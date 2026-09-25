import { expect, type Page } from '@playwright/test';

const optionalProperties = new Set(['Due date', 'Milestone', 'Parent', 'Type']);

export async function ensureIssuePropertyVisible(page: Page, name: string) {
  const properties = page.getByRole('region', { name: 'Issue properties' });
  const property = properties.getByLabel(name, { exact: true });
  if (!optionalProperties.has(name)) {
    await expect(property).toBeVisible();
    return;
  }

  if (await property.isVisible()) return;

  await properties.getByRole('button', { name: 'Add property' }).click();
  await page.getByRole('menuitem', { name, exact: true }).click();
  await expect(property).toBeVisible();
}

export async function chooseIssueProperty(page: Page, name: string, option: string) {
  await ensureIssuePropertyVisible(page, name);
  const picker = page
    .getByRole('region', { name: 'Issue properties' })
    .getByRole('combobox', { name });
  await picker.click();
  await page
    .getByRole('listbox', { name })
    .getByRole('option', { name: option, exact: true })
    .click();
}
