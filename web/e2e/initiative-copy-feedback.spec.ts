import { expect, test } from '@playwright/test';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import ja from '../src/i18n/locales/ja.json' with { type: 'json' };
import { contrastFailures } from './contrast.ts';

for (const scenario of ['editing', 'late failure', 'late success']) {
  test(`initiative copy preserves context during ${scenario}`, async ({ page, request }) => {
    const slug = `context-copy-${Date.now()}`;
    const otherSlug = `${slug}-other`;
    const otherName = `Other ${otherSlug}`;
    if (scenario !== 'editing')
      expect(
        (
          await request.post('/api/initiatives', { data: { slug: otherSlug, name: otherName } })
        ).ok(),
      ).toBeTruthy();
    const created = await request.post('/api/initiatives', {
      data: {
        slug,
        name: `First ${slug}`,
      },
    });
    expect(created.ok()).toBeTruthy();
    await page.addInitScript((success) => {
      let attempts = 0;
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: () => {
            if (++attempts > 1) return Promise.resolve();
            return new Promise<void>((resolve, reject) => {
              window.addEventListener(
                'release-copy',
                () => {
                  if (success) resolve();
                  else reject(new DOMException('Clipboard denied', 'NotAllowedError'));
                },
                { once: true },
              );
            });
          },
        },
      });
    }, scenario === 'late success');
    try {
      await page.goto(`/initiatives/${slug}`);
      const options = page.getByRole('button', { name: en.issueActions.moreActions, exact: true });
      await options.click();
      await page.getByRole('menuitem', { name: en.issueActions.copyTitle, exact: true }).click();
      const feedback = page.locator('[data-initiative-copy-feedback]');
      await expect(feedback.getByRole('status')).toContainText(en.clipboard.copying);
      const summary = page.getByRole('textbox', { name: en.ui.description, exact: true });
      if (scenario === 'editing') await summary.fill('Retained summary draft');
      else {
        await page.getByRole('button', { name: en.nav.initiatives, exact: true }).click();
        await expect(page).toHaveURL(/\/initiatives$/);
        await page.getByRole('main').getByRole('link', { name: otherName, exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`/initiatives/${otherSlug}$`));
        await expect(summary).toHaveValue('');
        await summary.focus();
        await summary.evaluate((element) => element.blur());
      }
      await page.evaluate(async () => {
        window.dispatchEvent(new Event('release-copy'));
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
      });
      if (scenario === 'editing') {
        await expect(summary).toHaveValue('Retained summary draft');
        await expect(summary).toBeFocused();
        await expect(feedback.getByRole('alert')).toContainText('Clipboard denied');
      } else {
        expect(await page.evaluate(() => document.activeElement === document.body)).toBeTruthy();
        await expect(feedback).toHaveCount(0);
        await options.click();
        await page.getByRole('menuitem', { name: en.issueActions.copyTitle, exact: true }).click();
        await expect(feedback.getByRole('status')).toContainText(en.ui.copied);
      }
    } finally {
      await request.delete(`/api/initiatives/${slug}`);
      if (scenario !== 'editing') await request.delete(`/api/initiatives/${otherSlug}`);
    }
  });
}

for (const scheme of ['light', 'dark']) {
  for (const [locale, labels] of [
    ['en', en],
    ['ja', ja],
  ] as const) {
    test(`initiative URL copy recovers in ${locale}/${scheme}`, async ({
      page,
      request,
    }, testInfo) => {
      const slug = `copy-${locale}-${scheme}-${Date.now()}`;
      const created = await request.post('/api/initiatives', {
        data: { name: `Copy initiative ${slug}`, slug },
      });
      expect(created.ok()).toBeTruthy();
      await page.route('**/api/workspace', async (route) => {
        const response = await route.fetch();
        return route.fulfill({ json: { ...(await response.json()), locale } });
      });
      await page.addInitScript((color) => {
        localStorage.setItem('kotowari.color-scheme', color);
        localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
        const state = window as unknown as { copies: string[] };
        state.copies = [];
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: {
            writeText: (text: string) => {
              state.copies.push(text);
              if (state.copies.length > 1) return Promise.resolve();
              return new Promise<void>((_resolve, reject) => {
                window.addEventListener(
                  'release-copy',
                  () => reject(new DOMException('Clipboard denied', 'NotAllowedError')),
                  { once: true },
                );
              });
            },
          },
        });
      }, scheme);
      await page.setViewportSize({ width: 360, height: 800 });
      try {
        await page.goto(`/initiatives/${slug}`);
        const options = page.getByRole('button', {
          name: labels.issueActions.moreActions,
          exact: true,
        });
        await options.click();
        await page
          .getByRole('menuitem', { name: labels.issueActions.copyUrl, exact: true })
          .click();
        const feedback = page.locator('[data-initiative-copy-feedback]');
        await expect(feedback.getByRole('status')).toContainText(labels.clipboard.copying);
        await options.click();
        for (const label of [
          labels.issueActions.copyId,
          labels.issueActions.copyUrl,
          labels.issueActions.copyTitle,
        ])
          await expect(page.getByRole('menuitem', { name: label, exact: true })).toBeDisabled();
        await page.keyboard.press('Escape');
        await expect(options).toHaveAttribute('aria-expanded', 'false');
        await expect(page.getByRole('menu')).toHaveCount(0);
        await expect(options).toBeFocused();
        await page.evaluate(() => window.dispatchEvent(new Event('release-copy')));
        await expect(feedback.getByRole('alert')).toContainText('Clipboard denied');
        const retry = feedback.getByRole('button', { name: labels.clipboard.retry, exact: true });
        await expect(retry).toBeFocused();
        expect((await retry.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        expect(await contrastFailures(page, '[data-initiative-copy-feedback]')).toEqual([]);
        await page.screenshot({ path: testInfo.outputPath('initiative-copy-failure.png') });
        await retry.click();
        await expect(feedback.getByRole('alert')).toHaveCount(0);
        await expect(feedback.getByRole('status')).toContainText(labels.ui.copied);
        await expect(options).toBeFocused();
        const url = new URL(`/initiatives/${slug}`, page.url()).href;
        expect(
          await page.evaluate(() => (window as unknown as { copies: string[] }).copies),
        ).toEqual([url, url]);
      } finally {
        await request.delete(`/api/initiatives/${slug}`);
      }
    });
  }
}

for (const kind of ['title', 'id']) {
  test(`initiative ${kind} copy retries its exact value`, async ({ page, request }) => {
    const slug = `copy-${kind}-${Date.now()}`;
    const name = `Initiative title 日本語 ${slug}`;
    const created = await request.post('/api/initiatives', { data: { name, slug } });
    expect(created.ok()).toBeTruthy();
    const initiative = (await created.json()) as { id: number };
    await page.addInitScript(() => {
      const state = window as unknown as { copies: string[] };
      state.copies = [];
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: (text: string) => {
            state.copies.push(text);
            return state.copies.length === 1
              ? Promise.reject(new DOMException('Clipboard denied', 'NotAllowedError'))
              : Promise.resolve();
          },
        },
      });
    });
    try {
      await page.goto(`/initiatives/${slug}`);
      const options = page.getByRole('button', { name: en.issueActions.moreActions, exact: true });
      await expect(options).toBeVisible();
      if (kind === 'title') {
        await options.click();
        await page.getByRole('menuitem', { name: en.issueActions.copyTitle, exact: true }).click();
      } else {
        await options.focus();
        await page.keyboard.press('Control+Period');
      }
      const feedback = page.locator('[data-initiative-copy-feedback]');
      const retry = feedback.getByRole('button', { name: en.clipboard.retry, exact: true });
      await expect(retry).toBeFocused();
      await retry.click();
      await expect(feedback.getByRole('status')).toContainText(en.ui.copied);
      await expect(options).toBeFocused();
      const value = kind === 'title' ? name : String(initiative.id);
      expect(await page.evaluate(() => (window as unknown as { copies: string[] }).copies)).toEqual(
        [value, value],
      );
    } finally {
      await request.delete(`/api/initiatives/${slug}`);
    }
  });
}
