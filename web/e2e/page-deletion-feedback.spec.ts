import { expect, test } from '@playwright/test';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import ja from '../src/i18n/locales/ja.json' with { type: 'json' };
import { contrastFailures } from './contrast.ts';

for (const scheme of ['light', 'dark']) {
  for (const [locale, labels] of [
    ['en', en],
    ['ja', ja],
  ] as const) {
    test(`document deletion cancels safely and retries in ${locale}/${scheme}`, async ({
      page,
      request,
    }, testInfo) => {
      const slug = `delete-${locale}-${scheme}-${Date.now()}`;
      const title = `文書 ${slug}`;
      expect((await request.post('/api/pages', { data: { title, slug } })).ok()).toBeTruthy();
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
      await page.route(`**/api/pages/${slug}`, async (route) => {
        if (route.request().method() !== 'DELETE') return route.continue();
        writes.push(route.request().url());
        if (writes.length === 1) {
          await gate;
          return route.fulfill({ status: 503, json: { error: 'Document deletion unavailable' } });
        }
        return route.continue();
      });
      try {
        await page.goto(`/pages/${slug}`);
        const trigger = page.getByRole('button', { name: labels.ui.delete, exact: true });
        const draftKey = `kotowari:draft:${new URL(page.url()).origin}:pages/${slug}/body`;
        await page.evaluate(
          (key) =>
            localStorage.setItem(
              key,
              JSON.stringify({ body: 'Retained until deletion', revision: 'old' }),
            ),
          draftKey,
        );
        await trigger.click();
        const dialog = page.getByRole('dialog', { name: labels.pageDeletion.title, exact: true });
        const cancel = dialog.getByRole('button', { name: labels.common.cancel, exact: true });
        await expect(cancel).toBeFocused();
        expect((await cancel.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        expect(
          (await dialog.getByRole('button', { name: labels.ui.delete, exact: true }).boundingBox())!
            .height,
        ).toBeGreaterThanOrEqual(44);
        await expect(dialog).toContainText(title);
        await cancel.click();
        await expect(dialog).toHaveCount(0);
        await expect(trigger).toBeFocused();
        expect(writes).toHaveLength(0);
        await trigger.click();
        await dialog.getByRole('button', { name: labels.ui.delete, exact: true }).click();
        await expect.poll(() => writes.length).toBe(1);
        await expect(cancel).toBeDisabled();
        await expect(
          dialog.getByRole('button', { name: labels.ui.delete, exact: true }),
        ).toBeDisabled();
        await page.keyboard.press('Escape');
        await expect(dialog).toBeVisible();
        release();
        await expect(dialog.getByRole('alert')).toContainText('Document deletion unavailable');
        const retry = dialog.getByRole('button', { name: labels.pageDeletion.retry, exact: true });
        await expect(retry).toBeFocused();
        expect(await contrastFailures(page, '[role="dialog"]')).toEqual([]);
        await page.screenshot({ path: testInfo.outputPath('document-deletion-failure.png') });
        expect((await request.get(`/api/pages/${slug}`)).ok()).toBeTruthy();
        expect(await page.evaluate((key) => localStorage.getItem(key), draftKey)).not.toBeNull();
        await retry.click();
        await expect(page).toHaveURL(/\/pages$/);
        await expect(dialog).toHaveCount(0);
        expect(writes).toEqual([writes[0], writes[0]]);
        expect((await request.get(`/api/pages/${slug}`)).status()).toBe(404);
        expect(await page.evaluate((key) => localStorage.getItem(key), draftKey)).toBeNull();
      } finally {
        release();
        await request.delete(`/api/pages/${slug}`);
      }
    });
  }
}

test('confirmed deletion waits for its response without background route reload', async ({
  page,
  request,
}) => {
  const slug = `committed-delete-${Date.now()}`;
  await request.post('/api/pages', { data: { title: slug, slug } });
  const revision = page.waitForResponse('**/api/revision');
  await page.goto(`/pages/${slug}`);
  await revision;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let commit!: () => void;
  const committed = new Promise<void>((resolve) => {
    commit = resolve;
  });
  let reads = 0;
  await page.route(`**/api/pages/${slug}`, async (route) => {
    if (route.request().method() === 'GET') {
      reads++;
      return route.continue();
    }
    if (route.request().method() !== 'DELETE') return route.continue();
    const response = await route.fetch();
    commit();
    await gate;
    return route.fulfill({ response });
  });
  try {
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Delete document', exact: true });
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await committed;
    expect((await request.get(`/api/pages/${slug}`)).status()).toBe(404);
    // Observe beyond Shell's three-second refresh interval while the response is held.
    await page.waitForTimeout(4000);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Delete', exact: true })).toBeDisabled();
    expect(reads).toBe(0);
    release();
    await expect(page).toHaveURL(/\/pages$/);
    await expect(dialog).toHaveCount(0);
  } finally {
    release();
  }
});

test('a recovered editor draft cannot steal focus from deletion confirmation', async ({
  page,
  request,
}) => {
  const slug = `delete-focus-${Date.now()}`;
  expect((await request.post('/api/pages', { data: { slug, title: slug } })).ok()).toBeTruthy();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.addInitScript(
    (key) =>
      localStorage.setItem(
        `kotowari:draft:${location.origin}:pages/${key}/body`,
        JSON.stringify({ body: 'Recovered behind confirmation', revision: 'old' }),
      ),
    slug,
  );
  await page.route(`**/api/documents/pages/${slug}/body`, async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    await gate;
    return route.continue();
  });
  try {
    await page.goto(`/pages/${slug}`);
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Delete document', exact: true });
    const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true });
    await expect(cancel).toBeFocused();
    release();
    await expect(page.locator('textarea[aria-label="Markdown body"]')).toHaveValue(
      'Recovered behind confirmation',
    );
    await expect(cancel).toBeFocused();
    await cancel.click();
    await expect(dialog).toHaveCount(0);
    expect((await request.get(`/api/pages/${slug}`)).ok()).toBeTruthy();
  } finally {
    release();
    await request.delete(`/api/pages/${slug}`);
  }
});
