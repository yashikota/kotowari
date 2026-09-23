import { expect, test } from '@playwright/test';
import { chooseIssueProperty } from './issue-properties.ts';

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

  await page.getByLabel('Due date').fill('2026-09-01');
  const documentEditor = page.getByRole('region', { name: 'Document editor' }).first();
  await expect(page.getByRole('heading', { name: '目的' })).toBeVisible();
  await documentEditor.getByRole('button', { name: 'Edit description' }).click();
  await documentEditor.getByLabel('Markdown body').fill('## Goal\n\nShow **labels**.');
  await documentEditor.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
  await documentEditor.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Goal' })).toBeVisible();

  const comment = page.getByLabel('New note');
  await comment.fill('looks good');
  await comment.press('ControlOrMeta+Enter');
  await expect(page.getByText('looks good')).toBeVisible();

  await page.getByRole('button', { name: 'Copy identifier' }).click();
  await page.keyboard.press('p');
  const adrTitle = page.getByPlaceholder('ADR title');
  await expect(adrTitle).toBeFocused();
  await adrTitle.fill('local cache');
  await adrTitle.press('ControlOrMeta+Enter');
  await expect(page).toHaveURL(/\/adrs\/ADR-\d+/);
  await expect(page.getByRole('textbox', { name: 'ADR title' }).first()).toHaveValue('local cache');
  await page.getByRole('link', { name: identifier }).click();
  await expect(page).toHaveURL(new RegExp(`/issues/${identifier}`));
  await expect(page.getByRole('link', { name: /ADR-/ })).toBeVisible();

  await page.getByRole('link', { name: 'Projects' }).click();
  await page.getByRole('button', { name: 'New project' }).first().click();
  const projectDialog = page.getByRole('dialog', { name: 'Create project' });
  await projectDialog.getByLabel('Project name').fill(projectName);
  await projectDialog.getByLabel('Description').fill('A user-created project');
  await projectDialog.getByLabel('Status').selectOption('started');
  await projectDialog.getByLabel('Priority').selectOption('2');
  await projectDialog.getByLabel('Start date').fill('2026-09-01');
  await projectDialog.getByLabel('Target date').fill('2026-10-01');
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
      startDate: '2026-09-01',
      targetDate: '2026-10-01',
    });

  await page.getByRole('link', { name: 'Cycles' }).click();
  await page.getByRole('button', { name: 'New cycle' }).click();
  await expect(page).toHaveURL(/\/cycles\/\d+$/);
  const cycleHeading = page.getByRole('heading', { name: /^Cycle \d+$/ });
  await expect(cycleHeading).toBeVisible();
  const cycleName = (await cycleHeading.textContent())?.trim();
  if (!cycleName) {
    throw new Error('expected cycle heading');
  }
  await expect(page.getByLabel('Cycle completion')).toHaveAttribute('aria-valuetext', '0%');
  await expect(page.getByText('0 / 0')).toBeVisible();

  await page.goto(`/issues/${identifier}`);
  await expect(page.getByLabel('Issue title')).toHaveValue('Smoke issue');
  await page.getByRole('button', { name: 'Search' }).first().click();
  await page.getByLabel('Command search').fill(`Assign to ${cycleName}`);
  await page.getByRole('option', { name: `Assign to ${cycleName}` }).click();
  await expect(page.getByRole('combobox', { name: 'Cycle' })).toHaveValue(/Cycle [1-9]/);

  await chooseIssueProperty(page, 'Status', 'Done');
  await page.getByRole('link', { name: 'Board' }).click();
  const doneCol = page.getByRole('region', { name: 'done issues' });
  await expect(doneCol.getByRole('button', { name: new RegExp(identifier) })).toBeVisible();

  await page.getByRole('link', { name: 'Pages' }).click();
  await page.getByRole('button', { name: 'Search' }).first().click();
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

  await page.getByLabel('New sub-issue').fill(childTitle);
  await page.getByLabel('New sub-issue').press('ControlOrMeta+Enter');
  await expect(page.getByRole('button', { name: new RegExp(childTitle) })).toBeVisible();

  await page.getByRole('link', { name: 'Back to issues' }).click();
  const issueList = page.getByRole('listbox', { name: 'Issues' });
  await page.getByLabel('Find issues').fill(parentTitle);
  await expect(issueList.getByRole('option', { name: new RegExp(parentTitle) })).toBeVisible();
  await page.getByLabel('Find issues').fill(childTitle);
  await expect(issueList.getByRole('option', { name: new RegExp(childTitle) })).toBeVisible();
  await page.getByLabel('Find issues').fill('');

  await page.getByRole('button', { name: 'New view' }).click();
  const viewName = page.getByPlaceholder('View name');
  await expect(viewName).toBeFocused();
  await viewName.fill('Todos');
  await viewName.press('ControlOrMeta+Enter');
  await expect(page).toHaveURL(/\/views\/todos/);
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await page.getByLabel('Filter status').selectOption('todo');
  await expect(page.getByRole('button', { name: 'Remove Status · Todo filter' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Remove Status · Todo filter' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Todos' })).toBeVisible();

  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByLabel('Grouping', { exact: true }).selectOption('status');
  await expect(page.getByLabel('Grouping', { exact: true })).toHaveValue('status');
  await expect
    .poll(
      async () =>
        ((await (await request.get('/api/views/todos')).json()) as { groupBy: string }).groupBy,
      { timeout: 10_000 },
    )
    .toBe('status');
  await page.getByLabel('Ordering', { exact: true }).selectOption('title');
  await expect
    .poll(
      async () =>
        ((await (await request.get('/api/views/todos')).json()) as { orderBy: string }).orderBy,
    )
    .toBe('title');
  await page
    .getByRole('radiogroup', { name: 'Layout' })
    .getByText('Board', { exact: true })
    .click();
  await expect
    .poll(
      async () =>
        ((await (await request.get('/api/views/todos')).json()) as { display: string }).display,
    )
    .toBe('board');

  await page.reload();
  await page.getByRole('button', { name: 'Display options' }).click();
  await expect(page.getByLabel('Grouping', { exact: true })).toHaveValue('status');
  await expect(page.getByLabel('Ordering', { exact: true })).toHaveValue('title');
  await expect(page.getByRole('radio', { name: 'Board' })).toBeChecked();
});
