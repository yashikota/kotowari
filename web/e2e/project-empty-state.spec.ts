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

  const emptyState = page.getByRole('region', { name: 'Projects' });
  await expect(emptyState).toBeVisible();
  await expect(emptyState.getByRole('heading', { name: 'Projects', level: 2 })).toBeVisible();
  await expect(emptyState).toContainText(
    'Projects are larger units of work with a clear outcome, such as a feature you want to ship. A project brings together issues and optional documents.',
  );
  await expect(emptyState.getByRole('link', { name: 'Documentation' })).toHaveAttribute(
    'href',
    '/pages',
  );
  const [emptyBounds, headingBounds, descriptionBounds] = await Promise.all([
    emptyState.boundingBox(),
    emptyState.getByRole('heading', { name: 'Projects', level: 2 }).boundingBox(),
    emptyState
      .getByText(
        'Projects are larger units of work with a clear outcome, such as a feature you want to ship. A project brings together issues and optional documents.',
      )
      .boundingBox(),
  ]);
  expect(emptyBounds).not.toBeNull();
  expect(headingBounds).not.toBeNull();
  expect(descriptionBounds).not.toBeNull();
  expect(emptyBounds!.height).toBeGreaterThan(600);
  expect(Math.abs(emptyBounds!.y + emptyBounds!.height / 2 - 450)).toBeLessThan(60);
  expect(descriptionBounds!.width).toBeLessThanOrEqual(340);
  expect(Math.abs(headingBounds!.x - descriptionBounds!.x)).toBeLessThanOrEqual(1);

  const createProject = emptyState.getByRole('button', { name: 'Create new project' });
  await expect(createProject.getByText('N', { exact: true })).toBeVisible();
  await expect(createProject.getByText('P', { exact: true })).toBeVisible();
  const [createBounds, documentationBounds] = await Promise.all([
    createProject.boundingBox(),
    emptyState.getByRole('link', { name: 'Documentation' }).boundingBox(),
  ]);
  expect(createBounds).not.toBeNull();
  expect(documentationBounds).not.toBeNull();
  expect(Math.abs(createBounds!.y - documentationBounds!.y)).toBeLessThanOrEqual(1);
  await createProject.click();
  await expect(page.getByRole('dialog', { name: 'New project' })).toBeVisible();
});

test('empty projects state remains usable on a narrow viewport', async ({ page, request }) => {
  await removeExistingProjects(request);
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
