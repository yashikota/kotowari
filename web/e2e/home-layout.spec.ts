import { expect, test } from '@playwright/test';

for (const scheme of ['light', 'dark']) {
  test(`home links stay readable and actionable in ${scheme}`, async ({
    page,
    request,
  }, testInfo) => {
    const title = `HomeResource${Date.now()} ${'LongResourceTitleWithoutSpaces'.repeat(8)}`;
    const response = await request.post('/api/workspace/resources', {
      data: { title, url: 'https://example.com/planning' },
    });
    expect(response.ok()).toBeTruthy();
    const resource = await response.json();
    await page.addInitScript((value) => {
      localStorage.setItem('kotowari.color-scheme', value);
      localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
    }, scheme);
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/');
    const link = page.getByRole('link', { name: title, exact: true });
    await link.scrollIntoViewIfNeeded();
    await link.focus();
    expect((await link.boundingBox())!.width).toBeGreaterThan(250);
    expect(
      await link.evaluate((element) => Number.parseFloat(getComputedStyle(element).outlineWidth)),
    ).toBeGreaterThanOrEqual(2);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBeTruthy();
    await page.screenshot({ path: testInfo.outputPath('home-resource.png') });
    await request.delete(`/api/workspace/resources/${resource.id}`);
  });
}
