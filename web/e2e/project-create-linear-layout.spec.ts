import { expect, test } from '@playwright/test';

test('project creation uses a spacious Linear-style canvas with a persistent action bar', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/projects');
  await page.getByRole('button', { name: 'New project' }).first().click();

  const dialog = page.getByRole('dialog', { name: 'New project' });
  await expect(dialog).toBeVisible();

  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.width).toBeGreaterThan(1000);
  expect(bounds!.height).toBeGreaterThan(750);

  const name = dialog.getByRole('textbox', { name: 'Project name' });
  const summary = dialog.getByRole('textbox', { name: 'Summary' });
  const status = dialog.getByLabel('Status');
  const description = dialog.getByRole('textbox', { name: 'Description' });
  const [nameBounds, summaryBounds, statusBounds, descriptionBounds] = await Promise.all([
    name.boundingBox(),
    summary.boundingBox(),
    status.boundingBox(),
    description.boundingBox(),
  ]);

  expect(nameBounds).not.toBeNull();
  expect(summaryBounds).not.toBeNull();
  expect(statusBounds).not.toBeNull();
  expect(descriptionBounds).not.toBeNull();
  expect(nameBounds!.y).toBeLessThan(summaryBounds!.y);
  expect(summaryBounds!.y).toBeLessThan(statusBounds!.y);
  expect(statusBounds!.y).toBeLessThan(descriptionBounds!.y);
  await expect(dialog.getByRole('button', { name: 'Create project' })).toBeInViewport();
});

test('project creation wraps controls on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/projects');
  await page.getByRole('button', { name: 'New project' }).first().click();

  const dialog = page.getByRole('dialog', { name: 'New project' });
  await expect(dialog).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.width).toBeGreaterThan(340);
  expect(bounds!.width).toBeLessThanOrEqual(390);
  await expect(dialog.getByRole('textbox', { name: 'Project name' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Create project' })).toBeInViewport();

  const formFits = await dialog.getByRole('textbox', { name: 'Project name' }).evaluate((name) => {
    const form = name.closest('form');
    return form !== null && form.scrollWidth <= form.clientWidth + 1;
  });
  expect(formFits).toBe(true);
});
