import { expect, test } from '@playwright/test';

test('cycle header navigates to adjacent cycles by search and keyboard shortcuts', async ({
  page,
  request,
}) => {
  const now = Date.now();
  const olderResponse = await request.post('/api/cycles', {
    data: {
      startsAt: new Date(now - 42 * 86_400_000).toISOString(),
      endsAt: new Date(now - 35 * 86_400_000).toISOString(),
      status: 'completed',
    },
  });
  expect(olderResponse.ok()).toBeTruthy();
  const older = (await olderResponse.json()) as { number: number };

  const previousResponse = await request.post('/api/cycles', {
    data: {
      startsAt: new Date(now - 21 * 86_400_000).toISOString(),
      endsAt: new Date(now - 14 * 86_400_000).toISOString(),
      status: 'completed',
    },
  });
  expect(previousResponse.ok()).toBeTruthy();
  const previous = (await previousResponse.json()) as { number: number };

  const currentResponse = await request.post('/api/cycles', {
    data: {
      startsAt: new Date(now - 3 * 86_400_000).toISOString(),
      endsAt: new Date(now + 4 * 86_400_000).toISOString(),
      status: 'active',
    },
  });
  expect(currentResponse.ok()).toBeTruthy();
  const current = (await currentResponse.json()) as { number: number };

  const nextResponse = await request.post('/api/cycles', {
    data: {
      startsAt: new Date(now + 7 * 86_400_000).toISOString(),
      endsAt: new Date(now + 14 * 86_400_000).toISOString(),
      status: 'upcoming',
    },
  });
  expect(nextResponse.ok()).toBeTruthy();
  const next = (await nextResponse.json()) as { number: number };

  await page.goto(`/cycles/${current.number}`);
  const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
  await expect(breadcrumb.getByRole('button', { name: 'Open cycle', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: `Cycle ${current.number}` })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'New issue' })).toBeVisible();
  await expect(page.getByRole('main').getByText('Current', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Change End date' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cycle options' })).toBeVisible();

  await page.getByRole('button', { name: 'Close cycle details' }).click();
  const openDetails = page.getByRole('button', { name: 'Open cycle details' });
  await expect(openDetails).toHaveAttribute('aria-expanded', 'false');
  await openDetails.click();
  await expect(page.getByRole('button', { name: 'Close cycle details' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );

  await page.getByRole('button', { name: 'Open cycle', exact: true }).click();

  const menu = page.getByRole('menu', { name: 'Open cycle' });
  const search = menu.getByRole('textbox', { name: 'Open cycle' });
  await expect(search).toBeFocused();
  await expect(menu.getByText('Next cycle (upcoming)')).toBeVisible();
  await expect(menu.getByText('Previous cycle (completed)')).toBeVisible();
  await expect(
    menu.getByRole('menuitem', { name: new RegExp(`Cycle ${next.number}`) }),
  ).toBeVisible();
  await expect(
    menu.getByRole('menuitem', { name: new RegExp(`Cycle ${previous.number}`) }),
  ).toBeVisible();
  await expect(
    menu.getByRole('menuitem', { name: new RegExp(`Cycle ${older.number}`) }),
  ).toHaveCount(0);

  await search.fill(`Cycle ${older.number}`);
  await expect(
    menu.getByRole('menuitem', { name: new RegExp(`Cycle ${older.number}`) }),
  ).toBeVisible();

  await search.fill(`Cycle ${next.number}`);
  await menu.getByRole('menuitem', { name: new RegExp(`Cycle ${next.number}`) }).click();
  await expect(page).toHaveURL(new RegExp(`/cycles/${next.number}$`));

  await page.goto(`/cycles/${current.number}`);
  await expect(page.getByRole('button', { name: 'Open cycle', exact: true })).toBeVisible();
  await page.keyboard.press('Alt+k');
  await expect(page).toHaveURL(new RegExp(`/cycles/${next.number}$`));

  await page.goto(`/cycles/${current.number}`);
  await expect(page.getByRole('button', { name: 'Open cycle', exact: true })).toBeVisible();
  await page.keyboard.press('Alt+j');
  await expect(page).toHaveURL(new RegExp(`/cycles/${previous.number}$`));
});

test('sidebar Current and Upcoming open their cycle details directly', async ({
  page,
  request,
}) => {
  const now = Date.now();
  const currentResponse = await request.post('/api/cycles', {
    data: {
      startsAt: new Date(now - 2 * 86_400_000).toISOString(),
      endsAt: new Date(now + 5 * 86_400_000).toISOString(),
      status: 'active',
    },
  });
  expect(currentResponse.ok(), await currentResponse.text()).toBeTruthy();
  const current = (await currentResponse.json()) as { number: number };

  const upcomingResponse = await request.post('/api/cycles', {
    data: {
      startsAt: new Date(now + 86_400_000).toISOString(),
      endsAt: new Date(now + 8 * 86_400_000).toISOString(),
      status: 'upcoming',
    },
  });
  expect(upcomingResponse.ok(), await upcomingResponse.text()).toBeTruthy();
  const upcoming = (await upcomingResponse.json()) as { number: number };

  // Other browser cases and schedule creation share the server's cycle store.
  // Keep this navigation fixture independent of their earlier upcoming cycles.
  const fixtures = (await (await request.get('/api/cycles')).json()) as { number: number }[];
  await page.route('**/api/cycles', (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    return route.fulfill({
      json: fixtures.filter(
        (cycle) => cycle.number === current.number || cycle.number === upcoming.number,
      ),
    });
  });

  await page.goto('/cycles');
  const cycleNavigation = page.getByRole('group', { name: 'Cycle navigation' });
  const currentLink = cycleNavigation.getByRole('link', { name: 'Current', exact: true });
  const upcomingLink = cycleNavigation.getByRole('link', { name: 'Upcoming', exact: true });
  await expect(currentLink).toHaveAttribute('href', '/cycles/active');
  await expect(upcomingLink).toHaveAttribute('href', '/cycles/upcoming');

  await currentLink.click();
  await expect(page).toHaveURL(new RegExp(`/cycles/${current.number}$`));
  await expect(page.getByRole('button', { name: 'Open cycle', exact: true })).toBeVisible();
  await expect(currentLink).toHaveAttribute('data-active', 'true');
  await expect(upcomingLink).not.toHaveAttribute('data-active');
  await expect(
    page
      .getByRole('navigation', { name: 'Team navigation' })
      .getByRole('link', { name: 'Cycles', exact: true }),
  ).not.toHaveAttribute('data-active');

  await upcomingLink.click();
  await expect(page).toHaveURL(new RegExp(`/cycles/${upcoming.number}$`));
  await expect(page.getByRole('button', { name: 'Open cycle', exact: true })).toBeVisible();
  await expect(upcomingLink).toHaveAttribute('data-active', 'true');
});

test('cycle notification subscriptions persist and deliver matching events to the inbox', async ({
  page,
  request,
}) => {
  const now = Date.now();
  const cycleResponse = await request.post('/api/cycles', {
    data: {
      startsAt: new Date(now + 14 * 86_400_000).toISOString(),
      endsAt: new Date(now + 21 * 86_400_000).toISOString(),
      status: 'upcoming',
    },
  });
  expect(cycleResponse.ok(), await cycleResponse.text()).toBeTruthy();
  const cycle = (await cycleResponse.json()) as { id: number; number: number; name: string };

  await page.goto('/cycles');
  const cycleRow = page.getByRole('region', { name: cycle.name });
  await cycleRow.getByRole('button', { name: 'Cycle options' }).click();
  await page.getByRole('menuitem', { name: 'Subscribe to cycle notifications' }).hover();
  const addedPreference = page.getByRole('menuitemcheckbox', {
    name: 'An issue is added to the current cycle',
  });
  const completedPreference = page.getByRole('menuitemcheckbox', {
    name: 'An issue is marked completed or canceled',
  });
  await addedPreference.click();
  await completedPreference.click();
  await expect
    .poll(async () => {
      const response = await request.get(`/api/cycles/${cycle.number}`);
      return (await response.json()) as {
        notifyOnIssueAdded: boolean;
        notifyOnIssueCompleted: boolean;
      };
    })
    .toMatchObject({ notifyOnIssueAdded: true, notifyOnIssueCompleted: true });

  await page.reload();
  const refreshedCycleRow = page.getByRole('region', { name: cycle.name });
  await refreshedCycleRow.getByRole('button', { name: 'Cycle options' }).click();
  await page.getByRole('menuitem', { name: 'Subscribe to cycle notifications' }).hover();
  await expect(addedPreference).toHaveAttribute('aria-checked', 'true');
  await expect(completedPreference).toHaveAttribute('aria-checked', 'true');

  await page.goto(`/cycles/${cycle.number}`);
  await page.getByRole('button', { name: 'Cycle options' }).click();
  await page.getByRole('menuitem', { name: 'Subscribe to cycle notifications' }).hover();
  await expect(addedPreference).toHaveAttribute('aria-checked', 'true');
  await expect(completedPreference).toHaveAttribute('aria-checked', 'true');

  const title = `Subscribed cycle issue ${now}`;
  const created = await request.post('/api/issues', {
    data: { title, status: 'todo', cycleId: cycle.id },
  });
  expect(created.ok(), await created.text()).toBeTruthy();
  const issue = (await created.json()) as { identifier: string };
  const completed = await request.patch(`/api/issues/${issue.identifier}`, {
    data: { status: 'done' },
  });
  expect(completed.ok(), await completed.text()).toBeTruthy();

  await expect
    .poll(async () => {
      const response = await request.get('/api/inbox/activities');
      const activities = (await response.json()) as {
        action: string;
        entityType: string;
        identifier: string;
      }[];
      return activities
        .filter(
          (activity) => activity.entityType === 'cycle' && activity.identifier === issue.identifier,
        )
        .map((activity) => activity.action);
    })
    .toEqual(['cycle_issue_completed', 'cycle_issue_added']);

  await page.goto('/inbox');
  await expect(page.getByText(`Issue added to ${cycle.name}`, { exact: true })).toBeVisible();
  await expect(
    page.getByText(`Issue marked completed or canceled in ${cycle.name}`, { exact: true }),
  ).toBeVisible();
});
