import { expect, test } from '@playwright/test';

test('project save feedback retains failed edits and retries without blocking other fields', async ({
  page,
  request,
}, testInfo) => {
  const slug = `save-feedback-${Date.now()}`;
  const name = 'Project save feedback';
  const response = await request.post('/api/projects', { data: { slug, name } });
  expect(response.ok()).toBeTruthy();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/projects/${slug}`);
  const summary = page.getByRole('textbox', { name: 'Project summary', exact: true });
  const revised = 'Keep this outcome after a failed save';
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let attempts = 0;
  let releaseSuccess!: () => void;
  const delayedSuccess = new Promise<void>((resolve) => {
    releaseSuccess = resolve;
  });
  await page.route(`**/api/projects/${slug}`, async (route) => {
    if (route.request().method() !== 'PATCH') return route.continue();
    attempts++;
    if (attempts === 1) {
      await pending;
      return route.fulfill({ status: 500, json: { error: 'Project save unavailable' } });
    }
    if (attempts === 3) await delayedSuccess;
    return route.continue();
  });
  await summary.fill(revised);
  await page.getByRole('heading').filter({ hasText: name }).click();
  try {
    await expect(
      page.getByRole('status').filter({ hasText: 'Saving project changes' }),
    ).toBeVisible();
    await expect(summary).toHaveValue(revised);
  } finally {
    release();
  }
  const failure = page.getByRole('alert').filter({ hasText: 'Project changes could not be saved' });
  await expect(failure).toContainText('Project save unavailable');
  await expect(summary).toHaveValue(revised);
  await page.screenshot({ path: testInfo.outputPath('project-save-failure.png') });
  await failure.getByRole('button', { name: 'Retry saving' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Project changes saved' })).toBeVisible();
  await expect(failure).toHaveCount(0);
  await expect
    .poll(async () => (await (await request.get(`/api/projects/${slug}`)).json()).summary)
    .toBe(revised);
  await summary.fill(`${revised} updated`);
  await expect(page.getByRole('status').filter({ hasText: 'Project changes saved' })).toHaveCount(
    0,
  );
  await page.getByRole('heading').filter({ hasText: name }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Saving project changes' }),
  ).toBeVisible();
  await summary.fill(`${revised} newer draft`);
  releaseSuccess();
  await expect(page.getByRole('status').filter({ hasText: 'Saving project changes' })).toHaveCount(
    0,
  );
  await expect(summary).toHaveValue(`${revised} newer draft`);
  await expect(page.getByRole('status').filter({ hasText: 'Project changes saved' })).toHaveCount(
    0,
  );
  await page.getByRole('heading').filter({ hasText: name }).click();
  const priority = page.getByRole('combobox', { name: 'Priority', exact: true });
  await priority.selectOption('2');
  await expect
    .poll(async () => (await (await request.get(`/api/projects/${slug}`)).json()).priority)
    .toBe(2);
  await page.reload();
  await expect(summary).toHaveValue(`${revised} newer draft`);
  await expect(priority).toHaveValue('2');
  await request.delete(`/api/projects/${slug}`);
});
