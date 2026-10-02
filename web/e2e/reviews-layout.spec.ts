import { expect, test } from '@playwright/test';

test('review rows preserve long titles and links on mobile', async ({
  page,
  request,
}, testInfo) => {
  const title = `A detailed task explaining the reason for this change ${Date.now()}`;
  const prTitle =
    'A pull request with a long descriptive title to make the review queue understandable';
  const response = await request.post('/api/issues', { data: { title, status: 'in_progress' } });
  expect(response.ok()).toBeTruthy();
  const issue = await response.json();
  const url = 'https://github.com/example/repo/pull/123456';
  expect(
    (
      await request.post(`/api/issues/${issue.identifier}/links`, {
        data: { url, title: prTitle, kind: 'pullRequest' },
      })
    ).ok(),
  ).toBeTruthy();
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/reviews');
  const row = page.getByRole('article').filter({ hasText: title });
  const pr = row.getByRole('link', { name: prTitle, exact: true });
  await expect(pr).toHaveAttribute('href', url);
  await expect(pr).toHaveAttribute('target', '_blank');
  await expect(row.getByRole('link', { name: issue.identifier, exact: true })).toBeInViewport();
  expect(
    await row.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
  ).toBeTruthy();
  expect((await pr.boundingBox())!.width).toBeGreaterThan(220);
  await expect(row.locator('time')).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath('reviews-mobile.png') });
  await request.delete(`/api/issues/${issue.identifier}`);
});
