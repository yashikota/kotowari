import { expect, test } from '@playwright/test';

test('empty projects page explains projects and opens project creation', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/projects');

  const emptyState = page.getByRole('region', { name: 'Projects' });
  await expect(emptyState).toBeVisible();
  await expect(emptyState.getByRole('heading', { name: 'Projects', level: 2 })).toBeVisible();
  await expect(emptyState).toContainText(
    'Projects are larger units of work with a clear outcome, such as a feature you want to ship.',
  );

  await emptyState.getByRole('button', { name: 'Create new project' }).click();
  await expect(page.getByRole('dialog', { name: 'New project' })).toBeVisible();
});

test('empty projects state remains usable on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/projects');

  const emptyState = page.getByRole('region', { name: 'Projects' });
  await expect(emptyState).toBeVisible();
  await expect(emptyState.getByRole('button', { name: 'Create new project' })).toBeInViewport();

  const contentFits = await emptyState.evaluate(
    (section) => section.scrollWidth <= section.clientWidth + 1,
  );
  expect(contentFits).toBe(true);
});
