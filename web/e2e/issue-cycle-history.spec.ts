import { expect, test } from '@playwright/test';
import { chooseIssueProperty } from './issue-properties.ts';

test('issue cycle moves appear in the activity timeline and inbox', async ({ page, request }) => {
  const now = Date.now();
  const firstCycleResponse = await request.post('/api/cycles', {
    data: {
      startsAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
      endsAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
    },
  });
  expect(firstCycleResponse.ok()).toBeTruthy();
  const firstCycle = (await firstCycleResponse.json()) as { id: number; number: number };
  const secondCycleResponse = await request.post('/api/cycles', {
    data: {
      startsAt: new Date(now + 48 * 60 * 60 * 1000).toISOString(),
      endsAt: new Date(now + 72 * 60 * 60 * 1000).toISOString(),
      status: 'upcoming',
    },
  });
  expect(secondCycleResponse.ok()).toBeTruthy();
  const secondCycle = (await secondCycleResponse.json()) as { id: number; number: number };

  const issueResponse = await request.post('/api/issues', {
    data: { title: `Cycle history ${now}`, cycleId: firstCycle.id },
  });
  expect(issueResponse.ok()).toBeTruthy();
  const issue = (await issueResponse.json()) as { identifier: string };

  await page.goto(`/issues/${issue.identifier}`);
  await chooseIssueProperty(page, 'Cycle', `Cycle ${secondCycle.number}`);

  const activity = page.getByRole('region', { name: 'Activity' });
  await expect(
    activity.getByTestId('issue-activity-entry').filter({
      hasText: `Cycle changed from Cycle ${firstCycle.number} to Cycle ${secondCycle.number}`,
    }),
  ).toBeVisible();

  const historyResponse = await request.get(`/api/issues/${issue.identifier}/activities`);
  expect(historyResponse.ok()).toBeTruthy();
  const history = (await historyResponse.json()) as {
    action: string;
    payload: { from?: string; to?: string };
  }[];
  expect(history.find((entry) => entry.action === 'cycle_changed')).toMatchObject({
    payload: { from: `Cycle ${firstCycle.number}`, to: `Cycle ${secondCycle.number}` },
  });

  const inboxResponse = await request.get('/api/inbox/activities');
  expect(inboxResponse.ok()).toBeTruthy();
  const inbox = (await inboxResponse.json()) as { action: string; identifier: string }[];
  expect(
    inbox.some(
      (entry) => entry.action === 'cycle_changed' && entry.identifier === issue.identifier,
    ),
  ).toBe(true);
});
