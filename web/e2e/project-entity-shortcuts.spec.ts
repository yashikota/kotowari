import { expect, test, type APIRequestContext } from '@playwright/test';

async function createProject(request: APIRequestContext) {
  const slug = `project-shortcuts-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const name = `Project shortcuts ${slug}`;
  const response = await request.post('/api/projects', {
    data: { name, slug, status: 'planned', description: '' },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return { slug, name, project: (await response.json()) as { id: number } };
}

test('Ctrl+U focuses project activity', async ({ page, request }) => {
  const { slug } = await createProject(request);
  await page.goto(`/projects/${slug}`);
  await page.getByRole('button', { name: 'New issue' }).focus();
  await page.keyboard.press('Control+u');
  await expect(page.getByRole('region', { name: 'Activity' })).toBeFocused();
});

test('Shift+H sets a project reminder that appears in Reminders', async ({ page, request }) => {
  const { slug, name } = await createProject(request);
  await page.goto(`/projects/${slug}`);
  await page.getByRole('button', { name: 'New issue' }).focus();
  await page.keyboard.press('Shift+h');
  await page.getByRole('menuitem', { name: 'Tomorrow' }).click();

  await expect
    .poll(async () => {
      const response = await request.get(`/api/projects/${slug}`);
      return ((await response.json()) as { reminderAt?: string | null }).reminderAt;
    })
    .toBeTruthy();

  await page.goto('/reminders');
  const reminderLink = page.getByRole('link', { name });
  await expect(reminderLink).toBeVisible();
  await reminderLink.locator('xpath=../..').getByRole('button', { name: 'Dismiss' }).click();
  await expect
    .poll(async () => {
      const response = await request.get(`/api/projects/${slug}`);
      return ((await response.json()) as { reminderAt?: string | null }).reminderAt;
    })
    .toBeFalsy();
});

test('project copy shortcuts copy its ID and URL', async ({ page, request }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  const { slug, project } = await createProject(request);
  await page.goto(`/projects/${slug}`);
  const shortcutTrigger = page.getByRole('button', { name: 'New issue' });

  await shortcutTrigger.focus();
  await page.keyboard.press('Control+.');
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(String(project.id));

  await shortcutTrigger.focus();
  await page.keyboard.press('Control+Shift+,');
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(new URL(`/projects/${slug}`, page.url()).href);
});
