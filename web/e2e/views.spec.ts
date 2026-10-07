import { expect, test } from '@playwright/test';
import {
  chooseIssueFilterOption,
  createIssueView,
  openIssueFilterCategory,
} from './issue-list-controls.ts';

async function scrollIssueListToEnd(list: import('@playwright/test').Locator) {
  await list.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
}

test('workspace views page lists saved views and opens them', async ({ page }) => {
  const name = `Workspace view ${Date.now()}`;
  await page.goto('/issues');
  await page
    .getByRole('navigation', { name: 'Workspace navigation' })
    .getByRole('link', { name: 'Views', exact: true })
    .click();

  await expect(page).toHaveURL(/\/views$/);
  await expect(
    page.getByRole('main').locator('header').getByRole('heading', { name: 'Views', level: 2 }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Workspace navigation' })
      .getByRole('link', { name: 'Views', exact: true }),
  ).toHaveAttribute('href', '/views');
  await createIssueView(page, name);
  await expect(page).toHaveURL(new RegExp(`/views/${name.toLowerCase().replaceAll(' ', '-')}$`));
  await page.goto('/views');
  await page
    .getByRole('main')
    .getByRole('navigation', { name: 'Saved views' })
    .getByRole('link', { name })
    .click();
  await expect(page).toHaveURL(new RegExp(`/views/${name.toLowerCase().replaceAll(' ', '-')}$`));
  await expect(page.getByRole('heading', { name })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open details' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close details' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Open details' }).click();
  await expect(page.getByRole('button', { name: 'Close details' })).toBeVisible();
  await expect(page.getByText('Select an issue')).toBeVisible();
  await page.getByRole('button', { name: 'Close details' }).click();
  await expect(page.getByRole('button', { name: 'Open details' })).toBeVisible();
});

test('saved issue views can be favorited and opened from Favorites', async ({ page, request }) => {
  const name = `Favorite view ${Date.now()}`;
  const slug = name.toLowerCase().replaceAll(' ', '-');
  const created = await request.post('/api/views', { data: { name, slug } });
  expect(created.ok()).toBeTruthy();

  await page.goto(`/views/${slug}`);
  const addFavorite = page.getByRole('button', { name: 'Add view to favorites' });
  await expect(addFavorite).toHaveAttribute('aria-pressed', 'false');
  await addFavorite.click();

  const removeFavorite = page.getByRole('button', { name: 'Remove view from favorites' });
  await expect(removeFavorite).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByRole('navigation', { name: 'Favorites' }).getByRole('link', { name, exact: true }),
  ).toBeVisible();
  const saved = await request.get(`/api/views/${slug}`);
  expect(await saved.json()).toMatchObject({ isFavorite: true });

  await removeFavorite.click();
  await expect(page.getByRole('button', { name: 'Add view to favorites' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(
    page.getByRole('navigation', { name: 'Favorites' }).getByRole('link', { name, exact: true }),
  ).toHaveCount(0);
});

test('built-in issue views can be favorited and remain available after reload', async ({
  page,
}) => {
  await page.goto('/issues?view=active');
  await expect(page.getByRole('heading', { name: 'Issues', level: 2 })).toBeVisible();
  const addFavorite = page.getByRole('switch', { name: 'Add issue view to favorites' });
  await expect(addFavorite).toHaveAttribute('aria-checked', 'false');
  await addFavorite.click();

  const favorites = page.getByRole('navigation', { name: 'Favorites' });
  await expect(favorites.getByRole('link', { name: 'Active', exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('switch', { name: 'Remove issue view from favorites' }),
  ).toHaveAttribute('aria-checked', 'true');
  await favorites.getByRole('link', { name: 'Active', exact: true }).click();
  await expect(page).toHaveURL(/\/issues\?view=active$/);

  await page.getByRole('switch', { name: 'Remove issue view from favorites' }).click();
  await expect(favorites.getByRole('link', { name: 'Active', exact: true })).toHaveCount(0);
});

test('subscriber filters work in issue lists and persist in saved views', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const subscribedTitle = `Subscribed filter ${stamp}`;
  const noSubscriberTitle = `No subscriber filter ${stamp}`;
  const subscribedResponse = await request.post('/api/issues', {
    data: { title: subscribedTitle, status: 'todo' },
  });
  const noSubscriberResponse = await request.post('/api/issues', {
    data: { title: noSubscriberTitle, status: 'todo' },
  });
  await expect(subscribedResponse).toBeOK();
  await expect(noSubscriberResponse).toBeOK();
  const subscribedIssue = (await subscribedResponse.json()) as { identifier: string };

  await page.goto(`/issues/${subscribedIssue.identifier}`);
  const activity = page.getByRole('region', { name: 'Activity', exact: true });
  const subscribeButton = activity.getByRole('button', { name: 'Subscribe to issue' });
  await expect(subscribeButton).toBeVisible();
  await subscribeButton.click();
  await expect(activity.getByRole('button', { name: 'Unsubscribe from issue' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.goto('/issues?subscribers=self');
  const issueList = page.getByRole('listbox', { name: 'Issues' });
  await expect(
    issueList.getByRole('option', { name: new RegExp(subscribedIssue.identifier) }),
  ).toBeVisible();
  await expect(issueList.getByText(noSubscriberTitle)).toHaveCount(0);

  await page.goto('/issues?subscribers=none');
  await scrollIssueListToEnd(issueList);
  await expect(issueList.getByText(noSubscriberTitle)).toBeVisible();
  await expect(
    issueList.getByRole('option', { name: new RegExp(subscribedIssue.identifier) }),
  ).toHaveCount(0);

  await page.goto('/views/new');
  await openIssueFilterCategory(page, 'Subscribers');
  await chooseIssueFilterOption(page, 'Filter subscribers', 'You');
  const preview = page.locator('[aria-label="Preview"]');
  await expect(preview.getByText(subscribedTitle)).toBeVisible();
  await expect(preview.getByText(noSubscriberTitle)).toHaveCount(0);
  const name = `Subscribers ${stamp}`;
  await page.getByRole('textbox', { name: 'View name', exact: true }).fill(name);
  await page.getByRole('button', { name: 'Create view', exact: true }).click();

  const slug = name.toLowerCase().replaceAll(' ', '-');
  await expect(page).toHaveURL(new RegExp(`/views/${slug}$`));
  const saved = await request.get(`/api/views/${slug}`);
  expect(await saved.json()).toMatchObject({ subscriber: 'self' });
  const savedList = page.getByRole('listbox', { name: 'Issues' });
  await expect(
    savedList.getByRole('option', { name: new RegExp(subscribedIssue.identifier) }),
  ).toBeVisible();
  await expect(savedList.getByText(noSubscriberTitle)).toHaveCount(0);
  await page.reload();
  await expect(
    savedList.getByRole('option', { name: new RegExp(subscribedIssue.identifier) }),
  ).toBeVisible();
  await expect(savedList.getByText(noSubscriberTitle)).toHaveCount(0);

  await page.goto('/views/new');
  await openIssueFilterCategory(page, 'Subscribers');
  await chooseIssueFilterOption(page, 'Filter subscribers', 'No subscribers');
  const noSubscriberPreview = page.locator('[aria-label="Preview"]');
  await scrollIssueListToEnd(noSubscriberPreview.locator('[role="listbox"]'));
  await expect(noSubscriberPreview.getByText(noSubscriberTitle)).toBeVisible();
  await expect(noSubscriberPreview.getByText(subscribedTitle)).toHaveCount(0);
  const noSubscriberViewName = `No subscribers ${stamp}`;
  await page.getByRole('textbox', { name: 'View name', exact: true }).fill(noSubscriberViewName);
  await page.getByRole('button', { name: 'Create view', exact: true }).click();
  const noSubscriberViewSlug = noSubscriberViewName.toLowerCase().replaceAll(' ', '-');
  await expect(page).toHaveURL(new RegExp(`/views/${noSubscriberViewSlug}$`));
  const noSubscriberView = await request.get(`/api/views/${noSubscriberViewSlug}`);
  expect(await noSubscriberView.json()).toMatchObject({ subscriber: 'none' });
  const noSubscriberList = page.getByRole('listbox', { name: 'Issues' });
  await scrollIssueListToEnd(noSubscriberList);
  await expect(noSubscriberList.getByText(noSubscriberTitle)).toBeVisible();
  await expect(noSubscriberList.getByText(subscribedTitle)).toHaveCount(0);
});

test('workspace views page has a useful empty state and create action', async ({ page }) => {
  await page.route('**/api/views', async (route) => {
    if (route.request().method() === 'GET') await route.fulfill({ json: [] });
    else await route.continue();
  });
  await page.goto('/views');
  const emptyState = page.getByRole('region', { name: 'Views' });
  await expect(emptyState.getByRole('heading', { name: 'Views', level: 2 })).toBeVisible();
  await page
    .getByRole('region', { name: 'Views' })
    .getByRole('button', { name: 'Create new view', exact: true })
    .click();
  await expect(page).toHaveURL(/\/views\/new/);
  await expect(page.getByRole('textbox', { name: 'View name' })).toHaveValue('All issues');
  await expect(page.getByRole('textbox', { name: 'Description' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choose icon' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Display options' })).toBeVisible();
});

test('views collection matches the centered Linear-style empty state and switches entity', async ({
  page,
}) => {
  await page.route('**/api/views', async (route) => {
    if (route.request().method() === 'GET') await route.fulfill({ json: [] });
    else await route.continue();
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/views');

  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toHaveCount(0);
  const tabs = page.getByRole('tablist', { name: 'View type' });
  await expect(tabs.getByRole('tab', { name: 'Issues' })).toHaveAttribute('aria-selected', 'true');
  await expect(tabs.getByRole('tab', { name: 'Projects' })).toHaveAttribute(
    'aria-selected',
    'false',
  );

  const emptyState = page.getByRole('region', { name: 'Views' });
  await expect(emptyState.getByRole('heading', { name: 'Views', level: 2 })).toBeVisible();
  await expect(emptyState).toContainText(
    'Create custom views with filters to focus on the issues you want to see. Save and favorite views for quick access.',
  );
  await expect(emptyState.getByRole('link', { name: 'Documentation' })).toHaveAttribute(
    'href',
    '/pages',
  );
  const emptyBounds = await emptyState.boundingBox();
  expect(emptyBounds).not.toBeNull();
  expect(emptyBounds!.height).toBeGreaterThan(600);
  expect(Math.abs(emptyBounds!.y + emptyBounds!.height / 2 - 500)).toBeLessThan(65);

  await tabs.getByRole('tab', { name: 'Projects' }).click();
  await expect(page).toHaveURL(/\/views\?entity=projects$/);
  await expect(tabs.getByRole('tab', { name: 'Projects' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(emptyState).toContainText(
    'Create project views with filters and layout options. Save your favorite project views to return to them quickly.',
  );
  await emptyState.getByRole('button', { name: 'Create new view' }).click();
  await expect(page).toHaveURL(/\/views\/projects\/new/);
  await expect(page.getByRole('textbox', { name: 'View name' })).toBeVisible();
});

test('views empty state fits a narrow viewport without clipping its actions', async ({ page }) => {
  await page.route('**/api/views', async (route) => {
    if (route.request().method() === 'GET') await route.fulfill({ json: [] });
    else await route.continue();
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/views');

  const emptyState = page.getByRole('region', { name: 'Views' });
  await expect(emptyState).toBeVisible();
  await expect(emptyState.getByRole('button', { name: 'Create new view' })).toBeInViewport();
  await expect(emptyState.getByRole('link', { name: 'Documentation' })).toBeInViewport();
  const contentFits = await emptyState.evaluate(
    (section) => section.scrollWidth <= section.clientWidth + 1,
  );
  expect(contentFits).toBe(true);
});

test('Alt+V saves the current issue filters and display settings as a new view draft', async ({
  page,
}) => {
  await page.goto('/issues?status=todo&layout=board&groupBy=project&orderBy=title&direction=desc');
  await page.getByRole('button', { name: 'Add new view' }).focus();
  await page.keyboard.press('Alt+v');

  await expect(page).toHaveURL(/\/views\/new/);
  const url = new URL(page.url());
  expect(url.searchParams.get('status')).toBe('todo');
  expect(url.searchParams.get('layout')).toBe('board');
  expect(url.searchParams.get('groupBy')).toBe('project');
  expect(url.searchParams.get('orderBy')).toBe('title');
  expect(url.searchParams.get('direction')).toBe('desc');
  await expect(page.getByRole('textbox', { name: 'View name' })).toHaveValue('All issues');

  await page.getByRole('button', { name: 'Display options' }).click();
  await expect(page.getByRole('radio', { name: 'Board' })).toBeChecked();
  await expect(page.getByRole('combobox', { name: 'Grouping', exact: true })).toHaveValue(
    'project',
  );
  await expect(page.getByRole('combobox', { name: 'Ordering' })).toHaveValue('title');
});

test('Alt+V saves the current project filters and layout as a project view draft', async ({
  page,
}) => {
  await page.goto('/projects?status=started&view=timeline&groupBy=targetDate');
  await page.getByRole('tab', { name: 'All projects' }).focus();
  await page.keyboard.press('Alt+v');

  await expect(page).toHaveURL(/\/views\/projects\/new/);
  const url = new URL(page.url());
  expect(url.searchParams.get('status')).toBe('["started"]');
  expect(url.searchParams.get('view')).toBe('timeline');
  expect(url.searchParams.get('groupBy')).toBe('targetDate');
  await expect(page.getByRole('textbox', { name: 'View name' })).toBeVisible();
  await page.getByRole('button', { name: 'Display options' }).click();
  await expect(page.getByRole('tab', { name: 'Timeline' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('views display options control order, direction, and visible date properties', async ({
  page,
}) => {
  await page.route('**/api/views', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: [
          {
            name: 'Zebra view',
            slug: 'zebra-view',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          {
            name: 'Alpha view',
            slug: 'alpha-view',
            createdAt: '2026-01-02T00:00:00.000Z',
            updatedAt: '2026-02-01T00:00:00.000Z',
          },
        ],
      });
    } else await route.continue();
  });
  await page.goto('/views');
  const savedViews = page.getByRole('main').getByRole('navigation', { name: 'Saved views' });
  await expect(savedViews.getByRole('link').first()).toContainText('Alpha view');
  await expect(savedViews.getByText(/Created ·/)).toHaveCount(2);
  const displayOptions = page.getByRole('button', { name: 'Display options' });

  await displayOptions.click();
  const ordering = page.getByRole('combobox', { name: 'Ordering' });
  await expect(ordering).toHaveValue('Name');
  await ordering.click();
  await page.getByRole('option', { name: 'Updated' }).click();
  await expect(savedViews.getByRole('link').first()).toContainText('Zebra view');
  await expect(ordering).toHaveValue('Updated');
  await page.getByRole('button', { name: 'Direction: Ascending' }).click();
  await expect(savedViews.getByRole('link').first()).toContainText('Alpha view');
  await expect(page.getByRole('button', { name: 'Direction: Descending' })).toBeVisible();
  const createdProperty = page.getByRole('button', { name: 'Created' });
  await expect(createdProperty).toHaveAttribute('aria-pressed', 'true');
  await createdProperty.click();
  await expect(savedViews.getByText(/Created ·/)).toHaveCount(0);
  await expect(createdProperty).toHaveAttribute('aria-pressed', 'false');
});

test('project saved views open from the Projects collection', async ({ page }) => {
  const projectView = {
    slug: 'roadmap',
    name: 'Roadmap',
    description: 'Near-term work',
    icon: 'target',
    search: { status: ['started'], view: 'timeline' },
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  };
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify([value])), {
    key: 'kotowari.project-views.v1',
    value: projectView,
  });
  await page.goto('/views?entity=projects');

  const savedViews = page.getByRole('main').getByRole('navigation', { name: 'Saved views' });
  await expect(savedViews.getByRole('button', { name: 'Roadmap' })).toBeVisible();
  await expect(savedViews).toContainText('Near-term work');
  await savedViews.getByRole('button', { name: 'Roadmap' }).click();
  await expect
    .poll(() => {
      const url = new URL(page.url());
      return {
        pathname: url.pathname,
        status: url.searchParams.get('status'),
        view: url.searchParams.get('view'),
        projectView: url.searchParams.get('projectView'),
      };
    })
    .toEqual({
      pathname: '/projects',
      status: '["started"]',
      view: 'timeline',
      projectView: 'roadmap',
    });
  await expect(page.getByRole('heading', { name: 'Projects', level: 2 })).toBeVisible();
});

test('new view editor saves its description, icon, filter, and live preview', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const matching = `Builder matching ${stamp}`;
  const hidden = `Builder hidden ${stamp}`;
  await request.post('/api/issues', { data: { title: matching, status: 'todo', priority: 2 } });
  await request.post('/api/issues', { data: { title: hidden, status: 'todo', priority: 4 } });

  await page.goto('/views');
  await page.getByRole('button', { name: 'New view', exact: true }).first().click();
  const name = `Builder ${stamp}`;
  await page.getByRole('textbox', { name: 'View name', exact: true }).fill(name);
  await page
    .getByRole('textbox', { name: 'Description', exact: true })
    .fill('Focused work for this cycle.');
  await page.getByRole('button', { name: 'Choose icon' }).click();
  await page.getByRole('button', { name: 'Rocket icon' }).click();

  await openIssueFilterCategory(page, 'Priority');
  await chooseIssueFilterOption(page, 'Filter priority', 'High');
  const preview = page.locator('[aria-label="Preview"]');
  await expect(preview.getByText(new RegExp(matching))).toBeVisible();
  await expect(preview.getByText(new RegExp(hidden))).toHaveCount(0);
  await page.getByRole('button', { name: 'Create view', exact: true }).click();

  const slug = name.toLowerCase().replaceAll(' ', '-');
  await expect(page).toHaveURL(new RegExp(`/views/${slug}$`));
  await expect(page.getByText('Focused work for this cycle.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove Priority · High filter' })).toBeVisible();
  const saved = await request.get(`/api/views/${slug}`);
  expect(await saved.json()).toMatchObject({
    name,
    description: 'Focused work for this cycle.',
    icon: 'rocket',
    priority: 2,
  });
  const list = page.getByRole('listbox', { name: 'Issues' });
  await expect(list.getByRole('option', { name: new RegExp(matching) })).toBeVisible();
  await expect(list.getByRole('option', { name: new RegExp(hidden) })).toHaveCount(0);
  await page.goto('/views');
  await expect(page.getByText('Focused work for this cycle.')).toBeVisible();
});
