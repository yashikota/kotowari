import { expect, test } from '@playwright/test';

test('view name failure retains the draft through another save and retries', async ({
  page,
  request,
}) => {
  const slug = `view-save-${Date.now()}`;
  const response = await request.post('/api/views', {
    data: { slug, name: 'Original view', display: 'list', groupBy: 'none' },
  });
  expect(response.ok()).toBeTruthy();
  await page.goto(`/views/${slug}`);
  let failed = false;
  await page.route(`**/api/views/${slug}`, async (route) => {
    if (route.request().method() === 'PATCH' && route.request().postDataJSON().name && !failed) {
      failed = true;
      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.fulfill({ status: 503, body: 'Temporary save failure' });
    } else await route.continue();
  });
  const input = page.getByRole('textbox', { name: 'View name', exact: true });
  await input.fill('A name that must survive a failed save');
  await input.press('Tab');
  await expect(page.getByRole('status')).toHaveText('Saving view…');
  await expect(page.getByRole('alert')).toContainText('View changes could not be saved');
  await expect(input).toHaveValue('A name that must survive a failed save');
  await page.getByRole('button', { name: 'Add view to Favorites' }).click();
  await expect(page.getByRole('button', { name: 'Remove view from Favorites' })).toBeVisible();
  await expect(input).toHaveValue('A name that must survive a failed save');
  await page.getByRole('button', { name: 'Retry saving' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('View saved');
  await page.reload();
  await expect(input).toHaveValue('A name that must survive a failed save');
  await request.delete(`/api/views/${slug}`);
});
