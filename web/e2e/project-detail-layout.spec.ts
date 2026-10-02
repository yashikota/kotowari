import { expect, test } from '@playwright/test';

for (const scheme of ['light', 'dark']) {
  test(`project detail prioritizes everyday actions and labeled properties in ${scheme}`, async ({
    page,
    request,
  }, testInfo) => {
    await page.addInitScript((value) => {
      localStorage.setItem('kotowari.color-scheme', value);
      localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
    }, scheme);
    const slug = `layout-${scheme}-${Date.now()}`;
    const name =
      'A project with a long name explaining the outcome and the reason this work is valuable';
    const response = await request.post('/api/projects', {
      data: {
        slug,
        name,
        summary: 'A clear outcome',
        description: 'Context for the work.\n'.repeat(8),
      },
    });
    expect(response.ok()).toBeTruthy();
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`/projects/${slug}`);
    await expect(page.getByRole('heading').filter({ hasText: name })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New issue', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete', exact: true })).toHaveCount(0);
    const description = page.getByRole('textbox', { name: 'Project description', exact: true });
    await expect(description).toHaveValue('Context for the work.\n'.repeat(8));
    expect(
      await description.evaluate((element) => element.scrollHeight <= element.clientHeight + 1),
    ).toBeTruthy();
    const priority = page.getByRole('combobox', { name: 'Priority', exact: true });
    await priority.selectOption('2');
    await expect
      .poll(async () => (await (await request.get(`/api/projects/${slug}`)).json()).priority)
      .toBe(2);
    await page.getByRole('button', { name: 'More actions', exact: true }).click();
    await expect(page.getByRole('menuitem', { name: 'Save as template' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Delete', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'More actions', exact: true })).toBeFocused();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBeTruthy();
    await page.evaluate(() => document.querySelector('header')?.scrollIntoView());
    await page.screenshot({ path: testInfo.outputPath(`project-detail-${scheme}.png`) });
    await request.delete(`/api/projects/${slug}`);
  });
}
