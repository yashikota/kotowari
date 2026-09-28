import { expect, test } from '@playwright/test';

test('] toggles the issue-list detail rail', async ({ page }) => {
  await page.goto('/issues');

  await expect(page.getByRole('button', { name: 'Open details' })).toBeVisible();
  await page.keyboard.press(']');
  await expect(page.getByRole('button', { name: 'Close details' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Issue details' })).toBeVisible();

  await page.keyboard.press(']');
  await expect(page.getByRole('button', { name: 'Open details' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Issue details' })).toHaveCount(0);
});

test('the issue-list sidebar shows and filters single-user assignees', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const selfTitle = `Assignee facet self ${stamp}`;
  const agentTitle = `Assignee facet agent ${stamp}`;
  const unassignedTitle = `Assignee facet unassigned ${stamp}`;
  for (const issue of [
    { title: selfTitle, assignee: 'self' },
    { title: agentTitle, assignee: 'agent' },
    { title: unassignedTitle },
  ]) {
    const response = await request.post('/api/issues', { data: issue });
    expect(response.ok()).toBeTruthy();
  }

  await page.goto('/issues');
  await page.getByRole('button', { name: 'Open details' }).click();

  const sidebar = page.getByRole('complementary', { name: 'Issue details' });
  await expect(sidebar.getByRole('combobox', { name: 'Details by' })).toHaveValue('Assignees');
  await expect(sidebar.getByRole('button', { name: /^You,/ })).toBeVisible();
  await expect(sidebar.getByRole('button', { name: /^Agent,/ })).toBeVisible();
  await expect(sidebar.getByRole('button', { name: /^Unassigned,/ })).toBeVisible();

  await sidebar.getByRole('button', { name: /^Agent,/ }).click();

  await expect(page).toHaveURL(/assignee=agent/);
  await expect(page.getByText(agentTitle)).toBeVisible();
  await expect(page.getByText(selfTitle)).toHaveCount(0);
  await expect(page.getByText(unassignedTitle)).toHaveCount(0);
});

test('] toggles cycle details from the issue-free cycle view', async ({ page, request }) => {
  const now = Date.now();
  const response = await request.post('/api/cycles', {
    data: {
      startsAt: new Date(now + 7 * 86_400_000).toISOString(),
      endsAt: new Date(now + 14 * 86_400_000).toISOString(),
      status: 'upcoming',
    },
  });
  expect(response.ok()).toBeTruthy();
  const cycle = (await response.json()) as { number: number };

  await page.goto(`/cycles/${cycle.number}`);
  await expect(page.getByRole('button', { name: 'Close cycle details' })).toBeVisible();
  await page.keyboard.press(']');
  await expect(page.getByRole('button', { name: 'Open cycle details' })).toBeVisible();
  await page.keyboard.press(']');
  await expect(page.getByRole('button', { name: 'Close cycle details' })).toBeVisible();
});

test('shortcut help documents the right-sidebar shortcut', async ({ page }) => {
  await page.goto('/config');
  await page.getByRole('button', { name: 'Keyboard shortcuts' }).click();

  const help = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(help.getByText('Toggle right sidebar')).toBeVisible();
  await expect(help.getByText(']', { exact: true })).toBeVisible();
});
