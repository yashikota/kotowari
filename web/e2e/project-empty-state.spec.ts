import { expect, test, type APIRequestContext } from '@playwright/test';

async function removeExistingProjects(request: APIRequestContext) {
  const response = await request.get('/api/projects');
  expect(response.ok()).toBeTruthy();
  const projects: Array<{ slug: string }> = await response.json();
  for (const project of projects) {
    const deleted = await request.delete(`/api/projects/${project.slug}`);
    expect(deleted.ok()).toBeTruthy();
  }
}

test('empty projects page explains projects and opens project creation', async ({
  page,
  request,
}) => {
  await removeExistingProjects(request);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/projects');

  const workspacePanel = page.getByTestId('workspace-panel');
  const panelBounds = await workspacePanel.boundingBox();
  expect(panelBounds).not.toBeNull();
  expect(Math.abs(panelBounds!.x - 244)).toBeLessThanOrEqual(1);
  expect(Math.abs(panelBounds!.y - 8)).toBeLessThanOrEqual(1);
  expect(Math.abs(panelBounds!.width - 1188)).toBeLessThanOrEqual(2);
  expect(Math.abs(panelBounds!.height - 856)).toBeLessThanOrEqual(2);
  await expect(workspacePanel).toHaveCSS('border-radius', '12px');

  const pageHeading = page.getByRole('heading', { name: 'Projects', level: 2 }).first();
  const pageHeadingBounds = await pageHeading.boundingBox();
  expect(pageHeadingBounds).not.toBeNull();
  expect(Math.abs(pageHeadingBounds!.x - 263)).toBeLessThanOrEqual(1);
  expect(Math.abs(pageHeadingBounds!.y - 22.5)).toBeLessThanOrEqual(1);
  expect(pageHeadingBounds!.width).toBeGreaterThan(50);
  expect(pageHeadingBounds!.height).toBe(16);

  const emptyState = page.getByRole('region', { name: 'Projects' });
  await expect(emptyState).toBeVisible();
  await expect(emptyState.getByRole('heading', { name: 'Projects', level: 2 })).toBeVisible();
  await expect(emptyState).toContainText(
    'Projects are larger units of work with a clear outcome, such as a new feature you want to ship. Keep related issues and optional documents together so progress is easy to follow.',
  );
  const illustration = emptyState.locator('svg');
  const [emptyBounds, illustrationBounds, headingBounds, descriptionBounds] = await Promise.all([
    emptyState.boundingBox(),
    illustration.boundingBox(),
    emptyState.getByRole('heading', { name: 'Projects', level: 2 }).boundingBox(),
    emptyState
      .getByText(
        'Projects are larger units of work with a clear outcome, such as a new feature you want to ship. Keep related issues and optional documents together so progress is easy to follow.',
      )
      .boundingBox(),
  ]);
  expect(emptyBounds).not.toBeNull();
  expect(headingBounds).not.toBeNull();
  expect(descriptionBounds).not.toBeNull();
  expect(emptyBounds!.height).toBeGreaterThan(600);
  expect(Math.abs(emptyBounds!.y - 96)).toBeLessThanOrEqual(1);
  expect(Math.abs(emptyBounds!.y + emptyBounds!.height / 2 - 480)).toBeLessThanOrEqual(1);
  expect(illustrationBounds).not.toBeNull();
  expect(Math.abs(illustrationBounds!.x - 668)).toBeLessThanOrEqual(1);
  expect(illustrationBounds!.width).toBe(77);
  expect(illustrationBounds!.height).toBe(80);
  expect(Math.abs(headingBounds!.x - 668)).toBeLessThanOrEqual(1);
  expect(Math.abs(headingBounds!.y - 453.6)).toBeLessThanOrEqual(2);
  expect(Math.abs(descriptionBounds!.x - 668)).toBeLessThanOrEqual(1);
  expect(Math.abs(descriptionBounds!.y - 484.6)).toBeLessThanOrEqual(2);
  expect(Math.abs(descriptionBounds!.width - 340)).toBeLessThanOrEqual(1);
  expect(Math.abs(headingBounds!.x - descriptionBounds!.x)).toBeLessThanOrEqual(1);

  const createProject = emptyState.getByRole('button', { name: 'Create new project' });
  await expect(createProject.getByText('N', { exact: true })).toBeVisible();
  await expect(createProject.getByText('P', { exact: true })).toBeVisible();
  const createBounds = await createProject.boundingBox();
  expect(createBounds).not.toBeNull();
  expect(Math.abs(createBounds!.x - 668)).toBeLessThanOrEqual(1);
  expect(Math.abs(createBounds!.y - 581.4)).toBeLessThanOrEqual(2);
  expect(createBounds!.height).toBe(28);
  await createProject.click();
  await expect(page.getByRole('dialog', { name: 'New project' })).toBeVisible();
});

test('empty projects state remains usable on a narrow viewport', async ({ page, request }) => {
  await removeExistingProjects(request);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/projects');

  const emptyState = page.getByRole('region', { name: 'Projects' });
  const workspacePanel = page.getByTestId('workspace-panel');
  await expect(emptyState).toBeVisible();
  await expect(emptyState.getByRole('button', { name: 'Create new project' })).toBeInViewport();
  const panelBounds = await workspacePanel.boundingBox();
  expect(panelBounds).not.toBeNull();
  expect(panelBounds!.x).toBe(0);
  expect(panelBounds!.y).toBe(0);
  expect(panelBounds!.width).toBe(390);
  expect(panelBounds!.height).toBe(844);

  const contentFits = await emptyState.evaluate(
    (section) => section.scrollWidth <= section.clientWidth + 1,
  );
  expect(contentFits).toBe(true);
});
