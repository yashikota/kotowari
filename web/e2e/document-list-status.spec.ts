import { expect, test } from '@playwright/test';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import ja from '../src/i18n/locales/ja.json' with { type: 'json' };
import { contrastFailures } from './contrast.ts';

for (const scheme of ['light', 'dark']) {
  for (const [locale, labels] of [
    ['en', en],
    ['ja', ja],
  ] as const) {
    test(`document list statuses are readable and localized in ${locale}/${scheme}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.addInitScript((color) => {
        localStorage.setItem('kotowari.color-scheme', color);
        localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
      }, scheme);
      await page.route('**/api/workspace', async (route) => {
        const response = await route.fetch();
        return route.fulfill({ json: { ...(await response.json()), locale } });
      });
      const statuses = ['proposed', 'accepted', 'deprecated', 'superseded'] as const;
      const documents = statuses.map((status, index) => ({
        id: index + 1,
        slug: `readable-${status}`,
        identifier: `ADR-${index + 1}`,
        title: `A detailed ${status} document with a long title for narrow screens`,
        parentId: null,
        projectId: null,
        status,
        tags: [],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-02-01T00:00:00Z',
      }));
      await page.route('**/api/pages', (route) => route.fulfill({ json: documents }));
      await page.route('**/api/adrs', (route) => route.fulfill({ json: documents }));
      for (const kind of ['pages', 'adrs']) {
        await page.goto(`/${kind}`);
        await expect(page.locator('[data-document-status]')).toHaveCount(statuses.length);
        for (const document of documents) {
          const row = page.locator('main a').filter({ hasText: document.title });
          const status = row.locator('[data-document-status]');
          await expect(status).toHaveText(labels.adrStatus[document.status]);
          expect(
            await row.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
          ).toBe(true);
          const statusBounds = await status.boundingBox();
          const titleBounds = await row.getByText(document.title, { exact: true }).boundingBox();
          expect(statusBounds).not.toBeNull();
          expect(titleBounds).not.toBeNull();
          if (kind === 'pages')
            expect(statusBounds!.y).toBeGreaterThanOrEqual(titleBounds!.y + titleBounds!.height);
          expect(
            await status.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
          ).toBe(true);
        }
        expect(await contrastFailures(page, 'main')).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        await page.screenshot({ path: testInfo.outputPath(`${kind}-${locale}-${scheme}.png`) });
      }
    });
  }
}
