import { expect, test } from '@playwright/test';
import { ensureIssuePropertyVisible } from './issue-properties.ts';
import { chooseIssueProperty } from './issue-properties.ts';
import {
  chooseIssueFilterOption,
  createIssueView,
  expandMoreNavigation,
  fillIssueSearch,
  openIssueFilterCategory,
} from './issue-list-controls.ts';

test('archive and restore an issue', async ({ page, request }) => {
  const title = `Archive candidate ${Date.now()}`;
  await page.goto('/issues');
  await page.getByRole('tab', { name: 'All issues' }).click();
  await page.keyboard.press('c');
  const issueTitle = page.getByPlaceholder('Issue title');
  await issueTitle.fill(title);
  await issueTitle.press('ControlOrMeta+Enter');
  await expect(page.getByPlaceholder('Issue title')).toHaveCount(0);
  await expect(page.getByLabel('Issue title')).toHaveValue(title);
  const identifier = (
    await page.getByRole('button', { name: 'Copy identifier' }).textContent()
  )?.trim();
  if (!identifier) throw new Error('expected issue identifier in the URL');

  await page.getByRole('button', { name: 'Issue options' }).click();
  await page.getByRole('menuitem', { name: 'Archive', exact: true }).click();
  await expect(page.getByText('Archived', { exact: true })).toBeVisible();
  await expect(page.locator('[inert][aria-disabled="true"]')).toHaveCount(1);

  const activeResponse = await request.get('/api/issues');
  const activeIssues = (await activeResponse.json()) as { identifier: string }[];
  expect(activeIssues.some((item) => item.identifier === identifier)).toBe(false);
  const archivedResponse = await request.get('/api/issues?archived=true');
  const archivedIssues = (await archivedResponse.json()) as {
    identifier: string;
    archivedAt: string | null;
  }[];
  expect(archivedIssues).toContainEqual(
    expect.objectContaining({ identifier, archivedAt: expect.any(String) }),
  );

  await page.getByRole('link', { name: 'Back to issues' }).click();
  await expandMoreNavigation(page);
  await page
    .getByRole('navigation', { name: 'More' })
    .getByRole('link', { name: 'Archived issues', exact: true })
    .click();
  const archivedIssue = page.getByRole('option', { name: new RegExp(identifier) });
  await expect(archivedIssue).toBeVisible();
  await page.goto(`/issues/${identifier}`);
  await expect(page.getByLabel('Issue title')).toHaveValue(title);
  await page.getByRole('button', { name: 'Issue options' }).click();
  await page.getByRole('menuitem', { name: 'Restore', exact: true }).click();
  await expect(page.getByText('Archived', { exact: true })).toHaveCount(0);
  await expect(page.locator('[aria-disabled="true"]')).toHaveCount(0);
  const restoredTitle = page.getByLabel('Issue title');
  await restoredTitle.fill(`${title} restored`);
  await restoredTitle.press('Tab');
  const restoredResponse = await request.get(`/api/issues/${identifier}`);
  await expect(restoredResponse).toBeOK();
  await expect(await restoredResponse.json()).toMatchObject({
    title: `${title} restored`,
    archivedAt: null,
  });
});

test('create issue, comment, and page', async ({ page, request }) => {
  const projectName = `Atlas ${Date.now()}`;
  const projectSlug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  await page.goto('/issues');
  await expect(page.getByRole('heading', { name: 'Issues' })).toBeVisible();
  await page.getByRole('tab', { name: 'All issues' }).click();

  await page.keyboard.press('c');
  const issueTitle = page.getByPlaceholder('Issue title');
  await expect(issueTitle).toBeFocused();
  await issueTitle.fill('Smoke issue');
  await issueTitle.press('ControlOrMeta+Enter');
  await expect(page.getByPlaceholder('Issue title')).toHaveCount(0);
  await expect(page).toHaveURL(/\/issues\/ISS-\d+/);
  const identifier = page.url().match(/ISS-\d+/)?.[0];
  if (!identifier) {
    throw new Error('expected issue identifier in the URL');
  }
  await expect(page.getByLabel('Issue title')).toHaveValue('Smoke issue');

  const labels = page.getByRole('group', { name: 'Labels' });
  await labels.getByRole('button', { name: 'Add labels' }).click();
  await page
    .getByRole('dialog', { name: 'Add labels' })
    .getByRole('button', { name: 'Bug' })
    .click();
  await expect(labels.getByRole('button', { name: 'Remove label Bug' })).toBeVisible();

  await ensureIssuePropertyVisible(page, 'Due date');
  await page.getByLabel('Due date').fill('2026-09-01');
  const documentEditor = page.getByRole('region', { name: 'Document editor' }).first();
  await expect(page.getByRole('heading', { name: '目的' })).toBeVisible();
  await documentEditor.getByRole('heading', { name: '目的' }).click();
  await documentEditor.getByLabel('Markdown body').fill('## Goal\n\nShow **labels**.');
  await documentEditor.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
  await documentEditor.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Goal' })).toBeVisible();

  await page.getByRole('button', { name: 'Add reaction' }).first().click();
  const issueReactionPicker = page.locator('emoji-picker');
  await expect(issueReactionPicker).toBeVisible();
  await page.getByLabel('Search emoji').fill('melting face');
  await issueReactionPicker.getByRole('option', { name: /melting face/ }).click();
  await expect(page.getByRole('button', { name: 'Remove 🫠 reaction' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Remove 🫠 reaction' })).toBeVisible();

  await page.getByRole('button', { name: 'Add reaction' }).first().click();
  const skinTonePicker = page.locator('emoji-picker');
  await skinTonePicker.getByRole('button', { name: /Choose a skin tone/ }).click();
  await skinTonePicker.getByRole('option', { name: 'Medium', exact: true }).click();
  await page.getByLabel('Search emoji').fill('thumbs up');
  const skinToneReactionResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      /\/api\/issues\/[^/]+\/reactions$/.test(new URL(response.url()).pathname),
    { timeout: 8000 },
  );
  await skinTonePicker.getByRole('option', { name: /thumbs up/ }).click();
  const skinToneReactionResult = await skinToneReactionResponse;
  if (!skinToneReactionResult.ok()) {
    throw new Error(
      `save skin-tone reaction failed: ${skinToneReactionResult.status()} ${await skinToneReactionResult.text()}`,
    );
  }
  await expect(page.getByRole('button', { name: 'Remove 👍🏽 reaction' })).toBeVisible();

  await page.getByLabel('Choose files to attach to issue').setInputFiles({
    name: 'architecture.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/KwAAAABJRU5ErkJggg==',
      'base64',
    ),
  });
  await expect(page.getByRole('img', { name: 'architecture.png' })).toBeVisible();
  const issueResponse = await request.get(`/api/issues/${identifier}`);
  const currentIssue = (await issueResponse.json()) as {
    attachments?: { id: string; name: string }[];
  };
  const issueAttachment = currentIssue.attachments?.[0];
  if (!issueAttachment) throw new Error('expected issue-level attachment');
  const issueAttachmentResponse = await request.get(
    `/api/issues/${identifier}/attachments/${issueAttachment.id}`,
  );
  await expect(issueAttachmentResponse).toBeOK();
  await expect(issueAttachmentResponse.headers()).toMatchObject({
    'content-type': 'image/png',
    'content-disposition': expect.stringContaining('inline'),
  });
  await page.reload();
  await expect(page.getByRole('img', { name: 'architecture.png' })).toBeVisible();
  await page.getByRole('button', { name: 'Remove issue attachment architecture.png' }).click();
  await expect(page.getByRole('img', { name: 'architecture.png' })).toHaveCount(0);
  const removedAttachment = await request.get(
    `/api/issues/${identifier}/attachments/${issueAttachment.id}`,
  );
  expect(removedAttachment.status()).toBe(404);

  const comment = page.getByLabel('New note');
  await comment.fill('looks good');
  await comment.press('ControlOrMeta+Enter');
  await expect(page.getByText('looks good')).toBeVisible();

  await comment.fill('with a file');
  await page.getByLabel('Choose files to attach', { exact: true }).setInputFiles({
    name: 'release-note.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('local attachment contents'),
  });
  await page.getByRole('button', { name: 'Submit comment' }).click();
  const attachmentLink = page.getByRole('link', { name: 'release-note.txt' });
  await expect(attachmentLink).toBeVisible();
  await page.getByRole('button', { name: 'Add reaction' }).last().click();
  await page.getByLabel('Search emoji').fill('red heart');
  const commentReactionResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      /\/comments\/\d+\/reactions$/.test(new URL(response.url()).pathname),
    { timeout: 8000 },
  );
  await page
    .locator('emoji-picker')
    .getByRole('option', { name: /red heart/ })
    .click();
  const reactionResult = await commentReactionResponse;
  if (!reactionResult.ok()) {
    throw new Error(
      `save comment reaction failed: ${reactionResult.status()} ${await reactionResult.text()}`,
    );
  }
  const commentsResponse = await request.get(`/api/issues/${identifier}/comments`);
  const comments = (await commentsResponse.json()) as {
    attachments?: { id: string; name: string }[];
    reactions?: string[];
  }[];
  const attachment = comments.at(-1)?.attachments?.[0];
  if (!attachment) throw new Error('expected persisted issue attachment');
  expect(comments.at(-1)?.reactions).toContain('❤️');
  const downloaded = await request.get(`/api/issues/${identifier}/attachments/${attachment.id}`);
  await expect(downloaded).toBeOK();
  await expect(await downloaded.text()).toBe('local attachment contents');

  await page.getByRole('button', { name: 'Comment options' }).nth(1).click();
  await page.getByRole('menuitem', { name: 'Edit comment' }).click();
  await page.getByLabel('Edit comment').fill('updated **note**');
  await page.getByRole('button', { name: 'Save', exact: true }).last().click();
  await expect(page.locator('strong', { hasText: 'note' })).toBeVisible();
  await expect(page.getByText(/edited/)).toBeVisible();

  await page.getByRole('button', { name: 'Comment options' }).nth(1).click();
  await page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('menuitem', { name: 'Delete comment' }).click();
  await expect(page.getByRole('link', { name: 'release-note.txt' })).toHaveCount(0);
  const deletedAttachment = await request.get(
    `/api/issues/${identifier}/attachments/${attachment.id}`,
  );
  expect(deletedAttachment.status()).toBe(404);

  await page.getByRole('button', { name: 'Copy identifier' }).click();
  await page.keyboard.press('Shift+p');
  const adrTitle = page.getByPlaceholder('ADR title');
  await expect(adrTitle).toBeFocused();
  await adrTitle.fill('local cache');
  await adrTitle.press('ControlOrMeta+Enter');
  await expect(page).toHaveURL(/\/adrs\/ADR-\d+/);
  await expect(page.getByRole('textbox', { name: 'ADR title' }).first()).toHaveValue('local cache');
  await page.getByRole('link', { name: identifier }).click();
  await expect(page).toHaveURL(new RegExp(`/issues/${identifier}`));
  await expect(page.getByRole('link', { name: /ADR-/ })).toBeVisible();

  await page
    .getByRole('navigation', { name: 'Workspace navigation' })
    .getByRole('link', { name: 'Projects', exact: true })
    .click();
  await page.getByRole('button', { name: 'New project' }).first().click();
  const projectDialog = page.getByRole('dialog', { name: 'New project' });
  await projectDialog.getByLabel('Project name').fill(projectName);
  await projectDialog.getByLabel('Description').fill('A user-created project');
  await projectDialog.getByRole('combobox', { name: 'Status' }).click();
  await page.getByRole('option', { name: 'In progress', exact: true }).click();
  await projectDialog.getByRole('combobox', { name: 'Priority' }).click();
  await page.getByRole('option', { name: 'High', exact: true }).click();
  const projectLabels = projectDialog.getByRole('combobox', { name: 'Project labels' });
  await projectLabels.fill('Bug');
  await page.getByRole('option', { name: 'Bug', exact: true }).click();
  await projectDialog.getByRole('button', { name: 'Change Start date' }).click();
  await page
    .getByRole('dialog', { name: 'Change Start date' })
    .getByRole('textbox', { name: 'Set Start date' })
    .fill('2026-09-01');
  await projectDialog.getByRole('button', { name: 'Change Target date' }).click();
  await page
    .getByRole('dialog', { name: 'Change Target date' })
    .getByRole('textbox', { name: 'Set Target date' })
    .fill('2026-10-01');
  await projectDialog.getByRole('button', { name: 'Create project' }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${projectSlug}`));
  await expect(page.getByRole('heading', { name: projectName })).toBeVisible();
  await expect
    .poll(async () => {
      const response = await request.get(`/api/projects/${projectSlug}`);
      return await response.json();
    })
    .toMatchObject({
      description: 'A user-created project',
      status: 'started',
      priority: 2,
      labels: ['Bug'],
      startDate: '2026-09-01',
      targetDate: '2026-10-01',
    });

  await page.getByRole('link', { name: 'Cycles' }).click();
  await page.getByRole('button', { name: 'New cycle' }).click();
  await expect(page).toHaveURL(/\/cycles\/\d+$/);
  const cycleNameButton = page
    .getByRole('navigation', { name: 'Breadcrumb' })
    .getByRole('button', { name: 'Open cycle' });
  await expect(cycleNameButton).toBeVisible();
  const cycleName = (await cycleNameButton.textContent())?.trim();
  if (!cycleName) {
    throw new Error('expected cycle navigation label');
  }
  const cycleProgress = page.getByRole('region', { name: 'Progress', exact: true });
  await expect(cycleProgress.getByText('Scope', { exact: true }).first()).toBeVisible();
  await expect(cycleProgress.getByText('Started', { exact: true }).first()).toBeVisible();
  await expect(cycleProgress.getByText('Completed', { exact: true }).first()).toBeVisible();
  await expect(cycleProgress.getByText('0 · 0%', { exact: true })).toHaveCount(2);
  await expect(
    cycleProgress.getByRole('progressbar', { name: 'Cycle completion' }),
  ).toHaveAttribute('aria-valuetext', '0%');
  const cycleProgressChart = page.getByRole('region', { name: 'Progress over time' });
  await expect(cycleProgressChart.getByRole('img')).toHaveAttribute(
    'aria-label',
    'Cycle progress over time: 0 in scope, 0 started, 0 completed',
  );
  await expect(cycleProgressChart.getByText('Ideal', { exact: true })).toBeVisible();

  await page.goto(`/issues/${identifier}`);
  await expect(page.getByLabel('Issue title')).toHaveValue('Smoke issue');
  await page.keyboard.press('ControlOrMeta+k');
  await page.getByLabel('Command search').fill(`Assign to ${cycleName}`);
  await page.getByRole('option', { name: `Assign to ${cycleName}` }).click();
  await expect(page.getByRole('combobox', { name: 'Cycle' })).toHaveValue(/Cycle [1-9]/);

  await chooseIssueProperty(page, 'Status', 'Done');
  await expandMoreNavigation(page);
  await page.getByRole('navigation', { name: 'More' }).getByRole('link', { name: 'Board' }).click();
  const doneCol = page.getByRole('region', { name: 'done issues' });
  await expect(doneCol.getByRole('button', { name: new RegExp(identifier) })).toBeVisible();

  await expandMoreNavigation(page);
  await page.getByRole('navigation', { name: 'More' }).getByRole('link', { name: 'Pages' }).click();
  await page.keyboard.press('ControlOrMeta+k');
  await page.getByLabel('Command search').fill('Create page');
  await page.getByRole('option', { name: 'Create page' }).click();
  const pageTitle = page.getByPlaceholder('Page title');
  await expect(pageTitle).toBeFocused();
  await pageTitle.fill('ADR 1');
  await pageTitle.press('ControlOrMeta+Enter');
  await expect(page).toHaveURL(/\/pages\//);
  await expect(page.getByRole('textbox', { name: 'Page title' }).first()).toHaveValue('ADR 1');
  await page.getByLabel('Project').selectOption({ label: projectName });
  await expect(page.getByLabel('Project')).not.toHaveValue('');
});

test('sub-issue and saved view', async ({ page, request }) => {
  const stamp = Date.now();
  const parentTitle = `Parent job ${stamp}`;
  const childTitle = `Child step ${stamp}`;
  await page.goto('/issues');
  await expect(page.getByRole('heading', { name: 'Issues' })).toBeVisible();
  await page.getByRole('tab', { name: 'All issues' }).click();
  await page.keyboard.press('c');
  const issueTitle = page.getByPlaceholder('Issue title');
  await expect(issueTitle).toBeFocused();
  await issueTitle.fill(parentTitle);
  await issueTitle.press('ControlOrMeta+Enter');
  await expect(page.getByPlaceholder('Issue title')).toHaveCount(0);
  await expect(page.getByLabel('Issue title')).toHaveValue(parentTitle);

  await page.getByRole('button', { name: 'Add sub-issues' }).click();
  await page.getByLabel('New sub-issue').fill(childTitle);
  await page.getByLabel('New sub-issue').press('ControlOrMeta+Enter');
  await expect
    .poll(async () => {
      const response = await request.get('/api/issues');
      const issues = (await response.json()) as {
        id: number;
        title: string;
        parentId: number | null;
      }[];
      const parent = issues.find((issue) => issue.title === parentTitle);
      const child = issues.find((issue) => issue.title === childTitle);
      return Boolean(parent && child && child.parentId === parent.id);
    })
    .toBe(true);
  await expect(page.getByRole('button', { name: new RegExp(childTitle) })).toBeVisible();

  await page.getByRole('link', { name: 'Back to issues' }).click();
  const issueList = page.getByRole('listbox', { name: 'Issues' });
  await fillIssueSearch(page, parentTitle);
  await expect(issueList.getByRole('option', { name: new RegExp(parentTitle) })).toBeVisible();
  await fillIssueSearch(page, childTitle);
  await expect(issueList.getByRole('option', { name: new RegExp(childTitle) })).toBeVisible();
  await fillIssueSearch(page, '');

  const findToggle = page.getByRole('button', { name: 'Find issues', exact: true });
  if ((await findToggle.getAttribute('aria-expanded')) === 'true') await findToggle.click();
  const viewName = `Todos ${stamp}`;
  const viewSlug = viewName.toLowerCase().replaceAll(' ', '-');
  await createIssueView(page, viewName);
  await expect(page).toHaveURL(new RegExp(`/views/${viewSlug}$`));
  await openIssueFilterCategory(page, 'Status');
  await chooseIssueFilterOption(page, 'Filter status', 'Todo');
  await expect(page.getByRole('button', { name: 'Remove Status · Todo filter' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Remove Status · Todo filter' })).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Saved views' })
      .getByRole('link', { name: viewName, exact: true }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByLabel('Grouping', { exact: true }).selectOption('status');
  await expect(page.getByLabel('Grouping', { exact: true })).toHaveValue('status');
  await expect
    .poll(
      async () =>
        ((await (await request.get(`/api/views/${viewSlug}`)).json()) as { groupBy: string })
          .groupBy,
      { timeout: 10_000 },
    )
    .toBe('status');
  await page.getByLabel('Ordering', { exact: true }).selectOption('title');
  await expect
    .poll(
      async () =>
        ((await (await request.get(`/api/views/${viewSlug}`)).json()) as { orderBy: string })
          .orderBy,
    )
    .toBe('title');
  await page
    .getByRole('radiogroup', { name: 'Layout' })
    .getByText('Board', { exact: true })
    .click();
  await expect
    .poll(
      async () =>
        ((await (await request.get(`/api/views/${viewSlug}`)).json()) as { display: string })
          .display,
    )
    .toBe('board');

  await page.reload();
  await page.getByRole('button', { name: 'Display options' }).click();
  await expect(page.getByLabel('Grouping', { exact: true })).toHaveValue('status');
  await expect(page.getByLabel('Ordering', { exact: true })).toHaveValue('title');
  await expect(page.getByRole('radio', { name: 'Board' })).toBeChecked();
});
