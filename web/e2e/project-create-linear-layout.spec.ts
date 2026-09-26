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
  const icon = dialog.getByRole('button', { name: 'Choose project icon' });
  const summary = dialog.getByRole('textbox', { name: 'Summary' });
  const status = dialog.getByRole('combobox', { name: 'Status' });
  const startDate = dialog.getByRole('button', { name: 'Change Start date' });
  const targetDate = dialog.getByRole('button', { name: 'Change Target date' });
  const labels = dialog.getByRole('combobox', { name: 'Project labels' });
  const addDependencies = dialog.getByRole('button', { name: 'Add dependencies' });
  const description = dialog.getByRole('textbox', { name: 'Description' });
  const milestones = dialog.getByText('Milestones', { exact: true });
  const [
    nameBounds,
    templateBounds,
    iconBounds,
    summaryBounds,
    statusBounds,
    startDateBounds,
    targetDateBounds,
    labelsBounds,
    dependenciesBounds,
    descriptionBounds,
    milestonesBounds,
  ] = await Promise.all([
    name.boundingBox(),
    template.boundingBox(),
    icon.boundingBox(),
    summary.boundingBox(),
    status.boundingBox(),
    startDate.boundingBox(),
    targetDate.boundingBox(),
    labels.boundingBox(),
    addDependencies.boundingBox(),
    description.boundingBox(),
    milestones.boundingBox(),
  ]);

  expect(nameBounds).not.toBeNull();
  expect(templateBounds).not.toBeNull();
  expect(iconBounds).not.toBeNull();
  expect(summaryBounds).not.toBeNull();
  expect(statusBounds).not.toBeNull();
  expect(startDateBounds).not.toBeNull();
  expect(targetDateBounds).not.toBeNull();
  expect(labelsBounds).not.toBeNull();
  expect(dependenciesBounds).not.toBeNull();
  expect(descriptionBounds).not.toBeNull();
  expect(milestonesBounds).not.toBeNull();
  expect(Math.abs(iconBounds!.y - templateBounds!.y)).toBeLessThanOrEqual(4);
  expect(nameBounds!.y).toBeGreaterThan(iconBounds!.y);
  expect(nameBounds!.y).toBeLessThan(summaryBounds!.y);
  expect(summaryBounds!.y).toBeLessThan(statusBounds!.y);
  expect(Math.abs(statusBounds!.y - startDateBounds!.y)).toBeLessThanOrEqual(4);
  expect(labelsBounds!.y).toBeGreaterThan(statusBounds!.y);
  expect(targetDateBounds!.y).toBeGreaterThanOrEqual(statusBounds!.y);
  expect(targetDateBounds!.y).toBeLessThan(descriptionBounds!.y);
  expect(dependenciesBounds!.y).toBeGreaterThanOrEqual(statusBounds!.y);
  expect(dependenciesBounds!.y).toBeLessThan(descriptionBounds!.y);
  expect(descriptionBounds!.height).toBeGreaterThan(240);
  expect(milestonesBounds!.y).toBeGreaterThanOrEqual(
    descriptionBounds!.y + descriptionBounds!.height,
  );
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
  await expect(dialog.getByRole('button', { name: 'Choose project icon' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Create project' })).toBeInViewport();

  const [nameBounds, templateBounds] = await Promise.all([
    dialog.getByRole('textbox', { name: 'Project name' }).boundingBox(),
    dialog.getByRole('combobox', { name: 'Project template' }).boundingBox(),
  ]);
  expect(nameBounds).not.toBeNull();
  expect(templateBounds).not.toBeNull();
  expect(templateBounds!.y).toBeLessThan(nameBounds!.y);

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

test('project dates use a compact picker and can be cleared', async ({ page }) => {
  await page.goto('/projects');
  await page.getByRole('button', { name: 'New project' }).first().click();

  const dialog = page.getByRole('dialog', { name: 'New project' });
  const startDate = dialog.getByRole('button', { name: 'Change Start date' });
  const targetDate = dialog.getByRole('button', { name: 'Change Target date' });
  await startDate.click();
  const datePopover = page.getByRole('dialog', { name: 'Change Start date' });
  const dateInput = datePopover.getByRole('textbox', { name: 'Set Start date' });
  await dateInput.fill('2026-09-26');
  await expect(dateInput).toHaveValue('2026-09-26');
  await dateInput.press('Enter');
  await expect(startDate).not.toHaveText('Start date');

  await targetDate.click();
  await expect(page.getByRole('dialog', { name: 'Change Target date' })).toBeVisible();
  await startDate.click();
  await expect(datePopover).toBeVisible();
  await datePopover.getByRole('button', { name: 'Clear date' }).click();
  await expect(startDate).toHaveText('Start date');
});

test('project dates support Linear-style precision tabs and natural-language periods', async ({
  page,
}) => {
  await page.goto('/projects');
  await page.getByRole('button', { name: 'New project' }).first().click();

  const dialog = page.getByRole('dialog', { name: 'New project' });
  const startDate = dialog.getByRole('button', { name: 'Change Start date' });
  await startDate.click();
  const datePopover = page.getByRole('dialog', { name: 'Change Start date' });
  for (const tab of ['Day', 'Month', 'Quarter', 'Half-year', 'Year']) {
    const control = datePopover.getByRole('tab', { name: tab, exact: true });
    await control.evaluate((element) => (element as HTMLButtonElement).click());
    await expect(control).toHaveAttribute('aria-selected', 'true');
    const bounds = await control.boundingBox();
    expect(bounds).not.toBeNull();
  }

  const dateInput = datePopover.getByRole('textbox', { name: 'Set Start date' });
  await dateInput.fill('Q4 2027');
  await dateInput.press('Enter');
  await expect(startDate).toHaveText('Oct 1');

  await startDate.click();
  await datePopover.getByRole('textbox', { name: 'Set Start date' }).fill('H1 2027');
  await datePopover.getByRole('textbox', { name: 'Set Start date' }).press('Enter');
  await expect(startDate).toHaveText('Jan 1');
});
