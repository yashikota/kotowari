import { expect, test } from '@playwright/test';

test('Linear-style workspace shell and collapsible priority groups', async ({ page }) => {
  await page.goto('/issues');

  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Issues', level: 2 })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open command palette' }).first()).toBeVisible();

  const createdIssueTitle = `Priority group smoke test ${Date.now()}`;
  await page.getByRole('button', { name: 'Create issue' }).click();
  const title = page.getByPlaceholder('Issue title');
  await title.fill(createdIssueTitle);
  await page.getByRole('dialog').getByLabel('Priority').selectOption('0');
  await title.press('Control+Enter');
  await expect(page).toHaveURL(/\/issues\/[A-Z]+-\d+/);

  await page.getByRole('link', { name: 'Issues' }).click();
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
