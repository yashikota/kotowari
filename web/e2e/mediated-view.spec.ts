import { expect, test } from '@playwright/test';

test('workspace link editors enter and leave mediated edit states independently', async ({
  page,
}) => {
  await page.goto('/');

  const url = page.getByRole('textbox', { name: 'Website' });
  const github = page.getByRole('textbox', { name: 'GitHub' });
  await url.fill('https://example.com');
  await github.fill('https://github.com/example/kotowari');
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  const workspaceLink = page.getByRole('link', { name: 'https://example.com' });
  const githubLink = page.getByRole('link', { name: 'https://github.com/example/kotowari' });
  await expect(workspaceLink).toBeVisible();
  await expect(githubLink).toBeVisible();

  await page.getByRole('button', { name: 'Edit' }).first().click();
  await expect(url).toBeVisible();
  await expect(githubLink).toBeVisible();
  await url.blur();
  await expect(workspaceLink).toBeVisible();

  await page.getByRole('button', { name: 'Edit' }).last().click();
  await expect(github).toBeVisible();
  await expect(workspaceLink).toBeVisible();
});
