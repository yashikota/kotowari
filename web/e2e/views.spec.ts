import { expect, test } from '@playwright/test';
import { createIssueView } from './issue-list-controls.ts';

test('workspace views page lists saved views and opens them', async ({ page }) => {
  const name = `Workspace view ${Date.now()}`;
  await page.goto('/issues');
  await page
    .getByRole('navigation', { name: 'Workspace navigation' })
    .getByRole('link', { name: 'Views', exact: true })
    .click();

  await expect(page).toHaveURL(/\/views$/);
  await expect(page.getByRole('heading', { name: 'Views', level: 2 })).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Workspace navigation' })
      .getByRole('link', { name: 'Views', exact: true }),
  ).toHaveAttribute('href', '/views');
  await createIssueView(page, name);
  await expect(page).toHaveURL(new RegExp(`/views/${name.toLowerCase().replaceAll(' ', '-')}$`));
  await page.goto('/views');
  await page.getByRole('navigation', { name: 'Saved views' }).getByRole('link', { name }).click();
  await expect(page).toHaveURL(new RegExp(`/views/${name.toLowerCase().replaceAll(' ', '-')}$`));
});

test('workspace views page has a useful empty state and create action', async ({ page }) => {
  await page.route('**/api/views', async (route) => {
    if (route.request().method() === 'GET') await route.fulfill({ json: [] });
    else await route.continue();
  });
  await page.goto('/views');
  await expect(page.getByText('No saved views yet', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New view', exact: true }).first().click();
  await expect(page.getByRole('dialog', { name: 'Create view' })).toBeVisible();
});
