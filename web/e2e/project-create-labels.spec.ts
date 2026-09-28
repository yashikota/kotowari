import { expect, test } from '@playwright/test';

test('new project labels can be created inline and attached to the project', async ({
  page,
  request,
}) => {
  const suffix = Date.now();
  const projectName = `Project label ${suffix}`;
  const labelName = `Launch ${suffix}`;

  await page.goto('/projects');
  await page.getByRole('button', { name: 'New project' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'New project' });
  const labelPicker = dialog.getByRole('combobox', { name: 'Project labels' });
  await labelPicker.fill(labelName);
  const createLabel = page
    .getByRole('listbox', { name: 'Project labels' })
    .getByRole('button', { name: `Create label “${labelName}”` });
  await expect(createLabel).toBeVisible();
  await createLabel.click();
  await expect(dialog.getByText(labelName, { exact: true })).toBeVisible();

  await dialog.getByRole('textbox', { name: 'Project name' }).fill(projectName);
  await dialog.getByRole('button', { name: 'Create project' }).click();
  await expect(page).toHaveURL(/\/projects\/[^/]+$/);

  const slug = new URL(page.url()).pathname.split('/').pop();
  if (!slug) throw new Error('expected created project route');
  const [projectResponse, labelsResponse] = await Promise.all([
    request.get(`/api/projects/${slug}`),
    request.get('/api/labels'),
  ]);
  expect(await projectResponse.json()).toMatchObject({ labels: [labelName] });
  expect(await labelsResponse.json()).toEqual(
    expect.arrayContaining([expect.objectContaining({ name: labelName })]),
  );
});
