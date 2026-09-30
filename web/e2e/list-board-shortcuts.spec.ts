import { expect, test } from '@playwright/test';
import { fillIssueSearch } from './issue-list-controls.ts';

async function expectClipboardToMatchPageURL(page: import('@playwright/test').Page) {
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(page.url());
}

test('issue list shortcuts switch layouts and copy the current page URL', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/issues?view=active');

  await page.getByRole('button', { name: 'Display options' }).focus();
  await page.keyboard.press('Control+b');
  await expect(page).toHaveURL(/layout=board/);
  await page.keyboard.press('Control+Shift+c');
  await expectClipboardToMatchPageURL(page);

  await page.keyboard.press('Control+b');
  await expect(page).toHaveURL(/layout=list/);
  await page.keyboard.press('?');
  const shortcuts = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(shortcuts).toContainText('Switch between list and board layouts');
  await expect(shortcuts).toContainText('Copy the current page URL');
});

test('saved issue views switch layouts with the keyboard and save the new layout', async ({
  page,
  request,
}) => {
  const slug = `keyboard-layout-${Date.now()}`;
  const created = await request.post('/api/views', {
    data: { name: 'Keyboard layout', slug, display: 'list' },
  });
  expect(created.ok(), await created.text()).toBeTruthy();

  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(`/views/${slug}`);
  await page.getByRole('button', { name: 'Display options' }).focus();
  await page.keyboard.press('Control+b');
  await expect
    .poll(async () => {
      const response = await request.get(`/api/views/${slug}`);
      return ((await response.json()) as { display: string }).display;
    })
    .toBe('board');
  await page.keyboard.press('Control+Shift+c');
  await expectClipboardToMatchPageURL(page);
});

test('board shortcut moves the focused issue into the adjacent status column', async ({
  page,
  request,
}) => {
  const title = `Board shortcut ${Date.now()}`;
  const created = await request.post('/api/issues', {
    data: { title, status: 'todo' },
  });
  expect(created.ok(), await created.text()).toBeTruthy();
  const issue = (await created.json()) as { identifier: string };

  await page.goto('/issues?layout=board');
  const todoColumn = page.getByRole('region', { name: 'Todo issues' });
  const card = todoColumn.getByRole('button').filter({ hasText: issue.identifier });
  await expect(card).toBeVisible();
  await card.focus();
  await page.keyboard.press('Control+ArrowRight');

  await expect
    .poll(async () => {
      const response = await request.get(`/api/issues/${issue.identifier}`);
      return ((await response.json()) as { workflowStatus: string }).workflowStatus;
    })
    .toBe('in_progress');
  await expect(page.getByRole('region', { name: 'In Progress issues' })).toContainText(
    issue.identifier,
  );
});

test('manual board shortcuts reorder issues within their status column', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const firstResponse = await request.post('/api/issues', {
    data: { title: `Board order ${stamp} first`, status: 'todo' },
  });
  const secondResponse = await request.post('/api/issues', {
    data: { title: `Board order ${stamp} second`, status: 'todo' },
  });
  expect(firstResponse.ok(), await firstResponse.text()).toBeTruthy();
  expect(secondResponse.ok(), await secondResponse.text()).toBeTruthy();
  const first = (await firstResponse.json()) as { identifier: string };
  const second = (await secondResponse.json()) as { identifier: string };

  await page.goto('/issues?layout=board');
  const todoColumn = page.getByRole('region', { name: 'Todo issues' });
  const firstCard = todoColumn.getByRole('button').filter({ hasText: first.identifier });
  const secondCard = todoColumn.getByRole('button').filter({ hasText: second.identifier });
  await expect(firstCard).toBeVisible();
  await expect(secondCard).toBeVisible();

  async function issueSortOrder(identifier: string) {
    const response = await request.get(`/api/issues/${identifier}`);
    return ((await response.json()) as { sortOrder: number }).sortOrder;
  }

  await secondCard.focus();
  await page.keyboard.press('Alt+ArrowUp');
  await expect
    .poll(
      async () =>
        (await issueSortOrder(second.identifier)) < (await issueSortOrder(first.identifier)),
    )
    .toBe(true);

  await secondCard.focus();
  await page.keyboard.press('Alt+Shift+ArrowDown');
  await expect
    .poll(
      async () =>
        (await issueSortOrder(second.identifier)) > (await issueSortOrder(first.identifier)),
    )
    .toBe(true);
});

test('manual issue-list shortcuts reorder issues within their group', async ({ page, request }) => {
  const stamp = Date.now();
  const firstResponse = await request.post('/api/issues', {
    data: { title: `List order ${stamp} first`, status: 'todo' },
  });
  const secondResponse = await request.post('/api/issues', {
    data: { title: `List order ${stamp} second`, status: 'todo' },
  });
  expect(firstResponse.ok(), await firstResponse.text()).toBeTruthy();
  expect(secondResponse.ok(), await secondResponse.text()).toBeTruthy();
  const first = (await firstResponse.json()) as { identifier: string };
  const second = (await secondResponse.json()) as { identifier: string };

  await page.goto('/issues?groupBy=none&orderBy=manual');
  await fillIssueSearch(page, String(stamp));
  const list = page.getByRole('listbox', { name: 'Issues' });
  const firstRow = list.getByRole('option').filter({ hasText: first.identifier });
  const secondRow = list.getByRole('option').filter({ hasText: second.identifier });
  await expect(firstRow).toBeVisible();
  await expect(secondRow).toBeVisible();
  await list.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(secondRow).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Alt+ArrowUp');

  await expect
    .poll(async () => {
      const secondValue = await request.get(`/api/issues/${second.identifier}`);
      const firstValue = await request.get(`/api/issues/${first.identifier}`);
      return (
        ((await secondValue.json()) as { sortOrder: number }).sortOrder <
        ((await firstValue.json()) as { sortOrder: number }).sortOrder
      );
    })
    .toBe(true);
});

test('board arrows move focus between issues and status columns', async ({ page, request }) => {
  const stamp = Date.now();
  for (const index of [0, 1]) {
    const created = await request.post('/api/issues', {
      data: { title: `Board navigation ${stamp} ${index}`, status: 'todo' },
    });
    expect(created.ok(), await created.text()).toBeTruthy();
  }
  const inProgress = await request.post('/api/issues', {
    data: { title: `Board navigation ${stamp} active`, status: 'in_progress' },
  });
  expect(inProgress.ok(), await inProgress.text()).toBeTruthy();

  await page.goto('/issues?layout=board');
  const todoCards = page
    .getByRole('region', { name: 'Todo issues' })
    .locator('[data-issue-board-card]');
  const firstTodoCard = todoCards.first();
  const firstIndex = Number(await firstTodoCard.getAttribute('data-board-index'));
  await firstTodoCard.focus();
  await page.keyboard.press('ArrowDown');
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.getAttribute('data-board-index')))
    .toBe(String(firstIndex + 1));

  await page.keyboard.press('ArrowRight');
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.activeElement?.closest('[data-issue-board-column]')?.getAttribute('aria-label'),
      ),
    )
    .toBe('In Progress issues');
});

test('cycle issue lists switch layouts and copy their current page URL', async ({
  page,
  request,
}) => {
  const now = Date.now();
  const created = await request.post('/api/cycles', {
    data: {
      startsAt: new Date(now - 3 * 86_400_000).toISOString(),
      endsAt: new Date(now + 4 * 86_400_000).toISOString(),
      status: 'active',
    },
  });
  expect(created.ok(), await created.text()).toBeTruthy();
  const cycle = (await created.json()) as { number: number };

  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(`/cycles/${cycle.number}`);
  await page.getByRole('button', { name: 'Display options' }).focus();
  await page.keyboard.press('Control+b');
  await page.getByRole('button', { name: 'Display options' }).click();
  await expect(page.getByRole('radio', { name: 'Board' })).toBeChecked();
  await page.keyboard.press('Escape');

  await page.keyboard.press('Control+Shift+c');
  await expectClipboardToMatchPageURL(page);
});
