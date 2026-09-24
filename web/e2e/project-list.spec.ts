import { expect, test, type Page } from '@playwright/test';

async function openProjectFilterPopover(page: Page) {
  const statusFilter = page.getByRole('combobox', { name: 'Project status' });
  if (!(await statusFilter.isVisible())) {
    await page.getByRole('button', { name: 'Add filter' }).click();
  }
  await expect(statusFilter).toBeVisible();
}

async function clearProjectFilters(page: Page) {
  const clearButton = page.getByRole('button', { name: 'Clear all filters' });
  if (!(await clearButton.isVisible())) await openProjectFilterPopover(page);
  const openOption = page.getByRole('option').first();
  if (await openOption.isVisible()) await page.keyboard.press('Escape');
  await expect(clearButton).toBeVisible();
  await clearButton.click();
}

test('project list filters, search, grouping, and ordering persist in the URL', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const plannedName = `Alpha plan ${stamp}`;
  const startedName = `Beta build ${stamp}`;
  const completedName = `Gamma shipped ${stamp}`;
  const plannedSlug = `alpha-plan-${stamp}`;
  const startedSlug = `beta-build-${stamp}`;
  const completedSlug = `gamma-shipped-${stamp}`;
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() + 1, 1);
  const targetDate = new Date(startDate);
  targetDate.setMonth(targetDate.getMonth() + 2, 1);
  const localDateKey = (value: Date) =>
    `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  const timelineStart = localDateKey(startDate);
  const timelineTarget = localDateKey(targetDate);
  const planned = await request.post('/api/projects', {
    data: {
      name: plannedName,
      slug: plannedSlug,
      status: 'planned',
      priority: 4,
      labels: ['Bug'],
      description: `Summary for ${plannedName}`,
    },
  });
  const started = await request.post('/api/projects', {
    data: {
      name: startedName,
      slug: startedSlug,
      status: 'started',
      priority: 1,
      startDate: timelineStart,
      targetDate: timelineTarget,
    },
  });
  const completed = await request.post('/api/projects', {
    data: {
      name: completedName,
      slug: completedSlug,
      status: 'completed',
      priority: 2,
      labels: ['Bug'],
    },
  });
  expect(planned.ok() && started.ok() && completed.ok()).toBeTruthy();
  const milestone = await request.post(`/api/projects/${plannedSlug}/milestones`, {
    data: { name: `Release marker ${stamp}` },
  });
  const dependency = await request.post(`/api/projects/${plannedSlug}/dependencies`, {
    data: { projectSlug: startedSlug, kind: 'blocks' },
  });
  expect(milestone.ok() && dependency.ok()).toBeTruthy();

  await page.goto('/projects');
  const search = page.getByRole('textbox', { name: 'Search projects' });
  await search.fill('Beta build');
  await expect(page.getByRole('link', { name: new RegExp(startedName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(plannedName) })).toHaveCount(0);
  await page.reload();
  await expect(search).toHaveValue('Beta build');

  await search.fill('');
  await openProjectFilterPopover(page);
  const statusFilter = page.getByRole('combobox', { name: 'Project status' });
  await statusFilter.fill('In progress');
  await page.getByRole('option', { name: 'In progress', exact: true }).click();
  await expect(page.getByRole('link', { name: new RegExp(startedName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(plannedName) })).toHaveCount(0);
  await expect.poll(() => new URL(page.url()).searchParams.get('status')).toBe('["started"]');
  await page.reload();
  await expect(page.getByRole('link', { name: new RegExp(startedName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(plannedName) })).toHaveCount(0);

  await clearProjectFilters(page);
  await openProjectFilterPopover(page);
  const labelFilter = page.getByRole('combobox', { name: 'Project labels' });
  await labelFilter.fill('Bug');
  await page.getByRole('option', { name: 'Bug', exact: true }).click();
  await expect(page.getByRole('link', { name: new RegExp(plannedName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(completedName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(startedName) })).toHaveCount(0);
  await clearProjectFilters(page);

  await openProjectFilterPopover(page);
  const milestoneFilter = page.getByRole('combobox', { name: 'Project milestones' });
  await milestoneFilter.fill(`Release marker ${stamp}`);
  await page.getByRole('option', { name: `Release marker ${stamp}`, exact: true }).click();
  await expect(page.getByRole('link', { name: new RegExp(plannedName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(startedName) })).toHaveCount(0);
  await clearProjectFilters(page);

  await openProjectFilterPopover(page);
  const relationFilter = page.getByRole('combobox', { name: 'Project relations' });
  await relationFilter.fill('Blocks');
  await page.getByRole('option', { name: 'Blocks', exact: true }).click();
  await expect(page.getByRole('link', { name: new RegExp(plannedName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(completedName) })).toHaveCount(0);
  await clearProjectFilters(page);

  await page.getByRole('button', { name: 'Add filter' }).click();
  await page.getByRole('combobox', { name: 'Project date field' }).click();
  await page.getByRole('option', { name: 'Target date', exact: true }).click();
  await page.getByLabel('Date from').fill(timelineTarget);
  await page.getByLabel('Date to').fill(timelineTarget);
  await expect(page.getByRole('link', { name: new RegExp(startedName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(plannedName) })).toHaveCount(0);
  await page.getByRole('button', { name: 'Add filter' }).click();
  await page.getByRole('button', { name: 'Clear all filters' }).click();

  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByRole('combobox', { name: 'Show closed projects' }).click();
  await page.getByRole('option', { name: 'Closed', exact: true }).click();
  await expect(page.getByRole('link', { name: new RegExp(completedName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(startedName) })).toHaveCount(0);
  await expect(page.getByRole('link', { name: new RegExp(plannedName) })).toHaveCount(0);
  await expect(page).toHaveURL(/closed=closed/);
  await page.reload();
  await expect(page.getByRole('link', { name: new RegExp(completedName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(plannedName) })).toHaveCount(0);

  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByRole('combobox', { name: 'Show closed projects' }).click();
  await page.getByRole('option', { name: 'All', exact: true }).click();
  await page.getByRole('combobox', { name: 'Grouping' }).click();
  await page.getByRole('option', { name: 'Status', exact: true }).click();
  await expect(page.getByRole('region', { name: 'In progress' })).toContainText(startedName);
  await expect(page.getByRole('region', { name: 'Planned' })).toContainText(plannedName);
  await expect(page.getByRole('region', { name: 'Completed' })).toContainText(completedName);

  await page.getByRole('combobox', { name: 'Grouping' }).click();
  await page.getByRole('option', { name: 'No grouping' }).click();
  await page.getByRole('combobox', { name: 'Ordering' }).click();
  await page.getByRole('option', { name: 'Priority', exact: true }).click();
  await page.getByRole('button', { name: 'Display options' }).click();
  const orderedRows = page.locator(
    `a[href="/projects/${startedSlug}"], a[href="/projects/${plannedSlug}"], a[href="/projects/${completedSlug}"]`,
  );
  await expect(orderedRows.first()).toHaveAttribute('href', `/projects/${startedSlug}`);

  await page.getByRole('button', { name: 'Display options' }).click();
  const summaryProperty = page.getByRole('checkbox', { name: 'Summary' });
  await summaryProperty.check();
  await expect(page.getByRole('link', { name: new RegExp(plannedName) })).toContainText(
    `Summary for ${plannedName}`,
  );
  await expect(page).toHaveURL(/displayProperties=/);
  await page.reload();
  await page.getByRole('button', { name: 'Display options' }).click();
  await expect(summaryProperty).toBeChecked();
  await page.getByRole('button', { name: 'Display options' }).click();

  await page.getByRole('button', { name: 'Board', exact: true }).click();
  await expect(page).toHaveURL(/view=board/);
  await expect(page.getByRole('grid', { name: 'Project board' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Planned' })).toBeVisible();
  await expect(page.getByRole('gridcell', { name: 'Planned' })).toContainText(plannedName);

  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByRole('combobox', { name: 'Columns' }).click();
  await page.getByRole('option', { name: 'Priority', exact: true }).click();
  await expect(page.getByRole('columnheader', { name: 'Urgent' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Rows' }).click();
  await page.getByRole('option', { name: 'Status', exact: true }).click();
  await expect(page.getByRole('rowheader', { name: 'In progress' })).toBeVisible();
  await expect(page.getByRole('gridcell', { name: 'Urgent · In progress' })).toContainText(
    startedName,
  );
  await page.getByRole('switch', { name: 'Show empty columns' }).uncheck();
  await expect(page).toHaveURL(/columnsBy=priority/);
  await expect(page).toHaveURL(/rowsBy=status/);
  await expect(page).toHaveURL(/showEmptyColumns=false/);
  await page.reload();
  await expect(page.getByRole('gridcell', { name: 'Urgent · In progress' })).toContainText(
    startedName,
  );

  await page.getByRole('button', { name: 'Timeline', exact: true }).click();
  await expect(page).toHaveURL(/view=timeline/);
  await expect(page.getByRole('region', { name: 'Project timeline' })).toBeVisible();
  await expect(page.getByRole('link', { name: `Open ${startedName}` })).toBeVisible();
  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByRole('switch', { name: 'Show week numbers' }).check();
  await page.getByRole('switch', { name: 'Show project list' }).uncheck();
  await expect(page).toHaveURL(/showProjectList=false/);
  await expect(page).toHaveURL(/showWeekNumbers=true/);
  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByRole('button', { name: 'Next period' }).click();
  await expect(page).toHaveURL(/timelineStart=/);
  await page.getByRole('button', { name: 'Today' }).click();
  await expect(page).not.toHaveURL(/timelineStart=/);
});

test('personal project views can be created, updated, reopened, and deleted', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const plannedName = `Planning ${stamp}`;
  const startedName = `Building ${stamp}`;
  const planned = await request.post('/api/projects', {
    data: { name: plannedName, slug: `planning-${stamp}`, status: 'planned' },
  });
  const started = await request.post('/api/projects', {
    data: { name: startedName, slug: `building-${stamp}`, status: 'started' },
  });
  expect(planned.ok() && started.ok()).toBeTruthy();

  await page.goto('/projects');
  await page.getByRole('button', { name: 'Add filter' }).click();
  const statusFilter = page.getByRole('combobox', { name: 'Project status' });
  await statusFilter.fill('In progress');
  await page.getByRole('option', { name: 'In progress', exact: true }).click();
  await expect(page.getByRole('link', { name: new RegExp(startedName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(plannedName) })).toHaveCount(0);

  await page.getByRole('button', { name: 'Add new view' }).click();
  await page.getByRole('textbox', { name: 'View name' }).fill(`In progress ${stamp}`);
  await page.getByRole('textbox', { name: 'Description' }).fill('Projects currently being built');
  await page.getByRole('button', { name: 'Create project view' }).click();

  const savedView = page.getByRole('tab', { name: `In progress ${stamp}` });
  await expect(savedView).toHaveAttribute('aria-selected', 'true');
  await expect(page).toHaveURL(/projectView=in-progress-/);
  await page.getByRole('tab', { name: 'All projects' }).click();
  await expect(page.getByRole('link', { name: new RegExp(plannedName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(startedName) })).toBeVisible();

  await savedView.click();
  await expect(page.getByRole('link', { name: new RegExp(startedName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(plannedName) })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('tab', { name: `In progress ${stamp}` })).toHaveAttribute(
    'aria-selected',
    'true',
  );

  await page.getByRole('textbox', { name: 'Search projects' }).fill(startedName);
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.getByRole('tab', { name: 'All projects' }).click();
  await page.getByRole('tab', { name: `In progress ${stamp}` }).click();
  await expect(page.getByRole('textbox', { name: 'Search projects' })).toHaveValue(startedName);
  await expect(page.getByRole('link', { name: new RegExp(startedName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(plannedName) })).toHaveCount(0);

  await page.getByRole('button', { name: 'Delete view' }).click();
  await expect(page.getByRole('tab', { name: `In progress ${stamp}` })).toHaveCount(0);
  await expect(page).not.toHaveURL(/projectView=/);
  await expect(page.getByRole('link', { name: new RegExp(plannedName) })).toBeVisible();
  const storedViews = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('kotowari.project-views.v1') ?? '[]'),
  );
  expect(storedViews).toEqual([]);
});

test('project health can be edited, filtered, and displayed in project views', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const projects = [
    { name: `Steady ${stamp}`, slug: `steady-${stamp}`, health: 'on_track' },
    { name: `At risk ${stamp}`, slug: `at-risk-${stamp}`, health: 'at_risk' },
    { name: `Blocked ${stamp}`, slug: `blocked-${stamp}`, health: 'off_track' },
  ];
  for (const project of projects) {
    const created = await request.post('/api/projects', {
      data: { name: project.name, slug: project.slug, status: 'started' },
    });
    expect(created.ok()).toBeTruthy();
    const updated = await request.patch(`/api/projects/${project.slug}`, {
      data: { health: project.health },
    });
    expect(updated.ok()).toBeTruthy();
  }

  await page.goto('/projects');
  await page.getByRole('button', { name: 'Add filter' }).click();
  const healthFilter = page.getByRole('combobox', { name: 'Project health' });
  await healthFilter.fill('At risk');
  await page.getByRole('option', { name: 'At risk', exact: true }).click();
  await expect(page.getByRole('link', { name: new RegExp(projects[1].name) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(projects[0].name) })).toHaveCount(0);
  await expect(page.getByRole('link', { name: new RegExp(projects[2].name) })).toHaveCount(0);
  await expect.poll(() => new URL(page.url()).searchParams.get('health')).toBe('["at_risk"]');

  await clearProjectFilters(page);
  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByRole('checkbox', { name: 'Health' }).check();
  await expect(page.getByRole('link', { name: new RegExp(projects[0].name) })).toContainText(
    'On track',
  );
  await expect(page.getByRole('link', { name: new RegExp(projects[1].name) })).toContainText(
    'At risk',
  );
  await page.getByRole('button', { name: 'Display options' }).click();

  await page.getByRole('button', { name: 'Board', exact: true }).click();
  await expect(page.getByRole('gridcell', { name: 'In progress' })).toContainText('On track');
  await page.getByRole('button', { name: 'Timeline', exact: true }).click();
  await expect(page.getByRole('rowheader').filter({ hasText: projects[1].name })).toContainText(
    'At risk',
  );

  await page.getByRole('link', { name: new RegExp(projects[2].name) }).click();
  const healthSelect = page.getByRole('combobox', { name: 'Health' });
  await healthSelect.selectOption('on_track');
  await expect
    .poll(async () => {
      const response = await request.get(`/api/projects/${projects[2].slug}`);
      const project = await response.json();
      return project.health;
    })
    .toBe('on_track');
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Health' })).toHaveValue('on_track');
});
