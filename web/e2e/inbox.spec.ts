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

  await page.getByRole('button', { name: 'Notification actions' }).click();
  await page.getByRole('menuitem', { name: 'Mark all as read' }).click();
  await expect(notifications.getByRole('button')).toHaveCount(0);
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
