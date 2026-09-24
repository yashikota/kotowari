import type { Page } from '@playwright/test';

export async function fillIssueSearch(page: Page, query: string) {
  const input = page.getByRole('textbox', { name: 'Find issues', exact: true });
  if ((await input.count()) === 0) {
    await page.getByRole('button', { name: 'Find issues', exact: true }).click();
  }
  await input.fill(query);
}

export async function createIssueView(page: Page, name: string) {
  await page.getByRole('button', { name: 'Add new view', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Create view' });
  await dialog.getByLabel('View name').fill(name);
  await dialog.getByRole('button', { name: 'Create', exact: true }).click();
}
