import { expect, test, type APIResponse } from '@playwright/test';

async function json<T>(response: APIResponse): Promise<T> {
  if (!response.ok()) throw new Error(`${response.status()} ${await response.text()}`);
  return (await response.json()) as T;
}

test('workspace search finds issues, projects and documents with shareable category tabs', async ({
  page,
  request,
}) => {
  const query = `Search${Date.now()}`;
  const issue = await json<{ identifier: string; createdAt: string }>(
    await request.post('/api/issues', {
      data: { title: `${query} issue`, status: 'todo' },
    }),
  );
  const exactIssue = await json<{ identifier: string }>(
    await request.post('/api/issues', {
      data: { title: query, status: 'todo' },
    }),
  );
  const startedIssue = await json<{ identifier: string }>(
    await request.post('/api/issues', {
      data: { title: `${query} started`, status: 'in_progress' },
    }),
  );
  const archivedIssue = await json<{ identifier: string }>(
    await request.post('/api/issues', {
      data: { title: `${query} archived`, status: 'todo' },
    }),
  );
  await request.patch(`/api/issues/${archivedIssue.identifier}`, { data: { archived: true } });
  const project = await json<{ slug: string }>(
    await request.post('/api/projects', {
      data: { name: `${query} project`, slug: `search-${Date.now()}` },
    }),
  );
  const adr = await json<{ identifier: string }>(
    await request.post('/api/adrs', { data: { title: `${query} decision` } }),
  );
  const pageDocument = await json<{ slug: string }>(
    await request.post('/api/pages', {
      data: { title: `${query} guide`, slug: `search-${Date.now()}` },
    }),
  );
  const commentIssue = await json<{ identifier: string }>(
    await request.post('/api/issues', {
      data: { title: 'Issue found from its comment', status: 'todo' },
    }),
  );
  const commentOnlyQuery = `${query}-comment-only`;
  await request.post(`/api/issues/${commentIssue.identifier}/comments`, {
    data: { body: `Searchable note ${commentOnlyQuery}` },
  });

  await page.goto('/issues');
  await page.getByRole('button', { name: 'Search' }).first().click();
  await expect(page).toHaveURL(/\/search$/);
  const search = page.getByRole('textbox', { name: 'Search issues, projects, and documents' });
  await expect(search).toBeFocused();
  await search.fill(query);
  await search.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/search\\?.*q=${query}`));

  const results = page.getByRole('list', { name: 'Search results' });
  await expect(results.getByRole('link', { name: new RegExp(issue.identifier) })).toBeVisible();
  await expect(results.getByRole('link', { name: new RegExp(`${query} project`) })).toBeVisible();
  await expect(results.getByRole('link', { name: new RegExp(adr.identifier) })).toBeVisible();
  await expect(results.getByRole('link', { name: new RegExp(`${query} guide`) })).toBeVisible();
  await expect(results.getByRole('listitem').first()).toContainText(exactIssue.identifier);

  await page.getByRole('tab', { name: 'Documents' }).click();
  await expect(page).toHaveURL(/tab=documents/);
  await expect(results.getByRole('link', { name: new RegExp(adr.identifier) })).toBeVisible();
  await expect(results.getByRole('link', { name: new RegExp(`${query} guide`) })).toBeVisible();
  await expect(results.getByRole('link', { name: new RegExp(issue.identifier) })).toHaveCount(0);

  await page.getByRole('tab', { name: 'Issues' }).click();
  await page.getByRole('button', { name: 'Add filter' }).click();
  await page.getByRole('menuitemcheckbox', { name: 'In Progress' }).click();
  await expect(page).toHaveURL(/status=in_progress/);
  await expect(
    results.getByRole('link', { name: new RegExp(startedIssue.identifier) }),
  ).toBeVisible();
  await expect(results.getByRole('link', { name: new RegExp(issue.identifier) })).toHaveCount(0);
  await page.getByRole('button', { name: 'Add filter' }).click();
  await page.getByRole('menuitemcheckbox', { name: 'Todo' }).click();
  await expect(page).toHaveURL(/status=.*todo/);
  await expect(results.getByRole('link', { name: new RegExp(issue.identifier) })).toBeVisible();
  await page.getByRole('button', { name: 'Remove status filter: In Progress' }).click();
  await expect(page).toHaveURL(/status=todo/);
  await expect(
    results.getByRole('link', { name: new RegExp(startedIssue.identifier) }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Remove status filter: Todo' }).click();
  await page.getByRole('button', { name: 'Add filter' }).click();
  await page.getByRole('menuitemcheckbox', { name: 'Done' }).click();
  await expect(page.getByRole('status')).toContainText('with the selected filters');
  await page.getByRole('button', { name: 'Remove status filter: Done' }).click();

  await page.getByRole('button', { name: 'Add filter' }).click();
  await page.getByRole('menuitem', { name: 'Updated date' }).click();
  await page.getByRole('menuitem', { name: '1 week ago' }).click();
  await expect(page).toHaveURL(/updated=P1W/);
  await expect(results.getByRole('link', { name: new RegExp(issue.identifier) })).toBeVisible();
  await page.getByRole('button', { name: 'Add filter' }).click();
  await page.getByRole('menuitem', { name: 'Created date' }).click();
  await page.getByRole('menuitem', { name: '1 day ago' }).click();
  await expect(page).toHaveURL(/created=P1D/);
  await expect(results.getByRole('link', { name: new RegExp(issue.identifier) })).toBeVisible();

  await page.getByRole('button', { name: 'Change comparison for Created date' }).click();
  await page.getByRole('menuitem', { name: 'before' }).click();
  await expect(page).toHaveURL(/created=before%3AP1D/);
  await expect(results.getByRole('link', { name: new RegExp(issue.identifier) })).toHaveCount(0);
  await page.getByRole('button', { name: 'Change comparison for Created date' }).click();
  await page.getByRole('menuitem', { name: 'after' }).click();
  await expect(results.getByRole('link', { name: new RegExp(issue.identifier) })).toBeVisible();
  await page.getByRole('button', { name: 'Remove Updated date filter: 1 week ago' }).click();
  await expect(page).not.toHaveURL(/updated=/);

  await page.getByRole('button', { name: 'Add filter' }).click();
  await page.getByRole('menuitem', { name: 'Updated date' }).click();
  await page.getByRole('menuitem', { name: 'Custom date or timeframe…' }).click();
  await expect(page.getByRole('dialog', { name: 'Updated date' })).toBeVisible();
  await page.getByRole('tab', { name: 'Day' }).click();
  await page.getByRole('textbox', { name: 'Date or timeframe' }).fill(issue.createdAt.slice(0, 10));
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page).toHaveURL(/updated=in%3A/);
  await expect(results.getByRole('link', { name: new RegExp(issue.identifier) })).toBeVisible();
  await page.getByRole('button', { name: new RegExp('Remove Updated date filter') }).click();

  const createdAt = new Date(issue.createdAt);
  const issueQuarter = Math.floor(createdAt.getUTCMonth() / 3) + 1;
  const issueYear = createdAt.getUTCFullYear();
  await page.getByRole('button', { name: 'Add filter' }).click();
  await page.getByRole('menuitem', { name: 'Updated date' }).click();
  await page.getByRole('menuitem', { name: 'Custom date or timeframe…' }).click();
  await page.getByRole('button', { name: `Quarter ${issueQuarter}, ${issueYear}` }).click();
  await expect(page.getByRole('textbox', { name: 'Date or timeframe' })).toHaveValue(
    `Q${issueQuarter} ${issueYear}`,
  );
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(results.getByRole('link', { name: new RegExp(issue.identifier) })).toBeVisible();
  await page.getByRole('button', { name: new RegExp('Remove Updated date filter') }).click();

  await page.getByRole('button', { name: 'Remove Created date filter: 1 day ago' }).click();

  await expect(
    results.getByRole('link', { name: new RegExp(archivedIssue.identifier) }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByRole('menuitemcheckbox', { name: 'Include archived' }).click();
  await expect(page).toHaveURL(/includeArchived=true/);
  await expect(
    results.getByRole('link', { name: new RegExp(archivedIssue.identifier) }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByRole('menuitemcheckbox', { name: 'Include archived' }).click();
  await expect(page).not.toHaveURL(/includeArchived=true/);
  await expect(
    results.getByRole('link', { name: new RegExp(archivedIssue.identifier) }),
  ).toHaveCount(0);

  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByRole('menuitem', { name: 'Last updated' }).click();
  await expect(page).toHaveURL(/ordering=updatedAt/);
  await page.getByRole('button', { name: 'Display options' }).click();
  await expect(page.getByRole('menuitem', { name: 'Last updated' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.getByRole('menuitem', { name: 'Last created' }).click();
  await expect(page).toHaveURL(/ordering=createdAt/);
  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByRole('menuitem', { name: 'Most relevant' }).click();
  await expect(page).not.toHaveURL(/ordering=/);
  await page.keyboard.press('Escape');

  await results.getByRole('link', { name: new RegExp(issue.identifier) }).click();
  await expect(page).toHaveURL(new RegExp(`/issues/${issue.identifier}$`));

  await page.getByRole('button', { name: 'Search' }).first().click();
  await search.fill('no-result-query');
  await search.press('Enter');
  await expect(page.getByRole('status')).toContainText('No results found');

  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(search).toHaveValue('');
  await expect(page.getByText('Search your workspace')).toBeVisible();
  await search.fill(commentOnlyQuery);
  await search.press('Enter');
  await expect(page).toHaveURL(new RegExp(`q=${commentOnlyQuery}`));
  await expect(
    results.getByRole('link', { name: new RegExp(commentIssue.identifier) }),
  ).toContainText(commentOnlyQuery);
  expect(project.slug).toBeTruthy();
  expect(pageDocument.slug).toBeTruthy();
});
