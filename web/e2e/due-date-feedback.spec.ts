import { contrastFailures } from './contrast.ts';
import { expect, test } from '@playwright/test';

for (const scheme of ['light', 'dark']) {
  test(`due date editing retains failed input and distinguishes removal in ${scheme}`, async ({
    page,
    request,
  }, testInfo) => {
    const response = await request.post('/api/issues', {
      data: { title: `Due date recovery ${Date.now()}`, dueDate: '2030-01-02' },
    });
    expect(response.ok()).toBeTruthy();
    const issue = await response.json();
    const endpoint = `/api/issues/${issue.identifier}`;
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
        return route.fulfill({ status: 503, json: { error: 'Date saving unavailable' } });
      }
      if (writes === 3)
        return route.fulfill({ status: 503, json: { error: 'Date removal unavailable' } });
      return route.continue();
    });
    await page.addInitScript((color) => {
      localStorage.setItem('kotowari.color-scheme', color);
      localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
    }, scheme);
    await page.setViewportSize({ width: 360, height: 800 });
    try {
      await page.goto(`/issues/${issue.identifier}`);
      await page.getByRole('button', { name: 'Issue options', exact: true }).focus();
      await page.keyboard.press('Shift+d');
      const dialog = page.getByRole('dialog', { name: 'Set due date', exact: true });
      const input = dialog.getByRole('textbox', { name: 'Due date', exact: true });
      await expect(input).toHaveValue('2030-01-02');
      await input.fill('');
      await expect(dialog.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
      await input.fill('2030-02-03');
      await input.press('Enter');
      await expect(input).toBeDisabled();
      await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled();
      await expect(
        dialog.getByRole('button', { name: 'Remove due date', exact: true }),
      ).toBeDisabled();
      await page.keyboard.press('Escape');
      await page.keyboard.press('Enter');
      await expect(dialog).toBeVisible();
      expect(writes).toBe(1);
      release();
      await expect(dialog.getByRole('alert')).toContainText('Due date could not be saved');
      await expect(input).toHaveValue('2030-02-03');
      await expect(input).toBeEnabled();
      expect(await contrastFailures(page, '[role=dialog]')).toEqual([]);
      await page.screenshot({
        path: testInfo.outputPath('due-date-failure.png'),
        animations: 'disabled',
      });
      await input.fill('2020-01-02');
      await expect(dialog.getByRole('alert')).toHaveCount(0);
      await input.press('Enter');
      await expect(dialog).toHaveCount(0);
      expect((await (await request.get(endpoint)).json()).dueDate).toBe('2020-01-02');
      await page.getByRole('button', { name: 'Issue options', exact: true }).focus();
      await page.keyboard.press('Control+Shift+d');
      const removal = page.getByRole('dialog', { name: 'Remove due date', exact: true });
      await expect(removal.getByRole('alert')).toContainText('Due date could not be removed');
      await expect(
        removal.getByText('The due date is still set. Retry to remove it.'),
      ).toBeVisible();
      await expect(removal.getByRole('textbox')).toHaveCount(0);
      expect(await contrastFailures(page, '[role=dialog]')).toEqual([]);
      await removal.getByRole('button', { name: 'Retry removing due date', exact: true }).click();
      await expect(removal).toHaveCount(0);
      expect((await (await request.get(endpoint)).json()).dueDate).toBeNull();
      expect(writes).toBe(4);
    } finally {
      release();
      await request.delete(endpoint);
    }
  });
}

test('a failed due date preset retries the same date', async ({ page, request }) => {
  const response = await request.post('/api/issues', {
    data: { title: `Preset recovery ${Date.now()}` },
  });
  const issue = await response.json();
  const endpoint = `/api/issues/${issue.identifier}`;
  const bodies: Record<string, unknown>[] = [];
  await page.route(`**${endpoint}`, async (route) => {
    if (route.request().method() !== 'PATCH') return route.continue();
    bodies.push(route.request().postDataJSON());
    if (bodies.length === 1)
      return route.fulfill({ status: 503, json: { error: 'Preset unavailable' } });
    return route.continue();
  });
  try {
    await page.goto(`/issues/${issue.identifier}`);
    await page.getByRole('button', { name: 'Issue options', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Due date', exact: true }).hover();
    await page.getByRole('menuitem', { name: 'Tomorrow', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Set due date', exact: true });
    await expect(dialog.getByRole('alert')).toContainText('Preset unavailable');
    await dialog.getByRole('button', { name: 'Retry saving due date', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(bodies).toHaveLength(2);
    expect(bodies[1]).toEqual(bodies[0]);
  } finally {
    await request.delete(endpoint);
  }
});
