import { expect, test } from '@playwright/test';

test('issue title changes appear in the activity timeline and inbox', async ({ page, request }) => {
  const now = Date.now();
  const originalTitle = `Original title ${now}`;
  const updatedTitle = `Updated title ${now}`;
  const issueResponse = await request.post('/api/issues', { data: { title: originalTitle } });
  expect(issueResponse.ok()).toBeTruthy();
  const issue = (await issueResponse.json()) as { identifier: string };

  let releaseInitialRead!: () => void;
  const initialRead = new Promise<void>((resolve) => {
    releaseInitialRead = resolve;
  });
  const issueURL = `**/api/issues/${issue.identifier}`;
  await page.route(issueURL, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    await initialRead;
    await route.fulfill({ response });
  });

  try {
    await page.goto(`/issues/${issue.identifier}`);
    const title = page.getByLabel('Issue title', { exact: true });
    const patchResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/issues/${issue.identifier}`) &&
        response.request().method() === 'PATCH',
    );
    await title.fill(updatedTitle);
    await title.blur();
    expect((await patchResponse).ok()).toBeTruthy();
    releaseInitialRead();
    await expect(title).toHaveValue(updatedTitle);
  } finally {
    releaseInitialRead();
    await page.unroute(issueURL);
  }

  const activity = page.getByRole('region', { name: 'Activity' });
  await expect(
    activity
      .getByTestId('issue-activity-entry')
      .filter({ hasText: `Title changed from ${originalTitle} to ${updatedTitle}` }),
  ).toBeVisible();

  const historyResponse = await request.get(`/api/issues/${issue.identifier}/activities`);
  expect(historyResponse.ok()).toBeTruthy();
  const history = (await historyResponse.json()) as {
    action: string;
    payload: { from?: string; to?: string };
  }[];
  expect(history.find((entry) => entry.action === 'title_changed')).toMatchObject({
    payload: { from: originalTitle, to: updatedTitle },
  });

  const inboxResponse = await request.get('/api/inbox/activities');
  expect(inboxResponse.ok()).toBeTruthy();
  const inbox = (await inboxResponse.json()) as { action: string; identifier: string }[];
  expect(
    inbox.some(
      (entry) => entry.action === 'title_changed' && entry.identifier === issue.identifier,
    ),
  ).toBe(true);
});
