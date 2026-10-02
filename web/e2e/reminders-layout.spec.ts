import { expect, test } from '@playwright/test';

test('reminders retain their heading on failure and recover into usable mobile rows', async ({
  page,
  request,
}, testInfo) => {
  const title = `A long reminder title that needs room to remain understandable ${Date.now()}`;
  const response = await request.post('/api/issues', { data: { title } });
  expect(response.ok()).toBeTruthy();
  const issue = await response.json();
  const updated = await request.patch(`/api/issues/${issue.identifier}`, {
    data: { reminderAt: '2026-10-10T09:00:00Z' },
  });
  expect(updated.ok()).toBeTruthy();
  let fail = true;
  await page.route('**/api/initiatives', (route) =>
    fail
      ? route.fulfill({ status: 500, json: { error: 'Temporarily unavailable' } })
      : route.continue(),
  );
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/reminders');
  await expect(page.getByRole('heading', { name: 'Reminders', level: 2 })).toBeVisible();
  await expect(
    page
      .getByRole('alert')
      .filter({ has: page.getByRole('button', { name: 'Retry', exact: true }) }),
  ).toBeVisible();
  fail = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(
    page
      .getByRole('alert')
      .filter({ has: page.getByRole('button', { name: 'Retry', exact: true }) }),
  ).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('kotowari');
  const row = page.getByRole('listitem').filter({ hasText: title });
  await expect(row).toBeVisible();
  const dismiss = row.getByRole('button', { name: 'Dismiss', exact: true });
  await expect(dismiss).toBeInViewport();
  expect(
    await row.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
  ).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('reminders-mobile.png') });
  await dismiss.click();
  await expect(row).toHaveCount(0);
  expect((await (await request.get(`/api/issues/${issue.identifier}`)).json()).title).toBe(title);
  await request.delete(`/api/issues/${issue.identifier}`);
});
