import { expect, test } from '@playwright/test';
import { chooseIssueProperty } from './issue-properties.ts';

test('creates a personally assigned issue from the issue composer', async ({ page, request }) => {
  const title = `Assigned from composer ${Date.now()}`;
  await page.goto('/issues');
  await page.getByRole('button', { name: 'Create issue', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Create issue' });
  await dialog.getByLabel('Issue title').fill(title);
  await dialog.getByLabel('Assignee', { exact: true }).selectOption('self');
  await dialog.getByRole('button', { name: 'Create', exact: true }).click();

  await expect(page.getByLabel('Issue title')).toHaveValue(title);
  const identifier = (
    await page.getByRole('button', { name: 'Copy identifier' }).textContent()
  )?.trim();
  if (!identifier) throw new Error('expected the created issue identifier in the URL');
  const response = await request.get(`/api/issues/${identifier}`);
  await expect(response).toBeOK();
  expect(await response.json()).toMatchObject({ assignee: 'self', title });
});

test('self assignment works across issue details, My issues, and list grouping', async ({
  page,
  request,
}) => {
  const title = `Personal issue ${Date.now()}`;
  const createdResponse = await request.post('/api/issues', { data: { title } });
  await expect(createdResponse).toBeOK();
  const issue = (await createdResponse.json()) as { identifier: string };

  await page.goto(`/issues/${issue.identifier}`);
  await chooseIssueProperty(page, 'Assignee', 'You');
  await expect
    .poll(async () => {
      const response = await request.get(`/api/issues/${issue.identifier}`);
      return ((await response.json()) as { assignee?: string }).assignee;
    })
    .toBe('self');

  await page.getByRole('link', { name: 'My issues', exact: true }).click();
  await expect(page).toHaveURL(/\/issues\?assignee=self$/);
  const assignedRow = page.getByRole('option', { name: new RegExp(issue.identifier) });
  await expect(assignedRow).toBeVisible();

  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByLabel('Grouping', { exact: true }).selectOption('assignee');
  await expect(page.getByRole('button', { name: /^You · \d+ issues?$/ })).toBeVisible();

  await page.goto(`/issues/${issue.identifier}`);
  await chooseIssueProperty(page, 'Assignee', 'Unassigned');
  await expect
    .poll(async () => {
      const response = await request.get(`/api/issues/${issue.identifier}`);
      return ((await response.json()) as { assignee?: string }).assignee ?? '';
    })
    .toBe('');

  await page.goto('/issues?assignee=self');
  await expect(page.getByRole('option', { name: new RegExp(issue.identifier) })).toHaveCount(0);
});

test('agent assignment filters issues and survives saving a reusable view', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const title = `Agent issue ${stamp}`;
  const created = await request.post('/api/issues', { data: { title, assignee: 'agent' } });
  await expect(created).toBeOK();
  const issue = (await created.json()) as { identifier: string };

  await page.goto('/issues?assignee=agent');
  await expect(page.getByRole('option', { name: new RegExp(issue.identifier) })).toBeVisible();
  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByLabel('Grouping', { exact: true }).selectOption('agent');
  await expect(page.getByRole('button', { name: /^Agent · \d+ issues?$/ })).toBeVisible();

  const name = `Agent view ${stamp}`;
  const slug = name.toLowerCase().replaceAll(' ', '-');
  await page.goto('/views/new?assignee=agent');
  await page.getByRole('textbox', { name: 'View name', exact: true }).fill(name);
  await page.getByRole('button', { name: 'Create view', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/views/${slug}$`));

  const saved = await request.get(`/api/views/${slug}`);
  await expect(saved).toBeOK();
  expect(await saved.json()).toMatchObject({ assignee: 'agent', groupBy: 'priority' });
  await expect(page.getByRole('option', { name: new RegExp(issue.identifier) })).toBeVisible();
});
