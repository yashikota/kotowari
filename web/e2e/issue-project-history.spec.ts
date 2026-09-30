import { expect, test } from '@playwright/test';

test('issue project changes appear in the activity timeline and inbox', async ({
  page,
  request,
}) => {
  const now = Date.now();
  const projectName = `Timeline project ${now}`;
  const projectResponse = await request.post('/api/projects', {
    data: { name: projectName, slug: `timeline-project-${now}`, status: 'planned' },
  });
  expect(projectResponse.ok()).toBeTruthy();

  const issueResponse = await request.post('/api/issues', {
    data: { title: `Project history ${now}` },
  });
  expect(issueResponse.ok()).toBeTruthy();
  const issue = (await issueResponse.json()) as { identifier: string };

  await page.goto(`/issues/${issue.identifier}`);
  const activity = page.getByRole('region', { name: 'Activity' });
  const chooseProject = async (name: string) => {
    await page.getByRole('combobox', { name: 'Project', exact: true }).click();
    await page
      .getByRole('listbox', { name: 'Project' })
      .getByRole('option', { name, exact: true })
      .click();
  };

  await chooseProject(projectName);
  await expect(
    activity
      .getByTestId('issue-activity-entry')
      .filter({ hasText: `Project changed from No project to ${projectName}` }),
  ).toBeVisible();

  await chooseProject('No project');
  await expect(
    activity
      .getByTestId('issue-activity-entry')
      .filter({ hasText: `Project changed from ${projectName} to No project` }),
  ).toBeVisible();

  const historyResponse = await request.get(`/api/issues/${issue.identifier}/activities`);
  expect(historyResponse.ok()).toBeTruthy();
  const history = (await historyResponse.json()) as {
    action: string;
    payload: { from?: string; to?: string };
  }[];
  expect(history.find((entry) => entry.action === 'project_changed')).toMatchObject({
    payload: { from: projectName, to: '' },
  });
  expect(history.filter((entry) => entry.action === 'project_changed')).toHaveLength(2);

  const inboxResponse = await request.get('/api/inbox/activities');
  expect(inboxResponse.ok()).toBeTruthy();
  const inbox = (await inboxResponse.json()) as { action: string; identifier: string }[];
  expect(
    inbox.filter(
      (entry) => entry.action === 'project_changed' && entry.identifier === issue.identifier,
    ),
  ).toHaveLength(2);
});
