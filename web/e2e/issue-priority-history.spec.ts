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
