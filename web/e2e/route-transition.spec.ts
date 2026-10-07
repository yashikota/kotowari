import { expect, test } from '@playwright/test';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import ja from '../src/i18n/locales/ja.json' with { type: 'json' };
import { contrastFailures } from './contrast.ts';

for (const scheme of ['light', 'dark']) {
  test(`route loading protects old project input and shortcuts in ${scheme}`, async ({
    page,
    request,
  }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.addInitScript(
      (value) => localStorage.setItem('kotowari.color-scheme', value),
      scheme,
    );
    const slug = `route-loading-${scheme}-${Date.now()}`;
    const next = `${slug}-next`;
    for (const key of [next, slug]) {
      expect(
        (
          await request.post('/api/projects', {
            data: {
              slug: key,
              name: key,
              ...(key === slug ? { dependencies: [{ projectSlug: next, kind: 'related' }] } : {}),
            },
          })
        ).ok(),
      ).toBeTruthy();
    }
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let reads = 0;
    let oldWrites = 0;
    await page.route(`**/api/projects/${next}/activities`, async (route) => {
      reads++;
      await gate;
      await route.continue();
    });
    await page.route(`**/api/projects/${slug}`, async (route) => {
      if (route.request().method() === 'PATCH') oldWrites++;
      await route.continue();
    });
    try {
      await page.goto(`/projects/${slug}`);
      const name = page
        .getByRole('form', { name: en.projectMilestones.heading, exact: true })
        .getByRole('textbox', { name: en.projectMilestones.name, exact: true });
      const oldInput = await name.elementHandle();
      await page.getByRole('link', { name: next, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/projects/${next}$`));
      await expect.poll(() => reads).toBeGreaterThan(0);
      await expect(page.locator('main [inert]')).toHaveCount(1);
      await oldInput!.evaluate((element) => element.focus());
      expect(await oldInput!.evaluate((element) => document.activeElement === element)).toBe(false);
      await page.keyboard.press('Alt+f');
      expect(oldWrites).toBe(0);
      const loading = page.locator('[data-route-loading]');
      await expect(loading).toBeVisible();
      expect(await contrastFailures(page, '[data-route-loading]')).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath('route-loading.png') });
      release();
      await expect(loading).toBeHidden();
      await expect(page.locator('main [inert]')).toHaveCount(0);
      await expect(page.locator('main')).toContainText(next);
      await name.fill('Prepared destination draft');
      await expect(name).toHaveValue('Prepared destination draft');
      await expect(name).toBeFocused();
      expect(oldWrites).toBe(0);
    } finally {
      release();
      for (const key of [slug, next]) await request.delete(`/api/projects/${key}`);
    }
  });
}

for (const scheme of ['light', 'dark']) {
  test(`failed route loading retains navigation and retries in ja/${scheme}`, async ({
    page,
    request,
  }, testInfo) => {
    await page.setViewportSize({ width: 360, height: 900 });
    await page.route('**/api/workspace', async (route) => {
      const response = await route.fetch();
      return route.fulfill({ json: { ...(await response.json()), locale: 'ja' } });
    });
    await page.addInitScript((value) => {
      localStorage.setItem('kotowari.color-scheme', value);
      localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
    }, scheme);
    const slug = `route-recovery-${scheme}-${Date.now()}`;
    expect((await request.post('/api/projects', { data: { slug, name: slug } })).ok()).toBeTruthy();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let reads = 0;
    await page.route(`**/api/projects/${slug}`, async (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      reads++;
      if (reads === 2) await gate;
      if (reads <= 2)
        return route.fulfill({ status: 503, json: { error: 'Project temporarily unavailable' } });
      return route.continue();
    });
    try {
      await page.goto(`/projects/${slug}`);
      const alert = page.getByRole('alert');
      await expect(alert).toContainText(ja.navigationStatus.failed);
      const retry = alert.getByRole('button', { name: ja.navigationStatus.retry, exact: true });
      await expect(retry).toBeFocused();
      await expect(page.locator('main [inert]')).toHaveCount(0);
      await retry.evaluate((button) => {
        button.click();
        button.click();
      });
      await expect(retry).toBeDisabled();
      await expect(alert.getByRole('status')).toContainText(ja.navigationStatus.retrying);
      await expect.poll(() => reads).toBe(2);
      release();
      await expect(retry).toBeEnabled();
      await expect(retry).toBeFocused();
      expect(reads).toBe(2);
      expect(await contrastFailures(page, '[role="alert"]')).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath('route-recovery.png') });
      await retry.click();
      await expect(alert).toBeHidden();
      await expect(page.locator('main')).toContainText(slug);
      await expect(page.locator('[data-route-content]')).toBeFocused();
      expect(reads).toBe(3);
      const name = page
        .getByRole('form', { name: ja.projectMilestones.heading, exact: true })
        .getByRole('textbox', { name: ja.projectMilestones.name, exact: true });
      await name.fill('Recovered page draft');
      await expect(name).toHaveValue('Recovered page draft');
    } finally {
      release();
      await request.delete(`/api/projects/${slug}`);
    }
  });
}
