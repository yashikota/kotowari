import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

async function choose(page: Page, label: string, option: string, scope: Page | Locator = page) {
  await scope.getByRole('combobox', { name: label }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

test('custom issue workflow states can be configured, used, filtered, and removed', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const statusName = `Review ${stamp}`;
  const statusId = `review-${stamp}`;
  const settings = page.getByRole('region', { name: 'Issue statuses' });

  await page.goto('/config');
  await expect(settings.getByLabel('Status name: Duplicate')).toHaveValue('Duplicate');
  await settings.getByLabel('New status name').fill(statusName);
  await settings.getByLabel('Description', { exact: true }).fill('Pull request is being reviewed');
  await choose(page, 'Workflow category', 'In Progress', settings);
  await settings.getByRole('button', { name: 'Add status' }).click();
  await expect(settings.getByRole('status')).toHaveText('Issue workflow saved.');
  await expect(settings.getByLabel(`Status name: ${statusName}`)).toHaveValue(statusName);

  await page.reload();
  await expect(settings.getByLabel(`Status name: ${statusName}`)).toHaveValue(statusName);

  const createResponse = await request.post('/api/issues', {
    data: { title: `Workflow status ${stamp}`, status: 'todo' },
  });
  expect(createResponse.ok()).toBeTruthy();
  const issue = (await createResponse.json()) as { identifier: string };

  await page.goto(`/issues/${issue.identifier}`);
  await choose(page, 'Status', 'Duplicate');
  await expect
    .poll(async () => {
      const response = await request.get(`/api/issues/${issue.identifier}`);
      const value = (await response.json()) as { status: string; workflowStatus: string };
      return `${value.status}:${value.workflowStatus}`;
    })
    .toBe('canceled:duplicate');

  await choose(page, 'Status', statusName);
  await expect
    .poll(async () => {
      const response = await request.get(`/api/issues/${issue.identifier}`);
      const value = (await response.json()) as { status: string; workflowStatus: string };
      return `${value.status}:${value.workflowStatus}`;
    })
    .toBe(`in_progress:${statusId}`);

  const filtered = await request.get(`/api/issues?status=${statusId}`);
  expect(filtered.ok()).toBeTruthy();
  const filteredIssues = (await filtered.json()) as { identifier: string }[];
  expect(filteredIssues.some((item) => item.identifier === issue.identifier)).toBeTruthy();

  await choose(page, 'Status', 'Todo');
  await expect
    .poll(async () => {
      const response = await request.get(`/api/issues/${issue.identifier}`);
      const value = (await response.json()) as { status: string; workflowStatus: string };
      return `${value.status}:${value.workflowStatus}`;
    })
    .toBe('todo:todo');

  await page.goto('/config');
  await settings.getByRole('button', { name: `Remove ${statusName}` }).click();
  await expect(settings.getByRole('status')).toHaveText('Issue workflow saved.');
  await expect(settings.getByLabel(`Status name: ${statusName}`)).toHaveCount(0);
});
