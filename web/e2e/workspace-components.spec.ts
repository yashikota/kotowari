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
  const project = (await projectResponse.json()) as { id: number; slug: string };
  const milestoneName = `Milestone ${stamp}`;
  const milestoneTargetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  await page.goto(`/projects/${project.slug}`);
  await page.getByLabel('Milestone name').fill(milestoneName);
  await page.getByLabel('Target date', { exact: true }).last().fill(milestoneTargetDate);
  await page.getByRole('button', { name: 'Add milestone' }).click();
  await expect(
    page.getByRole('textbox', { name: `Milestone name: ${milestoneName}` }),
  ).toBeVisible();
  const projectWithMilestones = await request.get(`/api/projects/${project.slug}`);
  const milestone = (
    (await projectWithMilestones.json()) as { milestones: { id: number; name: string }[] }
  ).milestones[0]!;
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
  await chooseIssueProperty(page, 'Type', 'Feature');
  await chooseIssueProperty(page, 'Estimate', '8');
  const projectPicker = properties.getByRole('combobox', { name: 'Project' });
  await projectPicker.click();
  await projectPicker.fill(projectName);
  await page.getByRole('option', { name: projectName, exact: true }).click();
  await chooseIssueProperty(page, 'Milestone', milestoneName);
  await chooseIssueProperty(page, 'Cycle', `Cycle ${cycle.number}`);
  const parentPicker = properties.getByRole('combobox', { name: 'Parent' });
  await parentPicker.click();
  await parentPicker.fill(parent.identifier);
  await page
    .getByRole('listbox', { name: 'Parent' })
    .getByRole('option', { name: `${parent.identifier} ${parentTitle}` })
    .click();

  const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await properties.getByLabel('Due date').fill(dueDate);

  const labelName = `Property label ${stamp}`;
  await properties.getByRole('button', { name: 'Add labels' }).click();
  const labelPicker = page.getByRole('dialog', { name: 'Add labels' });
  await labelPicker.getByLabel('New label').fill(labelName);
  await labelPicker.getByRole('button', { name: `Create “${labelName}”` }).click();

  await expect
    .poll(async () => {
      const updated = await request.get(`/api/issues/${issue.identifier}`);
      return (await updated.json()) as {
        status: string;
        priority: number;
        type: string;
        estimate: number;
        projectId: number;
        milestoneId: number;
        milestoneName: string;
        cycleId: number;
        parentId: number;
        dueDate: string;
        labels: { name: string }[];
      };
    })
    .toMatchObject({
      status: 'in_progress',
      priority: 4,
      type: 'feature',
      estimate: 8,
      projectId: project.id,
      milestoneId: milestone.id,
      milestoneName,
      cycleId: cycle.id,
      parentId: parent.id,
      dueDate: expect.stringContaining(dueDate),
      labels: [expect.objectContaining({ name: labelName })],
    });
  await expect(properties.getByRole('button', { name: `Remove label ${labelName}` })).toBeVisible();

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

test('type and estimate filters survive saving a reusable view', async ({ page, request }) => {
  const stamp = Date.now();
  const matchingTitle = `Feature estimate ${stamp}`;
  const otherTitle = `Task estimate ${stamp}`;
  const today = new Date();
  const localDate = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const overdue = new Date(today);
  overdue.setDate(overdue.getDate() - 1);
  const matchingResponse = await request.post('/api/issues', {
    data: { title: matchingTitle, type: 'feature', estimate: 8, dueDate: localDate(overdue) },
  });
  expect(matchingResponse.ok(), await matchingResponse.text()).toBeTruthy();
  const otherResponse = await request.post('/api/issues', {
    data: { title: otherTitle, type: 'task', estimate: 3, dueDate: localDate(today) },
  });
  expect(otherResponse.ok()).toBeTruthy();

  await page.goto('/issues');
  await page.getByLabel('Find issues').fill(stamp.toString());
  await page.getByRole('button', { name: 'Filter' }).click();
  await page.getByLabel('Filter type').selectOption('feature');
  await page.getByLabel('Filter estimate').selectOption('8');
  await page.getByLabel('Filter due date').selectOption('overdue');
  await expect(page).toHaveURL(/\?dueDate=overdue&type=feature&estimate=8$/);

  const filteredRow = page.getByRole('option', { name: new RegExp(matchingTitle) });
  await expect(filteredRow).toBeVisible();
  await expect(page.getByRole('option', { name: new RegExp(otherTitle) })).toHaveCount(0);

  const viewName = `Feature estimate ${stamp}`;
  await page.getByLabel('New view name').fill(viewName);
  await page.getByLabel('New view name').press('ControlOrMeta+Enter');
  const slug = `feature-estimate-${stamp}`;
  await expect(page).toHaveURL(new RegExp(`/views/${slug}$`));
  const saved = await request.get(`/api/views/${slug}`);
  expect(saved.ok()).toBeTruthy();
  expect(await saved.json()).toMatchObject({ type: 'feature', estimate: 8, dueDate: 'overdue' });
  const savedIssues = page.getByRole('listbox', { name: 'Issues' });
  await expect(savedIssues.getByRole('option', { name: new RegExp(matchingTitle) })).toBeVisible();
  await expect(savedIssues.getByRole('option', { name: new RegExp(otherTitle) })).toHaveCount(0);
});

test('due-date filters match relative windows and a custom date', async ({ page, request }) => {
  const stamp = Date.now();
  const localDate = (offsetDays: number) => {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  const nearTitle = `Due soon ${stamp}`;
  const farTitle = `Due later ${stamp}`;
  for (const [title, dueDate] of [
    [nearTitle, localDate(3)],
    [farTitle, localDate(45)],
  ]) {
    const created = await request.post('/api/issues', {
      data: { title, status: 'todo', dueDate },
    });
    expect(created.ok()).toBeTruthy();
  }

  await page.goto('/issues');
  await page.getByLabel('Find issues').fill(stamp.toString());
  await page.getByRole('button', { name: 'Filter' }).click();
  await page.getByLabel('Filter due date').selectOption('threeDays');
  const issues = page.getByRole('listbox', { name: 'Issues' });
  await expect(issues.getByRole('option', { name: new RegExp(nearTitle) })).toBeVisible();
  await expect(issues.getByRole('option', { name: new RegExp(farTitle) })).toHaveCount(0);

  await page.getByLabel('Filter due date').selectOption('custom');
  const customDate = localDate(45);
  await page.getByLabel('Due on date').fill(customDate);
  await expect.poll(() => new URL(page.url()).searchParams.get('dueDate')).toBe(`on:${customDate}`);
  await expect(issues.getByRole('option', { name: new RegExp(farTitle) })).toBeVisible();
  await expect(issues.getByRole('option', { name: new RegExp(nearTitle) })).toHaveCount(0);
});

test('relation filters distinguish blocked issues and survive saving a view', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const createIssue = async (title: string, data: Record<string, unknown> = {}) => {
    const response = await request.post('/api/issues', { data: { title, ...data } });
    expect(response.ok()).toBeTruthy();
    return (await response.json()) as { id: number; identifier: string; title: string };
  };
  const parent = await createIssue(`Relation parent ${stamp}`);
  const child = await createIssue(`Relation child ${stamp}`, { parentId: parent.id });
  const blocker = await createIssue(`Relation blocker ${stamp}`);
  const blocked = await createIssue(`Relation blocked ${stamp}`);
  const relation = await request.post(`/api/issues/${blocker.identifier}/relations`, {
    data: { targetIdentifier: blocked.identifier, kind: 'blocks' },
  });
  expect(relation.ok()).toBeTruthy();

  await page.goto('/issues');
  await page.getByLabel('Find issues').fill(stamp.toString());
  await page.getByRole('button', { name: 'Filter' }).click();
  await page.getByLabel('Filter relation').selectOption('subissue');
  const issues = page.getByRole('listbox', { name: 'Issues' });
  await expect(issues.getByRole('option', { name: new RegExp(child.title) })).toBeVisible();
  await expect(issues.getByRole('option', { name: new RegExp(parent.title) })).toHaveCount(0);

  await page.getByLabel('Filter relation').selectOption('blocked');
  await expect(issues.getByRole('option', { name: new RegExp(blocked.title) })).toBeVisible();
  await expect(issues.getByRole('option', { name: new RegExp(blocker.title) })).toHaveCount(0);

  const viewName = `Relation filter ${stamp}`;
  await page.getByLabel('New view name').fill(viewName);
  await page.getByLabel('New view name').press('ControlOrMeta+Enter');
  const slug = `relation-filter-${stamp}`;
  await expect(page).toHaveURL(new RegExp(`/views/${slug}$`));
  const saved = await request.get(`/api/views/${slug}`);
  expect(saved.ok()).toBeTruthy();
  expect(await saved.json()).toMatchObject({ relation: 'blocked' });
  await expect(
    page
      .getByRole('listbox', { name: 'Issues' })
      .getByRole('option', { name: new RegExp(blocked.title) }),
  ).toBeVisible();
});

test('content filter searches descriptions and persists on a saved view', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const matchingTitle = `Content result ${stamp}`;
  const otherTitle = `Other content ${stamp}`;
  const phrase = `Moonstone release ${stamp}`;
  for (const data of [
    { title: matchingTitle, body: `Implementation notes: ${phrase}` },
    { title: otherTitle, body: 'This description has no matching phrase.' },
  ]) {
    const created = await request.post('/api/issues', { data });
    expect(created.ok()).toBeTruthy();
  }

  await page.goto('/issues');
  await page.getByRole('button', { name: 'Filter' }).click();
  await page.getByLabel('Filter issue content').fill(phrase);
  const issues = page.getByRole('listbox', { name: 'Issues' });
  await expect(issues.getByRole('option', { name: new RegExp(matchingTitle) })).toBeVisible();
  await expect(issues.getByRole('option', { name: new RegExp(otherTitle) })).toHaveCount(0);

  const viewName = `Content filter ${stamp}`;
  await page.getByLabel('New view name').fill(viewName);
  await page.getByLabel('New view name').press('ControlOrMeta+Enter');
  const slug = `content-filter-${stamp}`;
  await expect(page).toHaveURL(new RegExp(`/views/${slug}$`));
  const saved = await request.get(`/api/views/${slug}`);
  expect(saved.ok()).toBeTruthy();
  expect(await saved.json()).toMatchObject({ content: phrase });
  const savedIssues = page.getByRole('listbox', { name: 'Issues' });
  await expect(savedIssues.getByRole('option', { name: new RegExp(matchingTitle) })).toBeVisible();
  await expect(savedIssues.getByRole('option', { name: new RegExp(otherTitle) })).toHaveCount(0);
});

test('created-date filters support relative and exact dates on saved views', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const title = `Created date ${stamp}`;
  const created = await request.post('/api/issues', { data: { title, status: 'todo' } });
  expect(created.ok()).toBeTruthy();
  const issue = (await created.json()) as { title: string; createdAt: string };

  await page.goto('/issues');
  await page.getByLabel('Find issues').fill(stamp.toString());
  await page.getByRole('button', { name: 'Filter' }).click();
  await page.getByLabel('Filter issue date').selectOption('createdAt');
  await page.getByLabel('Filter date timeframe').selectOption('weekAgo');
  const issues = page.getByRole('listbox', { name: 'Issues' });
  await expect(issues.getByRole('option', { name: new RegExp(title) })).toBeVisible();

  await page.getByLabel('Filter date timeframe').selectOption('custom');
  const createdDate = issue.createdAt.slice(0, 10);
  await page.getByLabel('On date').fill(createdDate);
  await expect
    .poll(() => new URL(page.url()).searchParams.get('dateRange'))
    .toBe(`on:${createdDate}`);
  await expect(issues.getByRole('option', { name: new RegExp(title) })).toBeVisible();

  const viewName = `Created date ${stamp}`;
  await page.getByLabel('New view name').fill(viewName);
  await page.getByLabel('New view name').press('ControlOrMeta+Enter');
  const slug = `created-date-${stamp}`;
  await expect(page).toHaveURL(new RegExp(`/views/${slug}$`));
  const saved = await request.get(`/api/views/${slug}`);
  expect(saved.ok()).toBeTruthy();
  expect(await saved.json()).toMatchObject({
    dateField: 'createdAt',
    dateRange: `on:${createdDate}`,
  });
  await expect(
    page.getByRole('listbox', { name: 'Issues' }).getByRole('option', { name: new RegExp(title) }),
  ).toBeVisible();
});

test('time-in-current-status filters by elapsed status time and persist on a saved view', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const title = `Recent status ${stamp}`;
  const created = await request.post('/api/issues', { data: { title, status: 'todo' } });
  expect(created.ok()).toBeTruthy();
  const createdIssue = (await created.json()) as { statusChangedAt: string };
  const dateAnchor = createdIssue.statusChangedAt.slice(0, 10);
  const apiFilter = await request.get(
    `/api/issues?dateField=timeInCurrentStatus&dateRange=dayAgo&dateAsOf=${dateAnchor}`,
  );
  expect(apiFilter.ok()).toBeTruthy();
  expect(
    ((await apiFilter.json()) as { title: string }[]).some((issue) => issue.title === title),
  ).toBe(false);

  await page.goto('/issues');
  await page.getByLabel('Find issues').fill(stamp.toString());
  await page.getByRole('button', { name: 'Filter' }).click();
  await page.getByLabel('Filter issue date').selectOption('timeInCurrentStatus');
  await page.getByLabel('Filter date timeframe').selectOption('dayAgo');
  const issueList = page.getByRole('listbox', { name: 'Issues' });
  await expect(issueList.getByRole('option', { name: new RegExp(title) })).toHaveCount(0);

  const viewName = `Status age ${stamp}`;
  await page.getByLabel('New view name').fill(viewName);
  await page.getByLabel('New view name').press('ControlOrMeta+Enter');
  const viewSlug = `status-age-${stamp}`;
  await expect(page).toHaveURL(new RegExp(`/views/${viewSlug}$`));
  const saved = await request.get(`/api/views/${viewSlug}`);
  expect(saved.ok()).toBeTruthy();
  expect(await saved.json()).toMatchObject({
    dateField: 'timeInCurrentStatus',
    dateRange: 'dayAgo',
  });
  await expect(page.getByText(/No issues\./)).toBeVisible();
  await expect(page.getByText(title, { exact: true })).toHaveCount(0);
});

test('project status and priority filter linked issues and persist on a saved view', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const startedProjectResponse = await request.post('/api/projects', {
    data: {
      name: `Started project ${stamp}`,
      slug: `started-${stamp}`,
      status: 'started',
      priority: 2,
    },
  });
  const plannedProjectResponse = await request.post('/api/projects', {
    data: {
      name: `Planned project ${stamp}`,
      slug: `planned-${stamp}`,
      status: 'planned',
      priority: 1,
    },
  });
  expect(startedProjectResponse.ok()).toBeTruthy();
  expect(plannedProjectResponse.ok()).toBeTruthy();
  const startedProject = (await startedProjectResponse.json()) as { id: number };
  const plannedProject = (await plannedProjectResponse.json()) as { id: number };
  const matchingTitle = `Started project issue ${stamp}`;
  const otherTitle = `Planned project issue ${stamp}`;
  for (const [title, projectId] of [
    [matchingTitle, startedProject.id],
    [otherTitle, plannedProject.id],
  ] as const) {
    const created = await request.post('/api/issues', {
      data: { title, status: 'todo', projectId },
    });
    expect(created.ok()).toBeTruthy();
  }

  await page.goto('/issues');
  await page.getByLabel('Find issues').fill(stamp.toString());
  await page.getByRole('button', { name: 'Filter' }).click();
  await page.getByLabel('Filter project status').selectOption('started');
  await page.getByLabel('Filter project priority').selectOption('2');
  const issues = page.getByRole('listbox', { name: 'Issues' });
  await expect(issues.getByRole('option', { name: new RegExp(matchingTitle) })).toBeVisible();
  await expect(issues.getByRole('option', { name: new RegExp(otherTitle) })).toHaveCount(0);

  const viewName = `Project properties ${stamp}`;
  await page.getByLabel('New view name').fill(viewName);
  await page.getByLabel('New view name').press('ControlOrMeta+Enter');
  const slug = `project-properties-${stamp}`;
  await expect(page).toHaveURL(new RegExp(`/views/${slug}$`));
  const saved = await request.get(`/api/views/${slug}`);
  expect(saved.ok()).toBeTruthy();
  expect(await saved.json()).toMatchObject({ projectStatus: 'started', projectPriority: 2 });
  await expect(
    page
      .getByRole('listbox', { name: 'Issues' })
      .getByRole('option', { name: new RegExp(matchingTitle) }),
  ).toBeVisible();
});

test('milestone-name contains filter matches linked issues and persists on a saved view', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const slug = `milestone-filter-${stamp}`;
  const projectResponse = await request.post('/api/projects', {
    data: { name: `Milestone filter ${stamp}`, slug, status: 'started' },
  });
  expect(projectResponse.ok()).toBeTruthy();
  const project = (await projectResponse.json()) as { id: number };
  const milestoneResponse = await request.post(`/api/projects/${slug}/milestones`, {
    data: { name: `Beta rollout ${stamp}` },
  });
  expect(milestoneResponse.ok()).toBeTruthy();
  const milestone = (await milestoneResponse.json()) as { id: number };
  const matchingTitle = `Milestone issue ${stamp}`;
  const otherTitle = `Unassigned milestone issue ${stamp}`;
  const matchingResponse = await request.post('/api/issues', {
    data: { title: matchingTitle, status: 'todo', projectId: project.id },
  });
  const otherResponse = await request.post('/api/issues', {
    data: { title: otherTitle, status: 'todo', projectId: project.id },
  });
  expect(matchingResponse.ok()).toBeTruthy();
  expect(otherResponse.ok()).toBeTruthy();
  const matching = (await matchingResponse.json()) as { identifier: string };
  const assigned = await request.patch(`/api/issues/${matching.identifier}`, {
    data: { milestoneId: milestone.id },
  });
  expect(assigned.ok()).toBeTruthy();

  await page.goto('/issues');
  await page.getByLabel('Find issues').fill(stamp.toString());
  await page.getByRole('button', { name: 'Filter' }).click();
  await page.getByLabel('Filter milestone name').fill('beta rollout');
  const issues = page.getByRole('listbox', { name: 'Issues' });
  await expect(issues.getByRole('option', { name: new RegExp(matchingTitle) })).toBeVisible();
  await expect(issues.getByRole('option', { name: new RegExp(otherTitle) })).toHaveCount(0);

  const viewName = `Milestone filter ${stamp}`;
  await page.getByLabel('New view name').fill(viewName);
  await page.getByLabel('New view name').press('ControlOrMeta+Enter');
  const viewSlug = `milestone-filter-${stamp}`;
  await expect(page).toHaveURL(new RegExp(`/views/${viewSlug}$`));
  const saved = await request.get(`/api/views/${viewSlug}`);
  expect(saved.ok()).toBeTruthy();
  expect(await saved.json()).toMatchObject({ milestoneName: 'beta rollout' });
  await expect(
    page
      .getByRole('listbox', { name: 'Issues' })
      .getByRole('option', { name: new RegExp(matchingTitle) }),
  ).toBeVisible();
});

test('project labels are editable, filter linked issues, and persist on a saved view', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const labelName = `Project label ${stamp}`;
  const labelResponse = await request.post('/api/labels', {
    data: { name: labelName, color: '#336699' },
  });
  expect(labelResponse.ok()).toBeTruthy();
  const projectSlug = `labeled-project-${stamp}`;
  const labeledResponse = await request.post('/api/projects', {
    data: { name: `Labeled project ${stamp}`, slug: projectSlug, status: 'started' },
  });
  const unlabeledResponse = await request.post('/api/projects', {
    data: { name: `Unlabeled project ${stamp}`, slug: `unlabeled-${stamp}`, status: 'planned' },
  });
  expect(labeledResponse.ok()).toBeTruthy();
  expect(unlabeledResponse.ok()).toBeTruthy();
  const labeled = (await labeledResponse.json()) as { id: number };
  const unlabeled = (await unlabeledResponse.json()) as { id: number };

  await page.goto(`/projects/${projectSlug}`);
  await page.getByText(labelName, { exact: true }).click();
  await expect
    .poll(async () => {
      const response = await request.get(`/api/projects/${projectSlug}`);
      return (await response.json()).labels;
    })
    .toEqual([labelName]);

  const matchingTitle = `Project label issue ${stamp}`;
  const otherTitle = `Unlabeled project issue ${stamp}`;
  for (const [title, projectId] of [
    [matchingTitle, labeled.id],
    [otherTitle, unlabeled.id],
  ] as const) {
    const created = await request.post('/api/issues', {
      data: { title, status: 'todo', projectId },
    });
    expect(created.ok()).toBeTruthy();
  }

  await page.goto('/issues');
  await page.getByLabel('Find issues').fill(stamp.toString());
  await page.getByRole('button', { name: 'Filter' }).click();
  const projectLabels = page.getByRole('group', { name: 'Filter project labels' });
  await projectLabels.getByText(labelName, { exact: true }).click();
  const issues = page.getByRole('listbox', { name: 'Issues' });
  await expect(issues.getByRole('option', { name: new RegExp(matchingTitle) })).toBeVisible();
  await expect(issues.getByRole('option', { name: new RegExp(otherTitle) })).toHaveCount(0);

  const viewName = `Project label view ${stamp}`;
  await page.getByLabel('New view name').fill(viewName);
  await page.getByLabel('New view name').press('ControlOrMeta+Enter');
  const viewSlug = `project-label-view-${stamp}`;
  await expect(page).toHaveURL(new RegExp(`/views/${viewSlug}$`));
  const saved = await request.get(`/api/views/${viewSlug}`);
  expect(saved.ok()).toBeTruthy();
  expect(await saved.json()).toMatchObject({ projectLabels: [labelName] });
  await expect(
    page
      .getByRole('listbox', { name: 'Issues' })
      .getByRole('option', { name: new RegExp(matchingTitle) }),
  ).toBeVisible();
});

test('added-to-cycle phases filter issues and persist on a saved view', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const now = Date.now();
  const cycleInput = async (startOffset: number, endOffset: number, status: string) => {
    const response = await request.post('/api/cycles', {
      data: {
        startsAt: new Date(now + startOffset).toISOString(),
        endsAt: new Date(now + endOffset).toISOString(),
        status,
      },
    });
    expect(response.ok()).toBeTruthy();
    return (await response.json()) as { id: number };
  };
  const pastCycle = await cycleInput(-72 * 60 * 60 * 1000, -48 * 60 * 60 * 1000, 'completed');
  const currentCycle = await cycleInput(-24 * 60 * 60 * 1000, 24 * 60 * 60 * 1000, 'active');
  const futureCycle = await cycleInput(48 * 60 * 60 * 1000, 72 * 60 * 60 * 1000, 'upcoming');
  const issueTitles = {
    after: `Added after ${stamp}`,
    during: `Added during ${stamp}`,
    planned: `Added planned ${stamp}`,
  };
  for (const [phase, cycleId] of [
    ['after', pastCycle.id],
    ['during', currentCycle.id],
    ['planned', futureCycle.id],
  ] as const) {
    const created = await request.post('/api/issues', {
      data: { title: issueTitles[phase], status: 'todo', cycleId },
    });
    expect(created.ok()).toBeTruthy();
  }

  await page.goto('/issues');
  await page.getByLabel('Find issues').fill(stamp.toString());
  await page.getByRole('button', { name: 'Filter' }).click();
  const addedToCycle = page.getByRole('group', { name: 'Filter added to cycle' });
  await addedToCycle.getByText('Planned', { exact: true }).click();
  const issueList = page.getByRole('listbox', { name: 'Issues' });
  await expect(
    issueList.getByRole('option', { name: new RegExp(issueTitles.planned) }),
  ).toBeVisible();
  await expect(issueList.getByRole('option', { name: new RegExp(issueTitles.during) })).toHaveCount(
    0,
  );
  await expect(issueList.getByRole('option', { name: new RegExp(issueTitles.after) })).toHaveCount(
    0,
  );

  const viewName = `Added to cycle ${stamp}`;
  await page.getByLabel('New view name').fill(viewName);
  await page.getByLabel('New view name').press('ControlOrMeta+Enter');
  const viewSlug = `added-to-cycle-${stamp}`;
  await expect(page).toHaveURL(new RegExp(`/views/${viewSlug}$`));
  const saved = await request.get(`/api/views/${viewSlug}`);
  expect(saved.ok()).toBeTruthy();
  expect(await saved.json()).toMatchObject({ addedToCycle: ['planned'] });
  await expect(
    page.getByRole('listbox', { name: 'Issues' }).getByRole('option', {
      name: new RegExp(issueTitles.planned),
    }),
  ).toBeVisible();
});

test('issue links can be added, displayed, sorted as real links, and removed', async ({
  page,
  request,
}) => {
  const title = `Issue links ${Date.now()}`;
  const created = await request.post('/api/issues', { data: { title, status: 'todo' } });
  expect(created.ok()).toBeTruthy();
  const issue = (await created.json()) as { identifier: string };

  await page.goto(`/issues/${issue.identifier}`);
  const url = 'https://github.com/example/repo/pull/42';
  await page.getByRole('textbox', { name: 'URL', exact: true }).fill(url);
  await page.getByRole('textbox', { name: 'Title (optional)' }).fill('Review build');
  await page.getByRole('combobox', { name: 'Resource type' }).selectOption('pullRequest');
  await page.getByRole('button', { name: 'Add link', exact: true }).click();

  const externalLink = page.getByRole('link', { name: 'Review build' });
  await expect(externalLink).toHaveAttribute('href', url);
  await expect(page.getByRole('list', { name: 'Links' }).getByText('Pull request')).toBeVisible();
  const persisted = await request.get(`/api/issues/${issue.identifier}`);
  expect(await persisted.json()).toMatchObject({
    externalLinks: [{ url, title: 'Review build', kind: 'pullRequest' }],
  });

  await page.goto('/issues');
  await page.reload();
  await page.getByLabel('Find issues').fill(title);
  const row = page.getByRole('option', { name: new RegExp(title) });
  await expect(row.getByLabel('1 link')).toBeVisible();
  await expect(row.getByLabel('1 pull request')).toBeVisible();
  await page.getByRole('button', { name: 'Display options' }).click();
  await expect(page.getByRole('checkbox', { name: 'Pull requests' })).toBeChecked();

  await page.goto(`/issues/${issue.identifier}`);
  await page.getByRole('button', { name: 'Remove link Review build' }).click();
  await expect(page.getByText('No external links yet.')).toBeVisible();
  await expect
    .poll(async () => {
      const response = await request.get(`/api/issues/${issue.identifier}`);
      return (await response.json()).externalLinks;
    })
    .toEqual([]);
});

test('issue options create a linked workspace document and open it for editing', async ({
  page,
  request,
}) => {
  const title = `Issue document ${Date.now()}`;
  const created = await request.post('/api/issues', { data: { title, status: 'todo' } });
  expect(created.ok()).toBeTruthy();
  const issue = (await created.json()) as { identifier: string };

  await page.goto(`/issues/${issue.identifier}`);
  await page.getByRole('button', { name: 'Issue options' }).click();
  await page.getByRole('menuitem', { name: 'Add document…' }).click();
  await expect(page).toHaveURL(/\/pages\/document-/);
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue('New document');

  const savedIssue = await request.get(`/api/issues/${issue.identifier}`);
  expect(savedIssue.ok()).toBeTruthy();
  const saved = await savedIssue.json();
  expect(saved.externalLinks).toEqual(
    expect.arrayContaining([expect.objectContaining({ kind: 'document', title: 'New document' })]),
  );
  await page.goto(`/issues/${issue.identifier}`);
  const documentLink = page.getByRole('link', { name: 'New document', exact: true });
  await expect(documentLink).toBeVisible();
  await expect(documentLink).toHaveAttribute('href', /\/pages\/document-/);
});

test('single-user favorites persist and appear in the sidebar', async ({ page, request }) => {
  const title = `Favorite issue ${Date.now()}`;
  const created = await request.post('/api/issues', { data: { title, status: 'todo' } });
  expect(created.ok()).toBeTruthy();
  const issue = (await created.json()) as { identifier: string };

  await page.goto(`/issues/${issue.identifier}`);
  await page.getByRole('button', { name: 'Add to favorites' }).click();
  await expect(page.getByRole('button', { name: 'Remove from favorites' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const favorites = page.getByRole('navigation', { name: 'Favorites' });
  await expect(favorites.getByRole('link', { name: new RegExp(issue.identifier) })).toBeVisible();

  const listed = await request.get('/api/issues?favorite=true');
  expect(await listed.json()).toEqual([expect.objectContaining({ identifier: issue.identifier })]);

  await page.getByRole('button', { name: 'Remove from favorites' }).click();
  await expect(page.getByRole('button', { name: 'Add to favorites' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(favorites.getByRole('link', { name: new RegExp(issue.identifier) })).toHaveCount(0);
});

test('issue relations stay reciprocal when added and removed', async ({ page, request }) => {
  const stamp = Date.now();
  const firstResponse = await request.post('/api/issues', {
    data: { title: `Blocks ${stamp}`, status: 'todo' },
  });
  const secondResponse = await request.post('/api/issues', {
    data: { title: `Blocked ${stamp}`, status: 'todo' },
  });
  expect(firstResponse.ok()).toBeTruthy();
  expect(secondResponse.ok()).toBeTruthy();
  const first = (await firstResponse.json()) as { identifier: string };
  const second = (await secondResponse.json()) as { identifier: string };

  await page.goto(`/issues/${first.identifier}`);
  await page.getByRole('combobox', { name: 'Relation type' }).selectOption('blocks');
  await page.getByRole('combobox', { name: 'Related issue' }).selectOption(second.identifier);
  await page.getByRole('button', { name: 'Add relation' }).click();
  const relations = page.getByRole('list', { name: 'Relations' });
  await expect(relations.getByRole('link', { name: new RegExp(second.identifier) })).toBeVisible();
  await expect(relations.getByText('Blocks', { exact: true })).toBeVisible();

  const target = await request.get(`/api/issues/${second.identifier}`);
  expect(await target.json()).toMatchObject({
    relations: [{ kind: 'blockedBy', targetIdentifier: first.identifier }],
  });
  await page.goto(`/issues/${second.identifier}`);
  await expect(page.getByRole('list', { name: 'Relations' }).getByText('Blocked by')).toBeVisible();

  await page.goto(`/issues/${first.identifier}`);
  await page.getByRole('button', { name: `Remove relation to ${second.identifier}` }).click();
  await expect(page.getByText('No related issues yet.')).toBeVisible();
  const unlinked = await request.get(`/api/issues/${second.identifier}`);
  expect((await unlinked.json()).relations).toEqual([]);
});

test('issue options create related, child, parent, blocked, and blocking issues', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const created = await request.post('/api/issues', {
    data: { title: `Related source ${stamp}`, status: 'todo' },
  });
  expect(created.ok()).toBeTruthy();
  const source = (await created.json()) as { id: number; identifier: string };
  await page.goto(`/issues/${source.identifier}`);

  async function createFromMenu(option: string, title: string) {
    await page.getByRole('button', { name: 'Issue options' }).click();
    await page.getByRole('menuitem', { name: 'Create related', exact: true }).hover();
    await page.getByRole('menuitem', { name: option, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Create related issue' });
    await dialog.getByRole('textbox', { name: 'Issue title' }).fill(title);
    await dialog.getByRole('button', { name: 'Create issue' }).click();
    await expect(dialog).toHaveCount(0);
  }

  const relatedTitle = `Related ${stamp}`;
  await createFromMenu('Issue…', relatedTitle);
  let current = (await (await request.get(`/api/issues/${source.identifier}`)).json()) as {
    parentId: number | null;
    relations: { kind: string; targetIdentifier: string }[];
  };
  let related = (await (await request.get('/api/issues')).json()) as {
    id: number;
    identifier: string;
    title: string;
    parentId: number | null;
  }[];
  const relatedIssue = related.find((item) => item.title === relatedTitle);
  expect(relatedIssue).toBeDefined();
  expect(current.relations).toContainEqual(
    expect.objectContaining({ kind: 'related', targetIdentifier: relatedIssue!.identifier }),
  );

  const childTitle = `Child ${stamp}`;
  await createFromMenu('Sub-issue…', childTitle);
  related = (await (await request.get('/api/issues')).json()) as typeof related;
  expect(related.find((item) => item.title === childTitle)?.parentId).toBe(source.id);

  const parentTitle = `Parent ${stamp}`;
  await createFromMenu('Parent issue…', parentTitle);
  related = (await (await request.get('/api/issues')).json()) as typeof related;
  const parent = related.find((item) => item.title === parentTitle);
  expect(parent).toBeDefined();
  current = (await (await request.get(`/api/issues/${source.identifier}`)).json()) as {
    parentId: number | null;
    relations: { kind: string; targetIdentifier: string }[];
  };
  expect(current.parentId).toBe(parent!.id);

  const blockedTitle = `Blocked ${stamp}`;
  await createFromMenu('Blocked issue…', blockedTitle);
  related = (await (await request.get('/api/issues')).json()) as typeof related;
  const blocked = related.find((item) => item.title === blockedTitle);
  expect(blocked).toBeDefined();
  current = (await (await request.get(`/api/issues/${source.identifier}`)).json()) as {
    parentId: number | null;
    relations: { kind: string; targetIdentifier: string }[];
  };
  expect(current.relations).toContainEqual(
    expect.objectContaining({ kind: 'blocks', targetIdentifier: blocked!.identifier }),
  );

  const blockingTitle = `Blocking ${stamp}`;
  await createFromMenu('Blocking issue…', blockingTitle);
  related = (await (await request.get('/api/issues')).json()) as typeof related;
  const blocking = related.find((item) => item.title === blockingTitle);
  expect(blocking).toBeDefined();
  current = (await (await request.get(`/api/issues/${source.identifier}`)).json()) as {
    parentId: number | null;
    relations: { kind: string; targetIdentifier: string }[];
  };
  expect(current.relations).toContainEqual(
    expect.objectContaining({ kind: 'blockedBy', targetIdentifier: blocking!.identifier }),
  );
});

test('issue options mark the current issue as parent, child, and reciprocal relations', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const create = async (name: string) => {
    const response = await request.post('/api/issues', {
      data: { title: `${name} ${stamp}`, status: 'todo' },
    });
    expect(response.ok()).toBeTruthy();
    return (await response.json()) as { id: number; identifier: string };
  };
  const source = await create('Mark source');
  const parentChild = await create('Parent target');
  const childParent = await create('Child target');
  const related = await create('Related target');
  const blockedBy = await create('Blocked-by target');
  const blocking = await create('Blocking target');
  const duplicate = await create('Duplicate target');
  await page.goto(`/issues/${source.identifier}`);

  async function markAs(option: string, target: { identifier: string }) {
    await page.getByRole('button', { name: 'Issue options' }).click();
    await page.getByRole('menuitem', { name: 'Mark as', exact: true }).hover();
    await page.getByRole('menuitem', { name: option, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: new RegExp('Mark as') });
    const selector = dialog.getByRole('combobox', { name: 'Related issue' });
    await selector.fill(target.identifier);
    await page
      .getByRole('listbox')
      .getByRole('option', { name: new RegExp(target.identifier) })
      .click();
    await expect(dialog).toHaveCount(0);
  }

  await markAs('Parent of…', parentChild);
  let state = (await (await request.get(`/api/issues/${parentChild.identifier}`)).json()) as {
    parentId: number | null;
  };
  expect(state.parentId).toBe(source.id);

  await markAs('Sub-issue of…', childParent);
  state = (await (await request.get(`/api/issues/${source.identifier}`)).json()) as {
    parentId: number | null;
  };
  expect(state.parentId).toBe(childParent.id);

  const relationCases = [
    { option: 'Related to…', target: related, kind: 'related' },
    { option: 'Blocked by…', target: blockedBy, kind: 'blockedBy' },
    { option: 'Blocking…', target: blocking, kind: 'blocks' },
    { option: 'Duplicate of…', target: duplicate, kind: 'duplicateOf' },
  ] as const;
  for (const { option, target, kind } of relationCases) {
    await markAs(option, target);
    const sourceState = (await (await request.get(`/api/issues/${source.identifier}`)).json()) as {
      relations: { kind: string; targetIdentifier: string }[];
    };
    expect(sourceState.relations).toContainEqual(
      expect.objectContaining({ kind, targetIdentifier: target.identifier }),
    );
  }
});

test('issue options add resource links and set, edit, and clear due dates', async ({
  page,
  request,
}) => {
  const created = await request.post('/api/issues', {
    data: { title: `Quick actions ${Date.now()}`, status: 'todo' },
  });
  expect(created.ok()).toBeTruthy();
  const issue = (await created.json()) as { identifier: string };
  await page.goto(`/issues/${issue.identifier}`);

  await page.getByRole('button', { name: 'Issue options' }).click();
  await page.getByRole('menuitem', { name: 'Add pull request…', exact: true }).click();
  const pullRequestDialog = page.getByRole('dialog', { name: 'Add Pull request' });
  await pullRequestDialog
    .getByRole('textbox', { name: 'URL' })
    .fill('https://github.com/kotowari/kotowari/pull/42');
  await pullRequestDialog.getByRole('textbox', { name: 'Title (optional)' }).fill('Review #42');
  await pullRequestDialog.getByRole('button', { name: 'Add Pull request' }).click();
  await expect(pullRequestDialog).toHaveCount(0);

  const withLink = (await (await request.get(`/api/issues/${issue.identifier}`)).json()) as {
    externalLinks: { url: string; title: string; kind: string }[];
  };
  expect(withLink.externalLinks).toContainEqual({
    url: 'https://github.com/kotowari/kotowari/pull/42',
    title: 'Review #42',
    kind: 'pullRequest',
    id: expect.any(Number),
    createdAt: expect.any(String),
  });

  await page.getByRole('button', { name: 'Issue options' }).click();
  await page.getByRole('menuitem', { name: 'Due date', exact: true }).hover();
  await page.getByRole('menuitem', { name: 'Tomorrow', exact: true }).click();
  await expect(page.getByRole('menu')).toHaveCount(0);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const expectedTomorrow = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  let updated = (await (await request.get(`/api/issues/${issue.identifier}`)).json()) as {
    dueDate: string | null;
  };
  expect(updated.dueDate).toBe(expectedTomorrow);

  await page.getByRole('button', { name: 'Issue options' }).click();
  await page.getByRole('menuitem', { name: 'Due date', exact: true }).hover();
  await page.getByRole('menuitem', { name: 'Custom…', exact: true }).click();
  const dueDateDialog = page.getByRole('dialog', { name: 'Set due date' });
  await dueDateDialog.getByLabel('Due date').fill('2030-02-03');
  await dueDateDialog.getByRole('button', { name: 'Save' }).click();
  await expect(dueDateDialog).toHaveCount(0);
  updated = (await (await request.get(`/api/issues/${issue.identifier}`)).json()) as {
    dueDate: string | null;
  };
  expect(updated.dueDate).toBe('2030-02-03');

  await page.getByRole('button', { name: 'Issue options' }).click();
  await page.getByRole('menuitem', { name: 'Due date', exact: true }).hover();
  await page.getByRole('menuitem', { name: 'Remove due date', exact: true }).click();
  updated = (await (await request.get(`/api/issues/${issue.identifier}`)).json()) as {
    dueDate: string | null;
  };
  expect(updated.dueDate).toBeNull();
});

test('issue options expose Linear copy actions and make a property-preserving copy', async ({
  page,
  request,
}) => {
  const title = `Copy source ${Date.now()}`;
  const created = await request.post('/api/issues', {
    data: {
      title,
      body: 'Keep the implementation details.',
      status: 'in_progress',
      type: 'bug',
      priority: 2,
      estimate: 3,
    },
  });
  expect(created.ok()).toBeTruthy();
  const issue = (await created.json()) as { identifier: string };

  await page.goto(`/issues/${issue.identifier}`);
  await page.getByRole('button', { name: 'Issue options' }).click();
  const menu = page.getByRole('menu');
  await expect(menu.getByRole('menuitem', { name: 'Copy URL' })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Copy issue as Markdown' })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Copy everything as Markdown' })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Copy as prompt' })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Copy git branch name' })).toBeVisible();
  await menu.getByRole('menuitem', { name: 'Make a copy' }).click();

  await expect(page).toHaveURL(/\/issues\/[A-Z]+-\d+$/);
  const copiedIdentifier = new URL(page.url()).pathname.split('/').at(-1)!;
  const copied = await request.get(`/api/issues/${copiedIdentifier}`);
  const copiedIssue = (await copied.json()) as { body: string };
  expect(copiedIssue.body.trimEnd()).toBe('Keep the implementation details.');
  expect(copiedIssue).toMatchObject({
    title: expect.stringContaining(title),
    status: 'in_progress',
    type: 'bug',
    priority: 2,
    estimate: 3,
  });
});

test('issues can be converted into reusable workspace templates', async ({ page, request }) => {
  const stamp = Date.now();
  const templateName = `Incident template ${stamp}`;
  const sourceTitle = `Incident response ${stamp}`;
  const sourceResponse = await request.post('/api/issues', {
    data: {
      title: sourceTitle,
      body: '## Impact\n\nDescribe customer impact.\n',
      status: 'in_progress',
      type: 'bug',
      priority: 2,
      estimate: 3,
    },
  });
  expect(sourceResponse.ok()).toBeTruthy();
  const source = (await sourceResponse.json()) as { identifier: string };

  await page.goto(`/issues/${source.identifier}`);
  await page.getByRole('button', { name: 'Issue options' }).click();
  await page.getByRole('menuitem', { name: 'Convert to' }).hover();
  await page.getByRole('menuitem', { name: 'Template…' }).click();
  const templateDialog = page.getByRole('dialog', { name: 'Template…' });
  await templateDialog.getByRole('textbox', { name: 'Template name' }).fill(templateName);
  await templateDialog.getByRole('button', { name: 'Create' }).click();
  await expect(templateDialog).toHaveCount(0);

  const templates = (await (await request.get('/api/issue-templates')).json()) as {
    slug: string;
    name: string;
    title: string;
    body: string;
    status: string;
    type: string;
    priority: number;
    estimate: number;
  }[];
  expect(templates).toContainEqual(
    expect.objectContaining({
      name: templateName,
      title: sourceTitle,
      body: expect.stringContaining('Describe customer impact.'),
      status: 'in_progress',
      type: 'bug',
      priority: 2,
      estimate: 3,
    }),
  );

  await page.goto('/templates');
  await expect(page.getByRole('listitem').filter({ hasText: templateName })).toBeVisible();
  await page.getByRole('button', { name: 'Create issue' }).click();
  const createDialog = page.getByRole('dialog', { name: 'Create issue' });
  const templatePicker = createDialog.getByRole('combobox', { name: 'Issue template' });
  await templatePicker.click();
  await page.getByRole('option', { name: templateName }).click();
  await expect(createDialog.getByRole('textbox', { name: 'Issue title' })).toHaveValue(sourceTitle);
  await expect(createDialog.getByRole('textbox', { name: 'Description' })).toContainText(
    'Describe customer impact.',
  );
  await expect(createDialog.getByLabel('Status')).toHaveValue('in_progress');
  await expect(createDialog.getByLabel('Priority')).toHaveValue('2');
  await expect(createDialog.getByLabel('Type')).toHaveValue('bug');
  await expect(createDialog.getByLabel('Estimate')).toHaveValue('3');

  const createdTitle = `Follow-up incident ${stamp}`;
  const dueDate = '2035-04-12';
  const titleInput = createDialog.getByRole('textbox', { name: 'Issue title' });
  await titleInput.fill(createdTitle);
  await expect(titleInput).toHaveValue(createdTitle);
  await createDialog.getByLabel('Due date').fill(dueDate);
  const createRequest = page.waitForRequest(
    (candidate) => candidate.url().endsWith('/api/issues') && candidate.method() === 'POST',
  );
  const createResponse = page.waitForResponse(
    (candidate) =>
      candidate.url().endsWith('/api/issues') && candidate.request().method() === 'POST',
  );
  await createDialog.getByRole('button', { name: 'Create', exact: true }).click();
  expect((await createRequest).postDataJSON()).toMatchObject({ title: createdTitle, dueDate });
  const createdFromResponse = (await (await createResponse).json()) as {
    identifier: string;
    title: string;
  };
  expect(createdFromResponse.title).toBe(createdTitle);
  await expect(page).toHaveURL(/\/issues\/[A-Z]+-\d+$/);
  const createdIssue = await request.get(`/api/issues/${createdFromResponse.identifier}`);
  expect(await createdIssue.json()).toMatchObject({
    title: createdTitle,
    body: expect.stringContaining('Describe customer impact.'),
    status: 'in_progress',
    type: 'bug',
    priority: 2,
    estimate: 3,
    dueDate,
  });
});

test('converting an issue creates a project and keeps the issue linked', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const title = `Project conversion ${stamp}`;
  const description = '## Project context\n\nKeep this context with the project.';
  const sourceResponse = await request.post('/api/issues', {
    data: { title, body: description, status: 'in_progress', priority: 2, dueDate: '2026-10-20' },
  });
  expect(sourceResponse.ok()).toBeTruthy();
  const source = (await sourceResponse.json()) as { identifier: string };

  await page.goto(`/issues/${source.identifier}`);
  await page.getByRole('button', { name: 'Issue options' }).click();
  await page.getByRole('menuitem', { name: 'Convert to' }).hover();
  await page.getByRole('menuitem', { name: 'Project…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Project…' });
  const projectName = `Converted project ${stamp}`;
  await dialog.getByRole('textbox', { name: 'Project name' }).fill(projectName);
  await expect(dialog.getByRole('textbox', { name: 'Description' })).toHaveValue(
    `${description}\n`,
  );
  await expect(dialog.getByLabel('Status')).toHaveValue('started');
  await expect(dialog.getByLabel('Priority')).toHaveValue('2');
  await expect(dialog.getByLabel('Target date')).toHaveValue('2026-10-20');
  await dialog.getByLabel('Status').selectOption('planned');
  await dialog.getByLabel('Priority').selectOption('3');
  await dialog.getByLabel('Start date').fill('2026-09-01');
  await dialog.getByLabel('Target date').fill('2026-10-31');
  await dialog.getByRole('button', { name: 'Create project' }).click();

  await expect(page).toHaveURL(/\/projects\/[a-z0-9-]+$/);
  const slug = new URL(page.url()).pathname.split('/').at(-1)!;
  await expect(page.getByRole('heading', { name: projectName })).toBeVisible();
  const projectResponse = await request.get(`/api/projects/${slug}`);
  expect(projectResponse.ok()).toBeTruthy();
  expect(await projectResponse.json()).toMatchObject({
    name: projectName,
    description: `${description}\n`,
    status: 'planned',
    priority: 3,
    startDate: '2026-09-01',
    targetDate: '2026-10-31',
  });
  const updatedIssue = await request.get(`/api/issues/${source.identifier}`);
  expect(await updatedIssue.json()).toMatchObject({
    identifier: source.identifier,
    title,
    body: `${description}\n`,
    status: 'in_progress',
    priority: 2,
    projectSlug: slug,
  });

  await page.getByRole('combobox', { name: 'Priority' }).selectOption('4');
  await expect
    .poll(async () => {
      const latest = await request.get(`/api/projects/${slug}`);
      return ((await latest.json()) as { priority: number }).priority;
    })
    .toBe(4);
});

test('issues can become scheduled recurring issues with an initial instance', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const title = `Weekly review ${stamp}`;
  const name = `Review schedule ${stamp}`;
  const firstDueDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const response = await request.post('/api/issues', {
    data: { title, body: 'Review progress and blockers.', status: 'in_progress', priority: 2 },
  });
  expect(response.ok()).toBeTruthy();
  const source = (await response.json()) as { identifier: string };

  await page.goto(`/issues/${source.identifier}`);
  await page.getByRole('button', { name: 'Issue options' }).click();
  await page.getByRole('menuitem', { name: 'Convert to' }).hover();
  await page.getByRole('menuitem', { name: 'Recurring issue…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Recurring issue…' });
  await dialog.getByRole('textbox', { name: 'Recurring issue name' }).fill(name);
  await dialog.getByRole('textbox', { name: 'First due' }).fill(firstDueDate);
  await dialog.getByRole('spinbutton', { name: 'Repeats every' }).fill('2');
  await dialog.getByRole('combobox', { name: 'Repeats every' }).selectOption('week');
  const createResponsePromise = page.waitForResponse((candidate) => {
    const request = candidate.request();
    return (
      request.method() === 'POST' &&
      new URL(candidate.url()).pathname === `/api/issues/${source.identifier}/recurrences`
    );
  });
  await dialog.getByRole('button', { name: 'Create', exact: true }).click();
  const createResponse = await createResponsePromise;
  const schedule = (await createResponse.json()) as {
    slug: string;
    name: string;
    title: string;
    body: string;
    firstDueDate: string;
    interval: number;
    unit: string;
    lastIssueIdentifier: string;
    enabled: boolean;
  };
  expect(createResponse.ok(), JSON.stringify(schedule)).toBeTruthy();
  expect(schedule).toMatchObject({
    slug: expect.any(String),
    name,
    title,
    body: expect.stringContaining('Review progress and blockers.'),
    firstDueDate,
    nextDueDate: firstDueDate,
    interval: 2,
    unit: 'week',
    lastIssueIdentifier: expect.any(String),
    enabled: true,
  });
  await expect(page).toHaveURL(new RegExp(`/issues/${schedule!.lastIssueIdentifier}$`));
  const firstInstance = await request.get(`/api/issues/${schedule!.lastIssueIdentifier}`);
  expect(await firstInstance.json()).toMatchObject({
    title,
    body: expect.stringContaining('Review progress and blockers.'),
    status: 'backlog',
    priority: 2,
    dueDate: firstDueDate,
  });

  await page.goto('/recurring');
  const scheduleRow = page.getByRole('listitem').filter({ hasText: name });
  await expect(scheduleRow).toBeVisible();
  await scheduleRow.getByRole('button', { name: 'Pause' }).click();
  await expect(scheduleRow.getByText('Paused')).toBeVisible();
  await scheduleRow.getByRole('button', { name: 'Resume' }).click();
  await expect(scheduleRow.getByText('Active')).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await scheduleRow.getByRole('button', { name: 'Delete schedule' }).click();
  await expect(page.getByText('No recurring issues yet.')).toBeVisible();
  const retained = await request.get(`/api/issues/${schedule!.lastIssueIdentifier}`);
  expect(retained.ok()).toBeTruthy();
});

test('issue options open description history and offer prior versions as drafts', async ({
  page,
  request,
}) => {
  const title = `Description history ${Date.now()}`;
  const created = await request.post('/api/issues', {
    data: { title, body: 'First description version.' },
  });
  expect(created.ok()).toBeTruthy();
  const issue = (await created.json()) as { identifier: string };
  const documentPath = `/api/documents/issues/${issue.identifier}/body`;
  const current = (await (await request.get(documentPath)).json()) as {
    revision: string;
  };
  const updated = await request.put(documentPath, {
    data: { body: 'Latest description version.', revision: current.revision },
  });
  expect(updated.ok()).toBeTruthy();

  await page.goto(`/issues/${issue.identifier}`);
  await page.getByRole('button', { name: 'Issue options' }).click();
  await page.getByRole('menuitem', { name: 'Show description history' }).click();
  const editor = page.getByRole('region', { name: 'Document editor' });
  const history = editor.getByLabel('Description history');
  await expect(editor.getByText('Current version')).toBeVisible();
  await expect(history.getByText('Latest description version.')).toBeVisible();
  await expect(history.getByRole('button', { name: /Restore as draft/ })).toBeVisible();
});

test('issue reminders can be scheduled, reviewed, and dismissed', async ({ page, request }) => {
  const created = await request.post('/api/issues', {
    data: { title: `Reminder ${Date.now()}` },
  });
  expect(created.ok()).toBeTruthy();
  const issue = (await created.json()) as { identifier: string; title: string };

  await page.goto(`/issues/${issue.identifier}`);
  await page.getByRole('button', { name: 'Issue options' }).click();
  await page.getByRole('menuitem', { name: 'Remind me' }).hover();
  const tomorrowReminderResponse = page.waitForResponse((response) => {
    const request = response.request();
    return (
      request.method() === 'PATCH' &&
      new URL(response.url()).pathname === `/api/issues/${issue.identifier}`
    );
  });
  await page.getByRole('menuitem', { name: 'Tomorrow' }).click();
  expect((await tomorrowReminderResponse).ok()).toBeTruthy();
  let saved = (await (await request.get(`/api/issues/${issue.identifier}`)).json()) as {
    reminderAt: string | null;
  };
  expect(saved.reminderAt).not.toBeNull();
  expect(new Date(saved.reminderAt!).getTime()).toBeGreaterThan(Date.now());
  await expect(page.getByRole('menu', { name: 'Issue options' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Issue options' }).click();
  await page.getByRole('menuitem', { name: 'Remind me' }).hover();
  await page.getByRole('menuitem', { name: 'Custom…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Set reminder' });
  await dialog.getByRole('textbox', { name: 'Date and time' }).fill('2030-01-02T03:04');
  const customReminderResponse = page.waitForResponse((response) => {
    const request = response.request();
    return (
      request.method() === 'PATCH' &&
      new URL(response.url()).pathname === `/api/issues/${issue.identifier}`
    );
  });
  await dialog.getByRole('button', { name: 'Save' }).click();
  expect((await customReminderResponse).ok()).toBeTruthy();
  saved = (await (await request.get(`/api/issues/${issue.identifier}`)).json()) as {
    reminderAt: string | null;
  };
  expect(Date.parse(saved.reminderAt!)).toBe(Date.parse('2030-01-02T03:04'));

  await page.goto('/reminders');
  await expect(page.getByRole('link', { name: new RegExp(issue.identifier) })).toBeVisible();
  const dismissResponse = page.waitForResponse((response) => {
    const request = response.request();
    return (
      request.method() === 'PATCH' &&
      new URL(response.url()).pathname === `/api/issues/${issue.identifier}`
    );
  });
  await page.getByRole('button', { name: 'Dismiss' }).click();
  expect((await dismissResponse).ok()).toBeTruthy();
  await expect(page.getByText('No scheduled reminders.')).toBeVisible();
  saved = (await (await request.get(`/api/issues/${issue.identifier}`)).json()) as {
    reminderAt: string | null;
  };
  expect(saved.reminderAt).toBeNull();
});

test('Linear-style display settings persist on a saved view and render empty groups', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const response = await request.post('/api/issues', {
    data: { title: `Display settings ${stamp}`, status: 'todo', priority: 2 },
  });
  expect(response.ok()).toBeTruthy();

  await page.goto('/issues');
  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByLabel('Grouping', { exact: true }).selectOption('status');
  await page.getByLabel('Ordering', { exact: true }).selectOption('status');
  await page.getByLabel('Completed issues', { exact: true }).selectOption('none');
  await page.getByLabel('Nested sub-issues').selectOption('showAll');
  await page.getByLabel('Show sub-issues').uncheck();
  await page.getByLabel('Show empty groups').check();
  await page.getByRole('checkbox', { name: 'Time in status' }).check();

  const viewName = `Display settings ${stamp}`;
  await page.getByLabel('New view name').fill(viewName);
  await page.getByLabel('New view name').press('ControlOrMeta+Enter');
  const slug = `display-settings-${stamp}`;
  await expect(page).toHaveURL(new RegExp(`/views/${slug}$`));

  const saved = await request.get(`/api/views/${slug}`);
  expect(saved.ok()).toBeTruthy();
  const view = await saved.json();
  expect(view).toMatchObject({
    groupBy: 'status',
    orderBy: 'status',
    completedIssues: 'none',
    showSubIssues: false,
    nestedSubIssues: 'showAll',
    showEmptyGroups: true,
  });
  expect(view.displayProperties).toContain('timeInStatus');
  await page.getByRole('button', { name: 'Display options' }).click();
  await expect(page.getByLabel('Grouping', { exact: true })).toHaveValue('status');
  await expect(page.getByRole('button', { name: /Canceled · 0 issues/ })).toBeVisible();
});

test('board columns group cards by status and reflect a detail edit', async ({ page, request }) => {
  const seed = Date.now();
  for (let index = 0; index < 20; index++) {
    const filler = await request.post('/api/issues', {
      data: { title: `Board filler ${seed} ${index}`, status: 'todo' },
    });
    expect(filler.ok()).toBeTruthy();
  }
  const title = `Component board ${Date.now()}`;
  const response = await request.post('/api/issues', {
    data: { title, status: 'todo', priority: 1 },
  });
  expect(response.ok()).toBeTruthy();
  const issue = (await response.json()) as { identifier: string };
  const cardName = new RegExp(issue.identifier);

  await page.goto('/board');
  const todoColumn = page.getByRole('region', { name: 'todo issues' });
  const todoCards = todoColumn.getByRole('region', { name: 'todo issue cards' });
  const scroll = await todoCards.evaluate((viewport: HTMLElement) => {
    viewport.scrollTop = viewport.scrollHeight;
    return {
      clientHeight: viewport.clientHeight,
      scrollHeight: viewport.scrollHeight,
      scrollTop: viewport.scrollTop,
    };
  });
  expect(scroll.scrollHeight).toBeGreaterThan(scroll.clientHeight);
  expect(scroll.scrollTop).toBeGreaterThan(0);
  const card = todoColumn.getByRole('button', { name: cardName });
  await expect(card).toBeVisible();
  await expect(card).toBeInViewport();
  await card.click();

  await chooseIssueProperty(page, 'Status', 'Done');
  await page.getByRole('link', { name: 'Board' }).click();

  const doneColumn = page.getByRole('region', { name: 'done issues' });
  await expect(doneColumn.getByRole('button', { name: cardName })).toBeVisible();
  await expect(todoColumn.getByRole('button', { name: cardName })).toHaveCount(0);
});

test('cycle navigation stays under the team and the list follows Linear chronology', async ({
  page,
  request,
}) => {
  const now = Date.now();
  const activeStart = new Date(now - 3 * 24 * 60 * 60 * 1000);
  const activeResponse = await request.post('/api/cycles', {
    data: {
      startsAt: activeStart.toISOString(),
      endsAt: new Date(now + 4 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
    },
  });
  expect(activeResponse.ok()).toBeTruthy();
  const activeCycle = (await activeResponse.json()) as { number: number };
  const upcomingStart = new Date(now + 7 * 24 * 60 * 60 * 1000);
  const upcomingResponse = await request.post('/api/cycles', {
    data: {
      startsAt: upcomingStart.toISOString(),
      endsAt: new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'upcoming',
    },
  });
  expect(upcomingResponse.ok()).toBeTruthy();
  const upcomingCycle = (await upcomingResponse.json()) as { number: number };
  const completedStart = new Date(now - 21 * 24 * 60 * 60 * 1000);
  const completedResponse = await request.post('/api/cycles', {
    data: {
      startsAt: completedStart.toISOString(),
      endsAt: new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'completed',
    },
  });
  expect(completedResponse.ok()).toBeTruthy();
  const completedCycle = (await completedResponse.json()) as { number: number };

  await page.goto('/cycles');
  const main = page.getByRole('main');
  const upcomingRow = main.getByRole('region', { name: `Cycle ${upcomingCycle.number}` });
  const activeRow = main.getByRole('region', { name: `Cycle ${activeCycle.number}` });
  const completedRow = main.getByRole('region', { name: `Cycle ${completedCycle.number}` });
  await expect(upcomingRow.getByRole('link')).toHaveAttribute(
    'href',
    `/cycles/${upcomingCycle.number}`,
  );
  await expect(activeRow.getByRole('link')).toHaveAttribute(
    'href',
    `/cycles/${activeCycle.number}`,
  );
  await expect(completedRow.getByRole('link')).toHaveAttribute(
    'href',
    `/cycles/${completedCycle.number}`,
  );
  const upcomingTop = (await upcomingRow.boundingBox())?.y;
  const activeTop = (await activeRow.boundingBox())?.y;
  const completedTop = (await completedRow.boundingBox())?.y;
  expect(upcomingTop).toBeDefined();
  expect(activeTop).toBeDefined();
  expect(completedTop).toBeDefined();
  expect(upcomingTop).toBeLessThan(activeTop!);
  expect(activeTop).toBeLessThan(completedTop!);
  await expect(upcomingRow.getByText('Upcoming', { exact: true })).toHaveCount(1);
  await expect(activeRow.getByText('Current', { exact: true })).toHaveCount(1);
  await expect(completedRow.getByText('Completed', { exact: true })).toHaveCount(1);

  await page.goto('/issues');
  const teamNavigation = page.getByRole('navigation', { name: 'Team navigation' });
  await expect(teamNavigation.getByRole('link', { name: 'Cycles', exact: true })).toBeVisible();
  const cycleNavigation = teamNavigation.getByRole('group', { name: 'Cycle navigation' });
  const currentLink = cycleNavigation.getByRole('link', { name: 'Current', exact: true });
  const upcomingLink = cycleNavigation.getByRole('link', { name: 'Upcoming', exact: true });
  await expect(currentLink).toBeVisible();
  await expect(upcomingLink).toBeVisible();
  await expect(teamNavigation.getByRole('link', { name: /^Cycle \d+ Current$/ })).toHaveCount(0);

  await currentLink.click();
  await expect(page).toHaveURL(/\/cycles\?scope=current$/);
  await expect(
    main.getByRole('link', { name: new RegExp(`Cycle ${activeCycle.number}\\b`) }),
  ).toBeVisible();
  await expect(
    main.getByRole('link', { name: new RegExp(`Cycle ${upcomingCycle.number}\\b`) }),
  ).toHaveCount(0);

  await upcomingLink.click();
  await expect(page).toHaveURL(/\/cycles\?scope=upcoming$/);
  await expect(
    main.getByRole('link', { name: new RegExp(`Cycle ${upcomingCycle.number}\\b`) }),
  ).toBeVisible();
  await expect(
    main.getByRole('link', { name: new RegExp(`Cycle ${activeCycle.number}\\b`) }),
  ).toHaveCount(0);
});

test('cycle details edit metadata and dates, favorite the cycle, and export issues', async ({
  page,
  request,
}) => {
  const created = await request.post('/api/cycles', {
    data: {
      startsAt: '2030-02-01T00:00:00Z',
      endsAt: '2030-02-14T00:00:00Z',
      status: 'active',
    },
  });
  expect(created.ok()).toBeTruthy();
  const cycle = (await created.json()) as { number: number; name: string };

  await page.goto(`/cycles/${cycle.number}`);
  await page.evaluate(() => {
    const target = window as Window & { copiedCycleLink?: string };
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          target.copiedCycleLink = value;
        },
      },
    });
  });
  await page.getByRole('button', { name: 'Cycle options' }).click();
  await page.getByRole('menuitem', { name: 'Copy link' }).click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as Window & { copiedCycleLink?: string }).copiedCycleLink),
    )
    .toMatch(new RegExp(`/cycles/${cycle.number}$`));

  await page.getByRole('button', { name: 'Cycle options' }).click();
  await page.getByRole('menuitem', { name: 'Edit cycle name and description…' }).click();
  const metadata = page.getByRole('dialog', { name: 'Edit cycle name and description…' });
  await metadata.getByLabel('Cycle name').fill('Release planning');
  await metadata.getByLabel('Description').fill('Stabilize the next release.');
  await metadata.getByRole('button', { name: 'Save' }).click();

  await page.getByRole('button', { name: 'Cycle options' }).click();
  await page.getByRole('menuitem', { name: 'Change cycle dates' }).click();
  const dates = page.getByRole('dialog', { name: 'Change cycle dates' });
  await expect(dates.getByLabel('Start date')).toBeDisabled();
  await dates.getByLabel('End date').fill('2030-02-21');
  await dates.getByRole('button', { name: 'Save' }).click();

  const favoriteSwitch = page.getByRole('switch', { name: 'Add to favorites' });
  await favoriteSwitch.focus();
  await favoriteSwitch.press('Space');
  await expect(favoriteSwitch).toBeChecked();
  const favoriteLink = page
    .getByRole('navigation', { name: 'Favorites' })
    .getByRole('link', { name: 'Release planning' });
  await expect(favoriteLink).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Cycle options' }).click();
  await page.getByRole('menuitem', { name: 'Export issues as CSV…' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(`cycle-${cycle.number}-issues.csv`);

  const calendarDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Cycle options' }).click();
  await page.getByRole('menuitem', { name: 'Download calendar file (.ics)…' }).click();
  const calendarDownload = await calendarDownloadPromise;
  expect(calendarDownload.suggestedFilename()).toBe(`cycle-${cycle.number}.ics`);

  const saved = await request.get(`/api/cycles/${cycle.number}`);
  expect(saved.ok()).toBeTruthy();
  expect(await saved.json()).toMatchObject({
    name: 'Release planning',
    description: 'Stabilize the next release.',
    startsAt: '2030-02-01T00:00:00Z',
    endsAt: '2030-02-21T00:00:00Z',
    isFavorite: true,
  });
});

test('cycle details summarize scope, started, and completed work', async ({ page, request }) => {
  const created = await request.post('/api/cycles', {
    data: {
      startsAt: '2033-02-01T00:00:00Z',
      endsAt: '2033-02-14T00:00:00Z',
      status: 'active',
    },
  });
  expect(created.ok()).toBeTruthy();
  const cycle = (await created.json()) as { id: number; number: number };
  for (const [index, status] of ['in_progress', 'done', 'canceled'].entries()) {
    const issue = await request.post('/api/issues', {
      data: { title: `Cycle detail progress ${cycle.number} ${index}`, status, cycleId: cycle.id },
    });
    expect(issue.ok()).toBeTruthy();
  }

  await page.goto(`/cycles/${cycle.number}`);
  const progress = page.getByRole('region', { name: 'Progress', exact: true });
  await expect(progress).toBeVisible();
  await expect(progress.getByText('Scope', { exact: true }).first()).toBeVisible();
  await expect(progress.getByText('Started', { exact: true }).first()).toBeVisible();
  await expect(progress.getByText('Completed', { exact: true }).first()).toBeVisible();
  await expect(progress.getByText('3', { exact: true })).toBeVisible();
  await expect(progress.getByText('1 · 33%', { exact: true })).toBeVisible();
  await expect(progress.getByText('2 · 67%', { exact: true })).toBeVisible();
  await expect(progress.getByRole('progressbar', { name: 'Cycle completion' })).toBeVisible();
  await expect(progress.getByRole('progressbar', { name: 'Cycle completion' })).toHaveAttribute(
    'aria-valuetext',
    '67%',
  );
});

test('cycle issues can be filtered in the URL and displayed as a board', async ({
  page,
  request,
}) => {
  const created = await request.post('/api/cycles', {
    data: {
      startsAt: '2034-02-01T00:00:00Z',
      endsAt: '2034-02-14T00:00:00Z',
      status: 'active',
    },
  });
  expect(created.ok()).toBeTruthy();
  const cycle = (await created.json()) as { id: number; number: number };
  const inProgressTitle = `Cycle in progress ${cycle.number}`;
  const todoTitle = `Cycle todo ${cycle.number}`;
  for (const [title, status] of [
    [inProgressTitle, 'in_progress'],
    [todoTitle, 'todo'],
  ]) {
    const issue = await request.post('/api/issues', {
      data: { title, status, cycleId: cycle.id },
    });
    expect(issue.ok()).toBeTruthy();
  }

  await page.goto(`/cycles/${cycle.number}`);
  const issueList = page.getByRole('listbox', { name: 'Issues' });
  await expect(issueList.getByRole('option', { name: new RegExp(inProgressTitle) })).toBeVisible();
  await expect(issueList.getByRole('option', { name: new RegExp(todoTitle) })).toBeVisible();

  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await page.getByLabel('Filter status').selectOption('in_progress');
  await expect(page).toHaveURL(new RegExp(`/cycles/${cycle.number}\\?status=in_progress$`));
  await expect(issueList.getByRole('option', { name: new RegExp(inProgressTitle) })).toBeVisible();
  await expect(issueList.getByRole('option', { name: new RegExp(todoTitle) })).toHaveCount(0);
  await expect(
    page.getByRole('region', { name: 'Progress' }).getByText('2', { exact: true }),
  ).toBeVisible();

  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByLabel('Ordering', { exact: true }).selectOption('title');
  await page
    .getByRole('radiogroup', { name: 'Layout' })
    .getByText('Board', { exact: true })
    .click();
  await expect(page.getByRole('radio', { name: 'Board' })).toBeChecked();
  await expect(page.getByRole('button', { name: new RegExp(inProgressTitle) })).toBeVisible();
});

test('cycle details add, open, and remove documents and links', async ({ page, request }) => {
  const stamp = Date.now();
  const created = await request.post('/api/cycles', {
    data: {
      startsAt: '2031-02-01T00:00:00Z',
      endsAt: '2031-02-14T00:00:00Z',
      status: 'upcoming',
    },
  });
  expect(created.ok()).toBeTruthy();
  const cycle = (await created.json()) as { number: number };

  await page.goto(`/cycles/${cycle.number}`);
  await page.getByRole('button', { name: 'Add document or link…' }).click();
  await page.getByRole('menuitem', { name: 'Add a link…' }).click();
  const linkDialog = page.getByRole('dialog', { name: 'Add link to cycle' });
  const url = `https://example.test/cycles/${stamp}`;
  await linkDialog.getByRole('textbox', { name: 'URL' }).fill(url);
  await linkDialog.getByRole('textbox', { name: 'Title (optional)' }).fill('Planning notes');
  await linkDialog.getByRole('button', { name: 'Add link', exact: true }).click();

  const resourceList = page.getByRole('list', { name: 'Documents and links' });
  const externalLink = resourceList.getByRole('link', { name: 'Planning notes' });
  await expect(externalLink).toHaveAttribute('href', url);
  const persisted = await request.get(`/api/cycles/${cycle.number}`);
  expect(await persisted.json()).toMatchObject({
    resources: [{ url, title: 'Planning notes', kind: 'link' }],
  });

  await page.getByRole('button', { name: 'Remove Planning notes' }).click();
  await expect(page.getByText('No documents or links yet.')).toBeVisible();

  await page.getByRole('button', { name: 'Add document or link…' }).click();
  const pageResponsePromise = page.waitForResponse((response) => {
    const request = response.request();
    return request.method() === 'POST' && new URL(response.url()).pathname === '/api/pages';
  });
  const cycleLinkResponsePromise = page.waitForResponse((response) => {
    const request = response.request();
    return (
      request.method() === 'POST' &&
      new URL(response.url()).pathname === `/api/cycles/${cycle.number}/links`
    );
  });
  await page.getByRole('menuitem', { name: 'Create new document…' }).click();
  const [pageResponse, cycleLinkResponse] = await Promise.all([
    pageResponsePromise,
    cycleLinkResponsePromise,
  ]);
  const createdPage = (await pageResponse.json()) as { slug: string };
  expect(pageResponse.ok()).toBeTruthy();
  expect(cycleLinkResponse.ok()).toBeTruthy();
  await expect(page).toHaveURL(new RegExp(`/pages/${createdPage.slug}$`));
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue('New document');

  const linkedDocument = await request.get(`/api/cycles/${cycle.number}`);
  expect(await linkedDocument.json()).toMatchObject({
    resources: [expect.objectContaining({ kind: 'document', title: 'New document' })],
  });

  await page.goto(`/cycles/${cycle.number}`);
  const documentLink = page
    .getByRole('list', { name: 'Documents and links' })
    .getByRole('link', { name: 'New document', exact: true });
  await expect(documentLink).toBeVisible();
  await expect(documentLink).toHaveAttribute('href', /\/pages\/document-/);
});

test('upcoming cycles can be started today from cycle options', async ({ page, request }) => {
  const created = await request.post('/api/cycles', {
    data: {
      startsAt: '2031-02-01T00:00:00Z',
      endsAt: '2031-02-14T00:00:00Z',
      status: 'upcoming',
    },
  });
  expect(created.ok()).toBeTruthy();
  const cycle = (await created.json()) as { number: number };

  await page.goto(`/cycles/${cycle.number}`);
  await page.getByRole('button', { name: 'Cycle options' }).click();
  await page.getByRole('menuitem', { name: 'Start cycle today…' }).click();

  const expectedStart = await page.evaluate(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T00:00:00Z`;
  });
  await expect(page.getByRole('combobox', { name: 'Status' })).toHaveValue('active');
  const saved = await request.get(`/api/cycles/${cycle.number}`);
  expect(await saved.json()).toMatchObject({ status: 'active', startsAt: expectedStart });
});

test('cycle list actions favorite, copy, export, and start an upcoming cycle', async ({
  page,
  request,
}) => {
  const activeCycle = await request.post('/api/cycles', {
    data: {
      startsAt: '2032-01-01T00:00:00Z',
      endsAt: '2032-01-14T00:00:00Z',
      status: 'active',
    },
  });
  expect(activeCycle.ok()).toBeTruthy();
  const created = await request.post('/api/cycles', {
    data: {
      startsAt: '2032-02-01T00:00:00Z',
      endsAt: '2032-02-14T00:00:00Z',
      status: 'upcoming',
    },
  });
  expect(created.ok()).toBeTruthy();
  const cycle = (await created.json()) as { number: number; name: string };

  await page.goto('/cycles');
  await page.evaluate(() => {
    const target = window as Window & { copiedCycleLink?: string };
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          target.copiedCycleLink = value;
        },
      },
    });
  });
  const row = page.getByRole('region', { name: cycle.name });
  await expect(row).toBeVisible();
  const options = row.getByRole('button', { name: 'Cycle options' });

  await options.click();
  await page.getByRole('menuitem', { name: 'Add to favorites' }).click();
  await expect(
    page.getByRole('navigation', { name: 'Favorites' }).getByRole('link', { name: cycle.name }),
  ).toBeVisible();

  await options.click();
  await page.getByRole('menuitem', { name: 'Copy link' }).click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as Window & { copiedCycleLink?: string }).copiedCycleLink),
    )
    .toMatch(new RegExp(`/cycles/${cycle.number}$`));

  const calendarDownloadPromise = page.waitForEvent('download');
  await options.click();
  await page.getByRole('menuitem', { name: 'Download calendar file (.ics)…' }).click();
  const calendarDownload = await calendarDownloadPromise;
  expect(calendarDownload.suggestedFilename()).toBe(`cycle-${cycle.number}.ics`);

  await options.click();
  await page.getByRole('menuitem', { name: 'Start cycle today…' }).click();
  await expect
    .poll(async () => {
      const saved = await request.get(`/api/cycles/${cycle.number}`);
      return saved.json();
    })
    .toMatchObject({ status: 'active', isFavorite: true });
});

test('cycle list menu edits cycle metadata and dates', async ({ page, request }) => {
  const activeCycle = await request.post('/api/cycles', {
    data: {
      startsAt: '2032-01-01T00:00:00Z',
      endsAt: '2032-01-14T00:00:00Z',
      status: 'active',
    },
  });
  expect(activeCycle.ok()).toBeTruthy();
  const created = await request.post('/api/cycles', {
    data: {
      startsAt: '2032-02-01T00:00:00Z',
      endsAt: '2032-02-14T00:00:00Z',
      status: 'upcoming',
    },
  });
  expect(created.ok()).toBeTruthy();
  const cycle = (await created.json()) as { number: number; name: string };

  await page.goto('/cycles');
  let row = page.getByRole('region', { name: cycle.name });
  await row.getByRole('button', { name: 'Cycle options' }).click();
  await page.getByRole('menuitem', { name: 'Edit cycle name and description…' }).click();
  const metadata = page.getByRole('dialog', { name: 'Edit cycle name and description…' });
  await metadata.getByLabel('Cycle name').fill('Next release');
  await metadata.getByLabel('Description').fill('Prepare the next release.');
  await metadata.getByRole('button', { name: 'Save' }).click();

  row = page.getByRole('region', { name: 'Next release', exact: true });
  await expect(row).toHaveCount(1);
  await row.getByRole('button', { name: 'Cycle options' }).click();
  await page.getByRole('menuitem', { name: 'Change cycle dates' }).click();
  const dates = page.getByRole('dialog', { name: 'Change cycle dates' });
  await dates.getByLabel('Start date').fill('2032-02-02');
  await dates.getByLabel('End date').fill('2032-02-16');
  await dates.getByRole('button', { name: 'Save' }).click();

  await expect
    .poll(async () => {
      const saved = await request.get(`/api/cycles/${cycle.number}`);
      return saved.json();
    })
    .toMatchObject({
      name: 'Next release',
      description: 'Prepare the next release.',
      startsAt: '2032-02-02T00:00:00Z',
      endsAt: '2032-02-16T00:00:00Z',
    });
});

test('current cycle list card summarizes scope, started, and completed work', async ({
  page,
  request,
}) => {
  const created = await request.post('/api/cycles', {
    data: {
      startsAt: '2033-02-01T00:00:00Z',
      endsAt: '2033-02-14T00:00:00Z',
      status: 'active',
    },
  });
  expect(created.ok()).toBeTruthy();
  const cycle = (await created.json()) as { id: number; number: number; name: string };
  for (const [index, status] of ['in_progress', 'done', 'canceled'].entries()) {
    const issue = await request.post('/api/issues', {
      data: { title: `Cycle progress ${cycle.number} ${index}`, status, cycleId: cycle.id },
    });
    expect(issue.ok()).toBeTruthy();
  }

  await page.goto('/cycles');
  const row = page.getByRole('region', { name: cycle.name });
  await expect(row.getByText('Scope')).toBeVisible();
  await expect(row.getByText('Started')).toBeVisible();
  await expect(row.getByText('Completed')).toBeVisible();
  await expect(row.getByText('1 · 33%')).toBeVisible();
  await expect(row.getByText('2 · 67%')).toBeVisible();
  await expect(
    row.getByRole('progressbar', { name: `Cycle ${cycle.number} completion 67%` }),
  ).toBeVisible();
});
