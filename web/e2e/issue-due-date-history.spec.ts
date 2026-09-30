import { expect, test } from '@playwright/test';
import { ensureIssuePropertyVisible } from './issue-properties.ts';

test('issue due date changes appear in the activity timeline and inbox', async ({
  page,
  request,
}) => {
  const now = Date.now();
  const issueResponse = await request.post('/api/issues', {
    data: { title: `Due date history ${now}` },
  });
  expect(issueResponse.ok()).toBeTruthy();
  const issue = (await issueResponse.json()) as { identifier: string };

  await page.goto(`/issues/${issue.identifier}`);
  await ensureIssuePropertyVisible(page, 'Due date');
  const dueDate = page.getByLabel('Due date', { exact: true });
  const activity = page.getByRole('region', { name: 'Activity' });

  await dueDate.fill('2028-04-15');
  await expect(
    activity
      .getByTestId('issue-activity-entry')
      .filter({ hasText: 'Due date changed from No due date to Apr 15, 2028' }),
  ).toBeVisible();

  await dueDate.fill('');
  await expect(
    activity
      .getByTestId('issue-activity-entry')
      .filter({ hasText: 'Due date changed from Apr 15, 2028 to No due date' }),
  ).toBeVisible();

  const historyResponse = await request.get(`/api/issues/${issue.identifier}/activities`);
  expect(historyResponse.ok()).toBeTruthy();
  const history = (await historyResponse.json()) as {
    action: string;
    payload: { from?: string; to?: string };
  }[];
  expect(history.find((entry) => entry.action === 'due_date_changed')).toMatchObject({
    payload: { from: '2028-04-15', to: '' },
  });
  expect(history.filter((entry) => entry.action === 'due_date_changed')).toHaveLength(2);

  const inboxResponse = await request.get('/api/inbox/activities');
  expect(inboxResponse.ok()).toBeTruthy();
  const inbox = (await inboxResponse.json()) as { action: string; identifier: string }[];
  expect(
    inbox.filter(
      (entry) => entry.action === 'due_date_changed' && entry.identifier === issue.identifier,
    ),
  ).toHaveLength(2);
});
