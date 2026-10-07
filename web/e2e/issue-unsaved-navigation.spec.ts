import { expect, test } from '@playwright/test';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import ja from '../src/i18n/locales/ja.json' with { type: 'json' };
import { contrastFailures } from './contrast.ts';

for (const scheme of ['light', 'dark']) {
  for (const [locale, labels] of [
    ['en', en],
    ['ja', ja],
  ] as const) {
    test(`unsaved title survives navigation and retry in ${locale}/${scheme}`, async ({
      page,
      request,
    }, testInfo) => {
      const stamp = `Unsaved ${Date.now()}`;
      const issues: { identifier: string; title: string }[] = [];
      for (let index = 0; index < 2; index++) {
        const response = await request.post('/api/issues', {
          data: { title: `${stamp} ${index}` },
        });
        expect(response.ok()).toBeTruthy();
        issues.push(await response.json());
      }
      await page.route('**/api/workspace', async (route) => {
        const response = await route.fetch();
        return route.fulfill({ json: { ...(await response.json()), locale } });
      });
      await page.addInitScript((color) => {
        localStorage.setItem('kotowari.color-scheme', color);
        localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
      }, scheme);
      await page.setViewportSize({ width: 360, height: 800 });
      try {
        await page.goto('/issues');
        const find = page.getByRole('textbox', { name: labels.ui.findIssues, exact: true });
        if (!(await find.isVisible()))
          await page.getByRole('button', { name: labels.ui.findIssues, exact: true }).click();
        await find.fill(stamp);
        const rows = page.getByRole('listbox').getByRole('option');
        await expect(rows).toHaveCount(2);
        await rows.first().click();
        const identifier = new URL(page.url()).pathname.split('/').at(-1)!;
        const original = issues.find((issue) => issue.identifier === identifier)!;
        const other = issues.find((issue) => issue.identifier !== identifier)!;
        const draft = `${original.title} retained`;
        const writes: unknown[] = [];
        await page.route(`**/api/issues/${identifier}`, async (route) => {
          if (route.request().method() !== 'PATCH') return route.continue();
          writes.push(route.request().postDataJSON());
          if (writes.length <= 2)
            return route.fulfill({ status: 503, json: { error: 'Title unavailable' } });
          return route.continue();
        });
        const title = page.getByRole('textbox', { name: labels.ui.issueTitle, exact: true });
        await title.fill(draft);
        await title.press('Enter');
        await expect(page.getByRole('alert')).toContainText('Title unavailable');
        const next = page.getByRole('button', { name: labels.issueNavigation.next, exact: true });
        await next.click();
        const dialog = page.getByRole('dialog', { name: labels.unsavedTitle.title, exact: true });
        const stay = dialog.getByRole('button', { name: labels.unsavedTitle.stay, exact: true });
        await expect(stay).toBeFocused();
        await stay.click();
        await expect(dialog).not.toBeVisible();
        await expect(next).toBeFocused();
        await expect(title).toHaveValue(draft);
        await next.click();
        const retry = dialog.getByRole('button', { name: labels.unsavedTitle.save, exact: true });
        await retry.click();
        await expect(dialog.getByRole('alert')).toContainText('Title unavailable');
        await expect(retry).toBeFocused();
        for (const button of await dialog.getByRole('button').all()) {
          if ((await button.getAttribute('aria-label')) !== labels.ui.close) {
            const box = await button.boundingBox();
            if (box) expect(box.height).toBeGreaterThanOrEqual(43.99);
          }
        }
        expect(await contrastFailures(page, '[role="dialog"]')).toEqual([]);
        await page.screenshot({ path: testInfo.outputPath('unsaved-title-retry.png') });
        await retry.click();
        await expect(page).toHaveURL(new RegExp(`/issues/${other.identifier}$`));
        await expect(title).toHaveValue(other.title);
        expect((await (await request.get(`/api/issues/${identifier}`)).json()).title).toBe(draft);
        expect(writes).toEqual([{ title: draft }, { title: draft }, { title: draft }]);
      } finally {
        for (const issue of issues) await request.delete(`/api/issues/${issue.identifier}`);
      }
    });
  }
}

for (const scenario of ['discard', 'undo', 'browser back', 'reload']) {
  test(`title navigation guard handles ${scenario}`, async ({ page, request }) => {
    const stamp = `Navigation choice ${Date.now()}`;
    const issues: { identifier: string; title: string }[] = [];
    for (let index = 0; index < 2; index++) {
      const response = await request.post('/api/issues', { data: { title: `${stamp} ${index}` } });
      expect(response.ok()).toBeTruthy();
      issues.push(await response.json());
    }
    try {
      await page.goto('/issues');
      const find = page.getByRole('textbox', { name: en.ui.findIssues, exact: true });
      if (!(await find.isVisible()))
        await page.getByRole('button', { name: en.ui.findIssues, exact: true }).click();
      await find.fill(stamp);
      const rows = page.getByRole('listbox').getByRole('option');
      await expect(rows).toHaveCount(2);
      await rows.first().click();
      const identifier = new URL(page.url()).pathname.split('/').at(-1)!;
      const original = issues.find((issue) => issue.identifier === identifier)!;
      const other = issues.find((issue) => issue.identifier !== identifier)!;
      const writes: unknown[] = [];
      await page.route(`**/api/issues/${identifier}`, async (route) => {
        if (route.request().method() !== 'PATCH') return route.continue();
        writes.push(route.request().postDataJSON());
        return route.fulfill({ status: 503, json: { error: 'Title unavailable' } });
      });
      const title = page.getByRole('textbox', { name: en.ui.issueTitle, exact: true });
      const draft = `${original.title} retained`;
      await title.fill(draft);
      await title.press('Enter');
      await expect(page.getByRole('alert')).toContainText('Title unavailable');
      if (scenario === 'reload') {
        const prompt = page.waitForEvent('dialog');
        await page.evaluate(() => {
          setTimeout(() => location.reload(), 0);
        });
        const dialog = await prompt;
        expect(dialog.type()).toBe('beforeunload');
        await dialog.dismiss();
        await expect(title).toHaveValue(draft);
        await expect(page).toHaveURL(new RegExp(`/issues/${identifier}$`));
      } else if (scenario === 'undo') {
        await title.fill(original.title);
        await page.getByRole('button', { name: en.issueNavigation.next, exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`/issues/${other.identifier}$`));
        await expect(page.getByRole('dialog')).toHaveCount(0);
      } else {
        if (scenario === 'browser back') await page.evaluate(() => history.back());
        else await page.getByRole('button', { name: en.issueNavigation.next, exact: true }).click();
        const dialog = page.getByRole('dialog', { name: en.unsavedTitle.title, exact: true });
        await expect(dialog).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(dialog).not.toBeVisible();
        await expect(title).toHaveValue(draft);
        if (scenario === 'browser back') await page.evaluate(() => history.back());
        else await page.getByRole('button', { name: en.issueNavigation.next, exact: true }).click();
        await dialog.getByRole('button', { name: en.unsavedTitle.discard, exact: true }).click();
        await expect(page).toHaveURL(
          scenario === 'browser back'
            ? /\/issues(?:\?.*)?$/
            : new RegExp(`/issues/${other.identifier}$`),
        );
      }
      expect((await (await request.get(`/api/issues/${identifier}`)).json()).title).toBe(
        original.title,
      );
      expect(writes).toEqual([{ title: draft }]);
    } finally {
      for (const issue of issues) await request.delete(`/api/issues/${issue.identifier}`);
    }
  });
}
