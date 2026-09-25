import { expect, test } from '@playwright/test';
import {
  chooseIssueFilterOption,
  createIssueView,
  openIssueFilterCategory,
} from './issue-list-controls.ts';

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
  await expect(page.getByRole('heading', { name })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open details' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close details' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Open details' }).click();
  await expect(page.getByRole('button', { name: 'Close details' })).toBeVisible();
  await expect(page.getByText('Select an issue')).toBeVisible();
  await page.getByRole('button', { name: 'Close details' }).click();
  await expect(page.getByRole('button', { name: 'Open details' })).toBeVisible();
});

test('workspace views page has a useful empty state and create action', async ({ page }) => {
  await page.route('**/api/views', async (route) => {
    if (route.request().method() === 'GET') await route.fulfill({ json: [] });
    else await route.continue();
  });
  await page.goto('/views');
  await expect(page.getByText('No saved views yet', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New view', exact: true }).first().click();
  await expect(page).toHaveURL(/\/views\/new/);
  await expect(page.getByRole('textbox', { name: 'View name' })).toHaveValue('All issues');
  await expect(page.getByRole('textbox', { name: 'Description' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choose icon' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Display options' })).toBeVisible();
});

test('new view editor saves its description, icon, filter, and live preview', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const matching = `Builder matching ${stamp}`;
  const hidden = `Builder hidden ${stamp}`;
  await request.post('/api/issues', { data: { title: matching, status: 'todo', priority: 2 } });
  await request.post('/api/issues', { data: { title: hidden, status: 'todo', priority: 4 } });

  await page.goto('/views');
  await page.getByRole('button', { name: 'New view', exact: true }).first().click();
  const name = `Builder ${stamp}`;
  await page.getByRole('textbox', { name: 'View name', exact: true }).fill(name);
  await page
    .getByRole('textbox', { name: 'Description', exact: true })
    .fill('Focused work for this cycle.');
  await page.getByRole('button', { name: 'Choose icon' }).click();
  await page.getByRole('button', { name: 'Rocket icon' }).click();

  await openIssueFilterCategory(page, 'Priority');
  await chooseIssueFilterOption(page, 'Filter priority', 'High');
  const preview = page.locator('[aria-label="Preview"]');
  await expect(preview.getByText(new RegExp(matching))).toBeVisible();
  await expect(preview.getByText(new RegExp(hidden))).toHaveCount(0);
  await page.getByRole('button', { name: 'Create view', exact: true }).click();

  const slug = name.toLowerCase().replaceAll(' ', '-');
  await expect(page).toHaveURL(new RegExp(`/views/${slug}$`));
  await expect(page.getByText('Focused work for this cycle.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove Priority · High filter' })).toBeVisible();
  const saved = await request.get(`/api/views/${slug}`);
  expect(await saved.json()).toMatchObject({
    name,
    description: 'Focused work for this cycle.',
    icon: 'rocket',
    priority: 2,
  });
  const list = page.getByRole('listbox', { name: 'Issues' });
  await expect(list.getByRole('option', { name: new RegExp(matching) })).toBeVisible();
  await expect(list.getByRole('option', { name: new RegExp(hidden) })).toHaveCount(0);
  await page.goto('/views');
  await expect(page.getByText('Focused work for this cycle.')).toBeVisible();
});
