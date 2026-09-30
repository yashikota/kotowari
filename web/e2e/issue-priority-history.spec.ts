import { expect, test } from '@playwright/test';
import { chooseIssueProperty } from './issue-properties.ts';

test('issue priority changes appear in the activity timeline and inbox', async ({
  page,
  request,
}) => {
  const now = Date.now();
  const issueResponse = await request.post('/api/issues', {
    data: { title: `Priority history ${now}` },
  });
  expect(issueResponse.ok()).toBeTruthy();
  const issue = (await issueResponse.json()) as { identifier: string };

  await page.goto(`/issues/${issue.identifier}`);
  await chooseIssueProperty(page, 'Priority', 'High');

  const activity = page.getByRole('region', { name: 'Activity' });
  await expect(
    activity
      .getByTestId('issue-activity-entry')
      .filter({ hasText: 'Priority changed from No priority to High' }),
  ).toBeVisible();

  const historyResponse = await request.get(`/api/issues/${issue.identifier}/activities`);
  expect(historyResponse.ok()).toBeTruthy();
  const history = (await historyResponse.json()) as {
    action: string;
    payload: { from?: number; to?: number };
  }[];
  expect(history.find((entry) => entry.action === 'priority_changed')).toMatchObject({
    payload: { from: 0, to: 2 },
  });

  const inboxResponse = await request.get('/api/inbox/activities');
  expect(inboxResponse.ok()).toBeTruthy();
  const inbox = (await inboxResponse.json()) as { action: string; identifier: string }[];
  expect(
    inbox.some(
      (entry) => entry.action === 'priority_changed' && entry.identifier === issue.identifier,
    ),
  ).toBe(true);
});

test('repeated priority changes collapse into expandable activity history', async ({
  page,
  request,
}) => {
  const now = Date.now();
  const issueResponse = await request.post('/api/issues', {
    data: { title: `Grouped priority history ${now}` },
  });
  expect(issueResponse.ok()).toBeTruthy();
  const issue = (await issueResponse.json()) as { identifier: string };

  await page.goto(`/issues/${issue.identifier}`);
  await chooseIssueProperty(page, 'Priority', 'High');
  await chooseIssueProperty(page, 'Priority', 'Low');

  const activity = page.getByRole('region', { name: 'Activity' });
  const group = activity.getByTestId('issue-activity-group');
  await expect(group).toHaveCount(1);
  await expect(group.getByTestId('issue-activity-priority-icon')).toHaveCount(3);
  const summary = group.getByTestId('issue-activity-entry');
  await expect(summary).toContainText('priority changed from No priority to High, then Low');
  const history = group.getByTestId('issue-activity-history-entry');
  await expect(history).toHaveCount(2);
  await expect(
    history.filter({ hasText: 'priority changed from No priority to High' }),
  ).toBeHidden();

  await summary.click();
  await expect(
    history.filter({ hasText: 'priority changed from No priority to High' }),
  ).toBeVisible();
  await expect(history.filter({ hasText: 'priority changed from High to Low' })).toBeVisible();
});
