import { expect, test } from '@playwright/test';

test('projects can be assigned a single-user lead and edited later', async ({ page, request }) => {
  const projectName = `Lead project ${Date.now()}`;

  await page.goto('/projects');
  await page.getByRole('button', { name: 'New project' }).first().click();
  const createDialog = page.getByRole('dialog', { name: 'New project' });
  await createDialog.getByLabel('Project name').fill(projectName);
  await createDialog.getByLabel('Lead').selectOption('self');
  await createDialog.getByRole('button', { name: 'Create project' }).click();

  await expect(page).toHaveURL(/\/projects\/[^/]+$/);
  const slug = new URL(page.url()).pathname.split('/').pop();
  if (!slug) throw new Error('expected created project route');
  await expect(page.getByLabel('Lead')).toHaveValue('self');
  await expect
    .poll(async () => {
      const response = await request.get(`/api/projects/${slug}`);
      return (await response.json()).lead;
    })
    .toBe('self');

  await page.goto('/projects');
  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByRole('checkbox', { name: 'Lead' }).check();
  await expect(page.getByRole('link', { name: /Lead project/ })).toContainText('You');

  await page.goto(`/projects/${slug}`);
  await page.getByLabel('Lead').selectOption('');
  await expect
    .poll(async () => {
      const response = await request.get(`/api/projects/${slug}`);
      return (await response.json()).lead ?? '';
    })
    .toBe('');
  await expect(page.getByLabel('Lead')).toHaveValue('');
});
