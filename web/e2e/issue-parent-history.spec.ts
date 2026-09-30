import { expect, test } from '@playwright/test';
import { chooseIssueProperty } from './issue-properties.ts';

test('issue parent changes appear in the activity timeline and inbox', async ({
  page,
  request,
}) => {
  const now = Date.now();
  const parentTitle = `Parent history ${now}`;
  const parentResponse = await request.post('/api/issues', { data: { title: parentTitle } });
  expect(parentResponse.ok()).toBeTruthy();
  const parent = (await parentResponse.json()) as { identifier: string; title: string };

  const issueResponse = await request.post('/api/issues', {
    data: { title: `Child history ${now}` },
  });
  expect(issueResponse.ok()).toBeTruthy();
  const issue = (await issueResponse.json()) as { identifier: string };

  await page.goto(`/issues/${issue.identifier}`);
  const activity = page.getByRole('region', { name: 'Activity' });
  const parentOption = `${parent.identifier} ${parent.title}`;

  await chooseIssueProperty(page, 'Parent', parentOption);
  await expect(
    activity
      .getByTestId('issue-activity-entry')
      .filter({ hasText: `Parent changed from No parent to ${parent.identifier}` }),
  ).toBeVisible();

  await chooseIssueProperty(page, 'Parent', 'No parent');
  await expect(
    activity
      .getByTestId('issue-activity-entry')
      .filter({ hasText: `Parent changed from ${parent.identifier} to No parent` }),
  ).toBeVisible();

  const historyResponse = await request.get(`/api/issues/${issue.identifier}/activities`);
  expect(historyResponse.ok()).toBeTruthy();
  const history = (await historyResponse.json()) as {
    action: string;
    payload: { from?: string; to?: string };
  }[];
  expect(history.find((entry) => entry.action === 'parent_changed')).toMatchObject({
    payload: { from: parent.identifier, to: '' },
  });
  expect(history.filter((entry) => entry.action === 'parent_changed')).toHaveLength(2);

  const inboxResponse = await request.get('/api/inbox/activities');
  expect(inboxResponse.ok()).toBeTruthy();
  const inbox = (await inboxResponse.json()) as { action: string; identifier: string }[];
  expect(
    inbox.filter(
      (entry) => entry.action === 'parent_changed' && entry.identifier === issue.identifier,
    ),
  ).toHaveLength(2);
});
