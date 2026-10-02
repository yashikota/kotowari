import { expect, test } from '@playwright/test';

for (const scheme of ['light', 'dark']) {
  test(`saved view rows stay readable and focused in ${scheme}`, async ({
    page,
    request,
  }, testInfo) => {
    const slug = `collection-${Date.now()}`;
    const name = 'A long saved view name describing the important next steps and relevant work';
    const description =
      'Keep the information needed for planning together. ' + 'LongContextWithoutSpaces'.repeat(6);
    const response = await request.post('/api/views', {
      data: { slug, name, description, display: 'list', groupBy: 'none' },
    });
    expect(response.ok()).toBeTruthy();
    await page.addInitScript(
      ({ scheme, slug, name, description }) => {
        localStorage.setItem('kotowari.color-scheme', scheme);
        localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
        localStorage.setItem(
          'kotowari.project-views.v1',
          JSON.stringify([
            {
              slug,
              name,
              description,
              search: {},
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ]),
        );
      },
      { scheme, slug, name, description },
    );
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/views');
    const collection = page.getByRole('navigation', { name: 'Saved views' });
    const link = collection.getByRole('link').filter({ hasText: name });
    await link.focus();
    expect(
      await link.evaluate((element) => Number.parseFloat(getComputedStyle(element).outlineWidth)),
    ).toBeGreaterThanOrEqual(2);
    expect((await link.getByText(name, { exact: true }).boundingBox())!.width).toBeGreaterThan(220);
    await page.screenshot({ path: testInfo.outputPath('issue-views.png') });
    await page.getByRole('tab', { name: 'Projects', exact: true }).click();
    const button = collection.getByRole('button', { name, exact: true });
    await button.focus();
    expect(
      await button.evaluate((element) => Number.parseFloat(getComputedStyle(element).outlineWidth)),
    ).toBeGreaterThanOrEqual(2);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBeTruthy();
    await page.screenshot({ path: testInfo.outputPath('project-views.png') });
    await button.press('Enter');
    await expect(page).toHaveURL(/projectView=/);
    await request.delete(`/api/views/${slug}`);
  });
}
