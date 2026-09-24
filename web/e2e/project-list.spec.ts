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
  const planned = await request.post('/api/projects', {
    data: { name: plannedName, slug: plannedSlug, status: 'planned', priority: 4, labels: ['Bug'] },
  });
  const started = await request.post('/api/projects', {
    data: { name: startedName, slug: startedSlug, status: 'started', priority: 1 },
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
});
