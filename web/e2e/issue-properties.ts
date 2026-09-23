import type { Page } from '@playwright/test';

export async function chooseIssueProperty(page: Page, name: string, option: string) {
  const picker = page
    .getByRole('complementary', { name: 'Issue properties' })
    .getByRole('combobox', { name });
  await picker.click();
  await page
    .getByRole('listbox', { name })
    .getByRole('option', { name: option, exact: true })
    .click();
}
