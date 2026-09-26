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
  await expect(shortcuts).toContainText('Select all issues in the current list');
});
