import { expect, test } from '@playwright/test';

test('P then L opens the searchable project label picker', async ({ page, request }) => {
  const stamp = Date.now();
  const labelName = `Project shortcut label ${stamp}`;
  const label = await request.post('/api/labels', {
    data: { name: labelName, color: '#336699' },
  });
  expect(label.ok(), await label.text()).toBeTruthy();
  const slug = `project-label-shortcut-${stamp}`;
  const created = await request.post('/api/projects', {
    data: { name: 'Project label shortcut', slug, status: 'planned', description: '' },
  });
  expect(created.ok(), await created.text()).toBeTruthy();

  await page.goto(`/projects/${slug}`);
  await page.getByRole('button', { name: 'New issue' }).focus();
  await page.keyboard.press('p');
  await page.keyboard.press('l');
  await expect(page.getByRole('option', { name: labelName, exact: true })).toBeVisible();
});

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
