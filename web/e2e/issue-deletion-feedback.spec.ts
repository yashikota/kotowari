import { expect, test } from '@playwright/test';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import ja from '../src/i18n/locales/ja.json' with { type: 'json' };
import { contrastFailures } from './contrast.ts';

for (const scheme of ['light', 'dark']) {
  for (const [locale, labels] of [
    ['en', en],
    ['ja', ja],
  ] as const) {
    test(`issue deletion cancels safely and retries in ${locale}/${scheme}`, async ({
      page,
      request,
    }, testInfo) => {
      const stamp = `delete-${locale}-${scheme}-${Date.now()}`;
      const title = `Issue ${stamp}`;
      const created = await request.post('/api/issues', { data: { title } });
      expect(created.ok()).toBeTruthy();
      const { identifier } = (await created.json()) as { identifier: string };
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
      const writes: string[] = [];
      await page.route(`**/api/issues/${identifier}`, async (route) => {
        if (route.request().method() !== 'DELETE') return route.continue();
        writes.push(route.request().url());
        if (writes.length === 1) {
          await gate;
          return route.fulfill({ status: 503, json: { error: 'Issue deletion unavailable' } });
        }
        return route.continue();
      });
      try {
        await page.goto(`/issues/${identifier}`);
        const trigger = page.getByRole('button', { name: labels.issueActions.button, exact: true });
        const draftKey = `kotowari:draft:${new URL(page.url()).origin}:issues/${identifier}/body`;
        await page.evaluate(
          (key) =>
            localStorage.setItem(
              key,
              JSON.stringify({ body: 'Retained until deletion', revision: 'old' }),
            ),
          draftKey,
        );
        await trigger.click();
        await page.getByRole('menuitem', { name: labels.issueActions.delete, exact: true }).click();
        const dialog = page.getByRole('dialog', { name: labels.issueDeletion.title, exact: true });
        const cancel = dialog.getByRole('button', { name: labels.common.cancel, exact: true });
        await expect(cancel).toBeFocused();
        expect((await cancel.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        expect(
          (await dialog
            .getByRole('button', { name: labels.issueActions.delete, exact: true })
            .boundingBox())!.height,
        ).toBeGreaterThanOrEqual(44);
        await expect(dialog).toContainText(identifier);
        await cancel.click();
        await expect(dialog).toHaveCount(0);
        await expect(trigger).toBeFocused();
        expect(writes).toHaveLength(0);
        await trigger.click();
        await page.getByRole('menuitem', { name: labels.issueActions.delete, exact: true }).click();
        await dialog.getByRole('button', { name: labels.issueActions.delete, exact: true }).click();
        await expect.poll(() => writes.length).toBe(1);
        await expect(cancel).toBeDisabled();
        await expect(
          dialog.getByRole('button', { name: labels.issueActions.delete, exact: true }),
        ).toBeDisabled();
        await page.keyboard.press('Escape');
        await expect(dialog).toBeVisible();
        release();
        await expect(dialog.getByRole('alert')).toContainText('Issue deletion unavailable');
        const retry = dialog.getByRole('button', { name: labels.issueDeletion.retry, exact: true });
        await expect(retry).toBeFocused();
        expect(await contrastFailures(page, '[role="dialog"]')).toEqual([]);
        await page.screenshot({ path: testInfo.outputPath('issue-deletion-failure.png') });
        expect((await request.get(`/api/issues/${identifier}`)).ok()).toBeTruthy();
        expect(await page.evaluate((key) => localStorage.getItem(key), draftKey)).not.toBeNull();
        await retry.click();
        await expect(page).toHaveURL(/\/issues$/);
        await expect(dialog).toHaveCount(0);
        expect(writes).toEqual([writes[0], writes[0]]);
        expect((await request.get(`/api/issues/${identifier}`)).status()).toBe(404);
        expect(await page.evaluate((key) => localStorage.getItem(key), draftKey)).toBeNull();
      } finally {
        release();
        await request.delete(`/api/issues/${identifier}`);
      }
    });
  }
}
