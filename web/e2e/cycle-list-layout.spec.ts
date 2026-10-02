import { expect, test } from '@playwright/test';

test('cycle summaries keep long names and options usable on mobile', async ({
  page,
  request,
}, testInfo) => {
  const name = `A cycle with a descriptive name for the next planned delivery ${Date.now()}`;
  const response = await request.post('/api/cycles', {
    data: {
      startsAt: '2027-01-01T00:00:00Z',
      endsAt: '2027-01-15T00:00:00Z',
      status: 'upcoming',
    },
  });
  expect(response.ok()).toBeTruthy();
  const cycle = await response.json();
  expect(
    (await request.patch(`/api/cycles/${cycle.number}`, { data: { name } })).ok(),
  ).toBeTruthy();
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/cycles');
  const row = page.getByRole('region').filter({ has: page.getByText(name, { exact: true }) });
  await row.scrollIntoViewIfNeeded();
  await expect(row.getByRole('link')).toBeVisible();
  expect((await row.getByText(name, { exact: true }).boundingBox())!.width).toBeGreaterThan(130);
  expect(
    await row.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
  ).toBeTruthy();
  const options = row.getByRole('button', { name: 'Cycle options', exact: true });
  await expect(options).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath('cycle-row-mobile.png') });
  await options.click();
  await expect(
    page.getByRole('menuitem', { name: 'Edit cycle name and description…', exact: true }),
  ).toBeVisible();
});

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
