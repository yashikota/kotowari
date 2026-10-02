import { expect, test } from '@playwright/test';

test('empty cycle list offers readable creation and prevents repeated requests', async ({
  page,
}, testInfo) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requests = 0;
  await page.route('**/api/cycles', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: [] });
    requests++;
    await pending;
    await route.continue();
  });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/cycles');
  const create = page.getByRole('button', { name: 'New cycle', exact: true });
  await expect(create).toHaveCount(2);
  await expect(create.last()).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath('cycles-empty-mobile.png') });
  try {
    await create.last().click();
    await expect(create.first()).toBeDisabled();
    await expect(create.last()).toBeDisabled();
    await create.first().dispatchEvent('click');
    await expect.poll(() => requests).toBe(1);
  } finally {
    release();
  }
  await expect(page).toHaveURL(/\/cycles\/\d+/);
});
