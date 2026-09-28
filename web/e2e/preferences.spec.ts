import { expect, test } from '@playwright/test';
import { expandMoreNavigation, fillIssueSearch } from './issue-list-controls.ts';

async function choose(page: import('@playwright/test').Page, label: string, option: string) {
  await page.getByRole('combobox', { name: label }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

test('personal preferences persist appearance, comment shortcuts, and the default home view', async ({
  page,
  request,
}) => {
  const issueResponse = await request.post('/api/issues', {
    data: { title: `Personal preferences ${Date.now()}` },
  });
  expect(issueResponse.ok()).toBeTruthy();
  const issue = (await issueResponse.json()) as { identifier: string };

  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/config');

  await choose(page, 'Default home view', 'Issues');
  await choose(page, 'Color scheme', 'Dark');
  await expect(page.locator('html')).toHaveAttribute('data-mantine-color-scheme', 'dark');
  await choose(page, 'Font size', 'Large');
  await expect
    .poll(() =>
      page
        .locator('html')
        .evaluate((element) =>
          getComputedStyle(element).getPropertyValue('--mantine-font-size-sm').trim(),
        ),
    )
    .toBe('0.8125rem');
  await choose(page, 'Send comments on', 'Enter');
  await expect(page.getByLabel('Convert text emoticons into emojis')).toBeChecked();
  await page.getByLabel('Use pointer cursors').check();
  await page.getByLabel('Underline links in text').check();
  await expect(page.locator('html')).toHaveAttribute('data-pointer-cursors', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-underline-links', 'true');

  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Default home view' })).toHaveValue('Issues');
  await expect(page.getByRole('combobox', { name: 'Color scheme' })).toHaveValue('Dark');
  await expect(page.getByRole('combobox', { name: 'Font size' })).toHaveValue('Large');
  await expect(page.getByRole('combobox', { name: 'Send comments on' })).toHaveValue('Enter');
  await expect(page.getByLabel('Use pointer cursors')).toBeChecked();
  await expect(page.getByLabel('Underline links in text')).toBeChecked();

  await page.goto('/');
  await expect(page).toHaveURL(/\/issues$/);
  await expect(page.getByRole('heading', { name: 'Issues' })).toBeVisible();

  await page.goto(`/issues/${issue.identifier}`);
  const note = 'Comment sent with Enter :)';
  await page.getByLabel('New note').fill(note);
  await page.getByLabel('New note').press('Enter');
  await expect(page.getByText('Comment sent with Enter 🙂', { exact: true })).toBeVisible();

  await page.goto('/config');
  await page.getByLabel('Convert text emoticons into emojis').uncheck();
  await page.goto(`/issues/${issue.identifier}`);
  await page.getByLabel('New note').fill('Keep :) unchanged');
  await page.getByLabel('New note').press('Enter');
  await expect(page.getByText('Keep :) unchanged', { exact: true })).toBeVisible();
});

test('sidebar sections can be moved, reordered, hidden, and restored after reload', async ({
  page,
}) => {
  await page.goto('/config');
  await page.getByRole('button', { name: 'Customize sidebar' }).click();
  await choose(page, 'Where to show Issues', 'Show in More');
  await page.getByRole('button', { name: 'Move Issues down' }).click();
  await page.getByRole('dialog').getByRole('button').first().click();

  await expandMoreNavigation(page);
  const moreLinks = page.getByRole('navigation', { name: 'More' }).getByRole('link');
  await expect(moreLinks.nth(0)).toHaveText('Reminders');
  await expect(moreLinks.nth(1)).toHaveText('Board');
  await expect(moreLinks.nth(2)).toHaveText('Issues');
  await expect(moreLinks.nth(3)).toHaveText('Initiatives');
  await expect(moreLinks.nth(4)).toHaveText('ADRs');
  await expect(
    page
      .getByRole('navigation', { name: 'Team navigation' })
      .getByRole('link', { name: 'Issues', exact: true }),
  ).toHaveCount(0);

  await page.reload();
  await expandMoreNavigation(page);
  const reloadedMoreLinks = page.getByRole('navigation', { name: 'More' }).getByRole('link');
  await expect(reloadedMoreLinks.nth(0)).toHaveText('Reminders');
  await expect(reloadedMoreLinks.nth(1)).toHaveText('Board');
  await expect(reloadedMoreLinks.nth(2)).toHaveText('Issues');
  await expect(reloadedMoreLinks.nth(3)).toHaveText('Initiatives');
  await expect(reloadedMoreLinks.nth(4)).toHaveText('ADRs');

  await page.getByRole('button', { name: 'Customize sidebar' }).click();
  await choose(page, 'Where to show Issues', "Don't show");
  await expect(page.getByRole('combobox', { name: 'Where to show Issues' })).toHaveValue(
    "Don't show",
  );
  await page.getByRole('dialog').getByRole('button').first().click();
  await page.reload();
  await expandMoreNavigation(page);
  await expect(page.getByRole('heading', { name: 'Config' })).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Team navigation' })
      .getByRole('link', { name: 'Issues', exact: true }),
  ).not.toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'More' })
      .getByRole('link', { name: 'Issues', exact: true }),
  ).not.toBeVisible();

  await page.getByRole('button', { name: 'Customize sidebar' }).click();
  await choose(page, 'Where to show Issues', 'Always show');
  await page.getByRole('dialog').getByRole('button').first().click();
  await expect(
    page
      .getByRole('navigation', { name: 'Team navigation' })
      .getByRole('link', { name: 'Issues', exact: true }),
  ).toBeVisible({ timeout: 15_000 });
});

test('auto-assign preference controls the new issue default and persists', async ({ page }) => {
  await page.goto('/config');
  const preference = page.getByRole('checkbox', { name: 'Auto-assign new issues to yourself' });
  await expect(preference).toBeChecked();
  await preference.uncheck();
  await page.reload();
  await expect(preference).not.toBeChecked();

  await page.getByRole('button', { name: 'Create issue' }).click();
  const assignee = page.getByRole('combobox', { name: 'Assignee' });
  await expect(assignee).toHaveValue('Unassigned');
  await page.keyboard.press('Escape');

  await page.goto('/config');
  await preference.check();
  await page.getByRole('button', { name: 'Create issue' }).click();
  await expect(page.getByRole('combobox', { name: 'Assignee' })).toHaveValue('You');
});

test('moving an unassigned issue to Started can automatically assign it to yourself', async ({
  page,
  request,
}) => {
  const response = await request.post('/api/issues', {
    data: { title: `Assign on start ${Date.now()}`, status: 'todo' },
  });
  expect(response.ok()).toBeTruthy();
  const issue = (await response.json()) as { identifier: string };

  await page.goto('/config');
  const preference = page.getByRole('checkbox', {
    name: 'Assign yourself when moving an issue to Started',
  });
  await expect(preference).not.toBeChecked();
  await preference.check();
  await page.reload();
  await expect(preference).toBeChecked();

  await page.goto(`/issues/${issue.identifier}`);
  const status = page.getByRole('combobox', { name: 'Status' });
  await status.click();
  await page.getByRole('option', { name: 'In Progress', exact: true }).click();
  await expect
    .poll(async () => {
      const updated = await request.get(`/api/issues/${issue.identifier}`);
      return ((await updated.json()) as { assignee?: string }).assignee;
    })
    .toBe('self');
});

test('first day of the week preference is persisted and used by project date pickers', async ({
  page,
}) => {
  await page.goto('/config');
  const firstDay = page.getByRole('combobox', { name: 'First day of the week' });
  await expect(firstDay).toHaveValue('Sunday');
  await choose(page, 'First day of the week', 'Monday');
  await page.reload();
  await expect(firstDay).toHaveValue('Monday');

  await page.goto('/projects');
  await page.getByRole('button', { name: 'New project' }).first().click();
  const projectDialog = page.getByRole('dialog', { name: 'New project' });
  await projectDialog.getByRole('button', { name: 'Change Start date' }).click();
  const datePicker = page.getByRole('dialog', { name: 'Change Start date' });
  await expect(datePicker.getByRole('columnheader')).toHaveText([
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
    'Sun',
  ]);
  await expect(datePicker.getByRole('grid').getByRole('button').first()).toHaveAttribute(
    'aria-label',
    expect.stringMatching(/^Monday/),
  );
});

test('default home view supports Linear inbox, My issues, and current cycle destinations', async ({
  page,
}) => {
  await page.goto('/config');
  await choose(page, 'Default home view', 'Inbox');
  await page.goto('/');
  await expect(page).toHaveURL(/\/inbox$/);
  await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible();

  await page.goto('/config');
  await choose(page, 'Default home view', 'My issues');
  await page.goto('/');
  await expect(page).toHaveURL(/\/issues\?assignee=self&myIssuesTab=assigned$/);
  await expect(page.getByRole('heading', { name: 'Issues' })).toBeVisible();

  await page.goto('/config');
  await choose(page, 'Default home view', 'Reviews');
  await page.goto('/');
  await expect(page).toHaveURL(/\/reviews$/);
  await expect(page.getByRole('heading', { name: 'Reviews' })).toBeVisible();

  await page.goto('/config');
  await choose(page, 'Default home view', 'Active issues');
  await page.goto('/');
  await expect(page).toHaveURL(/\/issues\?view=active$/);
  await expect(page.getByRole('tab', { name: 'Active', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );

  await page.goto('/config');
  await choose(page, 'Default home view', 'Current cycle');
  await page.goto('/');
  await expect(page).toHaveURL(/\/cycles(?:\/\d+|\?scope=current)$/);
});

test('Reviews lists linked pull requests with their issue context', async ({ page, request }) => {
  const title = `Review queue issue ${Date.now()}`;
  const issueResponse = await request.post('/api/issues', {
    data: { title, status: 'in_progress' },
  });
  expect(issueResponse.ok()).toBeTruthy();
  const issue = (await issueResponse.json()) as { identifier: string };
  const pullRequestUrl = `https://github.com/example/repo/pull/${Date.now()}`;
  const linkResponse = await request.post(`/api/issues/${issue.identifier}/links`, {
    data: { url: pullRequestUrl, title: 'Review queue change', kind: 'pullRequest' },
  });
  expect(linkResponse.ok()).toBeTruthy();

  await page.goto('/reviews');
  await expect(page.getByRole('heading', { name: 'Reviews' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Review queue change' })).toHaveAttribute(
    'href',
    pullRequestUrl,
  );
  await expect(page.getByRole('link', { name: issue.identifier, exact: true })).toHaveAttribute(
    'href',
    `/issues/${issue.identifier}`,
  );
  await expect(page.getByText(title, { exact: true })).toBeVisible();
});

test('issue list tabs are addressable and retain their Linear-style status scopes', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const fixtures = [
    { title: `Active view todo ${stamp}`, status: 'todo' },
    { title: `Active view started ${stamp}`, status: 'in_progress' },
    { title: `Backlog view ${stamp}`, status: 'backlog' },
  ];
  for (const fixture of fixtures) {
    const response = await request.post('/api/issues', { data: fixture });
    expect(response.ok()).toBeTruthy();
  }

  const issueTitle = (title: string) => page.getByText(title, { exact: true });
  await page.goto('/issues?view=active');
  const activeTab = page.getByRole('tab', { name: 'Active', exact: true });
  await expect(activeTab).toHaveAttribute('aria-selected', 'true');
  await fillIssueSearch(page, fixtures[0]!.title);
  await expect(issueTitle(fixtures[0]!.title)).toBeVisible();
  await fillIssueSearch(page, fixtures[1]!.title);
  await expect(issueTitle(fixtures[1]!.title)).toBeVisible();
  await fillIssueSearch(page, fixtures[2]!.title);
  await expect(issueTitle(fixtures[2]!.title)).toHaveCount(0);
  await fillIssueSearch(page, '');

  await page.reload();
  await expect(activeTab).toHaveAttribute('aria-selected', 'true');

  await page.getByRole('tab', { name: 'Backlog', exact: true }).click();
  await expect(page).toHaveURL(/\/issues\?view=backlog$/);
  await fillIssueSearch(page, fixtures[2]!.title);
  await expect(issueTitle(fixtures[2]!.title)).toBeVisible();
  await fillIssueSearch(page, fixtures[0]!.title);
  await expect(issueTitle(fixtures[0]!.title)).toHaveCount(0);
  await fillIssueSearch(page, '');

  await page.getByRole('tab', { name: 'All issues', exact: true }).click();
  await expect(page).toHaveURL(/\/issues\?view=all$/);
  for (const fixture of fixtures) {
    await fillIssueSearch(page, fixture.title);
    await expect(issueTitle(fixture.title)).toBeVisible();
  }
});

test('cycle schedule settings persist in the workspace', async ({ page, request }) => {
  await page.goto('/config');
  await choose(page, 'Cycle duration', '2 weeks');
  await choose(page, 'Cooldown between cycles', '1 week');
  await choose(page, 'Cycle start day', 'Tuesday');
  await choose(page, 'Automatically create upcoming cycles', 'Off');
  await page.getByRole('button', { name: 'Save cycle schedule' }).click();
  await expect(page.getByText('Cycle schedule saved')).toBeVisible();

  const response = await request.get('/api/workspace');
  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toMatchObject({
    cycleSettings: {
      durationDays: 14,
      cooldownDays: 7,
      startDay: 'tuesday',
      autoCreateAhead: 0,
    },
  });

  await request.patch('/api/workspace', {
    data: {
      cycleSettings: {
        durationDays: 7,
        cooldownDays: 0,
        startDay: 'monday',
        autoCreateAhead: 0,
      },
    },
  });
});
