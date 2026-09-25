import { expect, test } from '@playwright/test';
import { expandMoreNavigation, fillIssueSearch } from './issue-list-controls.ts';

test('issue filters use a searchable category menu with a scoped editor', async ({ page }) => {
  await page.goto('/issues');

  await page.getByRole('button', { name: 'Add filter', exact: true }).click();
  const searchFilters = page.getByRole('textbox', { name: 'Search filters' });
  await expect(searchFilters).toBeFocused();
  await searchFilters.fill('prior');
  await expect(page.getByRole('button', { name: 'Priority', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Status', exact: true })).toHaveCount(0);

  await searchFilters.fill('no matching category');
  await expect(page.getByText('No matching filters')).toBeVisible();

  await searchFilters.fill('status');
  await page.getByRole('button', { name: 'Status', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Filter status' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Search filters' })).toBeVisible();
  const searchOptions = page.getByRole('textbox', { name: 'Search filter options' });
  await searchOptions.fill('in progress');
  await expect(
    page.getByRole('group', { name: 'Filter status' }).getByRole('button', { name: 'In Progress' }),
  ).toBeVisible();
  await expect(
    page.getByRole('group', { name: 'Filter status' }).getByRole('button', { name: 'Backlog' }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Back to filters' }).click();
  await expect(page.getByRole('textbox', { name: 'Search filters' })).toBeVisible();
});

test('filter picker keeps its scoped editor inside a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/issues');
  await page.getByRole('button', { name: 'Add filter', exact: true }).click();
  await page.getByRole('button', { name: 'Status', exact: true }).click();

  const picker = page.getByRole('dialog', { name: 'Add filter' });
  await expect(page.getByRole('group', { name: 'Filter status' })).toBeVisible();
  const bounds = await picker.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);

  await page.getByRole('button', { name: 'Back to filters' }).click();
  await expect(page.getByRole('textbox', { name: 'Search filters' })).toBeVisible();
});

test('issue details facets show counts and filter the visible issue list', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const highTitle = `Facet high ${stamp}`;
  const lowTitle = `Facet low ${stamp}`;
  const projectName = `Facet project ${stamp}`;
  const projectSlug = `facet-project-${stamp}`;
  const projectResponse = await request.post('/api/projects', {
    data: { name: projectName, slug: projectSlug },
  });
  expect(projectResponse.ok()).toBeTruthy();
  const project = (await projectResponse.json()) as { id: number };
  const labelName = `Facet label ${stamp}`;
  const labelResponse = await request.post('/api/labels', {
    data: { name: labelName, color: '#7c3aed' },
  });
  expect(labelResponse.ok()).toBeTruthy();
  const label = (await labelResponse.json()) as { id: number };
  for (const [title, priority] of [
    [highTitle, 2],
    [lowTitle, 4],
  ] as const) {
    const created = await request.post('/api/issues', {
      data: {
        title,
        status: 'todo',
        priority,
        ...(title === highTitle ? { projectId: project.id, labelIds: [label.id] } : {}),
      },
    });
    expect(created.ok()).toBeTruthy();
  }

  await page.goto('/issues');
  await fillIssueSearch(page, String(stamp));
  await page.getByRole('button', { name: 'Open details' }).click();

  const details = page.getByRole('complementary', { name: 'Issue details' });
  await expect(details).toBeVisible();
  const panelBounds = await details.boundingBox();
  expect(panelBounds).not.toBeNull();
  expect(panelBounds!.width).toBeGreaterThanOrEqual(300);
  expect(panelBounds!.width).toBeLessThanOrEqual(340);
  const high = details.getByRole('button', { name: 'High, 1 issue' });
  await expect(high).toBeVisible();
  await expect(details.getByRole('button', { name: 'Low, 1 issue' })).toBeVisible();

  await high.click();
  await expect(page).toHaveURL(/priority=2/);
  const issues = page.getByRole('listbox', { name: 'Issues' });
  await expect(issues.getByRole('option', { name: new RegExp(highTitle) })).toBeVisible();
  await expect(issues.getByRole('option', { name: new RegExp(lowTitle) })).toHaveCount(0);
  await expect(details.getByRole('button', { name: 'High, 1 issue' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  const detailBy = details.getByRole('combobox', { name: 'Details by' });
  await detailBy.click();
  await page.getByRole('option', { name: 'Labels' }).click();
  const labelFacet = details.getByRole('button', { name: `${labelName}, 1 issue` });
  await expect(labelFacet).toBeVisible();
  await labelFacet.click();
  await expect.poll(() => new URL(page.url()).searchParams.get('labels')).toBe(labelName);
  await expect(issues.getByRole('option', { name: new RegExp(highTitle) })).toBeVisible();

  await detailBy.click();
  await page.getByRole('option', { name: 'Projects' }).click();
  const projectFacet = details.getByRole('button', { name: `${projectName}, 1 issue` });
  await expect(projectFacet).toBeVisible();
  await projectFacet.click();
  await expect.poll(() => new URL(page.url()).searchParams.get('project')).toBe(projectSlug);
  await expect(issues.getByRole('option', { name: new RegExp(highTitle) })).toBeVisible();

  await page.getByRole('button', { name: 'Close details' }).click();
  await expect(details).toHaveCount(0);
});

test('Linear-style workspace shell and collapsible priority groups', async ({ page }) => {
  await page.goto('/issues');

  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
  const workspaceNavigation = page.getByRole('navigation', { name: 'Workspace navigation' });
  await expect(workspaceNavigation).toBeVisible();
  await expect(
    workspaceNavigation.getByRole('link', { name: 'Projects', exact: true }),
  ).toBeVisible();
  await expect(workspaceNavigation.getByRole('link', { name: 'Views', exact: true })).toBeVisible();
  await expect(
    workspaceNavigation.getByRole('button', { name: 'Show more links' }),
  ).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('navigation', { name: 'More' })).toHaveCount(0);
  const teamNavigation = page.getByRole('navigation', { name: 'Team navigation' });
  await expect(teamNavigation.getByText('Your teams', { exact: true })).toBeVisible();
  await expect(teamNavigation.getByRole('link', { name: 'Home', exact: true })).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Home' }),
  ).toHaveCount(0);
  await expect(teamNavigation.getByRole('link', { name: 'Cycles', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Saved views' })).toBeVisible();
  await expandMoreNavigation(page);
  await expect(
    page.getByRole('navigation', { name: 'More' }).getByRole('link', { name: 'Board' }),
  ).toBeVisible();
  await teamNavigation.getByRole('button', { name: 'Your teams' }).click();
  await expect(teamNavigation.getByRole('link', { name: 'Cycles' })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Saved views' })).toHaveCount(0);
  await teamNavigation.getByRole('button', { name: 'Your teams' }).click();
  await expect(teamNavigation.getByRole('link', { name: 'Cycles' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Issues', level: 2 })).toBeAttached();
  await expect(page.getByRole('tablist', { name: 'Issue views' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'All issues' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('tab', { name: 'Archived' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Search' }).first()).toBeVisible();
  const allIssuesTab = page.getByRole('tab', { name: 'All issues' });
  const backlogTab = page.getByRole('tab', { name: 'Backlog' });
  await allIssuesTab.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(backlogTab).toBeFocused();
  await expect(backlogTab).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowRight');
  await expect(allIssuesTab).toBeFocused();

  const createdIssueTitle = `Priority group smoke test ${Date.now()}`;
  await page.getByRole('button', { name: 'Create issue', exact: true }).click();
  const title = page.getByPlaceholder('Issue title');
  await title.fill(createdIssueTitle);
  await page.getByRole('dialog').getByLabel('Priority').selectOption('0');
  await title.press('ControlOrMeta+Enter');
  await expect(page).toHaveURL(/\/issues\/[A-Z]+-\d+/);
  await expect(page.locator('input[aria-label="Issue title"]')).toHaveValue(createdIssueTitle);
  await expect(page.getByRole('main').getByRole('link', { name: 'Back to issues' })).toBeVisible();
  await expect(page.getByRole('listbox', { name: 'Issues' })).toHaveCount(0);

  await page.getByRole('main').getByRole('link', { name: 'Back to issues' }).click();
  await expect(page.getByRole('tab', { name: 'All issues' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await fillIssueSearch(page, createdIssueTitle);
  const noPriority = page
    .getByRole('button')
    .filter({ has: page.getByText('No priority', { exact: true }) });
  await expect(noPriority).toBeVisible();
  await expect(noPriority).toHaveAttribute('aria-expanded', 'true');
  await noPriority.click();
  await expect(noPriority).toHaveAttribute('aria-expanded', 'false');
  const issueList = page.getByRole('listbox', { name: 'Issues' });
  const createdIssue = issueList.getByRole('option', { name: new RegExp(createdIssueTitle) });
  await expect(createdIssue).toHaveCount(0);
  await noPriority.click();
  await expect(createdIssue).toBeVisible();

  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByLabel('Grouping', { exact: true }).selectOption('status');
  await page.getByLabel('Ordering', { exact: true }).selectOption('priority');
  await page.keyboard.press('Escape');
  const todoGroup = page
    .getByRole('button')
    .filter({ has: page.getByText('Todo', { exact: true }) });
  await expect(todoGroup).toBeVisible();
  await todoGroup.click();
  await expect(createdIssue).toHaveCount(0);

  await page.getByRole('tab', { name: 'Backlog' }).click();
  await expect(createdIssue).toHaveCount(0);
  await page.getByRole('tab', { name: 'Active' }).click();
  await expect(todoGroup).toHaveAttribute('aria-expanded', 'false');
  await todoGroup.click();
  await expect(createdIssue).toBeVisible();
  await page.getByRole('tab', { name: 'All issues' }).click();
  await expect(todoGroup).toHaveAttribute('aria-expanded', 'true');
  await expect(createdIssue).toBeVisible();

  await page.locator('body').click({ position: { x: 700, y: 120 } });
  await page.keyboard.press('ControlOrMeta+b');
  const todoColumn = page.getByRole('region', { name: 'todo issues' });
  await expect(
    todoColumn.getByRole('button', { name: new RegExp(createdIssueTitle) }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByRole('radiogroup', { name: 'Layout' }).getByText('List', { exact: true }).click();
  await expect(page.getByRole('listbox', { name: 'Issues' })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeHidden();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Team navigation' })
    .getByRole('link', { name: 'Projects' })
    .click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeHidden();
});

test('priority group quick-create inherits the group priority', async ({ page, request }) => {
  const stamp = Date.now();
  const seed = await request.post('/api/issues', {
    data: { title: `High group seed ${stamp}`, status: 'todo', priority: 2 },
  });
  expect(seed.ok()).toBeTruthy();

  await page.goto('/issues');
  await fillIssueSearch(page, stamp.toString());
  await page.getByRole('button', { name: 'Create new issue in High priority group' }).click();

  const dialog = page.getByRole('dialog', { name: 'Create issue' });
  const title = dialog.getByPlaceholder('Issue title');
  await expect(dialog.getByLabel('Priority')).toHaveValue('2');
  await title.fill(`Created from high group ${stamp}`);
  await title.press('ControlOrMeta+Enter');
  await expect(page).toHaveURL(/\/issues\/[A-Z]+-\d+/);

  const identifier = new URL(page.url()).pathname.match(/\/issues\/([^/]+)/)?.[1];
  expect(identifier).toBeTruthy();
  const created = await request.get(`/api/issues/${identifier}`);
  expect(created.ok()).toBeTruthy();
  expect(await created.json()).toMatchObject({
    title: `Created from high group ${stamp}`,
    priority: 2,
  });
});
