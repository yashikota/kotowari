import { expect, test } from '@playwright/test';

test('issue list row opens a detail view with an editable properties panel', async ({
  page,
  request,
}) => {
  const title = `Component detail ${Date.now()}`;
  const response = await request.post('/api/issues', {
    data: { title, status: 'todo', priority: 2 },
  });
  expect(response.ok()).toBeTruthy();
  const issue = (await response.json()) as { identifier: string };

  await page.goto('/issues');
  const issueList = page.getByRole('listbox', { name: 'Issues' });
  await page.getByLabel('Find issues').fill(title);

  const row = issueList.getByRole('option', { name: new RegExp(title) });
  await expect(row).toHaveAttribute('aria-posinset', '1');
  await expect(row).toHaveAttribute('aria-setsize', '1');
  await row.click();
  await expect(page).toHaveURL(new RegExp(`/issues/${issue.identifier}$`));

  const properties = page.getByRole('complementary', { name: 'Issue properties' });
  await expect(properties).toBeVisible();
  await expect(properties.getByRole('region', { name: 'Properties' })).toBeVisible();
  await expect(properties.getByRole('region', { name: 'Labels' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Document editor' }).first()).toBeVisible();

  await properties.getByLabel('Status').selectOption('in_progress');
  await expect
    .poll(async () => {
      const updated = await request.get(`/api/issues/${issue.identifier}`);
      return ((await updated.json()) as { status: string }).status;
    })
    .toBe('in_progress');
});

test('board columns group cards by status and reflect a detail edit', async ({ page, request }) => {
  const title = `Component board ${Date.now()}`;
  const response = await request.post('/api/issues', {
    data: { title, status: 'todo', priority: 1 },
  });
  expect(response.ok()).toBeTruthy();
  const issue = (await response.json()) as { identifier: string };
  const cardName = new RegExp(issue.identifier);

  await page.goto('/board');
  const todoColumn = page.getByRole('region', { name: 'todo issues' });
  await expect(todoColumn.getByRole('button', { name: cardName })).toBeVisible();
  await todoColumn.getByRole('button', { name: cardName }).click();

  await page.getByLabel('Status').selectOption('done');
  await page.getByRole('link', { name: 'Board' }).click();

  const doneColumn = page.getByRole('region', { name: 'done issues' });
  await expect(doneColumn.getByRole('button', { name: cardName })).toBeVisible();
  await expect(todoColumn.getByRole('button', { name: cardName })).toHaveCount(0);
});
