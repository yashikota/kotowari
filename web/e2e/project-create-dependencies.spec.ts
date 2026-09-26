import { expect, test } from '@playwright/test';

test('new projects can link reciprocal dependencies before creation', async ({ page, request }) => {
  const stamp = Date.now();
  const dependencySlug = `foundation-${stamp}`;
  const dependencyName = `Foundation ${stamp}`;
  const projectName = `Launch ${stamp}`;
  const seed = await request.post('/api/projects', {
    data: { name: dependencyName, slug: dependencySlug, status: 'started' },
  });
  expect(seed.status()).toBe(201);

  await page.goto('/projects');
  await page.getByRole('button', { name: 'New project' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'New project' });
  await dialog.getByLabel('Project name').fill(projectName);
  await dialog.getByRole('button', { name: 'Add dependencies' }).click();
  await dialog.getByLabel('Project', { exact: true }).selectOption(dependencySlug);
  await dialog.getByLabel('Relationship', { exact: true }).selectOption('blocked_by');
  await dialog.getByRole('button', { name: 'Add dependency', exact: true }).click();
  const dependencySummary = dialog.getByText(`Blocked by ${dependencyName}`);
  await expect(dependencySummary).toBeVisible();
  const [dependencyBounds, descriptionBounds] = await Promise.all([
    dependencySummary.boundingBox(),
    dialog.getByLabel('Description').boundingBox(),
  ]);
  expect(dependencyBounds).not.toBeNull();
  expect(descriptionBounds).not.toBeNull();
  expect(dependencyBounds!.y).toBeLessThan(descriptionBounds!.y);
  await dialog.getByRole('button', { name: 'Create project' }).click();

  await expect(page).toHaveURL(/\/projects\/[^/]+$/);
  const projectSlug = new URL(page.url()).pathname.split('/').pop();
  if (!projectSlug) throw new Error('expected created project route');
  const created = await request.get(`/api/projects/${projectSlug}`);
  await expect(await created.json()).toMatchObject({
    dependencies: [{ projectSlug: dependencySlug, kind: 'blocked_by' }],
  });
  const updatedDependency = await request.get(`/api/projects/${dependencySlug}`);
  await expect(await updatedDependency.json()).toMatchObject({
    dependencies: [{ projectSlug, kind: 'blocks' }],
  });
});
