import { expect, test, type APIResponse } from '@playwright/test';
import {
  chooseIssueFilterOption,
  createIssueView,
  fillIssueSearch,
  openIssueFilterCategory,
} from './issue-list-controls.ts';

async function json<T>(res: APIResponse): Promise<T> {
  if (!res.ok()) {
    throw new Error(`${res.status()} ${await res.text()}`);
  }
  return (await res.json()) as T;
}

test('adhoc filter, custom label, and delete', async ({ page, request }) => {
  const stamp = `${Date.now()}`;
  const keepTitle = `Keep ${stamp}`;
  const hideTitle = `Hide ${stamp}`;
  await json(await request.post('/api/issues', { data: { title: keepTitle, status: 'todo' } }));
  await json(await request.post('/api/issues', { data: { title: hideTitle, status: 'done' } }));

  await page.goto('/issues');
  await openIssueFilterCategory(page, 'Status');
  await chooseIssueFilterOption(page, 'Filter status', 'Todo');
  await expect(page).toHaveURL(/status=todo/);
  const list = page.getByRole('listbox', { name: 'Issues' });
  await expect(list.getByRole('option', { name: new RegExp(keepTitle) })).toBeVisible();
  await expect(list.getByRole('option', { name: new RegExp(hideTitle) })).toHaveCount(0);
  await page.getByRole('button', { name: 'Remove Status · Todo filter' }).click();
  await expect(page).not.toHaveURL(/status=todo/);
  await expect(list.getByRole('option', { name: new RegExp(hideTitle) })).toBeVisible();
  await openIssueFilterCategory(page, 'Status');
  await chooseIssueFilterOption(page, 'Filter status', 'Todo');

  await page.getByRole('button', { name: 'New view', exact: true }).click();
  const viewName = page.getByRole('textbox', { name: 'View name', exact: true });
  await viewName.fill(`Todo ${stamp}`);
  await viewName.press('ControlOrMeta+Enter');
  await expect(page).toHaveURL(new RegExp(`/views/todo-${stamp}`));
  await expect(page.getByRole('heading', { name: `Todo ${stamp}` })).toBeVisible();
  const savedViewIssues = page.getByRole('listbox', { name: 'Issues' });
  await expect(savedViewIssues.getByRole('option', { name: new RegExp(keepTitle) })).toBeVisible();
  await expect(savedViewIssues.getByRole('option', { name: new RegExp(hideTitle) })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Remove Status · Todo filter' })).toBeVisible();

  await page.goto(`/issues`);
  await fillIssueSearch(page, keepTitle);
  const issueList = page.getByRole('listbox', { name: 'Issues' });
  await issueList.getByRole('option', { name: new RegExp(keepTitle) }).click();
  await expect(page).toHaveURL(/\/issues\/ISS-/);
  await expect(page.getByLabel('Issue title')).toHaveValue(keepTitle);
  const label = `Harbor ${stamp}`;
  const labels = page.getByRole('group', { name: 'Labels' });
  await labels.getByRole('button', { name: 'Add labels' }).click();
  const labelPicker = page.getByRole('dialog', { name: 'Add labels' });
  await labelPicker.getByLabel('New label').fill(label);
  await labelPicker.getByRole('button', { name: `Create “${label}”` }).click();
  await expect(labels.getByRole('button', { name: `Remove label ${label}` })).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Issue options' }).click();
  await page.getByRole('menuitem', { name: 'Delete', exact: true }).click();
  await expect(page).toHaveURL(/\/issues/);
  await expect(page.getByRole('option', { name: new RegExp(keepTitle) })).toHaveCount(0);

  await page.goto('/issues');
  await openIssueFilterCategory(page, 'Status');
  await chooseIssueFilterOption(page, 'Filter status', 'Todo');
  const filteredViewName = `Todo filtered ${stamp}`;
  await createIssueView(page, filteredViewName);
  await expect(page).toHaveURL(new RegExp(`/views/todo-filtered-${stamp}`));
  await expect(page.getByRole('heading', { name: filteredViewName })).toBeVisible();
});
