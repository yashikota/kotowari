import { expect, test } from '@playwright/test';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import ja from '../src/i18n/locales/ja.json' with { type: 'json' };
import { contrastFailures } from './contrast.ts';

for (const scheme of ['light', 'dark']) {
  test(`late favorite confirmation preserves newer initiative edits in ${scheme}`, async ({
    page,
    request,
  }) => {
    await page.addInitScript(
      (value) => localStorage.setItem('kotowari.color-scheme', value),
      scheme,
    );
    const slug = `favorite-concurrent-${scheme}-${Date.now()}`;
    expect(
      (await request.post('/api/initiatives', { data: { slug, name: slug } })).ok(),
    ).toBeTruthy();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let confirmed = false;
    let reads = 0;
    await page.route(`**/api/initiatives/${slug}`, async (route) => {
      if (route.request().method() === 'GET') reads++;
      if (route.request().method() !== 'PATCH' || !route.request().postDataJSON().isFavorite)
        return route.continue();
      const response = await route.fetch();
      confirmed = true;
      await gate;
      return route.fulfill({ response });
    });
    try {
      await page.goto(`/initiatives/${slug}`);
      const favorite = page.locator('[data-initiative-favorite]');
      await favorite.click();
      await expect.poll(() => confirmed).toBe(true);
      const description = page.getByRole('textbox', { name: en.ui.description, exact: true });
      await description.fill('Saved while favorite response was pending');
      await page.getByRole('button', { name: en.initiatives.save, exact: true }).click();
      await expect(page.locator('form').getByRole('status')).toContainText(en.initiativeSave.saved);
      const readsBeforeFavorite = reads;
      await description.fill('New draft after confirmed property save');
      release();
      await expect(
        page.locator('[data-initiative-favorite-feedback]').getByRole('status'),
      ).toContainText(en.favoriteSave.saved);
      await expect(description).toHaveValue('New draft after confirmed property save');
      await expect(description).toBeFocused();
      await expect(favorite).toHaveAttribute('aria-pressed', 'true');
      expect(reads).toBe(readsBeforeFavorite);
      await page.getByRole('button', { name: en.initiatives.save, exact: true }).click();
      await expect(page.locator('form').getByRole('status')).toContainText(en.initiativeSave.saved);
      const record = await (await request.get(`/api/initiatives/${slug}`)).json();
      expect(record.description).toBe('New draft after confirmed property save');
      expect(record.isFavorite).toBe(true);
    } finally {
      release();
      await request.delete(`/api/initiatives/${slug}`);
    }
  });
}

for (const outcome of ['success', 'failure']) {
  test(`late initiative favorite ${outcome} stays scoped after navigation`, async ({
    page,
    request,
  }) => {
    const slug = `favorite-leave-${outcome}-${Date.now()}`;
    const nextSlug = `${slug}-next`;
    for (const key of [slug, nextSlug])
      expect(
        (await request.post('/api/initiatives', { data: { slug: key, name: key } })).ok(),
      ).toBeTruthy();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let started = false;
    await page.route(`**/api/initiatives/${slug}`, async (route) => {
      if (route.request().method() !== 'PATCH') return route.continue();
      started = true;
      await gate;
      return outcome === 'success'
        ? route.continue()
        : route.fulfill({ status: 503, json: { error: 'Old favorite failure' } });
    });
    try {
      await page.goto(`/initiatives/${slug}`);
      await page.locator('[data-initiative-favorite]').click();
      await expect.poll(() => started).toBe(true);
      await page.getByRole('button', { name: en.nav.initiatives, exact: true }).click();
      await page.getByRole('main').getByRole('link', { name: nextSlug, exact: true }).click();
      const description = page.getByRole('textbox', { name: en.ui.description, exact: true });
      await description.fill('Current initiative draft');
      const response = page.waitForResponse(
        (response) =>
          response.url().endsWith(`/api/initiatives/${slug}`) &&
          response.request().method() === 'PATCH',
      );
      release();
      await (await response).finished();
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      await expect(description).toHaveValue('Current initiative draft');
      await expect(description).toBeFocused();
      await expect(page).toHaveURL(new RegExp(`/initiatives/${nextSlug}$`));
      await expect(page.locator('[data-initiative-favorite-feedback]')).toHaveCount(0);
      await expect(page.locator('[data-initiative-favorite]')).toHaveAttribute(
        'aria-pressed',
        'false',
      );
      await page.locator('[data-initiative-favorite]').click();
      await expect(page.locator('[data-initiative-favorite]')).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await expect(description).toHaveValue('Current initiative draft');
    } finally {
      release();
      for (const key of [slug, nextSlug]) await request.delete(`/api/initiatives/${key}`);
    }
  });
}

for (const scheme of ['light', 'dark']) {
  for (const [locale, labels] of [
    ['en', en],
    ['ja', ja],
  ] as const) {
    test(`initiative favorite retains drafts and retries in ${locale}/${scheme}`, async ({
      page,
      request,
    }, testInfo) => {
      await page.route('**/api/workspace', async (route) => {
        const response = await route.fetch();
        return route.fulfill({ json: { ...(await response.json()), locale } });
      });
      await page.addInitScript((value) => {
        localStorage.setItem('kotowari.color-scheme', value);
        localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
      }, scheme);
      await page.setViewportSize({ width: 360, height: 900 });
      const slug = `favorite-feedback-${locale}-${scheme}-${Date.now()}`;
      expect(
        (await request.post('/api/initiatives', { data: { slug, name: slug } })).ok(),
      ).toBeTruthy();
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const patches: Record<string, unknown>[] = [];
      let detailReads = 0;
      await page.route(`**/api/initiatives/${slug}`, async (route) => {
        if (route.request().method() === 'GET') {
          detailReads++;
          return route.continue();
        }
        if (route.request().method() !== 'PATCH') return route.continue();
        patches.push(route.request().postDataJSON());
        if (patches.length === 1) {
          await gate;
          return route.fulfill({ status: 503, json: { error: 'Favorite unavailable' } });
        }
        return route.continue();
      });
      try {
        await page.goto(`/initiatives/${slug}`);
        const description = page.getByRole('textbox', { name: labels.ui.description, exact: true });
        await description.fill('Keep the initiative purpose draft');
        const favorite = page.locator('[data-initiative-favorite]');
        await favorite.evaluate((button: HTMLButtonElement) => {
          button.click();
          button.click();
        });
        await expect(favorite).toBeDisabled();
        const feedback = page.locator('[data-initiative-favorite-feedback]');
        await expect(feedback.getByRole('status')).toContainText(labels.favoriteSave.saving);
        expect(patches).toHaveLength(1);
        await page
          .getByRole('button', { name: labels.issueActions.moreActions, exact: true })
          .click();
        await expect(
          page.getByRole('menuitem', { name: labels.initiatives.delete, exact: true }),
        ).toBeDisabled();
        await page.keyboard.press('Escape');
        release();
        await expect(feedback.getByRole('alert')).toContainText('Favorite unavailable');
        const retry = feedback.getByRole('button', {
          name: labels.favoriteSave.retry,
          exact: true,
        });
        await expect(
          page.getByRole('button', { name: labels.issueActions.moreActions, exact: true }),
        ).toBeFocused();
        await expect(description).toHaveValue('Keep the initiative purpose draft');
        expect(await contrastFailures(page, '[data-initiative-favorite-feedback]')).toEqual([]);
        await page.screenshot({ path: testInfo.outputPath('favorite-failure.png') });
        await retry.click();
        await expect(feedback.getByRole('status')).toContainText(labels.favoriteSave.saved);
        await expect(favorite).toHaveAttribute('aria-pressed', 'true');
        await expect(favorite).toBeFocused();
        await expect(description).toHaveValue('Keep the initiative purpose draft');
        expect(detailReads).toBe(1);
        await favorite.click();
        await expect(favorite).toHaveAttribute('aria-pressed', 'false');
        await page.getByRole('button', { name: labels.initiatives.save, exact: true }).click();
        await expect(page.locator('form').getByRole('status')).toContainText(
          labels.initiativeSave.saved,
        );
        expect(patches).toEqual([
          { isFavorite: true },
          { isFavorite: true },
          { isFavorite: false },
          { description: 'Keep the initiative purpose draft' },
        ]);
        const record = await (await request.get(`/api/initiatives/${slug}`)).json();
        expect(record.description).toBe('Keep the initiative purpose draft');
        expect(Boolean(record.isFavorite)).toBe(false);
      } finally {
        release();
        await request.delete(`/api/initiatives/${slug}`);
      }
    });
  }
}
