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
        await request
          .delete(`/api/issues/${identifier}`, { timeout: 5000 })
          .catch(async (error) => {
            await testInfo.attach('cleanup-error', {
              body: String(error),
              contentType: 'text/plain',
            });
          });
      }
    });
  }
}

test('recovering a delayed body draft preserves the open issue menu', async ({ page, request }) => {
  const response = await request.post('/api/issues', {
    data: { title: `Delayed recovery ${Date.now()}` },
  });
  expect(response.ok()).toBeTruthy();
  const { identifier } = await response.json();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.addInitScript((id) => {
    localStorage.setItem(
      `kotowari:draft:${location.origin}:issues/${id}/body`,
      JSON.stringify({ body: 'Recovered while choosing an action', revision: 'old' }),
    );
  }, identifier);
  await page.route(`**/api/documents/issues/${identifier}/body`, async (route) => {
    await gate;
    return route.continue();
  });
  await page.setViewportSize({ width: 360, height: 800 });
  try {
    await page.goto(`/issues/${identifier}`);
    await page.getByRole('button', { name: en.issueActions.button, exact: true }).click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    release();
    await expect(page.getByRole('textbox', { name: en.ui.markdownBody, exact: true })).toHaveValue(
      'Recovered while choosing an action',
    );
    await expect(menu).toBeVisible();
    await expect
      .poll(() => menu.evaluate((element) => element.contains(document.activeElement)))
      .toBeTruthy();
    await menu.getByRole('menuitem', { name: en.issueActions.delete, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: en.issueDeletion.title, exact: true });
    await expect(dialog.getByRole('button', { name: en.common.cancel, exact: true })).toBeFocused();
    await dialog.getByRole('button', { name: en.common.cancel, exact: true }).click();
    expect((await request.get(`/api/issues/${identifier}`)).ok()).toBeTruthy();
  } finally {
    release();
    await request.delete(`/api/issues/${identifier}`);
  }
});
