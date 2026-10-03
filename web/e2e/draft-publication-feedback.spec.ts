import { expect, test } from '@playwright/test';

for (const scheme of ['light', 'dark']) {
  for (const recoverWithRetry of [false, true]) {
    test(`created issue remains confirmed when draft cleanup fails in ${scheme} with ${recoverWithRetry ? 'cleanup retry' : 'reload recovery'}`, async ({
      page,
      request,
    }, testInfo) => {
      const title = `Confirmed draft publication ${Date.now()}`;
      await page.addInitScript(
        ({ name, color }) => {
          localStorage.setItem('kotowari.color-scheme', color);
          localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
          if (!sessionStorage.getItem('draft-publication-seeded')) {
            localStorage.setItem(
              'kotowari.issue-drafts.v1',
              JSON.stringify([
                {
                  id: 'published-test',
                  title: name,
                  body: 'Only one issue should be created.',
                  createdAt: '2026-10-01T00:00:00Z',
                  updatedAt: '2026-10-01T00:00:00Z',
                },
              ]),
            );
            sessionStorage.setItem('draft-publication-seeded', 'true');
          }
          const state = window as Window & { draftCleanupFails?: boolean };
          const original = Storage.prototype.setItem;
          Storage.prototype.setItem = function (key, value) {
            if (key === 'kotowari.issue-drafts.v1' && state.draftCleanupFails)
              throw new DOMException('Draft cleanup unavailable', 'QuotaExceededError');
            return original.call(this, key, value);
          };
        },
        { name: title, color: scheme },
      );
      let creations = 0;
      await page.route('**/api/issues', async (route) => {
        if (route.request().method() === 'POST') creations++;
        await route.continue();
      });
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto('/drafts');
      await page.getByRole('button', { name: title, exact: true }).click();
      const composer = page.getByRole('dialog', { name: /^Create issue/ });
      await expect(composer.getByRole('textbox', { name: 'Issue title', exact: true })).toHaveValue(
        title,
      );
      await page.evaluate(() => {
        (window as Window & { draftCleanupFails?: boolean }).draftCleanupFails = true;
      });
      await composer.getByRole('button', { name: 'Create', exact: true }).click();
      await expect(page).toHaveURL(/\/issues\/[A-Z]+-\d+$/);
      const identifier = new URL(page.url()).pathname.split('/').at(-1)!;
      const notice = page.getByRole('alert').filter({
        has: page.getByRole('button', { name: 'Retry removing saved draft', exact: true }),
      });
      await expect(notice).toContainText(`Issue ${identifier} created`);
      await expect(notice).toContainText('Draft cleanup unavailable');
      await expect(composer).toHaveCount(0);
      await page.screenshot({
        path: testInfo.outputPath('draft-cleanup-failure.png'),
        animations: 'disabled',
      });
      const bounds = (await notice.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(360);
      await notice.getByRole('button', { name: 'Retry removing saved draft', exact: true }).click();
      await expect(notice).toContainText('Draft cleanup unavailable');
      expect(creations).toBe(1);
      if (recoverWithRetry) {
        await page.evaluate(() => {
          (window as Window & { draftCleanupFails?: boolean }).draftCleanupFails = false;
        });
        await notice
          .getByRole('button', { name: 'Retry removing saved draft', exact: true })
          .click();
        await expect(notice).toHaveCount(0);
        expect(await page.evaluate(() => localStorage.getItem('kotowari.issue-drafts.v1'))).toBe(
          '[]',
        );
        expect(creations).toBe(1);
        await request.delete(`/api/issues/${identifier}`);
        return;
      }
      await page.goto('/drafts');
      const card = page.getByTestId('issue-draft-card');
      await expect(card).toContainText(`Issue ${identifier} created`);
      await card.getByRole('button', { name: title, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/issues/${identifier}$`));
      await expect(composer).toHaveCount(0);
      expect(creations).toBe(1);
      const issues = await (await request.get('/api/issues')).json();
      expect(issues.filter((issue: { title: string }) => issue.title === title)).toHaveLength(1);
      await page.goto('/drafts');
      await card.getByRole('button', { name: 'Discard draft', exact: true }).click();
      await page
        .getByRole('dialog', { name: 'Discard this draft?' })
        .getByRole('button', { name: 'Discard', exact: true })
        .click();
      await expect(card).toHaveCount(0);
      expect(creations).toBe(1);
      await request.delete(`/api/issues/${identifier}`);
    });
  }
}
