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

test('Ctrl+Shift+D removes the issue due date', async ({ page, request }) => {
  const created = await request.post('/api/issues', {
    data: {
      title: `Remove due date shortcut ${Date.now()}`,
      status: 'todo',
      dueDate: '2030-02-03',
    },
  });
  expect(created.ok(), await created.text()).toBeTruthy();
  const issue = (await created.json()) as { identifier: string };
  await page.goto(`/issues/${issue.identifier}`);
  await page.getByRole('button', { name: 'Issue options' }).focus();

  const update = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      new URL(response.url()).pathname === `/api/issues/${issue.identifier}`,
  );
  await page.keyboard.press('Control+Shift+d');
  expect((await update).ok()).toBeTruthy();
  const issueState = (await (await request.get(`/api/issues/${issue.identifier}`)).json()) as {
    dueDate: string | null;
  };
  expect(issueState.dueDate).toBeNull();
});

test('issue options menu exposes the Linear favorite action and shortcut', async ({
  page,
  request,
}) => {
  const created = await request.post('/api/issues', {
    data: { title: `Issue menu favorite ${Date.now()}`, status: 'todo' },
  });
  expect(created.ok()).toBeTruthy();
  const issue = (await created.json()) as { identifier: string };
  await page.goto(`/issues/${issue.identifier}`);

  const issueOptions = page.getByRole('button', { name: 'Issue options' });
  await issueOptions.click();
  const menu = page.getByRole('menu', { name: 'Issue options' });
  const favoriteAction = menu.getByRole('menuitem', { name: 'Favorite' });
  await expect(favoriteAction).toBeVisible();
  await expect(favoriteAction.getByTestId('copy-shortcut')).toHaveText('Alt F');
  await favoriteAction.click();
  await expect(page.getByRole('button', { name: 'Remove from favorites' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await issueOptions.click();
  await page
    .getByRole('menu', { name: 'Issue options' })
    .getByRole('menuitem', { name: 'Remove from favorites' })
    .click();
  await expect(page.getByRole('button', { name: 'Add to favorites' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
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
  const resourceURL = `https://example.test/shortcut-resource/${Date.now()}`;
  const resourceTitle = 'Shortcut resource';
  const created = await request.post('/api/issues', {
    data: {
      title: `Issue structure shortcuts ${Date.now()}`,
      status: 'todo',
      links: [{ url: resourceURL, title: resourceTitle, kind: 'link' }],
    },
  });
  expect(created.ok()).toBeTruthy();
  const issue = (await created.json()) as { identifier: string };
  await page.goto(`/issues/${issue.identifier}`);

  const issueOptions = page.getByRole('button', { name: 'Issue options' });
  await issueOptions.focus();
  await page.keyboard.press('ControlOrMeta+Shift+o');
  await expect(page.getByRole('textbox', { name: 'New sub-issue' })).toBeVisible();

  const resourceLink = page.getByRole('link', { name: resourceTitle, exact: true });
  await expect(resourceLink).toBeVisible();
  await issueOptions.focus();
  await page.keyboard.press('ControlOrMeta+Shift+l');
  await expect(resourceLink).toBeHidden();
  await issueOptions.focus();
  await page.keyboard.press('ControlOrMeta+Shift+l');
  await expect(resourceLink).toBeVisible();

  await issueOptions.focus();
  await page.keyboard.press('ControlOrMeta+Alt+l');
  await expect(page.getByRole('dialog').getByRole('textbox', { name: 'URL' })).toBeVisible();
});

test('Shift+P opens the project picker and adds the issue to a project', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const projectName = `Project shortcut ${stamp}`;
  const projectResponse = await request.post('/api/projects', {
    data: { name: projectName, slug: `project-shortcut-${stamp}` },
  });
  expect(projectResponse.ok(), await projectResponse.text()).toBeTruthy();
  const project = (await projectResponse.json()) as { id: number };
  const issueResponse = await request.post('/api/issues', {
    data: { title: `Add to project shortcut ${stamp}`, status: 'todo' },
  });
  expect(issueResponse.ok(), await issueResponse.text()).toBeTruthy();
  const issue = (await issueResponse.json()) as { identifier: string };
  await page.goto(`/issues/${issue.identifier}`);

  await page.getByRole('button', { name: 'Issue options' }).focus();
  await page.keyboard.press('Shift+p');

  const projectPicker = page.getByRole('combobox', { name: 'Project' });
  await expect(projectPicker).toHaveAttribute('aria-expanded', 'true');
  await expect(projectPicker).toBeFocused();
  await page.getByRole('option', { name: projectName, exact: true }).click();
  await expect(projectPicker).toHaveValue(projectName);
  const issueState = (await (await request.get(`/api/issues/${issue.identifier}`)).json()) as {
    projectId: number | null;
  };
  expect(issueState.projectId).toBe(project.id);
});

test('M then B opens the blocked-by picker and links the selected issue', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const sourceResponse = await request.post('/api/issues', {
    data: { title: `Blocked source ${stamp}`, status: 'todo' },
  });
  const targetResponse = await request.post('/api/issues', {
    data: { title: `Blocked target ${stamp}`, status: 'todo' },
  });
  expect(sourceResponse.ok(), await sourceResponse.text()).toBeTruthy();
  expect(targetResponse.ok(), await targetResponse.text()).toBeTruthy();
  const source = (await sourceResponse.json()) as { identifier: string };
  const target = (await targetResponse.json()) as { identifier: string };
  await page.goto(`/issues/${source.identifier}`);
  await page.getByRole('button', { name: 'Issue options' }).focus();

  await page.keyboard.press('m');
  await page.keyboard.press('b');
  const dialog = page.getByRole('dialog', { name: 'Mark as Blocked by…' });
  await expect(dialog).toBeVisible();
  const targetPicker = page.getByRole('combobox', { name: 'Related issue' });
  await targetPicker.fill(target.identifier);
  await page
    .getByRole('listbox', { name: 'Related issue' })
    .getByRole('option', { name: new RegExp(`^${target.identifier}\\b`) })
    .click();
  await expect(dialog).toHaveCount(0);

  const issueState = (await (await request.get(`/api/issues/${source.identifier}`)).json()) as {
    relations: { kind: string; targetIdentifier: string }[];
  };
  expect(issueState.relations).toContainEqual(
    expect.objectContaining({ kind: 'blockedBy', targetIdentifier: target.identifier }),
  );
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
  const assignee = page.getByRole('combobox', { name: 'Assignee' });
  await issueOptions.focus();
  await page.keyboard.press('a');
  await expect(assignee).toHaveAttribute('aria-expanded', 'true');
  await expect(assignee).toBeFocused();
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.getByRole('option', { name: 'Agent', exact: true }).click();
  await expect(assignee).toHaveValue('Agent');

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
  const labelPicker = page.getByRole('dialog', { name: 'Change labels' });
  await expect(labelPicker).toBeVisible();
  const labelSearch = labelPicker.getByRole('textbox', { name: 'Change labels' });
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

test('Ctrl+M focuses the issue comment composer', async ({ page, request }) => {
  const created = await request.post('/api/issues', {
    data: { title: `Issue comment shortcut ${Date.now()}`, status: 'todo' },
  });
  expect(created.ok(), await created.text()).toBeTruthy();
  const issue = (await created.json()) as { identifier: string };
  await page.goto(`/issues/${issue.identifier}`);
  await page.getByRole('button', { name: 'Issue options' }).focus();
  await page.keyboard.press('Control+m');
  await expect(page.getByRole('textbox', { name: 'New note' })).toBeFocused();
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
  await expect(help).toContainText('Open the issue assignee menu');
  await expect(help).toContainText('Toggle the issue favorite');
  await expect(help).toContainText('Set the issue due date');
  await expect(help).toContainText('Remove the issue due date');
  await expect(help).toContainText('Set a reminder for the issue');
  await expect(help).toContainText('Focus the issue description');
  await expect(help).toContainText('Focus the issue comment');
  await expect(help).toContainText('Create a sub-issue');
  await expect(help).toContainText('Collapse or expand issue resources');
  await expect(help).toContainText('Add a link to the issue');
  await expect(help).toContainText('Add the issue to a project');
  await expect(help).toContainText('Mark this issue as blocked');
  await expect(help).toContainText('Set the parent issue');
  await expect(help).toContainText('Open the first sub-issue');
});
