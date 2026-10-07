import { expect, test } from '@playwright/test';
import { contrastFailures } from './contrast.ts';

for (const scheme of ['light', 'dark']) {
  test(`inbox preferences recover storage failures with a closed menu in ${scheme}`, async ({
    page,
  }, testInfo) => {
    await page.addInitScript((color) => {
      localStorage.setItem('kotowari.color-scheme', color);
      localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
      localStorage.removeItem('kotowari.inbox.v1');
    }, scheme);
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/inbox');
    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      let failures = 0;
      Storage.prototype.setItem = function (key, value) {
        if (key === 'kotowari.inbox.v1' && failures++ < 2)
          throw new DOMException('Storage unavailable', 'QuotaExceededError');
        return original.call(this, key, value);
      };
    });
    await page.getByRole('button', { name: 'Display options' }).click();
    await page.getByRole('menuitem', { name: 'Enable priority inbox' }).click();
    await expect(page.getByRole('menu')).toHaveCount(0);
    const retry = page.getByRole('button', { name: 'Retry saving inbox changes' });
    await expect(retry).toBeFocused();
    expect(await page.evaluate(() => localStorage.getItem('kotowari.inbox.v1'))).toBeNull();
    // A second distinct action can fail with exactly the same message.
    await page.getByRole('button', { name: 'Display options' }).click();
    await page.getByRole('menuitem', { name: 'Compact density', exact: true }).click();
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(retry).toBeFocused();
    expect(await contrastFailures(page, '[role="alert"]')).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('inbox-preference-failure.png') });
    await retry.click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Notification actions' })).toBeFocused();
    const state = JSON.parse(
      (await page.evaluate(() => localStorage.getItem('kotowari.inbox.v1'))) ?? '{}',
    );
    expect(state.density).toBe('compact');
    expect(state.priorityInboxEnabled).toBe(false);
    await page.getByRole('button', { name: 'Display options' }).click();
    await expect(
      page.getByRole('menuitem', { name: 'Compact density', exact: true }),
    ).toBeVisible();
  });
}
