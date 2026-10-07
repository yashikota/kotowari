import { expect, test } from '@playwright/test';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import ja from '../src/i18n/locales/ja.json' with { type: 'json' };
import { contrastFailures } from './contrast.ts';

for (const scheme of ['light', 'dark']) {
  test(`cached project navigation waits for fresh loader data in ${scheme}`, async ({
    page,
    request,
  }) => {
    await page.addInitScript(
      (value) => localStorage.setItem('kotowari.color-scheme', value),
      scheme,
    );
    const slug = `cached-navigation-${scheme}-${Date.now()}`;
    const next = `${slug}-next`;
    expect(
      (await request.post('/api/projects', { data: { slug: next, name: next } })).ok(),
    ).toBeTruthy();
    expect(
      (
        await request.post('/api/projects', {
          data: {
            slug,
            name: slug,
            dependencies: [{ projectSlug: next, kind: 'related' }],
          },
        })
      ).ok(),
    ).toBeTruthy();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let reads = 0;
    try {
      await page.goto(`/projects/${next}`);
      await page.waitForLoadState('networkidle');
      await page.getByRole('link', { name: slug, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/projects/${slug}$`));
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: en.projectFavorite.add, exact: true }).click();
      await expect(
        page.getByRole('button', { name: en.projectFavorite.remove, exact: true }),
      ).toBeVisible();
      await page.waitForLoadState('networkidle');
      await page.route(`**/api/projects/${next}/activities`, async (route) => {
        reads++;
        await gate;
        await route.continue();
      });
      await page.getByRole('main').getByRole('link', { name: next, exact: true }).click();
      await expect.poll(() => reads).toBeGreaterThan(0);
      await expect(page.locator('[data-route-loading]')).toBeVisible();
      await expect(page.locator('main [inert]')).toHaveCount(1);
      const form = page.getByRole('form', { name: en.projectMilestones.heading, exact: true });
      const name = form.getByRole('textbox', { name: en.projectMilestones.name, exact: true });
      release();
      await expect(page.locator('[data-route-loading]')).toBeHidden();
      await expect(page.locator('main [inert]')).toHaveCount(0);
      await name.fill('Destination draft after cached navigation');
      await expect(name).toHaveValue('Destination draft after cached navigation');
      await expect(name).toBeFocused();
      await form.getByRole('button', { name: en.projectMilestones.add, exact: true }).click();
      await expect(form.getByRole('status')).toContainText(en.milestoneCreation.saved);
      expect((await (await request.get(`/api/projects/${next}`)).json()).milestones[0].name).toBe(
        'Destination draft after cached navigation',
      );
      expect((await (await request.get(`/api/projects/${slug}`)).json()).milestones).toHaveLength(
        0,
      );
    } finally {
      release();
      for (const key of [slug, next]) await request.delete(`/api/projects/${key}`);
    }
  });
}

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

for (const scheme of ['light', 'dark']) {
  test(`late failed route retry preserves the next project draft in ${scheme}`, async ({
    page,
    request,
  }) => {
    await page.addInitScript(
      (value) => localStorage.setItem('kotowari.color-scheme', value),
      scheme,
    );
    const slug = `route-late-${scheme}-${Date.now()}`;
    const next = `${slug}-next`;
    for (const key of [slug, next])
      expect(
        (await request.post('/api/projects', { data: { slug: key, name: key } })).ok(),
      ).toBeTruthy();
    expect(
      (await request.patch(`/api/projects/${next}`, { data: { isFavorite: true } })).ok(),
    ).toBeTruthy();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let reads = 0;
    await page.route(`**/api/projects/${slug}`, async (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      reads++;
      if (reads === 2) await gate;
      return route.fulfill({ status: 503, json: { error: 'Old page still unavailable' } });
    });
    try {
      await page.goto(`/projects/${slug}`);
      await page.getByRole('button', { name: en.navigationStatus.retry, exact: true }).click();
      await expect.poll(() => reads).toBe(2);
      await page
        .getByRole('navigation', { name: 'Favorites', exact: true })
        .getByRole('link', { name: next, exact: true })
        .click();
      await expect(page).toHaveURL(new RegExp(`/projects/${next}$`));
      await expect(page.locator('main [inert]')).toHaveCount(0);
      const name = page
        .getByRole('form', { name: en.projectMilestones.heading, exact: true })
        .getByRole('textbox', { name: en.projectMilestones.name, exact: true });
      await name.fill('Keep current project draft');
      const oldResponse = page.waitForResponse((response) =>
        response.url().endsWith(`/api/projects/${slug}`),
      );
      release();
      await (await oldResponse).finished();
      await page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          }),
      );
      await expect(page).toHaveURL(new RegExp(`/projects/${next}$`));
      await expect(name).toHaveValue('Keep current project draft');
      await expect(name).toBeFocused();
      await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
      await expect(page.locator('[data-route-content]')).toHaveAttribute('aria-busy', 'false');
    } finally {
      release();
      for (const key of [slug, next]) await request.delete(`/api/projects/${key}`);
    }
  });
}
