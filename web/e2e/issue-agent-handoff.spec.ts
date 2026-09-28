import { expect, test } from '@playwright/test';

test('issue menu opens the local Agent with issue context ready to review', async ({
  page,
  request,
}) => {
  const title = `Agent handoff ${Date.now()}`;
  const body = 'Review the release checklist before implementation.';
  const created = await request.post('/api/issues', {
    data: { title, body, status: 'todo' },
  });
  expect(created.ok()).toBeTruthy();
  const issue = (await created.json()) as { identifier: string };

  await page.goto(`/issues/${issue.identifier}`);
  await page.getByRole('button', { name: 'Issue options' }).click();
  await page.getByRole('menuitem', { name: 'Open in Agent…' }).click();

  await expect(page).toHaveURL(/\/agent$/);
  const prompt = page.getByRole('textbox', { name: 'Message to AI' });
  await expect(prompt).toHaveValue(new RegExp(issue.identifier));
  await expect(prompt).toHaveValue(new RegExp(title));
  await expect(prompt).toHaveValue(new RegExp(body));
  await expect(page.getByRole('button', { name: 'Send' })).toBeEnabled();
});
