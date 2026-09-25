import type { Page } from '@playwright/test';

export async function fillIssueSearch(page: Page, query: string) {
  const input = page.getByRole('textbox', { name: 'Find issues', exact: true });
  if ((await input.count()) === 0) {
    await page.getByRole('button', { name: 'Find issues', exact: true }).click();
  }
  await input.fill(query);
}

export async function openIssueFilterCategory(page: Page, category: string) {
  const search = page.getByRole('textbox', { name: 'Search filters', exact: true });
  const addFilterButton = page.getByRole('button', { name: 'Add filter', exact: true });
  if ((await addFilterButton.getAttribute('aria-expanded')) !== 'true') {
    await addFilterButton.click();
    await search.waitFor({ state: 'visible', timeout: 5000 });
  }
  await search.waitFor({ state: 'visible', timeout: 5000 });
  await search.fill(category);
  await page.getByRole('menuitem', { name: category, exact: true }).click();
}

export async function chooseIssueFilterOption(page: Page, label: string, option: string) {
  const combobox = page.getByRole('combobox', { name: label, exact: true });
  if (await combobox.count()) {
    await combobox.click();
    await page.getByRole('option', { name: option, exact: true }).click();
    return;
  }

  const optionButton = page
    .getByRole('group', { name: label, exact: true })
    .getByRole('button', { name: option, exact: true });
  await optionButton.click();
}

export async function createIssueView(page: Page, name: string) {
  const addButton = page.getByRole('button', { name: 'Add new view', exact: true });
  if ((await addButton.count()) > 0) await addButton.click();
  else await page.getByRole('button', { name: 'New view', exact: true }).first().click();
  await page.waitForURL(/\/views\/new/);
  await page.getByRole('textbox', { name: 'View name', exact: true }).fill(name);
  await page.getByRole('button', { name: 'Create view', exact: true }).click();
}

export async function expandMoreNavigation(page: Page) {
  const button = page.getByRole('button', { name: 'Show more links', exact: true });
  if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click();
  await page.getByRole('navigation', { name: 'More', exact: true }).waitFor({ state: 'visible' });
}
