import { expect, test } from '@playwright/test';
import { contrastFailures } from './contrast.ts';

for (const scheme of ['light', 'dark']) {
  test(`issue archive failure preserves focus moved to the sidebar in ${scheme}`, async ({
    page,
    request,
  }) => {
    await page.addInitScript(
      (value) => localStorage.setItem('kotowari.color-scheme', value),
      scheme,
    );
    const created = await request.post('/api/issues', {
      data: { title: `Archive focus ${scheme} ${Date.now()}` },
    });
    expect(created.ok()).toBeTruthy();
    const issue = await created.json();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(`**/api/issues/${issue.identifier}`, async (route) => {
      if (route.request().method() !== 'PATCH') return route.continue();
      await gate;
      return route.fulfill({ status: 503, json: { error: 'Archive focus failure' } });
    });
    try {
      await page.goto(`/issues/${issue.identifier}`);
      await page.getByRole('button', { name: 'Issue options', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Archive', exact: true }).click();
      const feedback = page.locator('[data-issue-archive-feedback]');
      await expect(feedback.getByRole('status')).toBeVisible();
      const destination = page.getByRole('link', { name: 'Home', exact: true });
      await destination.focus();
      release();
      await expect(feedback.getByRole('alert')).toContainText('Archive focus failure');
      await expect(destination).toBeFocused();
      await expect(
        feedback.getByRole('button', { name: 'Retry archive change' }),
      ).not.toBeFocused();
    } finally {
      release();
      await request.delete(`/api/issues/${issue.identifier}`);
    }
  });
}

for (const scheme of ['light', 'dark']) {
  for (const initialArchived of [false, true]) {
    test(`issue ${initialArchived ? 'restore' : 'archive'} preserves state and retries in ${scheme}`, async ({
      page,
      request,
    }, testInfo) => {
      const response = await request.post('/api/issues', {
        data: { title: `Archive ${scheme} ${initialArchived} ${Date.now()}` },
      });
      expect(response.ok()).toBeTruthy();
      const issue = (await response.json()) as { identifier: string };
      if (initialArchived)
        expect(
          (
            await request.patch(`/api/issues/${issue.identifier}`, { data: { archived: true } })
          ).ok(),
        ).toBeTruthy();
      await page.addInitScript((color) => {
        localStorage.setItem('kotowari.color-scheme', color);
        localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
      }, scheme);
      await page.setViewportSize({ width: 360, height: 800 });
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const writes: unknown[] = [];
      await page.route(`**/api/issues/${issue.identifier}`, async (route) => {
        if (route.request().method() !== 'PATCH') return route.continue();
        writes.push(route.request().postDataJSON());
        if (writes.length === 1) {
          await gate;
          return route.fulfill({ status: 503, json: { error: 'Archive temporarily unavailable' } });
        }
        return route.continue();
      });
      try {
        await page.goto(`/issues/${issue.identifier}`);
        const options = page.getByRole('button', { name: 'Issue options', exact: true });
        await expect(options).toBeVisible();
        if (initialArchived) {
          await page.locator('[data-route-content]').focus();
          await page.keyboard.press('#');
        } else {
          await options.click();
          await page.getByRole('menuitem', { name: 'Archive', exact: true }).click();
        }
        const feedback = page.locator('[data-issue-archive-feedback]');
        await expect(feedback.getByRole('status')).toContainText('Saving archive change');
        await page.keyboard.press('#');
        expect(writes).toHaveLength(1);
        release();
        await expect(feedback.getByRole('alert')).toContainText('Archive temporarily unavailable');
        const retry = feedback.getByRole('button', { name: 'Retry archive change' });
        await expect(retry).toBeFocused();
        const persistedBefore = await (await request.get(`/api/issues/${issue.identifier}`)).json();
        expect(Boolean(persistedBefore.archivedAt)).toBe(initialArchived);
        expect(await contrastFailures(page, '[data-issue-archive-feedback]')).toEqual([]);
        await page.screenshot({ path: testInfo.outputPath('issue-archive-failure.png') });
        await retry.click();
        await expect(feedback.getByRole('status')).toContainText('Archive change saved');
        await expect(options).toBeFocused();
        expect(writes).toEqual([{ archived: !initialArchived }, { archived: !initialArchived }]);
        const persisted = await (await request.get(`/api/issues/${issue.identifier}`)).json();
        expect(Boolean(persisted.archivedAt)).toBe(!initialArchived);
      } finally {
        release();
        await request.delete(`/api/issues/${issue.identifier}`);
      }
    });
  }
}
