import { expect, test } from '@playwright/test';

test('personal inbox reviews, filters, reads, and archives recent issue activity', async ({
  page,
  request,
}) => {
  const title = `Inbox activity ${Date.now()}`;
  const created = await request.post('/api/issues', {
    data: { title, status: 'todo' },
  });
  expect(created.ok()).toBeTruthy();
  const issue = (await created.json()) as { identifier: string };
  const comment = await request.post(`/api/issues/${issue.identifier}/comments`, {
    data: { body: 'Review this update in the inbox.' },
  });
  expect(comment.ok()).toBeTruthy();

  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('kotowari.inbox.v1'));
  await page.goto('/inbox');
  await expect(page.getByRole('heading', { name: 'Inbox', level: 2 })).toBeVisible();
  const notifications = page.getByRole('region', { name: 'Notifications' });
  const commentItem = notifications.getByRole('button', {
    name: new RegExp(`${issue.identifier}: ${title}\\. Added a note`),
  });
  await expect(commentItem).toBeVisible();
  await expect(
    notifications.getByRole('button', { name: new RegExp(`${issue.identifier}: ${title}`) }),
  ).toHaveCount(2);

  await commentItem.click();
  const details = page.getByRole('region', { name: 'Notification details' });
  await expect(details.getByText('Review this update in the inbox.')).toBeVisible();
  await details.getByRole('button', { name: 'Mark as unread' }).click();
  await expect(commentItem).toHaveAttribute('aria-current', 'true');

  const unreadToggle = page.getByRole('button', { name: /Show unreads only/ });
  await unreadToggle.click();
  await expect(unreadToggle).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Add filter' }).click();
  await page.getByRole('menuitem', { name: 'Comments' }).click();
  await expect(
    notifications.getByRole('button', { name: new RegExp(issue.identifier) }),
  ).toHaveCount(1);

  await unreadToggle.click();
  await page.getByRole('button', { name: 'Add filter' }).click();
  await page.getByRole('menuitem', { name: 'All activity' }).click();
  await expect(
    notifications.getByRole('button', { name: new RegExp(issue.identifier) }),
  ).toHaveCount(2);

  await details.getByRole('button', { name: 'Archive' }).click();
  await expect(
    notifications.getByRole('button', { name: new RegExp(issue.identifier) }),
  ).toHaveCount(1);
  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByRole('menuitem', { name: 'Compact density' }).click();
  await page.reload();
  await expect(
    notifications.getByRole('button', { name: new RegExp(issue.identifier) }),
  ).toHaveCount(1);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('kotowari.inbox.v1')))
    .toContain('"density":"compact"');

  await page.setViewportSize({ width: 390, height: 844 });
  await notifications.getByRole('button', { name: new RegExp(issue.identifier) }).click();
  await expect(details).toBeVisible();
  await details.getByRole('button', { name: 'Back to inbox' }).click();
  await expect(notifications).toBeVisible();
});

test('inbox bulk actions remove read notifications or clear the personal inbox', async ({
  page,
  request,
}) => {
  const created = await request.post('/api/issues', {
    data: { title: `Inbox bulk actions ${Date.now()}`, status: 'todo' },
  });
  expect(created.ok()).toBeTruthy();
  const issue = (await created.json()) as { identifier: string };
  const comment = await request.post(`/api/issues/${issue.identifier}/comments`, {
    data: { body: 'A second inbox activity to keep unread.' },
  });
  expect(comment.ok()).toBeTruthy();

  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('kotowari.inbox.v1'));
  await page.goto('/inbox');
  const notifications = page.getByRole('region', { name: 'Notifications' });
  const issueNotifications = notifications.getByRole('button', {
    name: new RegExp(`${issue.identifier}: Inbox bulk actions`),
  });
  await expect(issueNotifications).toHaveCount(2);
  await issueNotifications.first().click();

  await page.getByRole('button', { name: 'Notification actions' }).click();
  await page.getByRole('menuitem', { name: 'Delete all read' }).click();
  await expect(issueNotifications).toHaveCount(1);

  await issueNotifications.click();
  await page.keyboard.press('Shift+Backspace');
  await expect(issueNotifications).toHaveCount(0);

  await page.getByRole('button', { name: 'Notification actions' }).click();
  await page.getByRole('menuitem', { name: 'Delete all', exact: true }).click();
  await expect(notifications.getByRole('button')).toHaveCount(0);
  await page.reload();
  await expect(notifications.getByRole('button')).toHaveCount(0);

  await page.getByRole('button', { name: 'Notification actions' }).click();
  await page.getByRole('menuitem', { name: 'Go to settings' }).click();
  await expect(page).toHaveURL(/\/config$/);
});

test('inbox display options show unread first and persist ordering', async ({ page, request }) => {
  const title = `Inbox ordering ${Date.now()}`;
  const created = await request.post('/api/issues', {
    data: { title, status: 'todo' },
  });
  expect(created.ok()).toBeTruthy();
  const issue = (await created.json()) as { identifier: string };
  const comment = await request.post(`/api/issues/${issue.identifier}/comments`, {
    data: { body: 'Newest activity in this inbox.' },
  });
  expect(comment.ok()).toBeTruthy();

  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('kotowari.inbox.v1'));
  await page.goto('/inbox');
  const notifications = page.getByRole('region', { name: 'Notifications' });
  const issueNotifications = notifications.getByRole('button', {
    name: new RegExp(`${issue.identifier}: ${title}`),
  });
  await expect(issueNotifications).toHaveCount(2);
  await expect(issueNotifications.first()).toHaveAttribute('aria-label', /Added a note/);

  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByRole('menuitem', { name: 'Ordering' }).hover();
  await page.getByRole('menuitem', { name: 'Oldest' }).click();
  await expect(issueNotifications.first()).toHaveAttribute('aria-label', /Created/);

  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByRole('menuitem', { name: 'Ordering' }).hover();
  await page.getByRole('menuitem', { name: 'Newest' }).click();
  const newestActivity = notifications.getByRole('button', {
    name: new RegExp(`${issue.identifier}: ${title}\\. Added a note`),
  });
  await newestActivity.click();

  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByRole('menuitem', { name: 'Show unread first' }).click();
  await expect(issueNotifications.first()).toHaveAttribute('aria-label', /Created/);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const state = JSON.parse(localStorage.getItem('kotowari.inbox.v1') ?? '{}') as {
          ordering?: string;
          showUnreadFirst?: boolean;
        };
        return state;
      }),
    )
    .toMatchObject({ ordering: 'newest', showUnreadFirst: true });

  await page.reload();
  await expect(issueNotifications.first()).toHaveAttribute('aria-label', /Created/);
});

test('priority inbox splits activity by type and Focus groups unread notifications', async ({
  page,
  request,
}) => {
  const title = `Inbox priority ${Date.now()}`;
  const created = await request.post('/api/issues', {
    data: { title, status: 'todo' },
  });
  expect(created.ok()).toBeTruthy();
  const issue = (await created.json()) as { identifier: string };
  const comment = await request.post(`/api/issues/${issue.identifier}/comments`, {
    data: { body: 'A reply that can be moved to Other.' },
  });
  expect(comment.ok()).toBeTruthy();
  const activitiesResponse = await request.get('/api/inbox/activities');
  expect(activitiesResponse.ok()).toBeTruthy();
  const activities = (await activitiesResponse.json()) as { action: string }[];
  const repliesCount = activities.filter((activity) =>
    activity.action.startsWith('comment'),
  ).length;
  const priorityCount = activities.length;

  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('kotowari.inbox.v1'));
  await page.goto('/inbox');
  const notifications = page.getByRole('region', { name: 'Notifications' });
  const issueNotifications = notifications.getByRole('button', {
    name: new RegExp(`${issue.identifier}: ${title}`),
  });
  await expect(issueNotifications).toHaveCount(2);

  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByRole('menuitem', { name: 'Enable priority inbox' }).click();
  await page.keyboard.press('Escape');
  const priorityTab = page.getByRole('tab', { name: /Priority/ });
  const otherTab = page.getByRole('tab', { name: /Other/ });
  await expect(priorityTab).toContainText(String(priorityCount));
  await expect(otherTab).toContainText('0');

  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByRole('menuitem', { name: 'Badge count' }).hover();
  await page.getByRole('menuitem', { name: 'None', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(priorityTab).toHaveText('Priority');
  await expect(otherTab).toHaveText('Other');
  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByRole('menuitem', { name: 'Badge count' }).hover();
  await page.getByRole('menuitem', { name: 'Priority & Other' }).click();
  await page.keyboard.press('Escape');
  await expect(priorityTab).toContainText(String(priorityCount));

  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByRole('menuitem', { name: 'Include in priority inbox' }).hover();
  await page.getByRole('menuitem', { name: 'Replies' }).click();
  await page.keyboard.press('Escape');
  await expect(priorityTab).toContainText(String(priorityCount - repliesCount));
  await expect(otherTab).toContainText(String(repliesCount));
  await otherTab.click();
  await expect(issueNotifications).toHaveCount(1);
  await expect(issueNotifications.first()).toHaveAttribute('aria-label', /Added a note/);

  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByRole('menuitem', { name: 'Include in priority inbox' }).hover();
  await page.getByRole('menuitem', { name: 'All', exact: true }).click();
  await page.keyboard.press('Escape');
  await priorityTab.click();

  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByRole('menuitem', { name: 'Group unreads by' }).hover();
  await page.getByRole('menuitem', { name: 'Focus' }).click();
  await page.keyboard.press('Escape');
  const unreadGroup = notifications.getByRole('region', { name: 'Unread' });
  const unreadToggle = unreadGroup.getByRole('button', { name: 'Unread' });
  await expect(unreadToggle).toHaveAttribute('aria-expanded', 'true');
  await unreadToggle.click();
  await expect(unreadGroup.locator('[data-inbox-activity-id]')).toHaveCount(0);
  await unreadToggle.click();
  await expect(unreadGroup.locator('[data-inbox-activity-id]')).toHaveCount(priorityCount);
  const currentIssueNotifications = unreadGroup.getByRole('button', {
    name: new RegExp(`${issue.identifier}: ${title}`),
  });
  await expect(currentIssueNotifications).toHaveCount(2);
  await currentIssueNotifications.first().click();
  await expect(unreadGroup.locator('[data-inbox-activity-id]')).toHaveCount(priorityCount - 1);
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('kotowari.inbox.v1') ?? '{}')))
    .toMatchObject({
      priorityInboxEnabled: true,
      priorityTypes: expect.arrayContaining(['replies']),
      priorityView: 'priority',
      unreadGrouping: 'focus',
    });

  await page.reload();
  await expect(unreadGroup.locator('[data-inbox-activity-id]')).toHaveCount(priorityCount - 1);
});

test('H snoozes a focused notification and keeps it hidden after reload', async ({
  page,
  request,
}) => {
  const title = `Inbox snooze ${Date.now()}`;
  const created = await request.post('/api/issues', {
    data: { title, status: 'todo' },
  });
  expect(created.ok()).toBeTruthy();
  const issue = (await created.json()) as { identifier: string };
  const comment = await request.post(`/api/issues/${issue.identifier}/comments`, {
    data: { body: 'Snooze this notification.' },
  });
  expect(comment.ok()).toBeTruthy();

  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('kotowari.inbox.v1'));
  await page.goto('/inbox');

  const notifications = page.getByRole('region', { name: 'Notifications' });
  const notification = notifications.getByRole('button', {
    name: new RegExp(`${issue.identifier}: ${title}\\. Added a note`),
  });
  await expect(notification).toBeVisible();
  const activityId = await notification.getAttribute('data-inbox-activity-id');
  expect(activityId).not.toBeNull();
  await notification.focus();
  await page.keyboard.press('h');

  const snoozeMenu = page.getByRole('menu');
  await expect(snoozeMenu.getByRole('menuitem', { name: 'Tomorrow morning' })).toBeVisible();
  await snoozeMenu.getByRole('menuitem', { name: 'Tomorrow morning' }).click();
  await expect(notification).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate((id) => {
        const state = JSON.parse(localStorage.getItem('kotowari.inbox.v1') ?? '{}') as {
          snoozedUntil?: Record<string, number>;
        };
        return state.snoozedUntil?.[id ?? ''] ?? 0;
      }, activityId),
    )
    .toBeGreaterThan(Date.now());
  await page.reload();
  await expect(notification).toHaveCount(0);
  await expect(
    page
      .getByRole('region', { name: 'Notifications' })
      .getByRole('button', { name: new RegExp(`${issue.identifier}: ${title}\\. Created`) }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByRole('menuitem', { name: 'Show snoozed' }).click();
  await expect(notification).toBeVisible();
  await expect(notification.getByText('Snoozed')).toBeVisible();
});
