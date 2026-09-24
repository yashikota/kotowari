import { expect, test } from '@playwright/test';

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
    data: { name: plannedName, slug: plannedSlug, status: 'planned', priority: 4, labels: ['Bug'] },
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

  await page.goto('/projects');
  const search = page.getByRole('textbox', { name: 'Search projects' });
  await search.fill('Beta build');
  await expect(page.getByRole('link', { name: new RegExp(startedName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(plannedName) })).toHaveCount(0);
  await page.reload();
  await expect(search).toHaveValue('Beta build');

  await search.fill('');
  await page.getByRole('button', { name: 'Add filter' }).click();
  const statusFilter = page.getByRole('combobox', { name: 'Project status' });
  await statusFilter.fill('In progress');
  await page.getByRole('option', { name: 'In progress', exact: true }).click();
  await expect(page.getByRole('link', { name: new RegExp(startedName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(plannedName) })).toHaveCount(0);
  await expect.poll(() => new URL(page.url()).searchParams.get('status')).toBe('["started"]');
  await page.reload();
  await expect(page.getByRole('link', { name: new RegExp(startedName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(plannedName) })).toHaveCount(0);

  await page.getByRole('button', { name: /Add filter/ }).click();
  await page.getByRole('button', { name: 'Clear all filters' }).click();
  await page.getByRole('button', { name: 'Add filter' }).click();
  const labelFilter = page.getByRole('combobox', { name: 'Project labels' });
  await labelFilter.fill('Bug');
  await page.getByRole('option', { name: 'Bug', exact: true }).click();
  await expect(page.getByRole('link', { name: new RegExp(plannedName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(completedName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(startedName) })).toHaveCount(0);
  await page.getByRole('button', { name: /Add filter/ }).click();
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
