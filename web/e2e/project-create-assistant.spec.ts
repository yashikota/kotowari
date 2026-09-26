import { expect, test } from '@playwright/test';

test('project creation includes a working assistant pane with draft prompts', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/projects');
  await page.getByRole('button', { name: 'New project' }).first().click();

  const dialog = page.getByRole('dialog', { name: 'New project' });
  const assistant = dialog.getByRole('complementary', { name: 'Project creation assistant' });
  await expect(assistant).toBeVisible();
  await expect(assistant.getByRole('heading', { name: 'Draft a new project' })).toBeVisible();
  await assistant.getByRole('button', { name: 'Plan timeline' }).click();
  await expect(assistant.getByRole('textbox', { name: 'Message to AI' })).toHaveValue(
    'Suggest a phased timeline for a new project. Keep it as a draft and do not modify workspace data.',
  );

  await assistant.getByRole('button', { name: 'Hide assistant' }).click();
  await expect(assistant).toBeHidden();
  await dialog.getByRole('button', { name: 'Show assistant' }).click();
  await expect(assistant).toBeVisible();
});

test('project creation keeps the assistant out of the narrow form layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/projects');
  await page.getByRole('button', { name: 'New project' }).first().click();

  const dialog = page.getByRole('dialog', { name: 'New project' });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole('complementary', { name: 'Project creation assistant' }),
  ).toBeHidden();
  await expect(dialog.getByLabel('Project name')).toBeVisible();
});
