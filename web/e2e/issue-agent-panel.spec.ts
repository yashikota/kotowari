import { expect, test } from '@playwright/test';

test('issue assistant opens as a contextual chat and carries context to the Agent page', async ({
  page,
  request,
}) => {
  const title = `Issue agent panel ${Date.now()}`;
  const created = await request.post('/api/issues', {
    data: { title, status: 'todo' },
  });
  expect(created.ok()).toBeTruthy();
  const issue = (await created.json()) as { identifier: string };
  await page.goto(`/issues/${issue.identifier}`);

  const launcher = page.getByRole('button', { name: 'AI assistant' });
  await expect(launcher).toBeVisible();
  await launcher.click();

  const assistant = page.getByRole('dialog', { name: 'AI assistant' });
  await expect(assistant).toBeVisible();
  await expect(assistant.getByText(issue.identifier, { exact: true })).toBeVisible();
  await expect(assistant.getByText(title, { exact: true })).toBeVisible();
  await expect(assistant.getByRole('button', { name: 'Summarize' })).toBeVisible();

  await assistant.getByLabel('Message to AI').fill('Summarize the issue');
  await assistant.getByRole('button', { name: 'Send', exact: true }).click();
  await assistant.getByRole('button', { name: 'Allow once' }).click();
  await expect(assistant.getByText('The ADR comparison is ready.')).toBeVisible();

  await assistant.getByRole('button', { name: 'Close' }).click();
  await expect(assistant).toBeHidden();
  await launcher.click();
  await expect(assistant.getByText('The ADR comparison is ready.')).toBeVisible();

  await assistant.getByRole('button', { name: 'Open full page' }).click();
  await expect(page).toHaveURL(/\/agent$/);
  await expect(page.getByLabel('Message to AI')).toHaveValue(
    new RegExp(`${issue.identifier} ${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
  );
});

test('issue assistant stays within a narrow viewport', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const title = `Mobile issue assistant ${Date.now()}`;
  const created = await request.post('/api/issues', {
    data: { title, status: 'todo' },
  });
  expect(created.ok()).toBeTruthy();
  const issue = (await created.json()) as { identifier: string };
  await page.goto(`/issues/${issue.identifier}`);

  const launcher = page.getByRole('button', { name: 'AI assistant' });
  await expect(launcher).toBeVisible();
  await launcher.click();
  const assistant = page.getByRole('dialog', { name: 'AI assistant' });
  await expect(assistant).toBeVisible();
  const box = await assistant.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await expect(assistant.getByLabel('Message to AI')).toBeVisible();
});
