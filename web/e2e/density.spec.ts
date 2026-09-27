import { expect, test, type APIResponse } from '@playwright/test';

async function json<T>(res: APIResponse): Promise<T> {
  if (!res.ok()) {
    throw new Error(`${res.status()} ${await res.text()}`);
  }
  return (await res.json()) as T;
}

test('shortcuts, find, and project-scoped create', async ({ page, request }) => {
  const stamp = `${Date.now()}`;
  const needle = `Needle ${stamp}`;
  const hay = `Haystack ${stamp}`;
  await json(await request.post('/api/issues', { data: { title: needle, status: 'todo' } }));
  await json(await request.post('/api/issues', { data: { title: hay, status: 'todo' } }));
  const projectName = `Pier ${stamp}`;
  const project = await json<{ slug: string }>(
    await request.post('/api/projects', { data: { name: projectName, slug: `pier-${stamp}` } }),
  );

  await page.goto('/issues');
  await page.getByRole('tab', { name: 'All issues' }).click();

  await page.keyboard.press('?');
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toHaveCount(0);

  await page.keyboard.press('/');
  const findInput = page.getByRole('textbox', { name: 'Find issues' });
  await expect(findInput).toBeFocused();
  await findInput.fill('Needle');
  const list = page.getByRole('listbox', { name: 'Issues' });
  await expect(list.getByRole('option', { name: new RegExp(needle) })).toBeVisible();
  await expect(list.getByRole('option', { name: new RegExp(hay) })).toHaveCount(0);

  await page.goto(`/projects/${project.slug}`);
  await page.getByRole('button', { name: 'New issue' }).click();
  const createDialog = page.getByRole('dialog', { name: 'Create issue' });
  await expect(createDialog).toBeVisible();
  await expect(createDialog.getByRole('combobox', { name: 'Project' })).toHaveValue(projectName);
});
