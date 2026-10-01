import { expect, test } from '@playwright/test';

const ownedTitles = new Set<string>();

test.beforeEach(() => ownedTitles.clear());

test.afterEach(async ({ request }) => {
  const response = await request.get('/api/issues');
  await expect(response).toBeOK();
  const issues = (await response.json()) as Array<{ title: string; identifier: string }>;
  for (const issue of issues.filter((item) => ownedTitles.has(item.title))) {
    await expect(await request.delete('/api/issues/' + issue.identifier)).toBeOK();
  }
});

test('CSV preview exposes later rows and imports confirmed issues with empty bodies', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const titles = Array.from({ length: 21 }, (_, index) => `CSV ${stamp} ${index}`);
  for (const title of titles) ownedTitles.add(title);
  await page.goto('/issues');
  await page.getByRole('button', { name: 'Display options', exact: true }).click();
  await page.getByRole('button', { name: 'Import issues from CSV…', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Import issues from CSV', exact: true });
  await dialog.locator('input[type="file"]').setInputFiles({
    name: 'issues.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      `Title,Description,Status,Priority\r\n${titles.map((title) => `${title},,Done,High`).join('\r\n')}`,
    ),
  });
  await expect(dialog.getByText(`2. ${titles[0]}`, { exact: true })).toBeVisible();
  await expect(dialog.getByText(`22. ${titles[20]}`, { exact: true })).toHaveCount(0);
  await dialog.getByRole('button', { name: '2', exact: true }).click();
  await expect(dialog.getByText(`22. ${titles[20]}`, { exact: true })).toBeVisible();
  const importButton = dialog.getByRole('button', { name: 'Import 21 issues', exact: true });
  await importButton.click();
  await expect(dialog.getByText('Imported 21 issues; 0 failed.', { exact: true })).toBeVisible();
  await expect(importButton).toBeDisabled();
  const response = await request.get('/api/issues');
  await expect(response).toBeOK();
  const issues = (await response.json()) as Array<{
    title: string;
    body: string;
    status: string;
    priority: number;
  }>;
  const imported = issues.filter((issue) => titles.includes(issue.title));
  expect(imported).toHaveLength(21);
  for (const issue of imported) {
    expect(issue.body.trim()).toBe('');
    expect(issue.status).toBe('done');
    expect(issue.priority).toBe(2);
  }
});

test('ambiguous CSV headers disable import until a valid file is selected', async ({ page }) => {
  await page.goto('/issues');
  await page.getByRole('button', { name: 'Display options', exact: true }).click();
  await page.getByRole('button', { name: 'Import issues from CSV…', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Import issues from CSV', exact: true });
  const input = dialog.locator('input[type="file"]');
  await input.setInputFiles({
    name: 'ambiguous.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('Title,title\nFirst,Second'),
  });
  await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Import 0 issues', exact: true })).toBeDisabled();
  await input.setInputFiles({
    name: 'valid.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('Title\nValid preview'),
  });
  await expect(dialog.getByRole('alert')).toHaveCount(0);
  await expect(dialog.getByText('2. Valid preview', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Import 1 issue', exact: true })).toBeEnabled();
});
