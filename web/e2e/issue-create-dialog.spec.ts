import { expect, test } from '@playwright/test';

test('issue creation keeps Linear-style compact properties usable on desktop and mobile', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const title = `Compact create dialog ${stamp}`;
  const projectName = `Create dialog project ${stamp}`;
  const projectResponse = await request.post('/api/projects', {
    data: { name: projectName, slug: `create-dialog-${stamp}` },
  });
  expect(projectResponse.ok()).toBeTruthy();
  const project = (await projectResponse.json()) as { id: number };

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto('/issues');
  await page.getByRole('button', { name: 'Create issue', exact: true }).click();

  const dialog = page.getByRole('dialog', { name: 'Create issue' });
  const properties = dialog.getByRole('group', { name: 'Issue properties' });
  const titleInput = dialog.getByRole('textbox', { name: 'Issue title' });
  const descriptionInput = dialog.getByRole('textbox', { name: 'Description' });
  await expect(dialog).toBeVisible();
  await expect(titleInput).toBeVisible();
  await expect(descriptionInput).toBeVisible();
  await expect(properties.getByRole('combobox')).toHaveCount(9);
  await expect(properties.getByRole('combobox', { name: 'Add to cycle' })).toHaveValue('No cycle');

  const desktopDialog = await dialog.boundingBox();
  const desktopTitle = await titleInput.boundingBox();
  const desktopStatus = await properties.getByRole('combobox', { name: 'Status' }).boundingBox();
  const desktopPriority = await properties
    .getByRole('combobox', { name: 'Priority' })
    .boundingBox();
  const desktopCycle = await properties
    .getByRole('combobox', { name: 'Add to cycle' })
    .boundingBox();
  const desktopEstimate = await properties
    .getByRole('combobox', { name: 'Estimate' })
    .boundingBox();
  const desktopTemplate = await properties
    .getByRole('combobox', { name: 'Issue template' })
    .boundingBox();
  expect(desktopDialog).not.toBeNull();
  expect(desktopTitle).not.toBeNull();
  expect(desktopStatus).not.toBeNull();
  expect(desktopPriority).not.toBeNull();
  expect(desktopCycle).not.toBeNull();
  expect(desktopEstimate).not.toBeNull();
  expect(desktopTemplate).not.toBeNull();
  expect(desktopDialog!.width).toBeGreaterThanOrEqual(680);
  expect(desktopTitle!.width).toBeGreaterThan(600);
  expect(Math.abs(desktopStatus!.y - desktopPriority!.y)).toBeLessThan(8);
  expect(desktopPriority!.x).toBeGreaterThan(desktopStatus!.x);
  expect(Math.abs(desktopCycle!.y - desktopTemplate!.y)).toBeLessThan(8);
  expect(Math.abs(desktopEstimate!.y - desktopTemplate!.y)).toBeLessThan(8);
  expect(desktopEstimate!.y).toBeGreaterThan(desktopStatus!.y);
  expect(desktopTemplate!.x).toBeGreaterThan(desktopCycle!.x);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileDialog = await dialog.boundingBox();
  expect(mobileDialog).not.toBeNull();
  expect(mobileDialog!.width).toBeLessThanOrEqual(390);
  for (const name of [
    'Status',
    'Priority',
    'Assignee',
    'Project',
    'Estimate',
    'Label',
    'Add to cycle',
    'Type',
    'Issue template',
  ]) {
    const control = properties.getByRole('combobox', { name, exact: true });
    await expect(control).toBeVisible();
    const bounds = await control.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(mobileDialog!.x);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(mobileDialog!.x + mobileDialog!.width);
  }

  await titleInput.fill(title);
  const priority = properties.getByRole('combobox', { name: 'Priority' });
  await priority.click();
  await page.getByRole('option', { name: 'High', exact: true }).click();
  const projectPicker = properties.getByRole('combobox', { name: 'Project' });
  await projectPicker.fill(projectName);
  await page.getByRole('option', { name: projectName, exact: true }).click();
  await dialog.getByRole('button', { name: 'Create', exact: true }).click();

  await expect(page).toHaveURL(/\/issues\/[A-Z]+-\d+/);
  const identifier = new URL(page.url()).pathname.match(/\/issues\/([^/]+)/)?.[1];
  expect(identifier).toBeTruthy();
  const issueResponse = await request.get(`/api/issues/${identifier}`);
  expect(issueResponse.ok()).toBeTruthy();
  expect(await issueResponse.json()).toMatchObject({
    title,
    priority: 2,
    projectId: project.id,
  });
});
