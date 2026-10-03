import { expect, test } from '@playwright/test';

for (const scheme of ['light', 'dark']) {
  for (const kind of ['issues', 'projects', 'initiatives']) {
    test(`${kind} reminder dismissal retains a failed row and permits other rows in ${scheme}`, async ({
      page,
      request,
    }, testInfo) => {
      const slug = `dismiss-${kind}-${scheme}-${Date.now()}`;
      const created = await request.post(`/api/${kind}`, {
        data: kind === 'issues' ? { title: slug } : { name: slug, slug, status: 'planned' },
      });
      expect(created.ok()).toBeTruthy();
      const entity = await created.json();
      const endpoint = `/api/${kind}/${kind === 'issues' ? entity.identifier : slug}`;
      expect(
        (await request.patch(endpoint, { data: { reminderAt: '2030-01-02T03:04:00Z' } })).ok(),
      ).toBeTruthy();
      const otherResponse = await request.post('/api/issues', {
        data: { title: `Other ${slug}` },
      });
      expect(otherResponse.ok()).toBeTruthy();
      const other = await otherResponse.json();
      expect(
        (
          await request.patch(`/api/issues/${other.identifier}`, {
            data: { reminderAt: '2030-01-02T03:04:00Z' },
          })
        ).ok(),
      ).toBeTruthy();
      let writes = 0;
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route(`**${endpoint}`, async (route) => {
        if (route.request().method() !== 'PATCH') return route.continue();
        writes++;
        if (writes === 1) {
          await gate;
          return route.fulfill({
            status: 503,
            json: { error: 'Dismissal temporarily unavailable' },
          });
        }
        return route.continue();
      });
      await page.addInitScript((color) => {
        localStorage.setItem('kotowari.color-scheme', color);
        localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
      }, scheme);
      await page.setViewportSize({ width: 360, height: 800 });
      try {
        await page.goto('/reminders');
        const row = page.getByRole('listitem').filter({
          has: page.getByRole('link', {
            name: kind === 'issues' ? `${entity.identifier}${slug}` : slug,
            exact: true,
          }),
        });
        const otherRow = page.getByRole('listitem').filter({
          has: page.getByRole('link', { name: `${other.identifier}Other ${slug}`, exact: true }),
        });
        const dismiss = row.getByRole('button', { name: 'Dismiss', exact: true });
        await dismiss.click();
        await expect(dismiss).toBeDisabled();
        await expect(row.getByRole('status')).toContainText('Dismissing reminder');
        await otherRow.getByRole('button', { name: 'Dismiss', exact: true }).click();
        await expect(otherRow).toHaveCount(0);
        expect(writes).toBe(1);
        release();
        await expect(row.getByRole('alert')).toContainText('Dismissal temporarily unavailable');
        await expect(dismiss).toBeEnabled();
        await expect(
          row.getByRole('button', { name: 'Retry dismissing', exact: true }),
        ).toBeFocused();
        await page.screenshot({
          path: testInfo.outputPath('reminder-dismiss-failure.png'),
          animations: 'disabled',
        });
        expect(
          await row.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
        ).toBeTruthy();
        await row.getByRole('button', { name: 'Retry dismissing', exact: true }).click();
        await expect(row).toHaveCount(0);
        await expect(
          page.getByRole('heading', { name: 'Reminders', exact: true }).locator('span'),
        ).toBeFocused();
        expect(writes).toBe(2);
        expect((await (await request.get(endpoint)).json()).reminderAt).toBeFalsy();
      } finally {
        release();
        await request.delete(endpoint);
        await request.delete(`/api/issues/${other.identifier}`);
      }
    });
  }
}
