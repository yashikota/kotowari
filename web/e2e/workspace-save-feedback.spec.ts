import { expect, test } from '@playwright/test';

test('workspace save shows pending state, retains failed input and clears stale feedback', async ({
  page,
  request,
}) => {
  const initial = await (await request.get('/api/workspace')).json();
  await page.goto('/config');
  const section = page.getByRole('region', { name: 'Workspace', exact: true });
  const name = section.getByRole('textbox', { name: 'Name', exact: true });
  const save = section.getByRole('button', { name: 'Save workspace', exact: true });
  const nextName = `Workspace ${Date.now()}`;
  await name.fill(nextName);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let attempts = 0;
  await page.route('**/api/workspace', async (route) => {
    if (route.request().method() !== 'PATCH') return route.continue();
    attempts++;
    if (attempts === 1) {
      await pending;
      await route.fulfill({ status: 500, json: { error: 'Save unavailable' } });
    } else await route.continue();
  });
  try {
    await save.click();
    await expect(name).toBeDisabled();
    await expect(section.getByRole('status')).toHaveText('Saving workspace…');
    await expect(save).toBeDisabled();
    await section.locator('form').evaluate((form) => (form as HTMLFormElement).requestSubmit());
    expect(attempts).toBe(1);
  } finally {
    release();
  }
  await expect(section.getByRole('alert')).toContainText('Save unavailable');
  await expect(name).toHaveValue(nextName);
  await section.getByRole('alert').getByRole('button', { name: 'Retry saving' }).click();
  await expect(section.getByRole('status')).toHaveText('Workspace saved');
  await expect(section.getByRole('alert')).toHaveCount(0);
  await name.fill(`${nextName} revised`);
  await expect(section.getByRole('status')).toHaveCount(0);
  expect(
    (await request.patch('/api/workspace', { data: { name: initial.name } })).ok(),
  ).toBeTruthy();
});

for (const scheme of ['light', 'dark']) {
  test(`workspace drafts survive another settings save and recover consistently in ${scheme}`, async ({
    page,
    request,
  }, testInfo) => {
    const original = await (await request.get('/api/workspace')).json();
    await page.addInitScript((value) => {
      localStorage.setItem('kotowari.color-scheme', value);
      localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
    }, scheme);
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/config');
    const workspace = page.getByRole('region', { name: 'Workspace', exact: true });
    const name = workspace.getByRole('textbox', { name: 'Name', exact: true });
    const draftName = `My personal workspace for planning and recording useful decisions ${Date.now()}`;
    try {
      await name.fill(draftName);
      await page.getByRole('button', { name: 'Save cycle schedule', exact: true }).click();
      await expect(page.getByText('Cycle schedule saved', { exact: true })).toBeVisible();
      await expect(name).toHaveValue(draftName);
      let attempts = 0;
      await page.route('**/api/workspace', async (route) => {
        if (route.request().method() !== 'PATCH' || !('name' in route.request().postDataJSON()))
          return route.continue();
        attempts += 1;
        if (attempts === 1)
          await route.fulfill({ status: 503, body: 'Temporary workspace settings failure' });
        else await route.continue();
      });
      await workspace.getByRole('button', { name: 'Save workspace', exact: true }).click();
      const alert = workspace.getByRole('alert');
      await expect(alert).toContainText('Workspace changes could not be saved');
      await expect(alert).toContainText('Temporary workspace settings failure');
      await expect(name).toHaveValue(draftName);
      await alert.scrollIntoViewIfNeeded();
      const retry = alert.getByRole('button', { name: 'Retry saving' });
      await retry.focus();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBeTruthy();
      await page.screenshot({ path: testInfo.outputPath('workspace-settings-failure.png') });
      await retry.press('Enter');
      await expect(alert).toBeHidden();
      await expect(workspace.getByRole('status')).toHaveText('Workspace saved');
      await expect(
        workspace.getByRole('button', { name: 'Save workspace', exact: true }),
      ).toBeFocused();
      expect(attempts).toBe(2);
      await page.reload();
      await expect(name).toHaveValue(draftName);
      await name.fill(`${draftName} revised`);
      await expect(workspace.getByRole('status')).toBeHidden();
    } finally {
      await request.patch('/api/workspace', {
        data: { name: original.name, timezone: original.timezone, locale: original.locale },
      });
    }
  });
}
