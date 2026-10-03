import { expect, test, type Page } from '@playwright/test';

async function openMenu(page: Page, kind: string) {
  if (kind === 'issues') {
    await page.getByRole('button', { name: 'Issue options', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Remind me', exact: true }).hover();
  } else await page.getByRole('button', { name: 'Remind me', exact: true }).click();
}

for (const scheme of ['light', 'dark']) {
  for (const kind of ['issues', 'projects', 'initiatives']) {
    test(`${kind} reminder preserves input and recovers with consistent controls in ${scheme}`, async ({
      page,
      request,
    }, testInfo) => {
      const slug = `reminder-${kind}-${scheme}-${Date.now()}`;
      const response = await request.post(`/api/${kind}`, {
        data: kind === 'issues' ? { title: slug } : { slug, name: slug, status: 'planned' },
      });
      expect(response.ok()).toBeTruthy();
      const entity = await response.json();
      const key = kind === 'issues' ? entity.identifier : slug;
      const endpoint = `/api/${kind}/${key}`;
      await page.addInitScript((color) => {
        localStorage.setItem('kotowari.color-scheme', color);
        localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
      }, scheme);
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto(`/${kind}/${key}`);
      await openMenu(page, kind);
      await page.getByRole('menuitem', { name: 'Custom…', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Set reminder', exact: true });
      const input = dialog.getByRole('textbox', { name: 'Date and time' });
      await input.fill('');
      await dialog.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(dialog.getByText('Choose a future date and time.')).toBeVisible();
      await expect(input).toBeFocused();
      await input.fill('2020-01-02T03:04');
      await dialog.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(input).toBeFocused();
      await input.fill('2030-01-02T03:04');
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
            json: { error: 'Reminder temporarily unavailable' },
          });
        }
        return route.continue();
      });
      try {
        await dialog.getByRole('button', { name: 'Save', exact: true }).click();
        await expect(input).toBeDisabled();
        await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled();
        await page.keyboard.press('Escape');
        await page.keyboard.press('Enter');
        await expect(dialog).toBeVisible();
        expect(writes).toBe(1);
        release();
        await expect(dialog.getByRole('alert')).toContainText('Reminder temporarily unavailable');
        await expect(input).toHaveValue('2030-01-02T03:04');
        await expect(input).toBeEnabled();
        await page.screenshot({ path: testInfo.outputPath('reminder-failure.png') });
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        ).toBeTruthy();
        await input.fill('2030-02-03T04:05');
        await expect(dialog.getByRole('alert')).toHaveCount(0);
        await dialog.getByRole('button', { name: 'Save', exact: true }).click();
        await expect(dialog).toHaveCount(0);
        expect(writes).toBe(2);
        const saved = await (await request.get(endpoint)).json();
        expect(Date.parse(saved.reminderAt)).toBe(
          await page.evaluate(() => Date.parse('2030-02-03T04:05')),
        );
      } finally {
        release();
        await request.delete(endpoint);
      }
    });
  }
}

for (const kind of ['issues', 'projects', 'initiatives']) {
  test(`${kind} preset and removal failures retry the original operation`, async ({
    page,
    request,
  }) => {
    const slug = `reminder-preset-${kind}-${Date.now()}`;
    const response = await request.post(`/api/${kind}`, {
      data: kind === 'issues' ? { title: slug } : { slug, name: slug, status: 'planned' },
    });
    expect(response.ok()).toBeTruthy();
    const entity = await response.json();
    const key = kind === 'issues' ? entity.identifier : slug;
    const endpoint = `/api/${kind}/${key}`;
    let writes = 0;
    const bodies: Record<string, unknown>[] = [];
    await page.route(`**${endpoint}`, async (route) => {
      if (route.request().method() !== 'PATCH') return route.continue();
      writes++;
      bodies.push(route.request().postDataJSON());
      if (writes === 1 || writes === 3)
        return route.fulfill({ status: 503, json: { error: 'Try again' } });
      return route.continue();
    });
    try {
      await page.goto(`/${kind}/${key}`);
      await openMenu(page, kind);
      await page.getByRole('menuitem', { name: 'Tomorrow', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Set reminder', exact: true });
      await expect(dialog.getByRole('alert')).toBeVisible();
      await dialog.getByRole('button', { name: 'Retry saving reminder', exact: true }).click();
      await expect(dialog).toHaveCount(0);
      expect(bodies[1]).toEqual(bodies[0]);
      await openMenu(page, kind);
      await page.getByRole('menuitem', { name: 'Cancel reminder', exact: true }).click();
      const removal = page.getByRole('dialog', { name: 'Cancel reminder', exact: true });
      await expect(removal.getByRole('alert')).toContainText('Reminder could not be canceled');
      await expect(
        removal.getByText('The reminder is still active. Retry to cancel it.'),
      ).toBeVisible();
      await expect(removal.getByRole('textbox')).toHaveCount(0);
      await removal.getByRole('button', { name: 'Retry canceling reminder', exact: true }).click();
      await expect(removal).toHaveCount(0);
      expect(bodies[3]).toEqual(bodies[2]);
      expect((await (await request.get(endpoint)).json()).reminderAt).toBeFalsy();
      expect(writes).toBe(4);
    } finally {
      await request.delete(endpoint);
    }
  });
}
