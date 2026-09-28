import { expect, test } from '@playwright/test';

test('issue drafts autosave, reopen with their properties, and publish as issues', async ({
  page,
  request,
}) => {
  const title = `Draft issue ${Date.now()}`;
  const body = 'This description must survive saving and reopening the draft.';

  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('kotowari.issue-drafts.v1'));
  await page.goto('/drafts');
  await expect(page.getByRole('heading', { name: 'Drafts', level: 2 })).toBeVisible();
  await expect(page.getByText('No active drafts')).toBeVisible();
  const emptyState = page.getByTestId('drafts-empty-state');
  const emptyIllustration = page.getByTestId('drafts-empty-illustration');
  const emptyMessage = page.getByText('No active drafts');
  await expect(emptyIllustration).toBeVisible();
  const emptyBounds = await emptyState.boundingBox();
  const illustrationBounds = await emptyIllustration.boundingBox();
  const messageBounds = await emptyMessage.boundingBox();
  expect(emptyBounds).not.toBeNull();
  expect(illustrationBounds).not.toBeNull();
  expect(messageBounds).not.toBeNull();
  const contentCenterY = (illustrationBounds!.y + messageBounds!.y + messageBounds!.height) / 2;
  expect(Math.abs(contentCenterY - (emptyBounds!.y + emptyBounds!.height / 2))).toBeLessThan(2);

  await page.getByRole('button', { name: 'Create issue' }).click();
  const createDialog = page.getByRole('dialog');
  await createDialog.getByRole('textbox', { name: 'Issue title' }).fill(title);
  await createDialog.getByRole('textbox', { name: 'Description' }).fill(body);
  const properties = createDialog.getByRole('group', { name: 'Issue properties' });
  await properties.getByRole('combobox', { name: 'Priority' }).click();
  await page.getByRole('option', { name: 'High', exact: true }).click();
  await page.keyboard.press('Escape');

  const draft = page.getByRole('button', { name: title, exact: true });
  await expect(draft).toBeVisible();
  await expect(page.getByRole('img', { name: '1 draft' })).toBeVisible();
  await page.reload();
  await expect(draft).toBeVisible();
  await draft.click();

  const reopenedDialog = page.getByRole('dialog');
  await expect(reopenedDialog.getByRole('textbox', { name: 'Issue title' })).toHaveValue(title);
  await expect(reopenedDialog.getByRole('textbox', { name: 'Description' })).toHaveValue(body);
  await expect(
    reopenedDialog.getByRole('group', { name: 'Issue properties' }).getByRole('combobox', {
      name: 'Priority',
    }),
  ).toHaveValue('High');
  await expect(reopenedDialog.getByRole('button', { name: 'Discard draft' })).toBeVisible();
  await reopenedDialog.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page).toHaveURL(/\/issues\/[A-Z]+-\d+$/);

  const identifier = new URL(page.url()).pathname.split('/').at(-1);
  expect(identifier).toBeTruthy();
  const savedIssue = await request.get(`/api/issues/${identifier}`);
  expect(savedIssue.ok()).toBeTruthy();
  const savedIssueBody = await savedIssue.json();
  expect(savedIssueBody).toMatchObject({ title, priority: 2 });
  expect(savedIssueBody.body.trimEnd()).toBe(body);
  expect(await page.evaluate(() => localStorage.getItem('kotowari.issue-drafts.v1'))).toBe('[]');
  await expect(page.getByRole('img', { name: '1 draft' })).toHaveCount(0);
});

test('drafts can be deleted without creating an issue', async ({ page }) => {
  const title = `Discarded draft ${Date.now()}`;
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('kotowari.issue-drafts.v1'));
  await page.goto('/drafts');
  await page.getByRole('button', { name: 'Create issue' }).click();
  await page.getByRole('dialog').getByRole('textbox', { name: 'Issue title' }).fill(title);
  await page.keyboard.press('Escape');

  const card = page.getByTestId('issue-draft-card');
  await card.getByRole('button', { name: 'Discard draft' }).click();
  const confirmation = page.getByRole('dialog', { name: 'Discard this draft?' });
  await expect(confirmation.getByText('Your draft will be deleted.')).toBeVisible();
  await confirmation.getByRole('button', { name: 'Cancel' }).click();
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Discard draft' }).click();
  await page
    .getByRole('dialog', { name: 'Discard this draft?' })
    .getByRole('button', {
      name: 'Discard',
      exact: true,
    })
    .click();
  await expect(page.getByText('No active drafts')).toBeVisible();
  await page.reload();
  await expect(page.getByText('No active drafts')).toBeVisible();
});

test('drafts can be saved directly and discarded together with confirmation', async ({ page }) => {
  const title = `Saved draft ${Date.now()}`;
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('kotowari.issue-drafts.v1'));
  await page.goto('/drafts');
  await page.getByRole('button', { name: 'Create issue' }).click();
  const dialog = page.getByRole('dialog', { name: 'Create issue' });
  await dialog.getByRole('textbox', { name: 'Issue title' }).fill(title);
  await dialog.getByRole('button', { name: 'Save draft' }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('Issue draft saved')).toBeVisible();
  await expect(page.getByRole('img', { name: '1 draft' })).toBeVisible();
  const card = page.getByTestId('issue-draft-card');
  await expect(card.getByRole('button', { name: title, exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Discard all' }).click();
  const confirmation = page.getByRole('dialog', { name: 'Discard all drafts?' });
  await expect(confirmation.getByText('All your drafts will be deleted.')).toBeVisible();
  await confirmation.getByRole('button', { name: 'Cancel' }).click();
  await expect(card).toBeVisible();
  await page.getByRole('button', { name: 'Discard all' }).click();
  await page
    .getByRole('dialog', { name: 'Discard all drafts?' })
    .getByRole('button', {
      name: 'Discard all',
    })
    .click();
  await expect(page.getByText('No active drafts')).toBeVisible();
  await expect(page.getByRole('img', { name: '1 draft' })).toHaveCount(0);
});
