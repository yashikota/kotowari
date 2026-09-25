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
  const issue = await json<{ identifier: string }>(
    await request.post('/api/issues', {
      data: { title: `${query} issue`, status: 'todo' },
    }),
  );
  const exactIssue = await json<{ identifier: string }>(
    await request.post('/api/issues', {
      data: { title: query, status: 'todo' },
    }),
  );
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
  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByRole('menuitem', { name: 'Title A–Z' }).click();
  await expect(page).toHaveURL(/order=title/);
  await page.getByRole('button', { name: 'Display options' }).click();
  await expect(page.getByRole('menuitem', { name: 'Title A–Z' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
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
  expect(project.slug).toBeTruthy();
  expect(pageDocument.slug).toBeTruthy();
});
