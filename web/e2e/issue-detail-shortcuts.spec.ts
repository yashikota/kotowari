import { expect, test } from '@playwright/test';

test('issue shortcuts assign to me, toggle favorite, and open the due-date picker', async ({
  page,
  request,
}) => {
  const created = await request.post('/api/issues', {
    data: { title: `Issue shortcuts ${Date.now()}`, status: 'todo' },
  });
  expect(created.ok()).toBeTruthy();
  const issue = (await created.json()) as { identifier: string };
  await page.goto(`/issues/${issue.identifier}`);

  const issueOptions = page.getByRole('button', { name: 'Issue options' });
  await issueOptions.focus();
  await page.keyboard.press('Shift+r');
  const issueTitle = page.getByRole('textbox', { name: 'Issue title' });
  await expect(issueTitle).toBeFocused();

  await issueOptions.focus();
  await page.keyboard.press('i');
  await expect(page.getByRole('combobox', { name: 'Assignee' })).toHaveValue('You');

  const favorite = page.getByRole('button', { name: 'Add to favorites' });
  await favorite.focus();
  await page.keyboard.press('Alt+f');
  await expect(page.getByRole('button', { name: 'Remove from favorites' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.keyboard.press('Shift+d');
  await expect(page.getByRole('dialog', { name: 'Set due date' })).toBeVisible();
  const resetFavorite = await request.patch(`/api/issues/${issue.identifier}`, {
    data: { isFavorite: false },
  });
  expect(resetFavorite.ok()).toBeTruthy();
});

test('Shift+H opens the issue reminder submenu', async ({ page, request }) => {
  const created = await request.post('/api/issues', {
    data: { title: `Issue reminder shortcut ${Date.now()}` },
  });
  expect(created.ok()).toBeTruthy();
  const issue = (await created.json()) as { identifier: string };
  await page.goto(`/issues/${issue.identifier}`);

  await page.getByRole('button', { name: 'Issue options' }).focus();
  await page.keyboard.press('Shift+h');

  const reminderMenu = page.getByRole('menu', { name: 'Issue options' });
  await expect(reminderMenu).toBeVisible();
  await expect(reminderMenu.getByRole('menuitem', { name: 'An hour from now' })).toBeVisible();
  await expect(reminderMenu.getByRole('menuitem', { name: 'Tomorrow' })).toBeVisible();
  await expect(reminderMenu.getByRole('menuitem', { name: 'Custom…' })).toBeVisible();
});

test('issue shortcuts create a sub-issue, toggle resources, and open the link form', async ({
  page,
  request,
}) => {
  const created = await request.post('/api/issues', {
    data: { title: `Issue structure shortcuts ${Date.now()}`, status: 'todo' },
  });
  expect(created.ok()).toBeTruthy();
  const issue = (await created.json()) as { identifier: string };
  await page.goto(`/issues/${issue.identifier}`);

  const issueOptions = page.getByRole('button', { name: 'Issue options' });
  await issueOptions.focus();
  await page.keyboard.press('ControlOrMeta+Shift+o');
  await expect(page.getByRole('textbox', { name: 'New sub-issue' })).toBeVisible();

  await issueOptions.focus();
  await page.keyboard.press('ControlOrMeta+Shift+l');
  await expect(page.getByRole('button', { name: 'Expand resources section' })).toBeVisible();

  await issueOptions.focus();
  await page.keyboard.press('ControlOrMeta+Alt+l');
  await expect(page.getByRole('dialog').getByRole('textbox', { name: 'URL' })).toBeVisible();
});

test('issue property shortcuts open focused status, priority, label, and estimate controls', async ({
  page,
  request,
}) => {
  const created = await request.post('/api/issues', {
    data: { title: `Issue property shortcuts ${Date.now()}`, status: 'todo' },
  });
  expect(created.ok()).toBeTruthy();
  const issue = (await created.json()) as { identifier: string };
  await page.goto(`/issues/${issue.identifier}`);

  const issueOptions = page.getByRole('button', { name: 'Issue options' });
  const status = page.getByRole('combobox', { name: 'Status' });
  await issueOptions.focus();
  await page.keyboard.press('s');
  await expect(status).toHaveAttribute('aria-expanded', 'true');
  await expect(status).toBeFocused();
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(status).toHaveAttribute('aria-expanded', 'false');

  const priority = page.getByRole('combobox', { name: 'Priority' });
  await issueOptions.focus();
  await page.keyboard.press('p');
  await expect(priority).toHaveAttribute('aria-expanded', 'true');
  await expect(priority).toBeFocused();
  await page.getByRole('option', { name: 'Urgent' }).click();
  await expect(priority).toHaveValue('Urgent');

  const estimate = page.getByRole('combobox', { name: 'Estimate' });
  await issueOptions.focus();
  await page.keyboard.press('Shift+e');
  await expect(estimate).toHaveAttribute('aria-expanded', 'true');
  await expect(estimate).toBeFocused();
  await page.keyboard.press('Escape');

  await issueOptions.focus();
  await page.keyboard.press('l');
  const labelSearch = page.getByRole('textbox', { name: 'New label' });
  await expect(labelSearch).toBeVisible();
  await expect(labelSearch).toBeFocused();
});

test('issue description shortcut enters edit mode and focuses the markdown editor', async ({
  page,
  request,
}) => {
  const created = await request.post('/api/issues', {
    data: { title: `Issue description shortcut ${Date.now()}`, status: 'todo' },
  });
  expect(created.ok()).toBeTruthy();
  const issue = (await created.json()) as { identifier: string };
  await page.goto(`/issues/${issue.identifier}`);

  await page.getByRole('button', { name: 'Issue options' }).focus();
  await page.keyboard.press('ControlOrMeta+Shift+i');

  const description = page.getByRole('textbox', { name: 'Markdown body' });
  await expect(description).toBeVisible();
  await expect(description).toBeFocused();
  await description.fill('Focused from the issue shortcut.');
  await expect(description).toHaveValue('Focused from the issue shortcut.');

  const anotherCreated = await request.post('/api/issues', {
    data: { title: `Issue after description shortcut ${Date.now()}`, status: 'todo' },
  });
  expect(anotherCreated.ok()).toBeTruthy();
  const anotherIssue = (await anotherCreated.json()) as { identifier: string };
  await page.goto(`/issues/${anotherIssue.identifier}`);
  await expect(page.getByRole('textbox', { name: 'Markdown body' })).toHaveCount(0);
});

test('shortcut help documents issue detail actions in the active locale', async ({
  page,
  request,
}) => {
  const created = await request.post('/api/issues', {
    data: { title: `Issue shortcut help ${Date.now()}`, status: 'todo' },
  });
  expect(created.ok()).toBeTruthy();
  const issue = (await created.json()) as { identifier: string };
  await page.goto(`/issues/${issue.identifier}`);

  await page.getByRole('button', { name: 'Issue options' }).focus();
  await page.keyboard.press('?');

  const help = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(help).toBeVisible();
  await expect(help).toContainText('Assign the issue to yourself');
  await expect(help).toContainText('Toggle the issue favorite');
  await expect(help).toContainText('Set the issue due date');
  await expect(help).toContainText('Set a reminder for the issue');
  await expect(help).toContainText('Focus the issue description');
  await expect(help).toContainText('Create a sub-issue');
  await expect(help).toContainText('Collapse or expand issue resources');
  await expect(help).toContainText('Add a link to the issue');
  await expect(help).toContainText('Create an ADR linked to this issue');
});
