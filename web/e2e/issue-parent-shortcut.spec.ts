import { expect, test } from '@playwright/test';

test('Ctrl+Shift+P sets the parent and Ctrl+Shift+Down opens the first sub-issue', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const parentResponse = await request.post('/api/issues', {
    data: { title: `Set parent shortcut ${stamp}`, status: 'todo' },
  });
  const childResponse = await request.post('/api/issues', {
    data: { title: `First child shortcut ${stamp}`, status: 'todo' },
  });
  expect(parentResponse.ok(), await parentResponse.text()).toBeTruthy();
  expect(childResponse.ok(), await childResponse.text()).toBeTruthy();
  const parent = (await parentResponse.json()) as { id: number; identifier: string };
  const child = (await childResponse.json()) as { identifier: string };

  const issueListLoaded = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/issues',
  );
  await page.goto(`/issues/${child.identifier}`);
  await issueListLoaded;
  await page.getByRole('button', { name: 'Issue options' }).focus();
  await page.keyboard.press('Control+Shift+p');
  const dialog = page.getByRole('dialog', { name: 'Mark as Sub-issue of…' });
  await expect(dialog).toBeVisible();
  const relatedIssue = dialog.getByRole('combobox', { name: 'Related issue' });
  await relatedIssue.fill(parent.identifier);
  await page
    .getByRole('listbox', { name: 'Related issue' })
    .getByRole('option', { name: new RegExp(`^${parent.identifier}\\b`) })
    .click();
  await expect(dialog).toHaveCount(0);

  const issueState = (await (await request.get(`/api/issues/${child.identifier}`)).json()) as {
    parentId: number | null;
  };
  expect(issueState.parentId).toBe(parent.id);

  await page.goto(`/issues/${parent.identifier}`);
  await page.getByRole('button', { name: 'Issue options' }).focus();
  await page.keyboard.press('Control+Shift+ArrowDown');
  await expect(page).toHaveURL(new RegExp(`/issues/${child.identifier}$`));
});

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
