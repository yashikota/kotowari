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
  await expect(
    page
      .getByRole('region', { name: 'Notifications' })
      .getByRole('button', { name: new RegExp(`${issue.identifier}: ${title}`) }),
  ).toHaveCount(0);
});
