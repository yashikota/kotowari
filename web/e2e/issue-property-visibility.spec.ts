import { expect, test } from '@playwright/test';

test('issue details keep optional properties out of the way until added', async ({
  page,
  request,
}) => {
  const title = `Optional properties ${Date.now()}`;
  const created = await request.post('/api/issues', { data: { title, status: 'todo' } });
  expect(created.ok()).toBeTruthy();
  const issue = (await created.json()) as { identifier: string };

  await page.goto(`/issues/${issue.identifier}`);
  await page.setViewportSize({ width: 930, height: 900 });
  const properties = page.getByRole('region', { name: 'Issue properties' });
  const coreProperties = properties.getByRole('group', { name: 'Core properties' });
  const cycleProperties = properties.getByRole('group', {
    name: 'Cycle and optional properties',
  });
  await expect(coreProperties.getByRole('combobox', { name: 'Status' })).toBeVisible();
  await expect(coreProperties.getByRole('combobox', { name: 'Priority' })).toBeVisible();
  await expect(coreProperties.getByRole('combobox', { name: 'Assignee' })).toBeVisible();
  await expect(coreProperties.getByRole('combobox', { name: 'Project' })).toBeVisible();
  await expect(coreProperties.getByRole('combobox', { name: 'Priority' })).toHaveValue(
    'No priority',
  );
  await expect(coreProperties.getByRole('combobox', { name: 'Project' })).toHaveValue('Project');
  await expect(coreProperties.getByRole('combobox', { name: 'Estimate' })).toHaveValue(
    'No estimate',
  );
  await expect(cycleProperties.getByRole('combobox', { name: 'Cycle' })).toHaveValue('No cycle');
  await expect(coreProperties.getByRole('combobox', { name: 'Estimate' })).toBeVisible();
  await expect(coreProperties.getByRole('group', { name: 'Labels' })).toBeVisible();
  await expect(cycleProperties.getByRole('combobox', { name: 'Cycle' })).toBeVisible();
  const propertyRows = coreProperties.locator('div[class*="row"]');
  const propertyRowBounds = await propertyRows.evaluateAll((rows) =>
    rows.map((row) => ({ y: row.getBoundingClientRect().y })),
  );
  expect(Math.max(...propertyRowBounds.map((bounds) => bounds.y))).toBe(
    Math.min(...propertyRowBounds.map((bounds) => bounds.y)),
  );
  const cycleRowBounds = await cycleProperties.locator('div[class*="row"]').first().boundingBox();
  expect(cycleRowBounds).not.toBeNull();
  expect(cycleRowBounds!.y).toBeGreaterThan(propertyRowBounds[0]!.y);
  const statusRadius = await properties
    .locator('div[class*="row"]')
    .first()
    .evaluate((row) => Number.parseFloat(getComputedStyle(row).borderTopLeftRadius));
  expect(statusRadius).toBeGreaterThan(12);
  const addPropertyBounds = await cycleProperties
    .getByRole('button', { name: 'Add property' })
    .boundingBox();
  expect(addPropertyBounds).not.toBeNull();
  expect(Math.abs(addPropertyBounds!.y - cycleRowBounds!.y)).toBeLessThan(4);
  for (const name of ['Due date', 'Milestone', 'Parent', 'Type']) {
    await expect(properties.getByLabel(name, { exact: true })).toHaveCount(0);
  }

  await cycleProperties.getByRole('button', { name: 'Add property' }).click();
  const propertyMenu = page.getByRole('menu', { name: 'Add property' });
  await expect(propertyMenu.getByRole('menuitem', { name: 'Due date' })).toBeEnabled();
  await expect(propertyMenu.getByRole('menuitem', { name: 'Type' })).toBeEnabled();
  await expect(propertyMenu.getByRole('menuitem', { name: 'Milestone' })).toBeDisabled();
  await propertyMenu.getByRole('menuitem', { name: 'Due date' }).click();

  const dueDate = properties.getByLabel('Due date');
  await expect(dueDate).toBeVisible();
  await dueDate.fill('2030-02-03');
  await expect
    .poll(async () => {
      const response = await request.get(`/api/issues/${issue.identifier}`);
      return ((await response.json()) as { dueDate: string | null }).dueDate;
    })
    .toBe('2030-02-03');

  await page.reload();
  await expect(properties.getByLabel('Due date')).toHaveValue('2030-02-03');
  await cycleProperties.getByRole('button', { name: 'Add property' }).click();
  await page.getByRole('menuitem', { name: 'Due date', exact: true }).click();
  await expect(properties.getByLabel('Due date')).toHaveCount(0);

  const unchanged = await request.get(`/api/issues/${issue.identifier}`);
  expect(await unchanged.json()).toMatchObject({ dueDate: '2030-02-03' });
  await page.reload();
  await expect(properties.getByLabel('Due date')).toHaveCount(0);
});
