import { expect, test } from '@playwright/test';

test('custom project workflow states can be configured, assigned, filtered, and removed', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const statusName = `Review ${stamp}`;
  const statusId = `review-${stamp}`;
  const projectName = `Status project ${stamp}`;
  const projectSlug = `status-project-${stamp}`;
  const settings = page.getByRole('region', { name: 'Project statuses' });
  const inProgress = settings.getByRole('region', { name: 'In progress' });

  await page.goto('/config');
  await expect(settings.getByLabel('Status name: In Progress')).toHaveValue('In Progress');
  await inProgress.getByRole('button', { name: 'Create new project status' }).click();
  await inProgress.getByLabel('New status name').fill(statusName);
  await inProgress.getByLabel('Description', { exact: true }).fill('Reviewing the release');
  await inProgress.getByRole('button', { name: 'Add status' }).click();
  await expect(settings.getByRole('status')).toHaveText('Project workflow saved.');
  await expect(settings.getByLabel(`Status name: ${statusName}`)).toHaveValue(statusName);

  const createResponse = await request.post('/api/projects', {
    data: {
      name: projectName,
      slug: projectSlug,
      status: 'planned',
      workflowStatus: 'planned',
      priority: 2,
    },
  });
  expect(createResponse.ok()).toBeTruthy();

  await page.goto(`/projects/${projectSlug}`);
  await page.getByLabel('Project status').selectOption(statusId);
  await expect
    .poll(async () => {
      const response = await request.get(`/api/projects/${projectSlug}`);
      const value = (await response.json()) as { status: string; workflowStatus: string };
      return `${value.status}:${value.workflowStatus}`;
    })
    .toBe(`started:${statusId}`);

  await page.goto(`/projects?status=${statusId}`);
  await expect(page.getByText(projectName, { exact: true })).toBeVisible();

  await page.goto(`/projects/${projectSlug}`);
  await page.getByLabel('Project status').selectOption('planned');
  await page.goto('/config');
  await settings.getByRole('button', { name: `Remove ${statusName}` }).click();
  await expect(settings.getByRole('status')).toHaveText('Project workflow saved.');
  await expect(settings.getByLabel(`Status name: ${statusName}`)).toHaveCount(0);
});
