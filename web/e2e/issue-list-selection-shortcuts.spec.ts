import { expect, test } from '@playwright/test';
import { fillIssueSearch } from './issue-list-controls.ts';

test('issue list supports Linear-style X, Mod+A, and Escape selection', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  for (let index = 0; index < 3; index++) {
    const response = await request.post('/api/issues', {
      data: { title: `Keyboard selection ${stamp} ${index}`, status: 'todo' },
    });
    expect(response.ok()).toBeTruthy();
  }

  await page.goto('/issues');
  await fillIssueSearch(page, String(stamp));
  const list = page.getByRole('listbox', { name: 'Issues' });
  const rows = list.getByRole('option');
  await expect(rows).toHaveCount(3);
  const identifiers = (await rows.allTextContents()).map((text) => text.match(/[A-Z]+-\d+/)?.[0]);
  expect(identifiers.every(Boolean)).toBeTruthy();

  await list.focus();
  await page.keyboard.press('x');
  await expect(page.getByRole('group', { name: '1 selected' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: `Select ${identifiers[0]}` })).toBeChecked();

  await page.keyboard.press('ControlOrMeta+a');
  await expect(page.getByRole('group', { name: '3 selected' })).toBeVisible();
  for (const identifier of identifiers) {
    await expect(page.getByRole('checkbox', { name: `Select ${identifier}` })).toBeChecked();
  }

  await page.keyboard.press('Escape');
  await expect(page.getByRole('group', { name: /selected/ })).toHaveCount(0);
  for (const identifier of identifiers) {
    await expect(page.getByRole('checkbox', { name: `Select ${identifier}` })).not.toBeChecked();
  }

  await page.keyboard.press('?');
  const shortcuts = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(shortcuts).toContainText('Select or deselect the focused issue');
  await expect(shortcuts).toContainText('Extend selection with Shift+click or Shift+arrow keys');
  await expect(shortcuts).toContainText('Select all issues in the current list');
});

test('issue list extends and shrinks keyboard range selection', async ({ page, request }) => {
  const stamp = Date.now();
  for (let index = 0; index < 3; index++) {
    const response = await request.post('/api/issues', {
      data: { title: `Keyboard range selection ${stamp} ${index}`, status: 'todo' },
    });
    expect(response.ok()).toBeTruthy();
  }

  await page.goto('/issues');
  await fillIssueSearch(page, String(stamp));
  const list = page.getByRole('listbox', { name: 'Issues' });
  const rows = list.getByRole('option');
  await expect(rows).toHaveCount(3);
  const identifiers = (await rows.allTextContents()).map((text) => text.match(/[A-Z]+-\d+/)?.[0]);
  expect(identifiers.every(Boolean)).toBeTruthy();

  await list.focus();
  await page.keyboard.press('x');
  await page.keyboard.press('Shift+ArrowDown');
  await expect(page.getByRole('group', { name: '2 selected' })).toBeVisible();
  for (const identifier of identifiers.slice(0, 2)) {
    await expect(page.getByRole('checkbox', { name: `Select ${identifier}` })).toBeChecked();
  }
  await expect(page.getByRole('checkbox', { name: `Select ${identifiers[2]}` })).not.toBeChecked();

  await page.keyboard.press('Shift+ArrowDown');
  await expect(page.getByRole('group', { name: '3 selected' })).toBeVisible();
  await page.keyboard.press('Shift+ArrowUp');
  await expect(page.getByRole('group', { name: '2 selected' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: `Select ${identifiers[2]}` })).not.toBeChecked();
});

test('issue list selects a Shift-clicked range', async ({ page, request }) => {
  const stamp = Date.now();
  for (let index = 0; index < 3; index++) {
    const response = await request.post('/api/issues', {
      data: { title: `Mouse range selection ${stamp} ${index}`, status: 'todo' },
    });
    expect(response.ok()).toBeTruthy();
  }

  await page.goto('/issues');
  await fillIssueSearch(page, String(stamp));
  const list = page.getByRole('listbox', { name: 'Issues' });
  const rows = list.getByRole('option');
  await expect(rows).toHaveCount(3);
  const identifiers = (await rows.allTextContents()).map((text) => text.match(/[A-Z]+-\d+/)?.[0]);
  expect(identifiers.every(Boolean)).toBeTruthy();

  await page.getByRole('checkbox', { name: `Select ${identifiers[0]}` }).check();
  await page
    .getByRole('checkbox', { name: `Select ${identifiers[2]}` })
    .click({ modifiers: ['Shift'] });
  await expect(page.getByRole('group', { name: '3 selected' })).toBeVisible();
  for (const identifier of identifiers) {
    await expect(page.getByRole('checkbox', { name: `Select ${identifier}` })).toBeChecked();
  }
});

test('issue board extends and shrinks keyboard range selection', async ({ page, request }) => {
  const stamp = Date.now();
  for (let index = 0; index < 3; index++) {
    const response = await request.post('/api/issues', {
      data: { title: `Board keyboard range ${stamp} ${index}`, status: 'todo' },
    });
    expect(response.ok()).toBeTruthy();
  }

  await page.goto('/issues?layout=board');
  await fillIssueSearch(page, String(stamp));
  const column = page.getByRole('region', { name: 'Todo issues' });
  const cards = column.locator('[data-issue-board-card]');
  await expect(cards).toHaveCount(3);
  const identifiers = await cards.evaluateAll((items) =>
    items.map((item) => item.getAttribute('data-board-issue-id')),
  );
  expect(identifiers.every(Boolean)).toBeTruthy();

  await cards.nth(0).focus();
  await page.keyboard.press('x');
  await page.keyboard.press('Shift+ArrowDown');
  await expect(page.getByRole('group', { name: '2 selected' })).toBeVisible();
  await page.keyboard.press('Shift+ArrowDown');
  await expect(page.getByRole('group', { name: '3 selected' })).toBeVisible();
  await page.keyboard.press('Shift+ArrowUp');
  await expect(page.getByRole('group', { name: '2 selected' })).toBeVisible();

  for (const identifier of identifiers.slice(0, 2)) {
    await expect(page.getByRole('checkbox', { name: `Select ${identifier}` })).toBeChecked();
  }
  await expect(page.getByRole('checkbox', { name: `Select ${identifiers[2]}` })).not.toBeChecked();
  await page.keyboard.press('ControlOrMeta+a');
  await expect(page.getByRole('group', { name: '3 selected' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('group', { name: /selected/ })).toHaveCount(0);
});

test('issue board selects a Shift-clicked card range', async ({ page, request }) => {
  const stamp = Date.now();
  for (let index = 0; index < 3; index++) {
    const response = await request.post('/api/issues', {
      data: { title: `Board mouse range ${stamp} ${index}`, status: 'todo' },
    });
    expect(response.ok()).toBeTruthy();
  }

  await page.goto('/issues?layout=board');
  await fillIssueSearch(page, String(stamp));
  const column = page.getByRole('region', { name: 'Todo issues' });
  const cards = column.locator('[data-issue-board-card]');
  await expect(cards).toHaveCount(3);
  const identifiers = await cards.evaluateAll((items) =>
    items.map((item) => item.getAttribute('data-board-issue-id')),
  );
  expect(identifiers.every(Boolean)).toBeTruthy();

  await page.getByRole('checkbox', { name: `Select ${identifiers[0]}` }).check();
  await cards.nth(2).click({ modifiers: ['Shift'] });
  await expect(page.getByRole('group', { name: '3 selected' })).toBeVisible();
  for (const identifier of identifiers) {
    await expect(page.getByRole('checkbox', { name: `Select ${identifier}` })).toBeChecked();
  }
});

test('issue board bulk actions update the selected issues', async ({ page, request }) => {
  const stamp = Date.now();
  const identifiers: string[] = [];
  for (let index = 0; index < 2; index++) {
    const response = await request.post('/api/issues', {
      data: { title: `Board bulk status ${stamp} ${index}`, status: 'todo' },
    });
    expect(response.ok()).toBeTruthy();
    const issue = (await response.json()) as { identifier: string };
    identifiers.push(issue.identifier);
  }

  await page.goto('/issues?layout=board');
  await fillIssueSearch(page, String(stamp));
  for (const identifier of identifiers) {
    await page.getByRole('checkbox', { name: `Select ${identifier}` }).check();
  }
  await expect(page.getByRole('group', { name: '2 selected' })).toBeVisible();
  await page.getByRole('button', { name: 'Actions' }).click();
  await page.getByRole('menuitem', { name: 'Set status to In Progress' }).click();

  await expect(page.getByRole('group', { name: /selected/ })).toHaveCount(0);
  for (const identifier of identifiers) {
    await expect
      .poll(async () => {
        const response = await request.get(`/api/issues/${identifier}`);
        return ((await response.json()) as { workflowStatus: string }).workflowStatus;
      })
      .toBe('in_progress');
  }
});

test('issue board selects all issues in the focused status column', async ({ page, request }) => {
  const stamp = Date.now();
  const todoIds: string[] = [];
  for (let index = 0; index < 2; index++) {
    const response = await request.post('/api/issues', {
      data: { title: `Board column selection ${stamp} todo ${index}`, status: 'todo' },
    });
    expect(response.ok()).toBeTruthy();
    todoIds.push(((await response.json()) as { identifier: string }).identifier);
  }
  const activeResponse = await request.post('/api/issues', {
    data: { title: `Board column selection ${stamp} active`, status: 'in_progress' },
  });
  expect(activeResponse.ok()).toBeTruthy();
  const activeId = ((await activeResponse.json()) as { identifier: string }).identifier;

  await page.goto('/issues?layout=board');
  await fillIssueSearch(page, String(stamp));
  const todoColumn = page.getByRole('region', { name: 'Todo issues' });
  const todoCards = todoColumn.locator('[data-issue-board-card]');
  await expect(todoCards).toHaveCount(2);
  await todoCards.first().focus();
  await expect(todoCards.first()).toBeFocused();
  await page.keyboard.press('Control+Alt+a');

  await expect(page.getByRole('group', { name: '2 selected' })).toBeVisible();
  for (const identifier of todoIds) {
    await expect(page.getByRole('checkbox', { name: `Select ${identifier}` })).toBeChecked();
  }
  await expect(page.getByRole('checkbox', { name: `Select ${activeId}` })).not.toBeChecked();
});

test('issue list can assign selected issues to Agent', async ({ page, request }) => {
  const stamp = Date.now();
  const identifiers: string[] = [];
  for (let index = 0; index < 2; index++) {
    const response = await request.post('/api/issues', {
      data: { title: `Bulk Agent assignment ${stamp} ${index}`, status: 'todo' },
    });
    expect(response.ok()).toBeTruthy();
    const issue = (await response.json()) as { identifier: string };
    identifiers.push(issue.identifier);
  }

  await page.goto('/issues');
  await fillIssueSearch(page, String(stamp));
  const list = page.getByRole('listbox', { name: 'Issues' });
  await expect(list.getByRole('option')).toHaveCount(2);
  for (const identifier of identifiers) {
    await page.getByRole('checkbox', { name: `Select ${identifier}` }).check();
  }

  await page.getByRole('button', { name: 'Actions' }).click();
  await page.getByRole('menuitem', { name: 'Assign to Agent', exact: true }).click();
  await expect(page.getByRole('group', { name: '2 selected' })).toHaveCount(0);
  for (const identifier of identifiers) {
    const response = await request.get(`/api/issues/${identifier}`);
    await expect(response).toBeOK();
    await expect(await response.json()).toMatchObject({ assignee: 'agent' });
  }
});
