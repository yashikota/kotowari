import { expect, test } from '@playwright/test';

test.afterEach(async ({ request }) => {
  const current = await request.get('/api/workspace');
  const workspace = (await current.json()) as { name: string; timezone: string };
  await request.patch('/api/workspace', {
    data: { name: workspace.name, timezone: workspace.timezone, locale: 'en' },
  });
});

test('standalone Agent keeps separate conversations and restores chat history', async ({
  page,
}) => {
  await page.goto('/agent');
  await expect(page.getByRole('heading', { name: 'New chat' })).toBeVisible();

  const assistant = page.getByRole('region', { name: 'AI assistant' });
  await assistant.getByLabel('Message to AI').fill('Review the single-user backlog');
  await assistant.getByRole('button', { name: 'Send', exact: true }).click();
  await assistant.getByRole('button', { name: 'Allow once' }).click();
  await expect(assistant.getByText('The ADR comparison is ready.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Review the single-user backlog' })).toBeVisible();

  await page.getByRole('button', { name: 'New chat', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'New chat' })).toBeVisible();
  await page.getByRole('button', { name: 'Chat history', exact: true }).click();
  const history = page.getByRole('navigation', { name: 'Chat history' });
  await history.getByRole('button', { name: 'Review the single-user backlog' }).click();
  await expect(assistant.getByText('The ADR comparison is ready.')).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'Chat history', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Chat history' })
    .getByRole('button', { name: 'Review the single-user backlog' })
    .click();
  await expect(
    page.getByRole('region', { name: 'AI assistant' }).getByText('The ADR comparison is ready.'),
  ).toBeVisible();
});

test('Agent and its controls follow the configured Japanese locale', async ({ page }) => {
  await page.goto('/config');
  await page.getByRole('combobox', { name: 'Language' }).click();
  await page.getByRole('option', { name: 'Japanese' }).click();
  await page.getByRole('button', { name: 'Save workspace' }).click();
  await expect(page.getByRole('link', { name: 'AI エージェント' })).toBeVisible();

  await page.goto('/agent');
  await expect(page.getByRole('button', { name: 'チャット履歴' })).toBeVisible();
  await expect(page.getByRole('button', { name: '新しいチャット' })).toBeVisible();
  await expect(page.getByLabel('AI へのメッセージ')).toBeVisible();
});
