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
  const template = dialog.getByRole('combobox', { name: 'Project template' });
  const summary = dialog.getByRole('textbox', { name: 'Summary' });
  const status = dialog.getByRole('combobox', { name: 'Status' });
  const addDependencies = dialog.getByRole('button', { name: 'Add dependencies' });
  const description = dialog.getByRole('textbox', { name: 'Description' });
  const [
    nameBounds,
    templateBounds,
    summaryBounds,
    statusBounds,
    dependenciesBounds,
    descriptionBounds,
  ] = await Promise.all([
    name.boundingBox(),
    template.boundingBox(),
    summary.boundingBox(),
    status.boundingBox(),
    addDependencies.boundingBox(),
    description.boundingBox(),
  ]);

  expect(nameBounds).not.toBeNull();
  expect(templateBounds).not.toBeNull();
  expect(summaryBounds).not.toBeNull();
  expect(statusBounds).not.toBeNull();
  expect(dependenciesBounds).not.toBeNull();
  expect(descriptionBounds).not.toBeNull();
  expect(
    Math.abs(nameBounds!.y + nameBounds!.height - (templateBounds!.y + templateBounds!.height)),
  ).toBeLessThan(4);
  expect(nameBounds!.y).toBeLessThan(summaryBounds!.y);
  expect(summaryBounds!.y).toBeLessThan(statusBounds!.y);
  expect(statusBounds!.y).toBeLessThan(dependenciesBounds!.y);
  expect(dependenciesBounds!.y).toBeLessThan(descriptionBounds!.y);
  await expect(dialog.getByRole('heading', { name: 'Dependencies' })).toHaveCount(0);
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
  await expect(dialog.getByRole('combobox', { name: 'Project template' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Create project' })).toBeInViewport();

  const [nameBounds, templateBounds] = await Promise.all([
    dialog.getByRole('textbox', { name: 'Project name' }).boundingBox(),
    dialog.getByRole('combobox', { name: 'Project template' }).boundingBox(),
  ]);
  expect(nameBounds).not.toBeNull();
  expect(templateBounds).not.toBeNull();
  expect(templateBounds!.y).toBeGreaterThan(nameBounds!.y);

  const formFits = await dialog.getByRole('textbox', { name: 'Project name' }).evaluate((name) => {
    const form = name.closest('form');
    return form !== null && form.scrollWidth <= form.clientWidth + 1;
  });
  expect(formFits).toBe(true);
});

test('project creation uses Linear-sized side gutters on a desktop viewport', async ({ page }) => {
  await page.setViewportSize({ width: 930, height: 920 });
  await page.goto('/projects');
  await page.getByRole('button', { name: 'New project' }).first().click();

  const dialog = page.getByRole('dialog', { name: 'New project' });
  await expect(dialog).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(8);
  expect(bounds!.x).toBeLessThanOrEqual(20);
  expect(bounds!.width).toBeGreaterThan(890);
  expect(bounds!.x + bounds!.width).toBeGreaterThanOrEqual(910);
});
