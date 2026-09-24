import type { Page } from '@playwright/test';

export async function fillIssueSearch(page: Page, query: string) {
  const input = page.getByRole('textbox', { name: 'Find issues', exact: true });
  if ((await input.count()) === 0) {
    await page.getByRole('button', { name: 'Find issues', exact: true }).click();
  }
  await input.fill(query);
}

export async function createIssueView(page: Page, name: string) {
  const addButton = page.getByRole('button', { name: 'Add new view', exact: true });
  if ((await addButton.count()) > 0) await addButton.click();
  else await page.getByRole('button', { name: 'New view', exact: true }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Create view' });
  await dialog.getByLabel('View name').fill(name);
  await dialog.getByRole('button', { name: 'Create', exact: true }).click();
}

export async function expandMoreNavigation(page: Page) {
  const button = page.getByRole('button', { name: 'Show more links', exact: true });
  if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click();
  await page.getByRole('navigation', { name: 'More', exact: true }).waitFor({ state: 'visible' });
}
