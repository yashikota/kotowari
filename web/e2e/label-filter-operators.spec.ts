import { expect, test } from '@playwright/test';
import { fillIssueSearch, openIssueFilterCategory } from './issue-list-controls.ts';

test('label filters match Linear any, all, and exclusion operators', async ({ page, request }) => {
  const stamp = `${Date.now()}`;
  const labelA = `Operator A ${stamp}`;
  const labelB = `Operator B ${stamp}`;
  const createdA = await request.post('/api/labels', { data: { name: labelA, color: '#123456' } });
  const createdB = await request.post('/api/labels', { data: { name: labelB, color: '#654321' } });
  expect(createdA.ok()).toBeTruthy();
  expect(createdB.ok()).toBeTruthy();
  const a = (await createdA.json()) as { id: number };
  const b = (await createdB.json()) as { id: number };

  const titles = {
    a: `Only A ${stamp}`,
    b: `Only B ${stamp}`,
    both: `Both labels ${stamp}`,
    none: `No labels ${stamp}`,
  };
  for (const [title, labelIds] of [
    [titles.a, [a.id]],
    [titles.b, [b.id]],
    [titles.both, [a.id, b.id]],
    [titles.none, []],
  ] as const) {
    const response = await request.post('/api/issues', { data: { title, labelIds } });
    expect(response.ok()).toBeTruthy();
  }

  await page.goto('/issues');
  await openIssueFilterCategory(page, 'Labels');
  const labelPicker = page.getByRole('menu', { name: 'Labels', exact: true });
  await labelPicker.getByText(labelA, { exact: true }).click();
  await labelPicker.getByText(labelB, { exact: true }).click();

  const operator = page.getByRole('combobox', { name: 'Label matching', exact: true });
  await expect(operator).toHaveValue('include all of');
  const list = page.getByRole('listbox', { name: 'Issues' });
  const issue = (title: string) => list.getByRole('option', { name: new RegExp(title) });
  await expect(issue(titles.both)).toBeVisible();
  await expect(issue(titles.a)).toHaveCount(0);
  await expect(issue(titles.b)).toHaveCount(0);
  await expect(issue(titles.none)).toHaveCount(0);

  await operator.click();
  await page.getByRole('option', { name: 'include any of', exact: true }).click();
  await expect(page).toHaveURL(/labelOperator=includeAny/);
  await expect(issue(titles.a)).toBeVisible();
  await expect(issue(titles.b)).toBeVisible();
  await expect(issue(titles.both)).toBeVisible();
  await expect(issue(titles.none)).toHaveCount(0);

  await operator.click();
  await page.getByRole('option', { name: 'exclude if any of', exact: true }).click();
  await expect(issue(titles.a)).toHaveCount(0);
  await expect(issue(titles.b)).toHaveCount(0);
  await expect(issue(titles.both)).toHaveCount(0);
  await fillIssueSearch(page, titles.none);
  await expect(issue(titles.none)).toBeVisible();
  await fillIssueSearch(page, '');

  await operator.click();
  await page.getByRole('option', { name: 'exclude if all', exact: true }).click();
  await expect(issue(titles.a)).toBeVisible();
  await expect(issue(titles.b)).toBeVisible();
  await expect(issue(titles.both)).toHaveCount(0);
  await fillIssueSearch(page, titles.none);
  await expect(issue(titles.none)).toBeVisible();
  await fillIssueSearch(page, '');

  const viewName = `Exclude all labels ${stamp}`;
  await page.getByRole('button', { name: 'New view', exact: true }).click();
  await page.getByRole('textbox', { name: 'View name', exact: true }).fill(viewName);
  await page.getByRole('button', { name: 'Create view', exact: true }).click();
  await page.waitForURL(/\/views\/[^/?#]+$/);
  await expect(page.getByRole('combobox', { name: 'Label matching' })).toHaveValue(
    'exclude if all',
  );
  await fillIssueSearch(page, titles.a);
  await expect(issue(titles.a)).toBeVisible();
  await fillIssueSearch(page, titles.both);
  await expect(issue(titles.both)).toHaveCount(0);
});
