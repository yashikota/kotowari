import { expect, test } from '@playwright/test';

test('project documents can be created in context and global creation clears that context', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const projectResponse = await request.post('/api/projects', {
    data: {
      name: `Document project ${stamp}`,
      slug: `document-project-${stamp}`,
      status: 'planned',
    },
  });
  expect(projectResponse.ok()).toBeTruthy();
  const project = (await projectResponse.json()) as { id: number; slug: string };
  await page.goto(`/projects/${project.slug}`);
  const documents = page.getByLabel('Project documents', { exact: true });
  await documents.getByRole('button', { name: 'Create page', exact: true }).click();
  const composer = page.getByRole('dialog', { name: 'Create page', exact: true });
  await expect(composer.getByRole('combobox', { name: 'Project', exact: true })).toHaveValue(
    String(project.id),
  );
  const title = `Project document ${stamp}`;
  await composer.getByRole('textbox', { name: 'Page title', exact: true }).fill(title);
  await composer.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(composer).toHaveCount(0);
  await expect(page).toHaveURL(/\/pages\//);
  const slug = new URL(page.url()).pathname.split('/').at(-1)!;
  const created = await request.get(`/api/pages/${slug}`);
  expect(await created.json()).toMatchObject({
    title,
    projectId: project.id,
    projectSlug: project.slug,
  });
  await page.goto(`/projects/${project.slug}`);
  await expect(documents.getByRole('link', { name: title, exact: true })).toBeVisible();
  await documents.getByRole('button', { name: 'Create page', exact: true }).click();
  await expect(composer.getByRole('combobox', { name: 'Project', exact: true })).toHaveValue(
    String(project.id),
  );
  await page.keyboard.press('Escape');
  await expect(composer).toHaveCount(0);
  await page.goto('/pages');
  await page.getByRole('button', { name: 'Create page', exact: true }).first().click();
  await expect(composer.getByRole('combobox', { name: 'Project', exact: true })).toHaveValue('');
  await request.delete(`/api/pages/${slug}`);
  await request.delete(`/api/projects/${project.slug}`);
});

test('document creation can select a project and holds the selection when saving fails', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const projectResponse = await request.post('/api/projects', {
    data: {
      name: `Selected project ${stamp}`,
      slug: `selected-project-${stamp}`,
      status: 'planned',
    },
  });
  expect(projectResponse.ok()).toBeTruthy();
  const project = (await projectResponse.json()) as { id: number; slug: string };
  let attempts = 0;
  await page.route('**/api/pages', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    attempts += 1;
    if (attempts === 1)
      return route.fulfill({ status: 500, json: { error: 'Document unavailable' } });
    await route.continue();
  });
  await page.goto('/pages');
  await page.getByRole('button', { name: 'Create page', exact: true }).first().click();
  const composer = page.getByRole('dialog', { name: 'Create page', exact: true });
  const projectSelect = composer.getByRole('combobox', { name: 'Project', exact: true });
  await projectSelect.selectOption(String(project.id));
  const title = composer.getByRole('textbox', { name: 'Page title', exact: true });
  const value = `Selected document ${stamp}`;
  await title.fill(value);
  await title.press('Control+Enter');
  await expect.poll(() => attempts).toBe(1);
  await expect(title).toBeEnabled();
  await expect(title).toHaveValue(value);
  await expect(projectSelect).toHaveValue(String(project.id));
  await title.press('Control+Enter');
  await expect(composer).toHaveCount(0);
  await expect(page).toHaveURL(/\/pages\//);
  const slug = new URL(page.url()).pathname.split('/').at(-1)!;
  const created = await request.get(`/api/pages/${slug}`);
  expect(await created.json()).toMatchObject({ title: value, projectId: project.id });
  expect(attempts).toBe(2);
  await request.delete(`/api/pages/${slug}`);
  await request.delete(`/api/projects/${project.slug}`);
});
