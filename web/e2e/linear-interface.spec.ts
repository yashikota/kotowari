import { expect, test } from '@playwright/test';

test('Linear-style workspace shell and collapsible priority groups', async ({ page }) => {
  await page.goto('/issues');

  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Issues', level: 2 })).toBeAttached();
  await expect(page.getByRole('tablist', { name: 'Issue views' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'All issues' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('button', { name: 'Open command palette' }).first()).toBeVisible();
  const allIssuesTab = page.getByRole('tab', { name: 'All issues' });
  const backlogTab = page.getByRole('tab', { name: 'Backlog' });
  await allIssuesTab.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(backlogTab).toBeFocused();
  await expect(backlogTab).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowRight');
  await expect(allIssuesTab).toBeFocused();

  const createdIssueTitle = `Priority group smoke test ${Date.now()}`;
  await page.getByRole('button', { name: 'Create issue' }).click();
  const title = page.getByPlaceholder('Issue title');
  await title.fill(createdIssueTitle);
  await page.getByRole('dialog').getByLabel('Priority').selectOption('0');
  await title.press('Control+Enter');
  await expect(page).toHaveURL(/\/issues\/[A-Z]+-\d+/);
  await expect(page.locator('input[aria-label="Issue title"]')).toHaveValue(createdIssueTitle);
  await expect(page.getByRole('main').getByRole('link', { name: 'Back to issues' })).toBeVisible();
  await expect(page.getByRole('listbox', { name: 'Issues' })).toHaveCount(0);

  await page.getByRole('main').getByRole('link', { name: 'Back to issues' }).click();
  await expect(page.getByRole('tab', { name: 'All issues' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByLabel('Find issues').fill(createdIssueTitle);
  const noPriority = page.getByRole('button', { name: /No priority · \d+ issues/ });
  await expect(noPriority).toBeVisible();
  await expect(noPriority).toHaveAttribute('aria-expanded', 'true');
  await noPriority.click();
  await expect(noPriority).toHaveAttribute('aria-expanded', 'false');
  const issueList = page.getByRole('listbox', { name: 'Issues' });
  const createdIssue = issueList.getByRole('option', { name: new RegExp(createdIssueTitle) });
  await expect(createdIssue).toHaveCount(0);
  await noPriority.click();
  await expect(createdIssue).toBeVisible();

  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByLabel('Group by').selectOption('status');
  await page.getByLabel('Order by').selectOption('priority');
  await page.keyboard.press('Escape');
  const todoGroup = page.getByRole('button', { name: /Todo · \d+ issues/ });
  await expect(todoGroup).toBeVisible();
  await todoGroup.click();
  await expect(createdIssue).toHaveCount(0);

  await page.getByRole('tab', { name: 'Backlog' }).click();
  await expect(createdIssue).toHaveCount(0);
  await page.getByRole('tab', { name: 'Active' }).click();
  await expect(todoGroup).toHaveAttribute('aria-expanded', 'false');
  await todoGroup.click();
  await expect(createdIssue).toBeVisible();
  await page.getByRole('tab', { name: 'All issues' }).click();
  await expect(todoGroup).toHaveAttribute('aria-expanded', 'true');
  await expect(createdIssue).toBeVisible();

  await page.locator('body').click({ position: { x: 700, y: 120 } });
  await page.keyboard.press('Control+b');
  const todoColumn = page.getByRole('region', { name: 'todo issues' });
  await expect(
    todoColumn.getByRole('button', { name: new RegExp(createdIssueTitle) }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByRole('radiogroup', { name: 'Layout' }).getByText('List', { exact: true }).click();
  await expect(page.getByRole('listbox', { name: 'Issues' })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeHidden();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Primary' })
    .getByRole('link', { name: 'Projects' })
    .click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeHidden();
});
