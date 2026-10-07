import { expect, test } from '@playwright/test';
import { contrastFailures } from './contrast.ts';

for (const scheme of ['light', 'dark']) {
  test(`inbox deletion retains notifications after storage failure in ${scheme}`, async ({
    page,
    request,
  }, testInfo) => {
    const title = `Inbox retry ${scheme} ${Date.now()}`;
    const response = await request.post('/api/issues', { data: { title, status: 'todo' } });
    expect(response.ok()).toBeTruthy();
    const issue = (await response.json()) as { identifier: string };
    try {
      await page.addInitScript((color) => {
        localStorage.setItem('kotowari.color-scheme', color);
        localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
        localStorage.removeItem('kotowari.inbox.v1');
      }, scheme);
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto('/inbox');
      const rows = page
        .getByRole('region', { name: 'Notifications' })
        .getByRole('button', { name: new RegExp(`${issue.identifier}: ${title}`) });
      await expect(rows).toHaveCount(1);
      await page.getByRole('button', { name: 'Notification actions' }).click();
      await page.getByRole('menuitem', { name: 'Delete all', exact: true }).click();
      const dialog = page.getByRole('dialog');
      const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true });
      await expect(cancel).toBeFocused();
      for (const button of [
        cancel,
        dialog.getByRole('button', { name: 'Delete notifications', exact: true }),
      ]) {
        expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      }
      await page.evaluate(() => {
        const original = Storage.prototype.setItem;
        let failed = false;
        Storage.prototype.setItem = function (key, value) {
          if (key === 'kotowari.inbox.v1' && !failed) {
            failed = true;
            throw new DOMException('Storage unavailable', 'QuotaExceededError');
          }
          return original.call(this, key, value);
        };
      });
      await dialog.getByRole('button', { name: 'Delete notifications', exact: true }).click();
      await expect(dialog.getByRole('alert')).toContainText('Notifications could not be deleted');
      const retry = dialog.getByRole('button', { name: 'Retry deleting notifications' });
      await expect(retry).toBeFocused();
      await expect(rows).toHaveCount(1);
      expect(await page.evaluate(() => localStorage.getItem('kotowari.inbox.v1'))).toBeNull();
      expect(await contrastFailures(page, '[role="dialog"]')).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath('inbox-deletion-failure.png') });
      await retry.click();
      await expect(dialog).toHaveCount(0);
      await expect(rows).toHaveCount(0);
      expect((await request.get(`/api/issues/${issue.identifier}`)).ok()).toBeTruthy();
    } finally {
      await request.delete(`/api/issues/${issue.identifier}`);
    }
  });
}
