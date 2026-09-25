import { expect, test } from '@playwright/test';

test('N then P opens the project creation flow from another workspace page', async ({ page }) => {
  await page.goto('/issues');
  await expect(page.getByRole('heading', { name: 'Issues' })).toBeVisible();
  await page.keyboard.press('n');
  await page.keyboard.press('p');

  const dialog = page.getByRole('dialog', { name: 'Create project' });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(dialog.getByRole('textbox', { name: 'Project name' })).toBeFocused();
});

test('N then P does not fire while the user is entering text', async ({ page }) => {
  await page.goto('/issues');
  await page.getByRole('button', { name: 'Find issues' }).click();
  const find = page.getByRole('textbox', { name: 'Find issues' });
  await expect(find).toBeFocused();
  await find.press('n');
  await find.press('p');

  await expect(page.getByRole('dialog', { name: 'Create project' })).toHaveCount(0);
  await expect(page).toHaveURL(/\/issues$/);
  await expect(find).toHaveValue('np');
});
