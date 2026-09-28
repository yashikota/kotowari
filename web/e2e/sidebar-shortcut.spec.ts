import { expect, test } from '@playwright/test';

test('the Linear left-sidebar shortcut collapses, restores, and persists navigation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  await expect(page.getByRole('button', { name: 'Collapse navigation' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Inbox', exact: true })).toBeVisible();

  await page.keyboard.press('[');

  await expect(page.getByRole('button', { name: 'Expand navigation' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Collapse navigation' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Inbox', exact: true })).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole('button', { name: 'Expand navigation' })).toBeVisible();
  await page.getByRole('button', { name: 'Expand navigation' }).click();

  await expect(page.getByRole('button', { name: 'Collapse navigation' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Inbox', exact: true })).toBeVisible();
});

test('the sidebar shortcut does not intercept text entry', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create issue' }).click();

  const issueTitle = page.getByRole('textbox', { name: 'Issue title' });
  await expect(issueTitle).toBeFocused();
  await page.keyboard.press('[');

  await expect(issueTitle).toHaveValue('[');
  await expect(page.getByRole('button', { name: 'Collapse navigation' })).toBeVisible();
});

test('shortcut help documents the left-sidebar shortcut', async ({ page }) => {
  await page.goto('/config');
  await page.getByRole('button', { name: 'Keyboard shortcuts' }).click();

  const help = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(help.getByText('Toggle left sidebar')).toBeVisible();
  await expect(help.getByText('[', { exact: true })).toBeVisible();
});
