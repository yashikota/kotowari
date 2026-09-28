import { expect, test } from '@playwright/test';
import { createIssueView, expandMoreNavigation, fillIssueSearch } from './issue-list-controls.ts';

function localDateOffset(days: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

test('issue views and controls share a toolbar that wraps on narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/issues');

  const selectedView = page.getByRole('tab', { name: 'All issues' });
  const filters = page.getByRole('search', { name: 'Issue filters' });
  const [desktopTabBounds, desktopFilterBounds, desktopAddFilterBounds] = await Promise.all([
    selectedView.boundingBox(),
    filters.boundingBox(),
    page.getByRole('button', { name: 'Add filter', exact: true }).boundingBox(),
  ]);
  expect(desktopTabBounds).not.toBeNull();
  expect(desktopFilterBounds).not.toBeNull();
  expect(desktopAddFilterBounds).not.toBeNull();
  const tabCenter = desktopTabBounds!.y + desktopTabBounds!.height / 2;
  const filterCenter = desktopFilterBounds!.y + desktopFilterBounds!.height / 2;
  expect(Math.abs(tabCenter - filterCenter)).toBeLessThan(4);
  expect(desktopAddFilterBounds!.x).toBeGreaterThan(1280 * 0.65);

  await page.setViewportSize({ width: 390, height: 844 });
  const [mobileTabBounds, mobileFilterBounds, documentWidth] = await Promise.all([
    selectedView.boundingBox(),
    filters.boundingBox(),
    page.evaluate(() => document.documentElement.scrollWidth),
  ]);
  expect(mobileTabBounds).not.toBeNull();
  expect(mobileFilterBounds).not.toBeNull();
  expect(mobileFilterBounds!.y).toBeGreaterThan(mobileTabBounds!.y);
  expect(documentWidth).toBeLessThanOrEqual(390);
});

test('AI filter suggestions apply real local issue filters and explain unsupported prompts', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const assignedTitle = `AI filter assigned ${stamp}`;
  const unassignedTitle = `AI filter unassigned ${stamp}`;
  for (const data of [{ title: assignedTitle, assignee: 'self' }, { title: unassignedTitle }]) {
    const response = await request.post('/api/issues', { data });
    expect(response.ok()).toBeTruthy();
  }

  await page.goto('/issues');
  await page.getByRole('button', { name: 'Add filter', exact: true }).click();
  const filterMenu = page.getByRole('menu', { name: 'Add filter' });
  await filterMenu.getByRole('menuitem', { name: 'AI filter', exact: true }).click();

  const input = page.getByRole('textbox', { name: 'AI filter' });
  await expect(input).toBeFocused();
  await input.fill('show me mysterious work');
  await input.press('Enter');
  await expect(page.getByRole('alert')).toContainText('couldn’t match');
  await page.getByRole('option', { name: 'assigned to me', exact: true }).click();

  await expect.poll(() => new URL(page.url()).searchParams.get('assignee')).toBe('self');
  const issueList = page.getByRole('listbox', { name: 'Issues' });
  await expect(issueList.getByRole('option', { name: new RegExp(assignedTitle) })).toBeVisible();
  await expect(issueList.getByRole('option', { name: new RegExp(unassignedTitle) })).toHaveCount(0);
  await expect(page.getByRole('menu', { name: 'Add filter' })).toBeHidden();
});

test('AI filter date prompt includes due dates only inside its requested window', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const todayTitle = `AI due today ${stamp}`;
  const boundaryTitle = `AI due boundary ${stamp}`;
  const outsideTitle = `AI due outside ${stamp}`;
  for (const data of [
    { title: todayTitle, dueDate: localDateOffset(0) },
    { title: boundaryTitle, dueDate: localDateOffset(14) },
    { title: outsideTitle, dueDate: localDateOffset(15) },
  ]) {
    const response = await request.post('/api/issues', { data });
    expect(response.ok()).toBeTruthy();
  }

  await page.goto('/issues');
  await page.getByRole('button', { name: 'Add filter', exact: true }).click();
  await page.getByRole('menuitem', { name: 'AI filter', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'AI filter' });
  await input.fill('due in the next 2 weeks');
  await input.press('Enter');

  await expect
    .poll(() => new URL(page.url()).searchParams.get('advancedFilterGroup'))
    .not.toBeNull();
  const issueList = page.getByRole('listbox', { name: 'Issues' });
  await expect(issueList.getByRole('option', { name: new RegExp(todayTitle) })).toBeVisible();
  await expect(issueList.getByRole('option', { name: new RegExp(boundaryTitle) })).toBeVisible();
  await expect(issueList.getByRole('option', { name: new RegExp(outsideTitle) })).toHaveCount(0);
});

test('issue display property chips persist as personal view state', async ({ page }) => {
  await page.goto('/issues');
  await page.getByRole('button', { name: 'Display options' }).click();

  const properties = page.getByRole('group', { name: 'Display properties' });
  const dueDate = properties.getByRole('button', { name: 'Due date', exact: true });
  const milestone = properties.getByRole('button', { name: 'Milestone', exact: true });
  await expect(dueDate).toHaveAttribute('aria-pressed', 'true');
  await expect(milestone).toHaveAttribute('aria-pressed', 'false');

  await dueDate.click();
  await milestone.click();
  await expect(dueDate).toHaveAttribute('aria-pressed', 'false');
  await expect(milestone).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/displayProperties=/);

  await page.reload();
  await page.getByRole('button', { name: 'Display options' }).click();
  await expect(properties.getByRole('button', { name: 'Due date', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(properties.getByRole('button', { name: 'Milestone', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('issue filters use a searchable category menu with a scoped editor', async ({ page }) => {
  await page.goto('/issues');

  await page.getByRole('button', { name: 'Add filter', exact: true }).click();
  const searchFilters = page.getByRole('textbox', { name: 'Search filters' });
  await expect(searchFilters).toBeFocused();
  const picker = page.getByRole('menu', { name: 'Add filter' });
  await expect(picker.getByText('Issue properties', { exact: true })).toHaveCount(0);
  const statusFilter = picker.getByRole('menuitem', { name: 'Status', exact: true });
  await expect(statusFilter.locator('svg')).toHaveCount(2);
  const [buttonBounds, iconBounds, labelBounds, chevronBounds] = await Promise.all([
    statusFilter.boundingBox(),
    statusFilter.locator('svg').first().boundingBox(),
    statusFilter.getByText('Status', { exact: true }).boundingBox(),
    statusFilter.locator('svg').last().boundingBox(),
  ]);
  expect(buttonBounds).not.toBeNull();
  expect(iconBounds).not.toBeNull();
  expect(labelBounds).not.toBeNull();
  expect(chevronBounds).not.toBeNull();
  expect(labelBounds!.x - iconBounds!.x - iconBounds!.width).toBeLessThan(40);
  expect(chevronBounds!.x).toBeGreaterThan(buttonBounds!.x + buttonBounds!.width * 0.75);
  await searchFilters.fill('prior');
  await expect(picker.getByRole('menuitem', { name: 'Priority', exact: true })).toBeVisible();
  await expect(picker.getByRole('menuitem', { name: 'Status', exact: true })).toHaveCount(0);

  await searchFilters.fill('no matching category');
  await expect(page.getByText('No matching filters')).toBeVisible();

  await searchFilters.fill('status');
  await page.getByRole('menuitem', { name: 'Status', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Filter status' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Search filters' })).toBeVisible();
  const searchOptions = page.getByRole('textbox', { name: 'Search filter options' });
  await searchOptions.fill('in progress');
  const inProgress = page
    .getByRole('group', { name: 'Filter status' })
    .getByRole('button', { name: 'In Progress' });
  await expect(inProgress).toBeVisible();
  await expect(inProgress.locator('svg')).toHaveCount(1);
  await expect(
    page.getByRole('group', { name: 'Filter status' }).getByRole('button', { name: 'Backlog' }),
  ).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('textbox', { name: 'Search filters' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Status', exact: true })).toBeVisible();
  await page.getByRole('menuitem', { name: 'Status', exact: true }).hover();
  await expect(page.getByRole('group', { name: 'Filter status' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('group', { name: 'Filter status' })).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Add filter' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
});

test('status filters match any selected workflow state and save into a view', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const titles = {
    backlog: `Multi status backlog ${stamp}`,
    inProgress: `Multi status in progress ${stamp}`,
    todo: `Multi status todo ${stamp}`,
  };
  for (const [title, status] of [
    [titles.backlog, 'backlog'],
    [titles.inProgress, 'in_progress'],
    [titles.todo, 'todo'],
  ] as const) {
    const response = await request.post('/api/issues', { data: { title, status } });
    expect(response.ok()).toBeTruthy();
  }

  await page.goto('/issues');
  await fillIssueSearch(page, String(stamp));
  await page.getByRole('button', { name: 'Add filter', exact: true }).click();
  const searchFilters = page.getByRole('textbox', { name: 'Search filters' });
  await searchFilters.fill('status');
  await page.getByRole('menuitem', { name: 'Status', exact: true }).click();
  const statusOptions = page.getByRole('group', { name: 'Filter status' });
  await statusOptions.getByRole('button', { name: 'Backlog', exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('status')).toBe('backlog');
  await expect.poll(() => new URL(page.url()).searchParams.get('statuses')).toBeNull();
  await statusOptions.getByRole('button', { name: 'In Progress', exact: true }).click();

  await expect
    .poll(() => JSON.parse(new URL(page.url()).searchParams.get('statuses') ?? '[]'))
    .toEqual(['backlog', 'in_progress']);
  const issueList = page.getByRole('listbox', { name: 'Issues' });
  await expect(issueList.getByRole('option', { name: new RegExp(titles.backlog) })).toBeVisible();
  await expect(
    issueList.getByRole('option', { name: new RegExp(titles.inProgress) }),
  ).toBeVisible();
  await expect(issueList.getByRole('option', { name: new RegExp(titles.todo) })).toHaveCount(0);

  const viewName = `Multi status view ${stamp}`;
  await createIssueView(page, viewName);
  const slug = viewName.toLowerCase().replaceAll(' ', '-');
  const response = await request.get(`/api/views/${slug}`);
  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toMatchObject({ statuses: ['backlog', 'in_progress'] });
});

test('priority filters match any selected priority and save into a view', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const titles = {
    urgent: `Multi priority urgent ${stamp}`,
    high: `Multi priority high ${stamp}`,
    low: `Multi priority low ${stamp}`,
  };
  for (const [title, priority] of [
    [titles.urgent, 1],
    [titles.high, 2],
    [titles.low, 4],
  ] as const) {
    const response = await request.post('/api/issues', { data: { title, priority } });
    expect(response.ok()).toBeTruthy();
  }

  await page.goto('/issues');
  await fillIssueSearch(page, String(stamp));
  await page.getByRole('button', { name: 'Add filter', exact: true }).click();
  const searchFilters = page.getByRole('textbox', { name: 'Search filters' });
  await searchFilters.fill('priority');
  await page.getByRole('menuitem', { name: 'Priority', exact: true }).click();
  const priorityOptions = page.getByRole('group', { name: 'Filter priority' });
  await priorityOptions.getByRole('button', { name: 'Urgent', exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('priority')).toBe('1');
  await priorityOptions.getByRole('button', { name: 'High', exact: true }).click();

  await expect
    .poll(() => JSON.parse(new URL(page.url()).searchParams.get('priorities') ?? '[]'))
    .toEqual([1, 2]);
  const issueList = page.getByRole('listbox', { name: 'Issues' });
  await expect(issueList.getByRole('option', { name: new RegExp(titles.urgent) })).toBeVisible();
  await expect(issueList.getByRole('option', { name: new RegExp(titles.high) })).toBeVisible();
  await expect(issueList.getByRole('option', { name: new RegExp(titles.low) })).toHaveCount(0);

  const viewName = `Multi priority view ${stamp}`;
  await createIssueView(page, viewName);
  const slug = viewName.toLowerCase().replaceAll(' ', '-');
  const savedView = await request.get(`/api/views/${slug}`);
  expect(savedView.ok()).toBeTruthy();
  expect(await savedView.json()).toMatchObject({ priorities: [1, 2], priority: null });
});

test('estimate filters include no-estimate issues and save the any-of selection', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const titles = {
    none: `No estimate ${stamp}`,
    small: `Estimate one ${stamp}`,
    medium: `Estimate three ${stamp}`,
  };
  for (const data of [
    { title: titles.none },
    { title: titles.small, estimate: 1 },
    { title: titles.medium, estimate: 3 },
  ]) {
    const response = await request.post('/api/issues', { data });
    expect(response.ok()).toBeTruthy();
  }

  await page.goto('/issues');
  await fillIssueSearch(page, String(stamp));
  await page.getByRole('button', { name: 'Add filter', exact: true }).click();
  const searchFilters = page.getByRole('textbox', { name: 'Search filters' });
  await searchFilters.fill('estimate');
  await page.getByRole('menuitem', { name: 'Estimate', exact: true }).click();
  const estimateOptions = page.getByRole('group', { name: 'Filter estimate' });
  await estimateOptions.getByRole('button', { name: 'No estimate', exact: true }).click();
  await estimateOptions.getByRole('button', { name: '1', exact: true }).click();

  await expect.poll(() => new URL(page.url()).searchParams.get('noEstimate')).toBe('true');
  await expect
    .poll(() => JSON.parse(new URL(page.url()).searchParams.get('estimates') ?? '[]'))
    .toEqual([1]);
  const issueList = page.getByRole('listbox', { name: 'Issues' });
  await expect(issueList.getByRole('option', { name: new RegExp(titles.none) })).toBeVisible();
  await expect(issueList.getByRole('option', { name: new RegExp(titles.small) })).toBeVisible();
  await expect(issueList.getByRole('option', { name: new RegExp(titles.medium) })).toHaveCount(0);

  const viewName = `Estimate any-of ${stamp}`;
  await createIssueView(page, viewName);
  const slug = viewName.toLowerCase().replaceAll(' ', '-');
  const savedView = await request.get(`/api/views/${slug}`);
  expect(savedView.ok()).toBeTruthy();
  expect(await savedView.json()).toMatchObject({
    estimates: [1],
    noEstimate: true,
    estimate: null,
  });
});

test('filter picker keeps its scoped editor inside a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/issues');
  await page.getByRole('button', { name: 'Add filter', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Status', exact: true }).click();

  await expect(page.getByRole('group', { name: 'Filter status' })).toBeVisible();
  const picker = page.getByRole('menu').last();
  const bounds = await picker.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);

  await page.keyboard.press('Escape');
  await expect(page.getByRole('textbox', { name: 'Search filters' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Status', exact: true })).toBeVisible();
});

test('advanced issue filters combine nested conditions and survive reload', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const statusTitle = `Advanced status ${stamp}`;
  const priorityTitle = `Advanced priority dashboard ${stamp}`;
  const noMatchTitle = `Advanced no match ${stamp}`;
  for (const [title, status, priority] of [
    [statusTitle, 'in_progress', 2],
    [priorityTitle, 'todo', 0],
    [noMatchTitle, 'todo', 4],
  ] as const) {
    const response = await request.post('/api/issues', {
      data: { title, status, priority },
    });
    expect(response.ok()).toBeTruthy();
  }

  await page.goto('/issues');
  await fillIssueSearch(page, String(stamp));
  await page.getByRole('button', { name: 'Add filter' }).click();
  await page.getByRole('menuitem', { name: 'Advanced filter', exact: true }).click();
  const builder = page.locator('#issue-advanced-filter-builder');
  const root = builder.locator('[aria-label="Filter group 1"]');
  await root.getByText('Any', { exact: true }).click();
  await root.getByRole('button', { name: 'Add condition' }).click();
  await root.getByRole('combobox', { name: 'Group 1 condition 1 field' }).click();
  await root.getByRole('option', { name: 'Status', exact: true }).click();
  await root.getByRole('combobox', { name: 'Group 1 condition 1 value' }).click();
  await root.getByRole('option', { name: 'In Progress', exact: true }).click();

  await root.getByRole('button', { name: 'Add filter group' }).click();
  const nested = builder.locator('[aria-label="Filter group 1.2"]');
  await nested.getByRole('button', { name: 'Add condition' }).click();
  await nested.getByRole('combobox', { name: 'Group 1.2 condition 1 field' }).click();
  await nested.getByRole('option', { name: 'Priority', exact: true }).click();
  await nested.getByRole('combobox', { name: 'Group 1.2 condition 1 value' }).click();
  await nested.getByRole('option', { name: 'No priority', exact: true }).click();
  await nested.getByRole('button', { name: 'Add condition' }).click();
  await nested.getByRole('combobox', { name: 'Group 1.2 condition 2 field' }).click();
  await page.getByRole('option', { name: 'Title', exact: true }).click();
  await nested.getByRole('textbox', { name: 'Group 1.2 condition 2 value' }).fill('dashboard');

  const issueList = page.getByRole('listbox', { name: 'Issues' });
  await expect(issueList.getByRole('option', { name: new RegExp(statusTitle) })).toBeVisible();
  await expect(issueList.getByRole('option', { name: new RegExp(priorityTitle) })).toBeVisible();
  await expect(issueList.getByRole('option', { name: new RegExp(noMatchTitle) })).toHaveCount(0);
  await expect
    .poll(() => new URL(page.url()).searchParams.get('advancedFilterGroup'))
    .not.toBeNull();
  await page.reload();
  await fillIssueSearch(page, String(stamp));
  await expect(issueList.getByRole('option', { name: new RegExp(statusTitle) })).toBeVisible();
  await expect(issueList.getByRole('option', { name: new RegExp(priorityTitle) })).toBeVisible();
  await expect(issueList.getByRole('option', { name: new RegExp(noMatchTitle) })).toHaveCount(0);

  const viewName = `Advanced view ${stamp}`;
  const slug = viewName.toLowerCase().replaceAll(' ', '-');
  await page.getByRole('button', { name: 'Add new view', exact: true }).click();
  await page.getByRole('textbox', { name: 'View name', exact: true }).fill(viewName);
  await page.getByRole('button', { name: 'Create view', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/views/${slug}$`));
  const savedView = await request.get(`/api/views/${slug}`);
  expect(savedView.ok()).toBeTruthy();
  expect(await savedView.json()).toMatchObject({
    advancedFilter: true,
    advancedFilterGroup: {
      kind: 'group',
      operator: 'or',
      children: [
        { kind: 'condition', field: 'status', operator: 'is', value: 'in_progress' },
        {
          kind: 'group',
          operator: 'and',
          children: [
            { kind: 'condition', field: 'priority', operator: 'is', value: '0' },
            { kind: 'condition', field: 'title', operator: 'contains', value: 'dashboard' },
          ],
        },
      ],
    },
  });
  await fillIssueSearch(page, String(stamp));
  const savedIssues = page.getByRole('listbox', { name: 'Issues' });
  await expect(savedIssues.getByRole('option', { name: new RegExp(statusTitle) })).toBeVisible();
  await expect(savedIssues.getByRole('option', { name: new RegExp(priorityTitle) })).toBeVisible();
  await expect(savedIssues.getByRole('option', { name: new RegExp(noMatchTitle) })).toHaveCount(0);
  await page.reload();
  await fillIssueSearch(page, String(stamp));
  await expect(savedIssues.getByRole('option', { name: new RegExp(statusTitle) })).toBeVisible();
  await expect(savedIssues.getByRole('option', { name: new RegExp(priorityTitle) })).toBeVisible();
  await expect(savedIssues.getByRole('option', { name: new RegExp(noMatchTitle) })).toHaveCount(0);
});

test('advanced issue filters compare dates and search issue content', async ({ page, request }) => {
  const stamp = Date.now();
  const matchingTitle = `Date content match ${stamp}`;
  const contentMismatchTitle = `Date content mismatch ${stamp}`;
  const dateMismatchTitle = `Date mismatch ${stamp}`;
  for (const issue of [
    {
      title: matchingTitle,
      body: `Contains advanced filter token ${stamp}`,
      dueDate: '2026-10-01',
    },
    {
      title: contentMismatchTitle,
      body: 'Different description',
      dueDate: '2026-10-02',
    },
    {
      title: dateMismatchTitle,
      body: `Contains advanced filter token ${stamp}`,
      dueDate: '2026-08-31',
    },
  ]) {
    const response = await request.post('/api/issues', {
      data: { ...issue, status: 'todo', priority: 2 },
    });
    expect(response.ok()).toBeTruthy();
  }

  await page.goto('/issues');
  await page.getByRole('button', { name: 'Add filter' }).click();
  await page.getByRole('menuitem', { name: 'Advanced filter', exact: true }).click();
  const root = page.locator('#issue-advanced-filter-builder [aria-label="Filter group 1"]');
  await root.getByRole('button', { name: 'Add condition' }).click();
  await root.getByRole('combobox', { name: 'Group 1 condition 1 field' }).click();
  await page.getByRole('option', { name: 'Due date', exact: true }).click();
  await root.getByRole('combobox', { name: 'Group 1 condition 1 operator' }).click();
  await page.getByRole('option', { name: 'is after', exact: true }).click();
  await root.getByRole('textbox', { name: 'Group 1 condition 1 value' }).fill('2026-09-01');

  await root.getByRole('button', { name: 'Add condition' }).click();
  await root.getByRole('combobox', { name: 'Group 1 condition 2 field' }).click();
  await page.getByRole('option', { name: 'Content', exact: true }).click();
  await root
    .getByRole('textbox', { name: 'Group 1 condition 2 value' })
    .fill(`advanced filter token ${stamp}`);

  const issueList = page.getByRole('listbox', { name: 'Issues' });
  await expect(issueList.getByRole('option', { name: new RegExp(matchingTitle) })).toBeVisible();
  await expect(
    issueList.getByRole('option', { name: new RegExp(contentMismatchTitle) }),
  ).toHaveCount(0);
  await expect(issueList.getByRole('option', { name: new RegExp(dateMismatchTitle) })).toHaveCount(
    0,
  );
  await expect
    .poll(() => new URL(page.url()).searchParams.get('advancedFilterGroup'))
    .not.toBeNull();
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
  expect(panelBounds!.width).toBeGreaterThanOrEqual(400);
  expect(panelBounds!.width).toBeLessThanOrEqual(430);
  const facetTab = (name: string) => details.getByRole('tab', { name, exact: true });
  await facetTab('Priority').click();
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

  await facetTab('Labels').click();
  const labelFacet = details.getByRole('button', { name: `${labelName}, 1 issue` });
  await expect(labelFacet).toBeVisible();
  await labelFacet.click();
  await expect.poll(() => new URL(page.url()).searchParams.get('labels')).toBe(labelName);
  await expect(issues.getByRole('option', { name: new RegExp(highTitle) })).toBeVisible();

  await facetTab('Projects').click();
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
  await expect(teamNavigation.getByRole('link', { name: 'Views', exact: true })).toBeVisible();
  await expect(teamNavigation.getByRole('link', { name: 'Initiatives', exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByRole('navigation', { name: 'Saved views' })).toBeVisible();
  await expandMoreNavigation(page);
  await expect(
    page.getByRole('navigation', { name: 'More' }).getByRole('link', { name: 'Board' }),
  ).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'More' }).getByRole('link', { name: 'Initiatives' }),
  ).toBeVisible();
  await teamNavigation.getByRole('button', { name: 'Your teams' }).click();
  await expect(teamNavigation.getByRole('link', { name: 'Cycles' })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Saved views' })).toHaveCount(0);
  await teamNavigation.getByRole('button', { name: 'Your teams' }).click();
  await expect(teamNavigation.getByRole('link', { name: 'Cycles' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Issues', level: 2 })).toBeAttached();
  await expect(page.getByRole('tablist', { name: 'Issue views' })).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('heading', { name: 'Issues' }),
  ).toBeVisible();
  await expect(page.getByRole('tab', { name: 'All issues' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('tab', { name: 'Archived' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Search' }).first()).toBeVisible();
  const allIssuesTab = page.getByRole('tab', { name: 'All issues' });
  const backlogTab = page.getByRole('tab', { name: 'Backlog' });
  const tabRadius = await allIssuesTab.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).borderTopLeftRadius),
  );
  expect(tabRadius).toBeGreaterThan(4);
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
  const priority = page.getByRole('dialog').getByRole('combobox', { name: 'Priority' });
  await priority.click();
  await page.getByRole('option', { name: 'No priority' }).click();
  await title.press('ControlOrMeta+Enter');
  await expect(page).toHaveURL(/\/issues\/[A-Z]+-\d+/);
  await expect(page.locator('input[aria-label="Issue title"]')).toHaveValue(createdIssueTitle);
  const issueOptions = page.getByRole('button', { name: 'Issue options', exact: true });
  await expect(issueOptions).toBeVisible();
  await expect(page.getByRole('listbox', { name: 'Issues' })).toHaveCount(0);

  await issueOptions.click();
  const backToIssues = page.getByRole('menuitem', { name: 'Back to issues', exact: true });
  await expect(backToIssues).toBeVisible();
  await backToIssues.click();
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
  await page.getByRole('button', { name: 'Create new issue in High group' }).click();

  const dialog = page.getByRole('dialog', { name: 'Create issue' });
  const title = dialog.getByPlaceholder('Issue title');
  await expect(dialog.getByRole('combobox', { name: 'Priority' })).toHaveValue('High');
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

test('status group quick-create inherits the group status', async ({ page, request }) => {
  const stamp = Date.now();
  const seed = await request.post('/api/issues', {
    data: { title: `Todo group seed ${stamp}`, status: 'todo', priority: 2 },
  });
  expect(seed.ok()).toBeTruthy();

  await page.goto('/issues');
  await fillIssueSearch(page, stamp.toString());
  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByLabel('Grouping', { exact: true }).selectOption('status');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Create new issue in Todo group' }).click();

  const dialog = page.getByRole('dialog', { name: 'Create issue' });
  await expect(dialog.getByRole('combobox', { name: 'Status' })).toHaveValue('Todo');
  const title = dialog.getByPlaceholder('Issue title');
  await title.fill(`Created from todo group ${stamp}`);
  await title.press('ControlOrMeta+Enter');
  await expect(page).toHaveURL(/\/issues\/[A-Z]+-\d+/);

  const identifier = new URL(page.url()).pathname.match(/\/issues\/([^/]+)/)?.[1];
  expect(identifier).toBeTruthy();
  const created = await request.get(`/api/issues/${identifier}`);
  expect(created.ok()).toBeTruthy();
  expect(await created.json()).toMatchObject({
    title: `Created from todo group ${stamp}`,
    status: 'todo',
    workflowStatus: 'todo',
  });
});

test('cycle group quick-create inherits the group cycle', async ({ page, request }) => {
  const now = Date.now();
  const cycleResponse = await request.post('/api/cycles', {
    data: {
      startsAt: new Date(now + 7 * 86_400_000).toISOString(),
      endsAt: new Date(now + 14 * 86_400_000).toISOString(),
      status: 'upcoming',
    },
  });
  expect(cycleResponse.ok()).toBeTruthy();
  const cycle = (await cycleResponse.json()) as { id: number; number: number };
  const stamp = Date.now();
  const seed = await request.post('/api/issues', {
    data: { title: `Cycle group seed ${stamp}`, status: 'todo', cycleId: cycle.id },
  });
  expect(seed.ok()).toBeTruthy();

  await page.goto('/issues');
  await fillIssueSearch(page, stamp.toString());
  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByLabel('Grouping', { exact: true }).selectOption('cycle');
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: `Create new issue in Cycle ${cycle.number} group` })
    .click();

  const dialog = page.getByRole('dialog', { name: 'Create issue' });
  await expect(dialog.getByRole('combobox', { name: 'Add to cycle' })).toHaveValue(
    `Cycle ${cycle.number}`,
  );
  const title = dialog.getByPlaceholder('Issue title');
  await title.fill(`Created from cycle group ${stamp}`);
  await title.press('ControlOrMeta+Enter');
  await expect(page).toHaveURL(/\/issues\/[A-Z]+-\d+/);

  const identifier = new URL(page.url()).pathname.match(/\/issues\/([^/]+)/)?.[1];
  expect(identifier).toBeTruthy();
  const created = await request.get(`/api/issues/${identifier}`);
  expect(created.ok()).toBeTruthy();
  expect(await created.json()).toMatchObject({
    title: `Created from cycle group ${stamp}`,
    cycleId: cycle.id,
  });
});

test('parent group quick-create creates a sub-issue under that parent', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const parentResponse = await request.post('/api/issues', {
    data: { title: `Parent group ${stamp}`, status: 'todo' },
  });
  expect(parentResponse.ok()).toBeTruthy();
  const parent = (await parentResponse.json()) as { id: number; identifier: string };
  const childResponse = await request.post('/api/issues', {
    data: { title: `Child seed ${stamp}`, status: 'todo', parentId: parent.id },
  });
  expect(childResponse.ok()).toBeTruthy();

  await page.goto('/issues');
  await fillIssueSearch(page, stamp.toString());
  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByLabel('Grouping', { exact: true }).selectOption('parent');
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: `Create new issue in ${parent.identifier} group` })
    .click();

  const dialog = page.getByRole('dialog', { name: 'Create issue' });
  await expect(dialog.getByRole('combobox', { name: 'Parent', exact: true })).toHaveValue(
    parent.identifier,
  );
  const title = dialog.getByPlaceholder('Issue title');
  await title.fill(`Created from parent group ${stamp}`);
  await title.press('ControlOrMeta+Enter');
  await expect(page).toHaveURL(/\/issues\/[A-Z]+-\d+/);

  const identifier = new URL(page.url()).pathname.match(/\/issues\/([^/]+)/)?.[1];
  expect(identifier).toBeTruthy();
  const created = await request.get(`/api/issues/${identifier}`);
  expect(created.ok()).toBeTruthy();
  expect(await created.json()).toMatchObject({
    title: `Created from parent group ${stamp}`,
    parentId: parent.id,
    parentIdentifier: parent.identifier,
  });
});
