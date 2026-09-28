import { expect, test } from '@playwright/test';

test('Ctrl+Shift+Up opens the parent issue and appears in shortcut help', async ({
  page,
  request,
}) => {
  const parentResponse = await request.post('/api/issues', {
    data: { title: `Shortcut parent ${Date.now()}`, status: 'todo' },
  });
  expect(parentResponse.ok(), await parentResponse.text()).toBeTruthy();
  const parent = (await parentResponse.json()) as { identifier: string; id: number };

  const childResponse = await request.post('/api/issues', {
    data: { title: `Shortcut child ${Date.now()}`, status: 'todo', parentId: parent.id },
  });
  expect(childResponse.ok(), await childResponse.text()).toBeTruthy();
  const child = (await childResponse.json()) as { identifier: string };

  await page.goto(`/issues/${child.identifier}`);
  await page.getByRole('button', { name: 'Issue options' }).focus();
  await page.keyboard.press('Control+Shift+ArrowUp');
  await expect(page).toHaveURL(new RegExp(`/issues/${parent.identifier}$`));

  await page.keyboard.press('?');
  const shortcuts = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(shortcuts).toContainText('Ctrl/⌘+Shift+↑');
  await expect(shortcuts).toContainText('Open the parent issue');
});

test('Ctrl+Shift+Up does nothing for a root issue or while entering a note', async ({
  page,
  request,
}) => {
  const response = await request.post('/api/issues', {
    data: { title: `Shortcut without parent ${Date.now()}`, status: 'todo' },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const issue = (await response.json()) as { identifier: string };
  await page.goto(`/issues/${issue.identifier}`);

  await page.getByRole('button', { name: 'Issue options' }).focus();
  await page.keyboard.press('Control+Shift+ArrowUp');
  await expect(page).toHaveURL(new RegExp(`/issues/${issue.identifier}$`));

  const note = page.getByRole('textbox', { name: 'New note' });
  await note.focus();
  await page.keyboard.press('Control+Shift+ArrowUp');
  await expect(page).toHaveURL(new RegExp(`/issues/${issue.identifier}$`));
  await expect(note).toBeFocused();
});
