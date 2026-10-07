import { expect, test } from '@playwright/test';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import ja from '../src/i18n/locales/ja.json' with { type: 'json' };
import { contrastFailures } from './contrast.ts';

for (const scheme of ['light', 'dark']) {
  for (const [locale, labels] of [
    ['en', en],
    ['ja', ja],
  ] as const) {
    test(`project archive preserves drafts and retries in ${locale}/${scheme}`, async ({
      page,
      request,
    }, testInfo) => {
      const slug = `archive-${locale}-${scheme}-${Date.now()}`;
      expect(
        (
          await request.post('/api/projects', {
            data: {
              slug,
              name: slug,
              summary: 'Original summary',
              description: 'Original description',
            },
          })
        ).ok(),
      ).toBeTruthy();
      await page.route('**/api/workspace', async (route) => {
        const response = await route.fetch();
        return route.fulfill({ json: { ...(await response.json()), locale } });
      });
      await page.addInitScript((color) => {
        localStorage.setItem('kotowari.color-scheme', color);
        localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
      }, scheme);
      await page.setViewportSize({ width: 360, height: 800 });
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const writes: unknown[] = [];
      await page.route(`**/api/projects/${slug}`, async (route) => {
        if (route.request().method() !== 'PATCH') return route.continue();
        const body = route.request().postDataJSON();
        if (!('archived' in body))
          return route.fulfill({ status: 503, json: { error: 'Text unavailable' } });
        writes.push(body);
        if (writes.length === 1) {
          await gate;
          return route.fulfill({ status: 503, json: { error: 'Archive unavailable' } });
        }
        if (writes.length === 3)
          return route.fulfill({ status: 503, json: { error: 'Restore unavailable' } });
        return route.continue();
      });
      try {
        await page.goto(`/projects/${slug}`);
        const summary = page.getByRole('textbox', { name: labels.ui.projectSummary, exact: true });
        const description = page.getByRole('textbox', {
          name: labels.ui.projectDescription,
          exact: true,
        });
        await summary.fill('Retained summary');
        await description.fill('Retained description');
        await page.getByRole('heading').filter({ hasText: slug }).click();
        await expect(
          page.getByRole('status').filter({ hasText: labels.projectSave.saving }),
        ).toHaveCount(0);
        await expect(page.getByRole('alert')).toContainText('Text unavailable');
        const options = page.getByRole('button', {
          name: labels.issueActions.moreActions,
          exact: true,
        });
        await options.click();
        await page.getByRole('menuitem', { name: labels.projectList.archive, exact: true }).click();
        const feedback = page.locator('[data-project-archive-feedback]');
        await expect(feedback.getByRole('status')).toContainText(labels.projectArchive.saving);
        await options.click();
        await expect(
          page.getByRole('menuitem', { name: labels.projectList.archive, exact: true }),
        ).toBeDisabled();
        await expect(
          page.getByRole('menuitem', { name: labels.ui.delete, exact: true }),
        ).toBeDisabled();
        await page.keyboard.press('Escape');
        await expect(page.getByRole('menu')).toHaveCount(0);
        release();
        const retry = feedback.getByRole('button', {
          name: labels.projectArchive.retry,
          exact: true,
        });
        await expect(retry).toBeFocused();
        await expect(feedback.getByRole('alert')).toContainText('Archive unavailable');
        expect(await contrastFailures(page, '[data-project-archive-feedback]')).toEqual([]);
        await page.screenshot({ path: testInfo.outputPath('archive-retry.png') });
        await retry.click();
        await expect(feedback.getByRole('status')).toContainText(labels.projectArchive.saved);
        await expect(page).toHaveURL(new RegExp(`/projects/${slug}$`));
        await expect(summary).toHaveValue('Retained summary');
        await expect(description).toHaveValue('Retained description');
        expect((await (await request.get(`/api/projects/${slug}`)).json()).archivedAt).toBeTruthy();
        await expect(
          page.getByText(labels.issueActions.archivedBadge, { exact: true }),
        ).toBeVisible();
        await options.click();
        await page.getByRole('menuitem', { name: labels.projectList.restore, exact: true }).click();
        await expect(feedback.getByRole('alert')).toContainText('Restore unavailable');
        await expect(retry).toBeFocused();
        expect((await (await request.get(`/api/projects/${slug}`)).json()).archivedAt).toBeTruthy();
        await retry.click();
        await expect
          .poll(async () => (await (await request.get(`/api/projects/${slug}`)).json()).archivedAt)
          .toBeFalsy();
        await expect(
          page.getByText(labels.issueActions.archivedBadge, { exact: true }),
        ).toHaveCount(0);
        await expect(summary).toHaveValue('Retained summary');
        await expect(description).toHaveValue('Retained description');
        expect(writes).toEqual([
          { archived: true },
          { archived: true },
          { archived: false },
          { archived: false },
        ]);
      } finally {
        release();
        await request.delete(`/api/projects/${slug}`);
      }
    });
  }
}

test('instant project archive rejection leaves keyboard focus on retry', async ({
  page,
  request,
}) => {
  const slug = `archive-instant-${Date.now()}`;
  expect((await request.post('/api/projects', { data: { slug, name: slug } })).ok()).toBeTruthy();
  const writes: unknown[] = [];
  await page.route(`**/api/projects/${slug}`, async (route) => {
    if (route.request().method() !== 'PATCH') return route.continue();
    writes.push(route.request().postDataJSON());
    if (writes.length === 1)
      return route.fulfill({ status: 503, json: { error: 'Archive unavailable' } });
    return route.continue();
  });
  try {
    await page.goto(`/projects/${slug}`);
    const options = page.getByRole('button', { name: en.issueActions.moreActions, exact: true });
    await options.click();
    await page.getByRole('menuitem', { name: en.projectList.archive, exact: true }).click();
    const feedback = page.locator('[data-project-archive-feedback]');
    await expect(page.getByRole('menu')).toHaveCount(0);
    const retry = feedback.getByRole('button', { name: en.projectArchive.retry, exact: true });
    await expect(retry).toBeFocused();
    await retry.press('Enter');
    await expect(feedback.getByRole('status')).toContainText(en.projectArchive.saved);
    await expect(options).toBeFocused();
    expect(writes).toEqual([{ archived: true }, { archived: true }]);
  } finally {
    await request.delete(`/api/projects/${slug}`);
  }
});

for (const outcome of ['failure', 'success']) {
  test(`late project archive ${outcome} leaves the next project unchanged`, async ({
    page,
    request,
  }) => {
    const slug = `archive-context-${Date.now()}`;
    const otherSlug = `${slug}-next`;
    expect(
      (await request.post('/api/projects', { data: { slug: otherSlug, name: otherSlug } })).ok(),
    ).toBeTruthy();
    expect(
      (
        await request.post('/api/projects', {
          data: { slug, name: slug, dependencies: [{ projectSlug: otherSlug, kind: 'related' }] },
        })
      ).ok(),
    ).toBeTruthy();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const writes: unknown[] = [];
    await page.route(`**/api/projects/${slug}`, async (route) => {
      if (route.request().method() !== 'PATCH') return route.continue();
      writes.push(route.request().postDataJSON());
      await gate;
      if (outcome === 'failure')
        return route.fulfill({ status: 503, json: { error: 'Archive unavailable' } });
      return route.continue();
    });
    try {
      await page.goto(`/projects/${slug}`);
      await page.getByRole('button', { name: en.issueActions.moreActions, exact: true }).click();
      await page.getByRole('menuitem', { name: en.projectList.archive, exact: true }).click();
      await expect(
        page.locator('[data-project-archive-feedback]').getByRole('status'),
      ).toContainText(en.projectArchive.saving);
      await page.getByRole('link', { name: otherSlug, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/projects/${otherSlug}$`));
      await expect(page.getByRole('heading').filter({ hasText: otherSlug })).toBeVisible();
      const response = page.waitForResponse(
        (response) =>
          response.url().endsWith(`/api/projects/${slug}`) &&
          response.request().method() === 'PATCH',
      );
      release();
      await response;
      await page.evaluate(
        async () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      await expect(page.locator('[data-project-archive-feedback]')).toBeEmpty();
      await expect(page.getByText(en.issueActions.archivedBadge, { exact: true })).toHaveCount(0);
      await expect
        .poll(() => page.evaluate(() => document.activeElement === document.body))
        .toBeTruthy();
      expect(writes).toEqual([{ archived: true }]);
      expect(Boolean((await (await request.get(`/api/projects/${slug}`)).json()).archivedAt)).toBe(
        outcome === 'success',
      );
      expect(
        (await (await request.get(`/api/projects/${otherSlug}`)).json()).archivedAt,
      ).toBeFalsy();
    } finally {
      release();
      await request.delete(`/api/projects/${slug}`);
      await request.delete(`/api/projects/${otherSlug}`);
    }
  });
}
