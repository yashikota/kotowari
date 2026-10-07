import { expect, test } from '@playwright/test';
import { contrastFailures } from './contrast.ts';

for (const scheme of ['light', 'dark']) {
  for (const operation of ['unread', 'archive', 'delete', 'snooze']) {
    test(`inbox ${operation} retains its context after storage failure in ${scheme}`, async ({
      page,
      request,
    }, testInfo) => {
      const title = `Storage ${operation} ${scheme} ${Date.now()}`;
      const response = await request.post('/api/issues', { data: { title, status: 'todo' } });
      const issue = (await response.json()) as { identifier: string };
      try {
        await page.addInitScript((color) => {
          localStorage.setItem('kotowari.color-scheme', color);
          localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
          localStorage.removeItem('kotowari.inbox.v1');
        }, scheme);
        await page.setViewportSize({ width: 360, height: 800 });
        await page.goto('/inbox');
        const row = page
          .getByRole('region', { name: 'Notifications' })
          .getByRole('button', { name: new RegExp(`${issue.identifier}: ${title}`) });
        const id = await row.getAttribute('data-inbox-activity-id');
        await row.click();
        const before = await page.evaluate(() => localStorage.getItem('kotowari.inbox.v1'));
        await page.evaluate(() => {
          const original = Storage.prototype.setItem;
          let failures = 0;
          Storage.prototype.setItem = function (key, value) {
            if (key === 'kotowari.inbox.v1' && failures++ < 2)
              throw new DOMException('Storage unavailable', 'QuotaExceededError');
            return original.call(this, key, value);
          };
        });
        const details = page.getByRole('region', { name: 'Notification details' });
        for (const button of await details.getByRole('button').all())
          expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        if (operation === 'snooze') {
          await details.getByRole('button', { name: 'Snooze notification' }).click();
          await page.getByRole('menuitem', { name: 'Tomorrow morning' }).click();
        } else {
          await details
            .getByRole('button', {
              name:
                operation === 'unread'
                  ? 'Mark as unread'
                  : operation === 'archive'
                    ? 'Archive'
                    : 'Delete notification',
              exact: true,
            })
            .click();
        }
        await expect(page.getByRole('alert')).toContainText('Inbox changes could not be saved');
        await expect(details).toContainText(title);
        expect(await page.evaluate(() => localStorage.getItem('kotowari.inbox.v1'))).toBe(before);
        const retry = page.getByRole('button', { name: 'Retry saving inbox changes' });
        await expect(retry).toBeFocused();
        await retry.click();
        await expect(retry).toBeFocused();
        expect(await contrastFailures(page, '[role="alert"]')).toEqual([]);
        await page.screenshot({ path: testInfo.outputPath('inbox-state-failure.png') });
        await retry.click();
        await expect(page.getByRole('alert')).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Notification actions' })).toBeFocused();
        const state = JSON.parse(
          (await page.evaluate(() => localStorage.getItem('kotowari.inbox.v1'))) ?? '{}',
        );
        if (operation === 'unread') expect(state.readIds).not.toContain(Number(id));
        if (operation === 'archive') expect(state.archivedIds).toContain(Number(id));
        if (operation === 'delete') expect(state.deletedIds).toContain(Number(id));
        if (operation === 'snooze') expect(state.snoozedUntil[id!]).toBeGreaterThan(Date.now());
        expect((await request.get(`/api/issues/${issue.identifier}`)).ok()).toBeTruthy();
      } finally {
        await request.delete(`/api/issues/${issue.identifier}`);
      }
    });
  }
}
