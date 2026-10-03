import { expect, test } from '@playwright/test';

for (const scheme of ['light', 'dark']) {
  test(`draft reading recovers without losing content in ${scheme}`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.addInitScript((color) => {
      localStorage.setItem('kotowari.color-scheme', color);
      localStorage.setItem(
        'kotowari.issue-drafts.v1',
        JSON.stringify([
          {
            id: 'read-draft',
            title: 'Preserved draft',
            body: 'Saved content',
            updatedAt: '2026-10-01T00:00:00Z',
          },
        ]),
      );
      const state = window as Window & { draftReadFails?: boolean };
      state.draftReadFails = true;
      const original = Storage.prototype.getItem;
      Storage.prototype.getItem = function (key) {
        if (key === 'kotowari.issue-drafts.v1' && state.draftReadFails)
          throw new DOMException('Draft storage unavailable', 'SecurityError');
        return original.call(this, key);
      };
    }, scheme);
    await page.goto('/drafts');
    const retry = page.getByRole('button', { name: 'Retry loading drafts', exact: true });
    await expect(retry).toBeVisible();
    await expect(page.getByText('No active drafts', { exact: true })).toHaveCount(0);
    await page.evaluate(() => {
      (window as Window & { draftReadFails?: boolean }).draftReadFails = false;
    });
    await retry.click();
    const open = page.getByRole('button', { name: 'Preserved draft', exact: true });
    await expect(open).toBeEnabled();
    await page.evaluate(() => {
      (window as Window & { draftReadFails?: boolean }).draftReadFails = true;
      window.dispatchEvent(new Event('kotowari:issue-drafts-changed'));
    });
    await expect(retry).toBeVisible();
    await expect(open).toBeDisabled();
    await expect(page.getByTestId('issue-draft-card')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Discard all', exact: true })).toBeDisabled();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    await page.evaluate(() => {
      (window as Window & { draftReadFails?: boolean }).draftReadFails = false;
    });
    await retry.click();
    await expect(open).toBeEnabled();
    await expect(retry).toHaveCount(0);
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem('kotowari.issue-drafts.v1')!)[0].body,
      ),
    ).toBe('Saved content');
  });
}
