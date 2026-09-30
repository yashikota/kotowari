import { expect, test } from '@playwright/test';

test('workspace home adds, persists, and removes resource links', async ({ page, request }) => {
  const url = `https://example.test/workspace-resource/${Date.now()}`;
  const title = `Workspace guide ${Date.now()}`;

  await page.goto('/');
  await page.getByRole('button', { name: 'Add resource' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add resource' });
  await dialog.getByRole('textbox', { name: 'URL' }).fill(url);
  await dialog.getByRole('textbox', { name: 'Title (optional)' }).fill(title);
  await dialog.getByRole('button', { name: 'Add link' }).click();

  const resource = page.getByRole('link', { name: title });
  await expect(resource).toHaveAttribute('href', url);
  await page.reload();
  await expect(page.getByRole('link', { name: title })).toHaveAttribute('href', url);

  const workspaceResponse = await request.get('/api/workspace');
  await expect(workspaceResponse).toBeOK();
  const workspace = (await workspaceResponse.json()) as {
    resources: { url: string; title: string }[];
  };
  expect(workspace.resources).toContainEqual(expect.objectContaining({ url, title }));

  await page.getByRole('button', { name: `Remove resource ${title}` }).click();
  await expect(page.getByRole('link', { name: title })).toHaveCount(0);
  const updatedResponse = await request.get('/api/workspace');
  const updated = (await updatedResponse.json()) as { resources: { url: string }[] };
  expect(updated.resources.some((item) => item.url === url)).toBe(false);
});
