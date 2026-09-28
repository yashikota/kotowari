import { expect, test } from '@playwright/test';

test('new projects default to Linear backlog and a persistable project icon', async ({
  page,
  request,
}) => {
  const projectName = `Linear defaults ${Date.now()}`;
  await page.goto('/projects');
  await page.getByRole('button', { name: 'New project' }).first().click();

  const dialog = page.getByRole('dialog', { name: 'New project' });
  await expect(dialog.getByRole('combobox', { name: 'Status' })).toHaveValue('Backlog');
  await dialog.getByRole('textbox', { name: 'Project name' }).fill(projectName);
  await dialog.getByRole('button', { name: 'Create project' }).click();
  await expect(page).toHaveURL(/\/projects\/[^/]+$/);

  const slug = new URL(page.url()).pathname.split('/').pop();
  if (!slug) throw new Error('expected created project route');
  const response = await request.get(`/api/projects/${slug}`);
  expect(await response.json()).toMatchObject({
    status: 'backlog',
    icon: 'cube',
    iconColor: 'blue',
  });
});

test('project creation matches Linear canvas geometry and keeps the action bar persistent', async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/projects');
  await page.getByRole('button', { name: 'New project' }).first().click();

  const dialog = page.getByRole('dialog', { name: 'New project' });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole('complementary', { name: 'Project creation assistant' }),
  ).toBeHidden();
  const createWithAgent = dialog.getByRole('button', { name: 'Create with Agent' });
  await expect(createWithAgent).toBeVisible();

  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.width).toBeGreaterThanOrEqual(900);
  expect(bounds!.width).toBeLessThanOrEqual(920);
  expect(bounds!.height).toBeGreaterThan(750);

  const name = dialog.getByRole('textbox', { name: 'Project name' });
  const template = dialog.getByRole('combobox', { name: 'Project template' });
  const icon = dialog.getByRole('button', { name: 'Choose project icon' });
  const summary = dialog.getByRole('textbox', { name: 'Project summary' });
  const status = dialog.getByRole('combobox', { name: 'Status' });
  const priority = dialog.getByRole('combobox', { name: 'Priority' });
  const lead = dialog.getByRole('combobox', { name: 'Lead' });
  const startDate = dialog.getByRole('button', { name: 'Change Start date' });
  const targetDate = dialog.getByRole('button', { name: 'Change Target date' });
  const labels = dialog.getByRole('combobox', { name: 'Project labels' });
  const addDependencies = dialog.getByRole('button', { name: 'Add dependencies' });
  const description = dialog.getByRole('textbox', { name: 'Project description' });
  const milestones = dialog.getByText('Milestones', { exact: true });
  const milestoneRow = dialog.locator('[aria-label="Milestones"]');
  const templatesResponse = await request.get('/api/project-templates');
  const templates = await templatesResponse.json();
  const [
    nameBounds,
    agentBounds,
    iconBounds,
    summaryBounds,
    statusBounds,
    priorityBounds,
    leadBounds,
    startDateBounds,
    targetDateBounds,
    labelsBounds,
    dependenciesBounds,
    descriptionBounds,
    milestonesBounds,
    milestoneRowBounds,
  ] = await Promise.all([
    name.boundingBox(),
    createWithAgent.boundingBox(),
    icon.boundingBox(),
    summary.boundingBox(),
    status.boundingBox(),
    priority.boundingBox(),
    lead.boundingBox(),
    startDate.boundingBox(),
    targetDate.boundingBox(),
    labels.boundingBox(),
    addDependencies.boundingBox(),
    description.boundingBox(),
    milestones.boundingBox(),
    milestoneRow.boundingBox(),
  ]);

  expect(nameBounds).not.toBeNull();
  expect(agentBounds).not.toBeNull();
  expect(agentBounds!.x).toBeGreaterThan(bounds!.x + bounds!.width / 2);
  if ((await templates).length > 0) await expect(template).toBeVisible();
  else await expect(template).toHaveCount(0);
  expect(iconBounds).not.toBeNull();
  expect(summaryBounds).not.toBeNull();
  expect(statusBounds).not.toBeNull();
  expect(priorityBounds).not.toBeNull();
  expect(leadBounds).not.toBeNull();
  await expect(status).toHaveValue('Backlog');
  await expect(lead).toHaveAttribute('placeholder', 'Lead');
  await expect(summary).toHaveAttribute('placeholder', 'Add a short summary…');
  expect(startDateBounds).not.toBeNull();
  expect(targetDateBounds).not.toBeNull();
  expect(labelsBounds).not.toBeNull();
  expect(dependenciesBounds).not.toBeNull();
  expect(descriptionBounds).not.toBeNull();
  expect(milestonesBounds).not.toBeNull();
  expect(milestoneRowBounds).not.toBeNull();
  expect(Math.abs(iconBounds!.x - (bounds!.x + 27))).toBeLessThanOrEqual(3);
  expect(agentBounds!.y).toBeLessThan(iconBounds!.y);
  expect(nameBounds!.y).toBeGreaterThan(iconBounds!.y);
  expect(nameBounds!.y).toBeLessThan(summaryBounds!.y);
  expect(summaryBounds!.y).toBeLessThan(statusBounds!.y);
  expect(statusBounds!.width).toBeLessThan(95);
  expect(priorityBounds!.width).toBeLessThan(110);
  expect(leadBounds!.width).toBeLessThan(85);
  expect(Math.abs(statusBounds!.y - startDateBounds!.y)).toBeLessThanOrEqual(8);
  expect(Math.abs(startDateBounds!.y - targetDateBounds!.y)).toBeLessThanOrEqual(8);
  expect(labelsBounds!.y).toBeGreaterThan(statusBounds!.y);
  expect(Math.abs(labelsBounds!.y - dependenciesBounds!.y)).toBeLessThanOrEqual(8);
  await expect(startDate).toHaveText('Start');
  await expect(targetDate).toHaveText('Target');
  await expect(addDependencies).toContainText('Dependencies');
  await expect(labels).toHaveAttribute('placeholder', 'Labels');
  expect(targetDateBounds!.y).toBeGreaterThanOrEqual(statusBounds!.y);
  expect(targetDateBounds!.y).toBeLessThan(descriptionBounds!.y);
  expect(dependenciesBounds!.y).toBeGreaterThanOrEqual(statusBounds!.y);
  expect(dependenciesBounds!.y).toBeLessThan(descriptionBounds!.y);
  expect(descriptionBounds!.height).toBeGreaterThan(240);
  expect(milestonesBounds!.y).toBeGreaterThanOrEqual(
    descriptionBounds!.y + descriptionBounds!.height,
  );
  expect(milestonesBounds!.y).toBeGreaterThan(bounds!.y + bounds!.height * 0.75);
  expect(milestoneRowBounds!.height).toBeCloseTo(46, 0);
  expect(milestoneRowBounds!.y).toBeGreaterThanOrEqual(bounds!.y + bounds!.height * 0.83);
  await expect(dialog.getByRole('heading', { name: 'Dependencies' })).toHaveCount(0);
  const createProject = dialog.getByRole('button', { name: 'Create project' });
  await expect(createProject).toBeInViewport();
  await expect(createProject).toBeEnabled();
  await expect(dialog.getByRole('button', { name: 'Members' })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Slack channel' })).toHaveCount(0);
  await expect(addDependencies).toBeEnabled();
  await addDependencies.click();
  if ((await (await request.get('/api/projects')).json()).length > 0) {
    await expect(dialog.getByRole('combobox', { name: 'Project', exact: true })).toBeVisible();
  } else {
    await expect(dialog.getByText('No other projects')).toBeVisible();
  }
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await createProject.click();
  await expect(name).toBeFocused();
  expect(
    await name.evaluate((element) => (element as HTMLInputElement).validity.valueMissing),
  ).toBe(true);
});

test('project creation wraps controls on a narrow viewport', async ({ page, request }) => {
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
  const template = dialog.getByRole('combobox', { name: 'Project template' });
  const templatesResponse = await request.get('/api/project-templates');
  if ((await templatesResponse.json()).length > 0) {
    await expect(template).toBeVisible();
  } else {
    await expect(template).toHaveCount(0);
  }
  await expect(dialog.getByRole('button', { name: 'Choose project icon' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Create project' })).toBeInViewport();

  const nameBounds = await dialog.getByRole('textbox', { name: 'Project name' }).boundingBox();
  const templateBounds = (await template.count()) > 0 ? await template.boundingBox() : null;
  expect(nameBounds).not.toBeNull();
  if (templateBounds) expect(templateBounds.y).toBeLessThan(nameBounds!.y);

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
  expect(bounds!.width).toBeLessThanOrEqual(920);
  expect(bounds!.x + bounds!.width).toBeGreaterThanOrEqual(910);
});

test('project dates use a compact picker and can be cleared', async ({ page }) => {
  await page.goto('/projects');
  await page.getByRole('button', { name: 'New project' }).first().click();

  const dialog = page.getByRole('dialog', { name: 'New project' });
  const startDate = dialog.getByRole('button', { name: 'Change Start date' });
  const targetDate = dialog.getByRole('button', { name: 'Change Target date' });
  await startDate.click();
  await expect(startDate).toHaveText('Start');
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
  await expect(startDate).toHaveText('Start');
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
