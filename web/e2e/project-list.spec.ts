import { expect, test, type Page } from '@playwright/test';

async function openProjectFilter(page: Page, category: string, controlName: string) {
  const control = page.getByRole('combobox', { name: controlName });
  if (!(await control.isVisible())) {
    const filterSearch = page.getByRole('textbox', { name: 'Add Filter…' });
    if (!(await filterSearch.isVisible())) {
      await page.getByRole('button', { name: 'Add filter' }).click();
    } else {
      const allFilters = page.getByRole('button', { name: 'All filters' });
      if (await allFilters.isVisible()) await allFilters.click();
    }
    const categoryButton = page.getByRole('button', { name: category, exact: true });
    await expect(categoryButton).toBeVisible();
    await categoryButton.click();
  }
  await expect(control).toBeVisible();
  return control;
}

async function clearProjectFilters(page: Page) {
  const clearButton = page.getByRole('button', { name: 'Clear all filters' });
  if (!(await clearButton.isVisible())) {
    const allFilters = page.getByRole('button', { name: 'All filters' });
    if (await allFilters.isVisible()) {
      await allFilters.click();
    } else {
      await page.getByRole('button', { name: 'Add filter' }).click();
    }
  }
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
      lead: 'self',
      labels: ['Bug'],
      summary: `Summary for ${plannedName}`,
      description: `Detailed plan for ${plannedName}`,
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
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeHidden();
  await page.getByRole('button', { name: 'Add filter' }).click();
  await page.getByRole('button', { name: 'Title & summary', exact: true }).click();
  const titleSearch = page.getByRole('textbox', { name: 'Title & summary' });
  const titleOperator = page.getByRole('combobox', { name: 'Title & summary operator' });
  await titleSearch.fill(`Summary for ${plannedName}`);
  await expect(page.getByRole('link', { name: new RegExp(plannedName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(startedName) })).toHaveCount(0);
  await expect
    .poll(() => new URL(page.url()).searchParams.get('q'))
    .toBe(`Summary for ${plannedName}`);
  await titleSearch.fill(`Detailed plan for ${plannedName}`);
  await expect(page.getByRole('link', { name: new RegExp(plannedName) })).toHaveCount(0);
  await titleSearch.fill('Beta build');
  await expect(page.getByRole('link', { name: new RegExp(startedName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(plannedName) })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('link', { name: new RegExp(startedName) })).toBeVisible();

  await page.getByRole('button', { name: 'Add filter' }).click();
  await page.getByRole('button', { name: 'Title & summary', exact: true }).click();
  await titleOperator.click();
  await page.getByRole('option', { name: 'does not contain', exact: true }).click();
  await titleSearch.fill('Beta build');
  await expect(page.getByRole('link', { name: new RegExp(startedName) })).toHaveCount(0);
  await expect(page.getByRole('link', { name: new RegExp(plannedName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(completedName) })).toBeVisible();
  await expect.poll(() => new URL(page.url()).searchParams.get('qOperator')).toBe('doesNotContain');
  await page.reload();
  await expect(page.getByRole('link', { name: new RegExp(startedName) })).toHaveCount(0);
  await expect(page.getByRole('link', { name: new RegExp(plannedName) })).toBeVisible();

  await clearProjectFilters(page);
  const statusFilter = await openProjectFilter(page, 'Status', 'Status');
  await statusFilter.fill('In progress');
  await page.getByRole('option', { name: 'In progress', exact: true }).click();
  await expect(page.getByRole('link', { name: new RegExp(startedName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(plannedName) })).toHaveCount(0);
  await expect.poll(() => new URL(page.url()).searchParams.get('status')).toBe('["started"]');
  await page.reload();
  await expect(page.getByRole('link', { name: new RegExp(startedName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(plannedName) })).toHaveCount(0);

  await clearProjectFilters(page);
  const labelFilter = await openProjectFilter(page, 'Labels', 'Labels');
  await labelFilter.fill('Bug');
  await page.getByRole('option', { name: 'Bug', exact: true }).click();
  await expect(page.getByRole('link', { name: new RegExp(plannedName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(completedName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(startedName) })).toHaveCount(0);
  await clearProjectFilters(page);

  const milestoneFilter = await openProjectFilter(page, 'Milestones', 'Project milestones');
  await milestoneFilter.fill(`Release marker ${stamp}`);
  await page.getByRole('option', { name: `Release marker ${stamp}`, exact: true }).click();
  await expect(page.getByRole('link', { name: new RegExp(plannedName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(startedName) })).toHaveCount(0);
  await clearProjectFilters(page);

  const relationFilter = await openProjectFilter(page, 'Relations', 'Project relations');
  await relationFilter.fill('Blocks');
  await page.getByRole('option', { name: 'Blocks', exact: true }).click();
  await expect(page.getByRole('link', { name: new RegExp(plannedName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(completedName) })).toHaveCount(0);
  await clearProjectFilters(page);

  const dateField = await openProjectFilter(page, 'Dates', 'Project date field');
  await dateField.click();
  await page.getByRole('option', { name: 'Target date', exact: true }).click();
  await page.getByLabel('Date from').fill(timelineTarget);
  await page.getByLabel('Date to').fill(timelineTarget);
  await expect(page.getByRole('link', { name: new RegExp(startedName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(plannedName) })).toHaveCount(0);
  await clearProjectFilters(page);

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
  const leadProperty = page.getByRole('checkbox', { name: 'Lead' });
  await summaryProperty.check();
  await leadProperty.check();
  await expect(page.getByRole('link', { name: new RegExp(plannedName) })).toContainText(
    `Summary for ${plannedName}`,
  );
  await expect(
    page.getByRole('link', { name: new RegExp(plannedName) }).getByText('You', { exact: true }),
  ).toHaveCount(1);
  await expect(page).toHaveURL(/displayProperties=/);
  await page.reload();
  await page.getByRole('button', { name: 'Display options' }).click();
  await expect(summaryProperty).toBeChecked();
  await page.getByRole('button', { name: 'Display options' }).click();

  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByRole('tab', { name: 'Board', exact: true }).click();
  await expect(page).toHaveURL(/view=board/);
  await expect(page.getByRole('grid', { name: 'Project board' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Planned' })).toBeVisible();
  await expect(page.getByRole('gridcell', { name: 'Planned' })).toContainText(plannedName);

  await page.keyboard.press('Escape');
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

  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByRole('tab', { name: 'Timeline', exact: true }).click();
  await expect(page).toHaveURL(/view=timeline/);
  await expect(page.getByRole('region', { name: 'Project timeline' })).toBeVisible();
  await expect(page.getByRole('link', { name: `Open ${startedName}` })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByRole('switch', { name: 'Show week numbers' }).check();
  await page.getByRole('switch', { name: 'Show project list' }).uncheck();
  await expect(page).toHaveURL(/showProjectList=false/);
  await expect(page).toHaveURL(/showWeekNumbers=true/);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Next period' }).click();
  await expect(page).toHaveURL(/timelineStart=/);
  await page.getByRole('button', { name: 'Today' }).click();
  await expect(page).not.toHaveURL(/timelineStart=/);
});

test('project list and saved-view previews group by labels, health, and dates', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const labeledName = `Grouped project ${stamp}`;
  const atRiskName = `At risk project ${stamp}`;
  const unassignedName = `Unassigned project ${stamp}`;
  const labeledSlug = `grouped-project-${stamp}`;
  const atRiskSlug = `at-risk-project-${stamp}`;
  const unassignedSlug = `unassigned-project-${stamp}`;
  const labeled = await request.post('/api/projects', {
    data: {
      name: labeledName,
      slug: labeledSlug,
      labels: ['Bug', 'Feature'],
      startDate: '2026-09-14',
      targetDate: '2026-10-14',
    },
  });
  const atRisk = await request.post('/api/projects', {
    data: {
      name: atRiskName,
      slug: atRiskSlug,
      labels: ['Feature'],
      targetDate: '2026-11-14',
    },
  });
  const unassigned = await request.post('/api/projects', {
    data: { name: unassignedName, slug: unassignedSlug },
  });
  expect(labeled.ok() && atRisk.ok() && unassigned.ok()).toBeTruthy();
  const healthUpdates = await Promise.all([
    request.patch(`/api/projects/${labeledSlug}`, { data: { health: 'on_track' } }),
    request.patch(`/api/projects/${atRiskSlug}`, { data: { health: 'at_risk' } }),
  ]);
  expect(healthUpdates.every((response) => response.ok())).toBeTruthy();
  const healthUpdateProjects = await Promise.all(
    healthUpdates.map(
      async (response) => (await response.json()) as { slug: string; healthUpdatedAt?: string },
    ),
  );
  expect(healthUpdateProjects.every((project) => project.healthUpdatedAt)).toBeTruthy();

  await page.goto('/projects?groupBy=labels');
  await expect(page.getByRole('region', { name: 'Bug' })).toContainText(labeledName);
  await expect(page.getByRole('region', { name: 'Feature' })).toContainText(labeledName);
  await expect(page.getByRole('region', { name: 'Feature' })).toContainText(atRiskName);
  await expect(page.getByRole('region', { name: 'No label' })).toContainText(unassignedName);
  await page.reload();
  await expect(page.getByRole('region', { name: 'Bug' })).toContainText(labeledName);

  await page.goto('/projects?groupBy=health');
  await expect(page.getByRole('region', { name: 'On track' })).toContainText(labeledName);
  await expect(page.getByRole('region', { name: 'At risk' })).toContainText(atRiskName);
  await expect(page.getByRole('region', { name: 'No update' })).toContainText(unassignedName);

  await page.goto('/projects?groupBy=startDate');
  const expectedStartDate = await page.evaluate(() =>
    new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(
      new Date('2026-09-14T00:00:00Z'),
    ),
  );
  await expect(page.getByRole('region', { name: expectedStartDate })).toContainText(labeledName);
  await expect(page.getByRole('region', { name: 'No date' })).toContainText(unassignedName);

  await page.goto('/projects?groupBy=targetDate');
  const expectedTargetDate = await page.evaluate(() =>
    new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(
      new Date('2026-10-14T00:00:00Z'),
    ),
  );
  await expect(page.getByRole('region', { name: expectedTargetDate })).toContainText(labeledName);
  await expect(page.getByRole('region', { name: 'No date' })).toContainText(unassignedName);

  await page.goto('/projects');
  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByRole('combobox', { name: 'Ordering' }).click();
  await page.getByRole('option', { name: 'Health updated', exact: true }).click();
  await page.getByRole('button', { name: 'Display options' }).click();
  await expect(page).toHaveURL(/orderBy=healthUpdated/);
  const expectedHealthOrder = [
    ...healthUpdateProjects.map((project) => ({ slug: project.slug, at: project.healthUpdatedAt })),
    { slug: unassignedSlug, at: undefined },
  ].sort((left, right) => {
    if (!left.at || !right.at) {
      if (left.at === right.at) return left.slug.localeCompare(right.slug);
      return left.at ? -1 : 1;
    }
    return left.at.localeCompare(right.at) || left.slug.localeCompare(right.slug);
  });
  const orderedRows = page.locator(
    `a[href="/projects/${labeledSlug}"], a[href="/projects/${atRiskSlug}"], a[href="/projects/${unassignedSlug}"]`,
  );
  await expect(orderedRows).toHaveCount(3);
  for (const [index, project] of expectedHealthOrder.entries()) {
    await expect(orderedRows.nth(index)).toHaveAttribute('href', `/projects/${project.slug}`);
  }
  await page.reload();
  await expect(page).toHaveURL(/orderBy=healthUpdated/);
  await expect(orderedRows.first()).toHaveAttribute(
    'href',
    `/projects/${expectedHealthOrder[0]!.slug}`,
  );

  await page.goto('/views/projects/new?groupBy=health');
  await expect(page.getByText('On track', { exact: true })).toBeVisible();
  await expect(page.getByText('At risk', { exact: true })).toBeVisible();
  await expect(page.getByText('No update', { exact: true })).toBeVisible();
  await expect(page.getByText(labeledName)).toBeVisible();
  await expect(page.getByText(atRiskName)).toBeVisible();
  await expect(page.getByText(unassignedName)).toBeVisible();
});

test('personal project views can be created, updated, reopened, and deleted', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const plannedName = `Planning ${stamp}`;
  const startedName = `Building ${stamp}`;
  const planned = await request.post('/api/projects', {
    data: { name: plannedName, slug: `planning-${stamp}`, status: 'planned', priority: 1 },
  });
  const started = await request.post('/api/projects', {
    data: { name: startedName, slug: `building-${stamp}`, status: 'started', priority: 3 },
  });
  expect(planned.ok() && started.ok()).toBeTruthy();

  await page.goto('/projects');
  await page.getByRole('button', { name: 'Add filter' }).click();
  const statusFilter = page.getByRole('combobox', { name: 'Status' });
  await page.getByRole('button', { name: 'Status', exact: true }).click();
  await statusFilter.fill('In progress');
  await page.getByRole('option', { name: 'In progress', exact: true }).click();
  await expect(page.getByRole('link', { name: new RegExp(startedName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(plannedName) })).toHaveCount(0);

  await page.getByRole('button', { name: 'Add new view' }).click();
  await expect(page).toHaveURL(/\/views\/projects\/new/);
  await expect(page.getByRole('tab', { name: 'Projects' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('button', { name: 'Add filter' }).click();
  await page.getByRole('textbox', { name: 'Add Filter…' }).fill('Show closed projects');
  await expect(page.getByText('No matching filters')).toBeVisible();
  await page.getByRole('textbox', { name: 'Add Filter…' }).fill('Priority');
  await page.getByRole('button', { name: 'Priority', exact: true }).click();
  const builderPriorityFilter = page.getByRole('combobox', { name: 'Priority' });
  await builderPriorityFilter.fill('Medium');
  await page.getByRole('option', { name: 'Medium', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Priority: Medium' })).toBeVisible();
  await page.getByRole('button', { name: 'All filters' }).click();
  await page.getByRole('textbox', { name: 'Add Filter…' }).fill('Specific project');
  await page.getByRole('button', { name: 'Specific project', exact: true }).click();
  const specificProjectFilter = page.getByRole('combobox', { name: 'Specific project' });
  await specificProjectFilter.fill(startedName);
  await page.getByRole('option', { name: startedName, exact: true }).click();
  await expect(
    page.getByRole('button', { name: `Specific project: ${startedName}` }),
  ).toBeVisible();
  const previewProjects = page.locator('[aria-hidden="true"] a[href^="/projects/"]');
  await expect(previewProjects).toHaveCount(1);
  await expect(previewProjects).toHaveAttribute('href', `/projects/building-${stamp}`);
  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByRole('combobox', { name: 'Show closed projects' }).click();
  await page.getByRole('option', { name: 'Open', exact: true }).click();
  await expect(page).toHaveURL(/closed=open/);
  await page.getByRole('tab', { name: 'Board', exact: true }).click();
  await expect(
    page.locator('[aria-hidden="true"] [role="grid"][aria-label="Project board"]'),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Timeline', exact: true }).click();
  await expect(
    page.locator('[aria-hidden="true"] [role="region"][aria-label="Project timeline"]'),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'List', exact: true }).click();
  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByRole('textbox', { name: 'View name' }).fill(`In progress ${stamp}`);
  await page.getByRole('textbox', { name: 'Description' }).fill('Projects currently being built');
  await page.getByRole('button', { name: 'Choose icon' }).click();
  await page.getByRole('button', { name: 'Rocket icon' }).click();
  await page.getByRole('button', { name: 'Create view' }).click();

  const savedView = page.getByRole('tab', { name: `In progress ${stamp}` });
  await expect(savedView).toHaveAttribute('aria-selected', 'true');
  await expect(page).toHaveURL(/projectView=in-progress-/);
  const createdView = await page.evaluate(
    () => JSON.parse(localStorage.getItem('kotowari.project-views.v1') ?? '[]')[0],
  );
  expect(createdView).toMatchObject({
    name: `In progress ${stamp}`,
    description: 'Projects currently being built',
    icon: 'rocket',
  });
  expect(createdView.search.status).toContain('started');
  expect(createdView.search.priority).toContain('3');
  expect(createdView.search.closed).toBe('open');
  expect(createdView.search.specificProject).toBe(`building-${stamp}`);
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

  await page.getByRole('button', { name: 'Add filter' }).click();
  await page.getByRole('button', { name: 'Title & summary', exact: true }).click();
  const viewTitleOperator = page.getByRole('combobox', { name: 'Title & summary operator' });
  await viewTitleOperator.click();
  await page.getByRole('option', { name: 'does not contain', exact: true }).click();
  await page.getByRole('textbox', { name: 'Title & summary' }).fill(plannedName);
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.getByRole('tab', { name: 'All projects' }).click();
  await page.getByRole('tab', { name: `In progress ${stamp}` }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe(plannedName);
  await expect.poll(() => new URL(page.url()).searchParams.get('qOperator')).toBe('doesNotContain');
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

test('advanced project filters can match any selected facet and survive reload', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const statusOnlyName = `Advanced status ${stamp}`;
  const priorityOnlyName = `Advanced priority ${stamp}`;
  const noMatchName = `Advanced no match ${stamp}`;
  const projects = [
    { name: statusOnlyName, slug: `advanced-status-${stamp}`, status: 'started', priority: 4 },
    { name: priorityOnlyName, slug: `advanced-priority-${stamp}`, status: 'planned', priority: 0 },
    { name: noMatchName, slug: `advanced-none-${stamp}`, status: 'planned', priority: 4 },
  ];
  for (const project of projects) {
    const response = await request.post('/api/projects', { data: project });
    expect(response.ok()).toBeTruthy();
  }

  await page.goto('/projects?status=started&priority=%5B%220%22%5D');
  await expect(page.getByRole('link', { name: new RegExp(statusOnlyName) })).toHaveCount(0);
  await expect(page.getByRole('link', { name: new RegExp(priorityOnlyName) })).toHaveCount(0);
  await expect(page.getByRole('link', { name: new RegExp(noMatchName) })).toHaveCount(0);

  await page.getByRole('button', { name: 'Add filter' }).click();
  await page.getByRole('button', { name: 'Advanced filter', exact: true }).click();

  await expect(page.getByRole('link', { name: new RegExp(statusOnlyName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(priorityOnlyName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(noMatchName) })).toHaveCount(0);
  await expect.poll(() => new URL(page.url()).searchParams.get('filterOperator')).toBe('or');
  await page.reload();
  await expect(page.getByRole('link', { name: new RegExp(statusOnlyName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(priorityOnlyName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(noMatchName) })).toHaveCount(0);
  await page.getByRole('button', { name: 'Open advanced filter builder' }).click();
  await expect(page.getByRole('radio', { name: 'Any' })).toBeChecked();
});

test('advanced project filter groups combine nested status and priority rules', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const statusName = `Grouped status ${stamp}`;
  const priorityName = `Grouped priority ${stamp}`;
  const noMatchName = `Grouped no match ${stamp}`;
  for (const project of [
    { name: statusName, slug: `grouped-status-${stamp}`, status: 'started', priority: 4 },
    { name: priorityName, slug: `grouped-priority-${stamp}`, status: 'planned', priority: 0 },
    { name: noMatchName, slug: `grouped-none-${stamp}`, status: 'planned', priority: 4 },
  ]) {
    const response = await request.post('/api/projects', { data: project });
    expect(response.ok()).toBeTruthy();
  }

  await page.goto('/projects');
  await page.getByRole('button', { name: 'Add filter' }).click();
  await page.getByRole('button', { name: 'Advanced filter', exact: true }).click();
  await page.getByRole('button', { name: 'Open advanced filter builder' }).click();

  const builder = page.locator('[aria-label="Advanced filter"]');
  const rootGroup = builder.locator('[aria-label="Filter group 1"]');
  await rootGroup.getByText('Any', { exact: true }).click();
  await rootGroup.getByRole('button', { name: 'Add filter', exact: true }).click();
  await rootGroup.getByRole('combobox', { name: 'Group 1 condition 1 field' }).click();
  await rootGroup.getByRole('option', { name: 'Status', exact: true }).click();
  await rootGroup.getByRole('combobox', { name: 'Group 1 condition 1 value' }).click();
  await rootGroup.getByRole('option', { name: 'In progress', exact: true }).click();

  await rootGroup.getByRole('button', { name: 'Add filter group' }).click();
  const nestedGroup = builder.locator('[aria-label="Filter group 1.2"]');
  await nestedGroup.getByRole('button', { name: 'Add filter', exact: true }).click();
  await nestedGroup.getByRole('combobox', { name: 'Group 1.2 condition 1 field' }).click();
  await nestedGroup.getByRole('option', { name: 'Priority', exact: true }).click();
  await nestedGroup.getByRole('combobox', { name: 'Group 1.2 condition 1 value' }).click();
  await nestedGroup.getByRole('option', { name: 'No priority', exact: true }).click();

  await expect(page.getByRole('link', { name: new RegExp(statusName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(priorityName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(noMatchName) })).toHaveCount(0);
  await expect
    .poll(() => new URL(page.url()).searchParams.get('advancedFilterGroup'))
    .not.toBeNull();
  await page.reload();
  await expect(page.getByRole('link', { name: new RegExp(statusName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(priorityName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(noMatchName) })).toHaveCount(0);
});

test('project view filter menu stays within a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 760, height: 800 });
  await page.goto('/views/projects/new');
  await page.getByRole('button', { name: 'Add filter' }).click();
  const filterMenu = page.getByRole('dialog', { name: 'Add filter' });
  await expect(filterMenu).toBeVisible();
  const bounds = await filterMenu.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(760);
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
  const healthFilter = await openProjectFilter(page, 'Health', 'Project health');
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

  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByRole('tab', { name: 'Board', exact: true }).click();
  await expect(page.getByRole('gridcell', { name: 'In progress' })).toContainText('On track');
  await page.getByRole('tab', { name: 'Timeline', exact: true }).click();
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

test('completion dates are recorded, displayed, and filterable', async ({ page, request }) => {
  const stamp = Date.now();
  const completedName = `Shipped ${stamp}`;
  const openName = `Still building ${stamp}`;
  const created = await request.post('/api/projects', {
    data: { name: completedName, slug: `shipped-${stamp}`, status: 'started' },
  });
  const open = await request.post('/api/projects', {
    data: { name: openName, slug: `still-building-${stamp}`, status: 'started' },
  });
  expect(created.ok() && open.ok()).toBeTruthy();

  const completed = await request.patch(`/api/projects/shipped-${stamp}`, {
    data: { status: 'completed' },
  });
  expect(completed.ok()).toBeTruthy();
  const project = await completed.json();
  expect(project.completedAt).toBeTruthy();
  const completedDate = project.completedAt.slice(0, 10);

  await page.goto('/projects');
  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByRole('checkbox', { name: 'Completed', exact: true }).check();
  await expect(page.getByRole('link', { name: new RegExp(completedName) })).toContainText(
    'Completed',
  );
  await page.getByRole('button', { name: 'Display options' }).click();

  const dateField = await openProjectFilter(page, 'Dates', 'Project date field');
  await dateField.click();
  await page.getByRole('option', { name: 'Completed', exact: true }).click();
  await page.getByLabel('Date from').fill(completedDate);
  await page.getByLabel('Date to').fill(completedDate);
  await expect(page.getByRole('link', { name: new RegExp(completedName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(openName) })).toHaveCount(0);
  await expect(page).toHaveURL(/dateField=completed/);
  await page.reload();
  await expect(page.getByRole('link', { name: new RegExp(completedName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(openName) })).toHaveCount(0);
});

test('project summary is distinct from description through creation and editing', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const name = `Launch plan ${stamp}`;
  const summary = 'Ship the desktop experience';
  const revisedSummary = 'Desktop release is ready';
  const description = 'Detailed rollout notes, validation steps, and follow-up work.';

  await page.goto('/projects');
  await page.getByRole('button', { name: 'New project' }).first().click();
  await page.getByRole('button', { name: 'Choose project icon' }).click();
  await page.getByRole('button', { name: 'Choose Purple icon color' }).click();
  await page.getByRole('button', { name: 'Rocket', exact: true }).click();
  await page.getByLabel('Project name').fill(name);
  await page.getByLabel('Summary').fill(summary);
  await page.getByLabel('Description').fill(description);
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page).toHaveURL(/\/projects\/[^/]+$/);
  const projectSlug = new URL(page.url()).pathname.split('/').pop();
  if (!projectSlug) throw new Error('expected created project route');
  const createdResponse = await request.get(`/api/projects/${projectSlug}`);
  await expect(await createdResponse.json()).toMatchObject({ icon: 'rocket', iconColor: 'purple' });

  const summaryField = page.getByLabel('Project summary');
  const descriptionField = page.getByLabel('Project description');
  await expect(summaryField).toHaveValue(summary);
  await expect(descriptionField).toHaveValue(description);
  await summaryField.fill(revisedSummary);
  await expect(summaryField).toHaveValue(revisedSummary);
  await page.getByRole('button', { name: 'Choose project icon' }).click();
  await page.getByRole('tab', { name: 'Emojis' }).click();
  await page.getByRole('button', { name: 'Package', exact: true }).click();
  await descriptionField.click();
  await expect
    .poll(async () => {
      const response = await request.get(`/api/projects/${projectSlug}`);
      return await response.json();
    })
    .toMatchObject({
      summary: revisedSummary,
      icon: 'emoji:package',
      iconColor: 'purple',
    });
  await page.getByLabel('Project status').selectOption('started');
  await expect(page.getByText('Status changed from Planned to In progress')).toBeVisible();
  await page.getByLabel('Health').selectOption('at_risk');
  await expect(page.getByText('Health changed from No update to At risk')).toBeVisible();
  await page.reload();
  await expect(summaryField).toHaveValue(revisedSummary);
  await expect(descriptionField).toHaveValue(description);
  await expect(page.getByText('Status changed from Planned to In progress')).toBeVisible();
  await expect(page.getByText('Health changed from No update to At risk')).toBeVisible();
});
