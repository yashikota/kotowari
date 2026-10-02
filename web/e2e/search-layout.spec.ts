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
