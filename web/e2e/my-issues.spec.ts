import { expect, test } from '@playwright/test';

test('My issues uses a focused header and Linear-style personal tabs', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const assignedTitle = `My assigned ${stamp}`;
  const unassignedTitle = `Not assigned to me ${stamp}`;
  const agentCreatedTitle = `Agent created ${stamp}`;
  for (const data of [
    { title: assignedTitle, status: 'todo', assignee: 'self' },
    { title: unassignedTitle, status: 'todo' },
  ]) {
    const response = await request.post('/api/issues', { data });
    expect(response.ok()).toBeTruthy();
  }
  const agentCreated = await request.post('/api/issues', {
    data: { title: agentCreatedTitle, status: 'todo', creator: 'agent' },
  });
  expect(agentCreated.ok()).toBeTruthy();

  await page.goto('/issues?assignee=self&myIssuesTab=assigned');
  await expect(page.getByRole('heading', { name: 'My issues' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toHaveCount(0);

  const tabs = page.getByRole('tablist', { name: 'My issues' });
  await expect(tabs).toBeVisible();
  const issues = page.getByRole('listbox', { name: 'Issues' });
  await expect(issues.getByRole('option', { name: new RegExp(assignedTitle) })).toBeVisible();
  await expect(issues.getByRole('option', { name: new RegExp(unassignedTitle) })).toHaveCount(0);
  await page.getByRole('button', { name: 'Display options' }).click();
  await expect(page.getByLabel('Grouping', { exact: true })).toHaveValue('focus');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /^Backlog · \d+ issues?$/ })).toBeVisible();

  await tabs.getByRole('tab', { name: 'Created' }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('myIssuesTab')).toBe('created');
  await expect(issues.getByRole('option', { name: new RegExp(assignedTitle) })).toBeVisible();
  await expect(issues.getByRole('option', { name: new RegExp(unassignedTitle) })).toBeVisible();
  await expect(issues.getByRole('option', { name: new RegExp(agentCreatedTitle) })).toHaveCount(0);
  await expect(issues.getByRole('button', { name: /No cycle/ })).toHaveCount(0);
  await expect(issues.getByRole('option').first()).toContainText(unassignedTitle);
  await page.getByRole('button', { name: 'Display options' }).click();
  await expect(page.getByLabel('Grouping', { exact: true })).toHaveValue('none');
  await expect(page.getByLabel('Ordering', { exact: true })).toHaveValue('created');
  await page.keyboard.press('Escape');

  await tabs.getByRole('tab', { name: 'Subscribed' }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('myIssuesTab')).toBe('subscribed');
  await expect(issues.getByRole('option', { name: new RegExp(assignedTitle) })).toHaveCount(0);

  await tabs.getByRole('tab', { name: 'Activity' }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('myIssuesTab')).toBe('activity');
  await expect(page.getByText(/No issues with activity from you|My assigned/)).toBeVisible();
});
