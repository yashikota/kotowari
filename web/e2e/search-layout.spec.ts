import { expect, test } from '@playwright/test';

for (const scheme of ['light', 'dark']) {
  test(`search results and empty recovery remain readable in ${scheme}`, async ({
    page,
    request,
  }, testInfo) => {
    await page.addInitScript((value) => {
      localStorage.setItem('kotowari.color-scheme', value);
      localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
    }, scheme);
    const query = `ReadableSearch${Date.now()}`;
    const title = `${query} A long task title explaining the intended outcome and enough context to choose the right result`;
    const response = await request.post('/api/issues', { data: { title, status: 'todo' } });
    expect(response.ok()).toBeTruthy();
    const issue = await response.json();
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`/search?q=${query}`);
    const result = page
      .getByRole('list', { name: 'Search results' })
      .getByRole('link', { name: new RegExp(issue.identifier) });
    await expect(result).toBeVisible();
    const titleElement = result.getByText(title, { exact: true });
    const identifier = result.getByText(issue.identifier, { exact: true });
    expect((await titleElement.boundingBox())!.width).toBeGreaterThan(220);
    expect((await identifier.boundingBox())!.y).toBeGreaterThan(
      (await titleElement.boundingBox())!.y,
    );
    await result.focus();
    expect(
      await result.evaluate((element) => Number.parseFloat(getComputedStyle(element).outlineWidth)),
    ).toBeGreaterThanOrEqual(2);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBeTruthy();
    await page.screenshot({ path: testInfo.outputPath(`search-${scheme}.png`) });
    await page.goto(`/search?q=${query}&status=canceled`);
    await expect(page.getByRole('status')).toContainText('No results found');
    await page.getByRole('button', { name: 'Clear', exact: true }).last().click();
    await expect(result).toBeVisible();
    expect(new URL(page.url()).searchParams.get('q')).toBe(query);
    expect(new URL(page.url()).searchParams.has('status')).toBeFalsy();
    await page.goto(`/search?q=${query}&tab=projects`);
    await page.getByRole('button', { name: 'Search all categories' }).click();
    await expect(result).toBeVisible();
    await page.goto(`/search?q=${query}missing`);
    await page.getByRole('button', { name: 'Edit search term' }).click();
    const input = page.getByRole('textbox', { name: 'Search issues, projects, and documents' });
    await expect(input).toBeFocused();
    await expect(input).toHaveValue(`${query}missing`);
    await request.delete(`/api/issues/${issue.identifier}`);
  });
}

test('search failure retains query and filters and retries in place', async ({ page, request }) => {
  const query = `SearchRecovery${Date.now()}`;
  const response = await request.post('/api/issues', { data: { title: query, status: 'todo' } });
  const issue = await response.json();
  let attempts = 0;
  await page.route('**/api/search?*', async (route) => {
    attempts += 1;
    if (attempts === 1) await route.fulfill({ status: 503, body: 'Unavailable' });
    else await route.continue();
  });
  await page.goto(`/search?q=${query}&status=todo`);
  await expect(page.getByRole('alert')).toContainText('Search could not be loaded');
  await expect(
    page.getByRole('textbox', { name: 'Search issues, projects, and documents' }),
  ).toHaveValue(query);
  await expect(page.getByText('No results found', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Retry search' }).click();
  await expect(page.getByRole('list', { name: 'Search results' })).toContainText(query);
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('status')).toBe('todo');
  await request.delete(`/api/issues/${issue.identifier}`);
});

test('search navigation hides old results while loading a new query', async ({
  page,
  request,
}, testInfo) => {
  const query = `SearchPending${Date.now()}`;
  const response = await request.post('/api/issues', { data: { title: query, status: 'todo' } });
  const issue = await response.json();
  await page.goto(`/search?q=${query}`);
  await expect(page.getByRole('list', { name: 'Search results' })).toContainText(query);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/search?*', async (route) => {
    await gate;
    await route.continue();
  });
  const input = page.getByRole('textbox', { name: 'Search issues, projects, and documents' });
  await input.fill(`${query}missing`);
  await input.press('Enter');
  await expect(page.getByRole('status')).toHaveText('Searching…');
  await expect(page.getByRole('list', { name: 'Search results' })).toHaveCount(0);
  await expect(input).toHaveValue(`${query}missing`);
  await page.screenshot({ path: testInfo.outputPath('search-pending.png') });
  release();
  await expect(page.getByRole('status')).toHaveText('No results found');
  await request.delete(`/api/issues/${issue.identifier}`);
});
