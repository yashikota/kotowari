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

test('empty My issues Activity opens the issue composer', async ({ page }) => {
  await page.route('**/api/inbox/activities', (route) => route.fulfill({ json: [] }));
  await page.goto('/issues?myIssuesTab=activity');
  await expect(page.getByText('No issues with activity from you', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Create issue', exact: true })
    .filter({ hasText: 'Create issue' })
    .click();
  await expect(page.getByRole('dialog', { name: /^Create issue/ })).toBeVisible();
});

test('My issues number shortcuts switch personal tabs and ignore title input', async ({ page }) => {
  await page.goto('/issues?assignee=self&myIssuesTab=assigned');
  await expect(page.getByRole('tab', { name: 'Assigned', exact: true })).toBeVisible();
  for (const [key, tab] of [
    ['2', 'created'],
    ['3', 'subscribed'],
    ['4', 'activity'],
    ['1', 'assigned'],
  ]) {
    await page.keyboard.press(key!);
    await expect.poll(() => new URL(page.url()).searchParams.get('myIssuesTab')).toBe(tab);
  }
  await page.getByRole('button', { name: 'Create issue', exact: true }).click();
  const title = page
    .getByRole('dialog', { name: /^Create issue/ })
    .getByRole('textbox', { name: 'Issue title' });
  await title.fill('');
  await title.press('4');
  await expect(title).toHaveValue('4');
  expect(new URL(page.url()).searchParams.get('myIssuesTab')).toBe('assigned');
});

test('personal number shortcuts stay inactive on the workspace issue list', async ({ page }) => {
  await page.goto('/issues');
  await expect(page.getByRole('button', { name: 'Display options', exact: true })).toBeVisible();
  await page.keyboard.press('4');
  expect(new URL(page.url()).searchParams.has('myIssuesTab')).toBe(false);
  await expect(page.getByRole('tablist', { name: 'My issues', exact: true })).toHaveCount(0);
});
