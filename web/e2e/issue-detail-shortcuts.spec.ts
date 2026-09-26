import { expect, test } from '@playwright/test';

test('issue shortcuts assign to me, toggle favorite, and open the due-date picker', async ({
  page,
  request,
}) => {
  const created = await request.post('/api/issues', {
    data: { title: `Issue shortcuts ${Date.now()}`, status: 'todo' },
  });
  expect(created.ok()).toBeTruthy();
  const issue = (await created.json()) as { identifier: string };
  await page.goto(`/issues/${issue.identifier}`);

  const issueOptions = page.getByRole('button', { name: 'Issue options' });
  await issueOptions.focus();
  await page.keyboard.press('Shift+r');
  const issueTitle = page.getByRole('textbox', { name: 'Issue title' });
  await expect(issueTitle).toBeFocused();

  await issueOptions.focus();
  await page.keyboard.press('i');
  await expect(page.getByRole('combobox', { name: 'Assignee' })).toHaveValue('You');

  const favorite = page.getByRole('button', { name: 'Add to favorites' });
  await favorite.focus();
  await page.keyboard.press('Alt+f');
  await expect(page.getByRole('button', { name: 'Remove from favorites' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.keyboard.press('Shift+d');
  await expect(page.getByRole('dialog', { name: 'Set due date' })).toBeVisible();
  const resetFavorite = await request.patch(`/api/issues/${issue.identifier}`, {
    data: { isFavorite: false },
  });
  expect(resetFavorite.ok()).toBeTruthy();
});

test('issue shortcuts create a sub-issue, toggle resources, and open the link form', async ({
  page,
  request,
}) => {
  const created = await request.post('/api/issues', {
    data: { title: `Issue structure shortcuts ${Date.now()}`, status: 'todo' },
  });
  expect(created.ok()).toBeTruthy();
  const issue = (await created.json()) as { identifier: string };
  await page.goto(`/issues/${issue.identifier}`);

  const issueOptions = page.getByRole('button', { name: 'Issue options' });
  await issueOptions.focus();
  await page.keyboard.press('ControlOrMeta+Shift+o');
  await expect(page.getByRole('textbox', { name: 'New sub-issue' })).toBeVisible();

  await issueOptions.focus();
  await page.keyboard.press('ControlOrMeta+Shift+l');
  await expect(page.getByRole('button', { name: 'Expand resources section' })).toBeVisible();

  await issueOptions.focus();
  await page.keyboard.press('ControlOrMeta+Alt+l');
  await expect(page.getByRole('dialog').getByRole('textbox', { name: 'URL' })).toBeVisible();
});
