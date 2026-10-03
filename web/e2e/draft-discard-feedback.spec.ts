import { expect, test } from '@playwright/test';

for (const scheme of ['light', 'dark']) {
  for (const all of [false, true]) {
    test(`draft ${all ? 'all' : 'single'} discard preserves saved content when storage fails in ${scheme}`, async ({
      page,
    }, testInfo) => {
      const title = `A long draft title describing the outcome and the work still needed ${Date.now()}`;
      await page.addInitScript(
        ({ color, name }) => {
          localStorage.setItem('kotowari.color-scheme', color);
          localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
          localStorage.setItem(
            'kotowari.issue-drafts.v1',
            JSON.stringify([
              {
                id: 'draft-one',
                title: name,
                body: 'Draft content must survive a failed deletion.',
                createdAt: '2026-10-01T00:00:00Z',
                updatedAt: '2026-10-02T00:00:00Z',
              },
              {
                id: 'draft-two',
                title: 'Another saved draft',
                body: 'Another saved description.',
                createdAt: '2026-10-01T00:00:00Z',
                updatedAt: '2026-10-01T00:00:00Z',
              },
            ]),
          );
        },
        { color: scheme, name: title },
      );
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto('/drafts');
      const cards = page.getByTestId('issue-draft-card');
      await expect(cards).toHaveCount(2);
      const first = cards.filter({ hasText: title });
      const open = first.getByRole('button', { name: title, exact: true });
      await expect(open).toBeVisible();
      expect((await open.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      expect(
        await open.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
      ).toBeTruthy();
      const discard = all
        ? page.getByRole('button', { name: 'Discard all', exact: true })
        : first.getByRole('button', { name: 'Discard draft', exact: true });
      expect((await discard.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await page.evaluate(() => {
        const state = window as Window & { draftStorageFails?: boolean };
        state.draftStorageFails = true;
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          if (key === 'kotowari.issue-drafts.v1' && state.draftStorageFails)
            throw new DOMException('Draft storage temporarily unavailable', 'QuotaExceededError');
          return original.call(this, key, value);
        };
      });
      await discard.click();
      const dialog = page.getByRole('dialog', {
        name: all ? 'Discard all drafts?' : 'Discard this draft?',
        exact: true,
      });
      await dialog
        .getByRole('button', { name: all ? 'Discard all' : 'Discard', exact: true })
        .click();
      await expect(dialog.getByRole('alert')).toContainText(
        'Draft storage temporarily unavailable',
      );
      await expect(cards).toHaveCount(2);
      expect(
        await page.evaluate(
          () => JSON.parse(localStorage.getItem('kotowari.issue-drafts.v1') ?? '[]').length,
        ),
      ).toBe(2);
      await page.screenshot({
        path: testInfo.outputPath('draft-discard-failure.png'),
        animations: 'disabled',
      });
      await page.evaluate(() => {
        (window as Window & { draftStorageFails?: boolean }).draftStorageFails = false;
      });
      await dialog.getByRole('button', { name: 'Retry discarding', exact: true }).click();
      await expect(dialog).toHaveCount(0);
      await expect(cards).toHaveCount(all ? 0 : 1);
      expect(
        await page.evaluate(
          () => JSON.parse(localStorage.getItem('kotowari.issue-drafts.v1') ?? '[]').length,
        ),
      ).toBe(all ? 0 : 1);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBeTruthy();
    });
  }
}
