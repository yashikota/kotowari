import { expect, test } from '@playwright/test';

for (const scheme of ['light', 'dark']) {
  test(`initiative fields stay readable and recover from saving errors in ${scheme}`, async ({
    page,
    request,
  }, testInfo) => {
    await page.addInitScript((value) => {
      localStorage.setItem('kotowari.color-scheme', value);
      localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
    }, scheme);
    const slug = `initiative-layout-${scheme}-${Date.now()}`;
    const name =
      'A longer-term goal with enough context to understand the intended outcome of related projects';
    const response = await request.post('/api/initiatives', {
      data: { slug, name, status: 'planned' },
    });
    expect(response.ok()).toBeTruthy();
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`/initiatives/${slug}`);
    const input = page.getByRole('textbox', { name: 'Name', exact: true });
    await expect(input).toHaveValue(name);
    await expect(page.getByRole('combobox', { name: 'Status', exact: true })).toHaveValue(
      'Planned',
    );
    expect((await input.boundingBox())!.width).toBeGreaterThan(250);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBeTruthy();
    await page.getByRole('button', { name: 'More actions', exact: true }).click();
    await expect(
      page.getByRole('menuitem', { name: 'Delete initiative', exact: true }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('menuitem', { name: 'Delete initiative', exact: true }),
    ).toBeHidden();
    await expect(page.getByRole('button', { name: 'More actions', exact: true })).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath(`initiative-${scheme}.png`) });
    const revised = `${name} revised`;
    await input.fill(revised);
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    let attempts = 0;
    await page.route(`**/api/initiatives/${slug}`, async (route) => {
      if (route.request().method() !== 'PATCH') return route.continue();
      attempts++;
      if (attempts === 1) {
        await pending;
        return route.fulfill({ status: 500, json: { error: 'Initiative save unavailable' } });
      }
      return route.continue();
    });
    const save = page.getByRole('button', { name: 'Save changes', exact: true });
    await save.click();
    try {
      await expect(input).toBeDisabled();
      await page
        .locator('form')
        .evaluate((element) => (element as HTMLFormElement).requestSubmit());
      expect(attempts).toBe(1);
    } finally {
      release();
    }
    await expect(page.getByRole('alert')).toHaveText('Initiative save unavailable');
    await expect(input).toHaveValue(revised);
    await expect(input).toBeEnabled();
    await save.click();
    await expect
      .poll(async () => (await (await request.get(`/api/initiatives/${slug}`)).json()).name)
      .toBe(revised);
    await expect(page.getByRole('alert')).toHaveCount(0);
    await request.delete(`/api/initiatives/${slug}`);
  });
}
