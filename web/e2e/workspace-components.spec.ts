import { expect, test } from '@playwright/test';
import { chooseIssueProperty } from './issue-properties.ts';

test('issue list row opens a detail view with an editable properties panel', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const title = `Component detail ${stamp}`;
  const projectName = `Properties project ${stamp}`;
  const projectResponse = await request.post('/api/projects', {
    data: { name: projectName, slug: `properties-${stamp}` },
  });
  expect(projectResponse.ok()).toBeTruthy();
  const project = (await projectResponse.json()) as { id: number };
  const cycleResponse = await request.post('/api/cycles', {
    data: {
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
    },
  });
  expect(cycleResponse.ok()).toBeTruthy();
  const cycle = (await cycleResponse.json()) as { id: number; number: number };
  const parentTitle = `Properties parent ${stamp}`;
  const parentResponse = await request.post('/api/issues', {
    data: { title: parentTitle, status: 'todo' },
  });
  expect(parentResponse.ok()).toBeTruthy();
  const parent = (await parentResponse.json()) as { id: number; identifier: string };
  const response = await request.post('/api/issues', {
    data: { title, status: 'todo', priority: 2 },
  });
  expect(response.ok()).toBeTruthy();
  const issue = (await response.json()) as { identifier: string };

  await page.goto('/issues');
  const issueList = page.getByRole('listbox', { name: 'Issues' });
  await page.getByLabel('Find issues').fill(title);

  const row = issueList.getByRole('option', { name: new RegExp(title) });
  await expect(row).toHaveAttribute('aria-posinset', '1');
  await expect(row).toHaveAttribute('aria-setsize', '1');
  await row.click();
  await expect(page).toHaveURL(new RegExp(`/issues/${issue.identifier}$`));

  const properties = page.getByRole('complementary', { name: 'Issue properties' });
  await expect(properties).toBeVisible();
  await expect(properties.getByRole('region', { name: 'Properties' })).toBeVisible();
  await expect(properties.getByRole('group', { name: 'Labels' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Document editor' }).first()).toBeVisible();

  await chooseIssueProperty(page, 'Status', 'In Progress');
  await chooseIssueProperty(page, 'Priority', 'Low');
  const projectPicker = properties.getByRole('combobox', { name: 'Project' });
  await projectPicker.click();
  await projectPicker.fill(projectName);
  await page.getByRole('option', { name: projectName, exact: true }).click();
  await chooseIssueProperty(page, 'Cycle', `Cycle ${cycle.number}`);
  const parentPicker = properties.getByRole('combobox', { name: 'Parent' });
  await parentPicker.click();
  await parentPicker.fill(parent.identifier);
  await page.getByRole('option', { name: `${parent.identifier} ${parentTitle}` }).click();

  const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await properties.getByLabel('Due date').fill(dueDate);

  const labelName = `Property label ${stamp}`;
  await properties.getByRole('button', { name: 'Add labels' }).click();
  const labelPicker = page.getByRole('dialog', { name: 'Add labels' });
  await labelPicker.getByLabel('New label').fill(labelName);
  await labelPicker.getByRole('button', { name: `Create “${labelName}”` }).click();
  await expect(properties.getByRole('button', { name: `Remove label ${labelName}` })).toBeVisible();

  await expect
    .poll(async () => {
      const updated = await request.get(`/api/issues/${issue.identifier}`);
      return (await updated.json()) as {
        status: string;
        priority: number;
        projectId: number;
        cycleId: number;
        parentId: number;
        dueDate: string;
        labels: { name: string }[];
      };
    })
    .toMatchObject({
      status: 'in_progress',
      priority: 4,
      projectId: project.id,
      cycleId: cycle.id,
      parentId: parent.id,
      dueDate: expect.stringContaining(dueDate),
      labels: [expect.objectContaining({ name: labelName })],
    });

  await properties.getByRole('button', { name: `Remove label ${labelName}` }).click();
  await expect
    .poll(async () => {
      const updated = await request.get(`/api/issues/${issue.identifier}`);
      return ((await updated.json()) as { labels: { name: string }[] }).labels.some(
        (label) => label.name === labelName,
      );
    })
    .toBe(false);
});

test('board columns group cards by status and reflect a detail edit', async ({ page, request }) => {
  const title = `Component board ${Date.now()}`;
  const response = await request.post('/api/issues', {
    data: { title, status: 'todo', priority: 1 },
  });
  expect(response.ok()).toBeTruthy();
  const issue = (await response.json()) as { identifier: string };
  const cardName = new RegExp(issue.identifier);

  await page.goto('/board');
  const todoColumn = page.getByRole('region', { name: 'todo issues' });
  await expect(todoColumn.getByRole('button', { name: cardName })).toBeVisible();
  await todoColumn.getByRole('button', { name: cardName }).click();

  await chooseIssueProperty(page, 'Status', 'Done');
  await page.getByRole('link', { name: 'Board' }).click();

  const doneColumn = page.getByRole('region', { name: 'done issues' });
  await expect(doneColumn.getByRole('button', { name: cardName })).toBeVisible();
  await expect(todoColumn.getByRole('button', { name: cardName })).toHaveCount(0);
});

test('sidebar labels the active cycle as current', async ({ page, request }) => {
  const start = new Date();
  const response = await request.post('/api/cycles', {
    data: {
      startsAt: start.toISOString(),
      endsAt: new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
    },
  });
  expect(response.ok()).toBeTruthy();
  const cycle = (await response.json()) as { number: number };

  await page.goto('/issues');
  const activeCycleLink = page
    .getByRole('navigation', { name: 'Primary' })
    .getByRole('link', { name: `Cycle ${cycle.number} Current` });
  await expect(activeCycleLink).toBeVisible();
  await activeCycleLink.click();
  await expect(page).toHaveURL(new RegExp(`/cycles/${cycle.number}$`));
  await expect(page.getByLabel('Cycle status')).toHaveValue('active');
});
