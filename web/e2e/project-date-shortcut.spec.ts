import { expect, test } from '@playwright/test';

test('Ctrl+Alt+S and Ctrl+Alt+D focus project start and target dates', async ({
  page,
  request,
}) => {
  const slug = `project-date-shortcut-${Date.now()}`;
  const created = await request.post('/api/projects', {
    data: { name: 'Project date shortcuts', slug, status: 'planned', description: '' },
  });
  expect(created.ok(), await created.text()).toBeTruthy();

  await page.goto(`/projects/${slug}`);
  const shortcutTrigger = page.getByRole('button', { name: 'New issue' });
  await shortcutTrigger.focus();
  await page.keyboard.press('Control+Alt+s');
  await expect(page.getByLabel('Start date')).toBeFocused();

  await shortcutTrigger.focus();
  await page.keyboard.press('Control+Alt+d');
  await expect(page.getByLabel('Target date').first()).toBeFocused();
});
