import { expect, test } from '@playwright/test';
import { fillIssueSearch } from './issue-list-controls.ts';

for (const scheme of ['light', 'dark']) {
  test(`confirmed bulk writes do not clear a newer selection after refresh in ${scheme}`, async ({
    page,
    request,
  }) => {
    const stamp = `bulk-refresh-${scheme}-${Date.now()}`;
    const identifiers: string[] = [];
    let release = () => {};
    try {
      for (let index = 0; index < 2; index++) {
        const response = await request.post('/api/issues', {
          data: { title: `${stamp} ${index}`, status: 'todo' },
        });
        expect(response.ok()).toBeTruthy();
        identifiers.push((await response.json()).identifier);
      }
      await page.addInitScript(
        (color) => localStorage.setItem('kotowari.color-scheme', color),
        scheme,
      );
      await page.goto('/issues');
      await fillIssueSearch(page, stamp);
      const selectBoth = async () => {
        for (const identifier of identifiers)
          await page.getByRole('checkbox', { name: `Select ${identifier}`, exact: true }).check();
      };
      await selectBoth();
      let refreshing = false;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route('**/api/issues**', async (route) => {
        if (
          route.request().method() !== 'GET' ||
          new URL(route.request().url()).pathname !== '/api/issues'
        )
          return route.continue();
        refreshing = true;
        await gate;
        return route.continue();
      });
      await page.getByRole('button', { name: 'Actions', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Assignee', exact: true }).hover();
      await page.getByRole('menuitem', { name: 'Assign to me', exact: true }).click();
      await expect.poll(() => refreshing).toBe(true);
      for (const identifier of identifiers)
        await expect(
          page.getByRole('checkbox', { name: `Select ${identifier}`, exact: true }),
        ).not.toBeChecked();
      await selectBoth();
      const refreshed = page.waitForResponse(
        (response) => new URL(response.url()).pathname === '/api/issues',
      );
      release();
      await (await refreshed).finished();
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      for (const identifier of identifiers)
        await expect(
          page.getByRole('checkbox', { name: `Select ${identifier}`, exact: true }),
        ).toBeChecked();
      await page.getByRole('button', { name: 'Actions', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Assignee', exact: true }).hover();
      await page.getByRole('menuitem', { name: 'Unassign', exact: true }).click();
      await expect
        .poll(async () =>
          Promise.all(
            identifiers.map(
              async (identifier) =>
                (await (await request.get(`/api/issues/${identifier}`)).json()).assignee ?? '',
            ),
          ),
        )
        .toEqual(['', '']);
    } finally {
      release();
      for (const identifier of identifiers) await request.delete(`/api/issues/${identifier}`);
    }
  });
}
