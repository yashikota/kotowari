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
    await expect(save).toBeDisabled();
    await section.locator('form').evaluate((form) => (form as HTMLFormElement).requestSubmit());
    expect(attempts).toBe(1);
  } finally {
    release();
  }
  await expect(section.getByRole('alert')).toContainText('Save unavailable');
  await expect(name).toHaveValue(nextName);
  await save.click();
  await expect(section.getByRole('status')).toHaveText('Workspace saved');
  await expect(section.getByRole('alert')).toHaveCount(0);
  await name.fill(`${nextName} revised`);
  await expect(section.getByRole('status')).toHaveCount(0);
  expect(
    (await request.patch('/api/workspace', { data: { name: initial.name } })).ok(),
  ).toBeTruthy();
});
