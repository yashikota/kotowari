import { expect, test } from '@playwright/test';
import { expandMoreNavigation } from './issue-list-controls.ts';

async function choose(page: import('@playwright/test').Page, label: string, option: string) {
  await page.getByRole('combobox', { name: label }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

test('personal preferences persist appearance, comment shortcuts, and the default home view', async ({
  page,
  request,
}) => {
  const issueResponse = await request.post('/api/issues', {
    data: { title: `Personal preferences ${Date.now()}` },
  });
  expect(issueResponse.ok()).toBeTruthy();
  const issue = (await issueResponse.json()) as { identifier: string };

  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/config');

  await choose(page, 'Default home view', 'Issues');
  await choose(page, 'Color scheme', 'Dark');
  await expect(page.locator('html')).toHaveAttribute('data-mantine-color-scheme', 'dark');
  await choose(page, 'Font size', 'Large');
  await expect
    .poll(() =>
      page
        .locator('html')
        .evaluate((element) =>
          getComputedStyle(element).getPropertyValue('--mantine-font-size-sm').trim(),
        ),
    )
    .toBe('0.8125rem');
  await choose(page, 'Send comments on', 'Enter');
  await expect(page.getByLabel('Convert text emoticons into emojis')).toBeChecked();
  await page.getByLabel('Use pointer cursors').check();
  await page.getByLabel('Underline links in text').check();
  await expect(page.locator('html')).toHaveAttribute('data-pointer-cursors', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-underline-links', 'true');

  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Default home view' })).toHaveValue('Issues');
  await expect(page.getByRole('combobox', { name: 'Color scheme' })).toHaveValue('Dark');
  await expect(page.getByRole('combobox', { name: 'Font size' })).toHaveValue('Large');
  await expect(page.getByRole('combobox', { name: 'Send comments on' })).toHaveValue('Enter');
  await expect(page.getByLabel('Use pointer cursors')).toBeChecked();
  await expect(page.getByLabel('Underline links in text')).toBeChecked();

  await page.goto('/');
  await expect(page).toHaveURL(/\/issues$/);
  await expect(page.getByRole('heading', { name: 'Issues' })).toBeVisible();

  await page.goto(`/issues/${issue.identifier}`);
  const note = 'Comment sent with Enter :)';
  await page.getByLabel('New note').fill(note);
  await page.getByLabel('New note').press('Enter');
  await expect(page.getByText('Comment sent with Enter 🙂', { exact: true })).toBeVisible();

  await page.goto('/config');
  await page.getByLabel('Convert text emoticons into emojis').uncheck();
  await page.goto(`/issues/${issue.identifier}`);
  await page.getByLabel('New note').fill('Keep :) unchanged');
  await page.getByLabel('New note').press('Enter');
  await expect(page.getByText('Keep :) unchanged', { exact: true })).toBeVisible();
});

test('sidebar sections can be moved, reordered, hidden, and restored after reload', async ({
  page,
}) => {
  await page.goto('/config');
  await page.getByRole('button', { name: 'Customize sidebar' }).click();
  await choose(page, 'Where to show Issues', 'More');
  await page.getByRole('button', { name: 'Move Issues down' }).click();
  await page.getByRole('dialog').getByRole('button').first().click();

  await expandMoreNavigation(page);
  const moreLinks = page.getByRole('navigation', { name: 'More' }).getByRole('link');
  await expect(moreLinks.nth(0)).toHaveText('Reminders');
  await expect(moreLinks.nth(1)).toHaveText('Board');
  await expect(moreLinks.nth(2)).toHaveText('Issues');
  await expect(moreLinks.nth(3)).toHaveText('ADRs');
  await expect(
    page
      .getByRole('navigation', { name: 'Team navigation' })
      .getByRole('link', { name: 'Issues', exact: true }),
  ).toHaveCount(0);

  await page.reload();
  await expandMoreNavigation(page);
  const reloadedMoreLinks = page.getByRole('navigation', { name: 'More' }).getByRole('link');
  await expect(reloadedMoreLinks.nth(0)).toHaveText('Reminders');
  await expect(reloadedMoreLinks.nth(1)).toHaveText('Board');
  await expect(reloadedMoreLinks.nth(2)).toHaveText('Issues');
  await expect(reloadedMoreLinks.nth(3)).toHaveText('ADRs');

  await page.getByRole('button', { name: 'Customize sidebar' }).click();
  await choose(page, 'Where to show Issues', "Don't show");
  await expect(page.getByRole('combobox', { name: 'Where to show Issues' })).toHaveValue(
    "Don't show",
  );
  await page.getByRole('dialog').getByRole('button').first().click();
  await page.reload();
  await expandMoreNavigation(page);
  await expect(page.getByRole('heading', { name: 'Config' })).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Team navigation' })
      .getByRole('link', { name: 'Issues', exact: true }),
  ).not.toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'More' })
      .getByRole('link', { name: 'Issues', exact: true }),
  ).not.toBeVisible();

  await page.getByRole('button', { name: 'Customize sidebar' }).click();
  await choose(page, 'Where to show Issues', 'Sidebar');
  await page.getByRole('dialog').getByRole('button').first().click();
  await expect(
    page
      .getByRole('navigation', { name: 'Team navigation' })
      .getByRole('link', { name: 'Issues', exact: true }),
  ).toBeVisible({ timeout: 15_000 });
});
