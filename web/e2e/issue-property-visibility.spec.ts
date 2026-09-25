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
  const properties = page.getByRole('region', { name: 'Issue properties' });
  await expect(properties.getByRole('combobox', { name: 'Status' })).toBeVisible();
  await expect(properties.getByRole('combobox', { name: 'Priority' })).toBeVisible();
  await expect(properties.getByRole('combobox', { name: 'Assignee' })).toBeVisible();
  await expect(properties.getByRole('combobox', { name: 'Project' })).toBeVisible();
  await expect(properties.getByRole('combobox', { name: 'Priority' })).toHaveValue('Priority');
  await expect(properties.getByRole('combobox', { name: 'Project' })).toHaveValue('Project');
  await expect(properties.getByRole('combobox', { name: 'Estimate' })).toHaveValue('Estimate');
  await expect(properties.getByRole('combobox', { name: 'Cycle' })).toHaveValue('Cycle');
  await expect(properties.getByRole('combobox', { name: 'Estimate' })).toBeVisible();
  await expect(properties.getByRole('group', { name: 'Labels' })).toBeVisible();
  await expect(properties.getByRole('combobox', { name: 'Cycle' })).toBeVisible();
  for (const name of ['Due date', 'Milestone', 'Parent', 'Type']) {
    await expect(properties.getByLabel(name, { exact: true })).toHaveCount(0);
  }

  await properties.getByRole('button', { name: 'Add property' }).click();
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
  await properties.getByRole('button', { name: 'Add property' }).click();
  await page.getByRole('menuitem', { name: 'Due date', exact: true }).click();
  await expect(properties.getByLabel('Due date')).toHaveCount(0);

  const unchanged = await request.get(`/api/issues/${issue.identifier}`);
  expect(await unchanged.json()).toMatchObject({ dueDate: '2030-02-03' });
  await page.reload();
  await expect(properties.getByLabel('Due date')).toHaveCount(0);
});
