import { expect, test } from '@playwright/test';

test('issue shortcuts delete with confirmation and restore archived issues', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const deletedTitle = `Delete shortcut ${stamp}`;
  const deletedResponse = await request.post('/api/issues', { data: { title: deletedTitle } });
  expect(deletedResponse.ok()).toBeTruthy();
  const deletedIssue = (await deletedResponse.json()) as { identifier: string };

  await page.goto(`/issues/${deletedIssue.identifier}`);
  await expect(
    page.getByRole('heading', { name: new RegExp(deletedIssue.identifier) }),
  ).toBeVisible();
  await page.keyboard.press('Control+Delete');
  const confirmation = page.getByRole('dialog', { name: 'Delete issue', exact: true });
  await expect(confirmation.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await confirmation.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page).toHaveURL(/\/issues$/);
  expect((await request.get(`/api/issues/${deletedIssue.identifier}`)).status()).toBe(404);

  const restoredTitle = `Restore shortcut ${stamp}`;
  const restoredResponse = await request.post('/api/issues', { data: { title: restoredTitle } });
  expect(restoredResponse.ok()).toBeTruthy();
  const restoredIssue = (await restoredResponse.json()) as { identifier: string };
  const archiveResponse = await request.patch(`/api/issues/${restoredIssue.identifier}`, {
    data: { archived: true },
  });
  expect(archiveResponse.ok()).toBeTruthy();

  await page.goto(`/issues/${restoredIssue.identifier}`);
  await expect(
    page.getByRole('heading', { name: new RegExp(restoredIssue.identifier) }),
  ).toBeVisible();
  const restoreResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/issues/${restoredIssue.identifier}`) &&
      response.request().method() === 'PATCH' &&
      response.request().postDataJSON()?.archived === false,
  );
  const restoreRequest = page.waitForRequest(
    (request) =>
      request.url().endsWith(`/api/issues/${restoredIssue.identifier}`) &&
      request.method() === 'PATCH' &&
      request.postDataJSON()?.archived === false,
  );
  await page.keyboard.press('#');
  await restoreRequest;
  const restored = await restoreResponse;
  expect(restored.ok(), await restored.text()).toBeTruthy();
  const issueAfterRestore = await request.get(`/api/issues/${restoredIssue.identifier}`);
  expect(await issueAfterRestore.json()).toMatchObject({ archivedAt: null, title: restoredTitle });
});
