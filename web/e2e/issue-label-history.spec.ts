import { expect, test } from '@playwright/test';

test('issue label changes appear in the activity timeline and inbox', async ({ page, request }) => {
  const now = Date.now();
  const labelName = `Timeline ${now}`;
  const labelResponse = await request.post('/api/labels', {
    data: { name: labelName, color: '#336699' },
  });
  expect(labelResponse.ok()).toBeTruthy();

  const issueResponse = await request.post('/api/issues', {
    data: { title: `Label history ${now}` },
  });
  expect(issueResponse.ok()).toBeTruthy();
  const issue = (await issueResponse.json()) as { identifier: string };

  await page.goto(`/issues/${issue.identifier}`);
  const labels = page.getByRole('group', { name: 'Labels' });
  const activity = page.getByRole('region', { name: 'Activity' });
  const labelActivity = (action: 'Added' | 'Removed') =>
    activity
      .getByTestId('issue-activity-entry')
      .filter({ hasText: `${action} label ${labelName}` });

  await labels.getByRole('button', { name: 'Change labels' }).click();
  const labelPicker = page.getByRole('dialog', { name: 'Change labels' });
  await labelPicker.getByRole('checkbox', { name: labelName }).click();
  await expect(labelPicker.getByRole('checkbox', { name: labelName })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.keyboard.press('Escape');
  await expect(labelActivity('Added')).toBeVisible();

  await labels.getByRole('button', { name: 'Change labels' }).click();
  await labelPicker.getByRole('checkbox', { name: labelName }).click();
  await expect(labelPicker.getByRole('checkbox', { name: labelName })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await page.keyboard.press('Escape');
  await expect(labelActivity('Removed')).toBeVisible();

  const historyResponse = await request.get(`/api/issues/${issue.identifier}/activities`);
  expect(historyResponse.ok()).toBeTruthy();
  const history = (await historyResponse.json()) as {
    action: string;
    payload: { label?: string };
  }[];
  expect(history.find((entry) => entry.action === 'label_added')).toMatchObject({
    payload: { label: labelName },
  });
  expect(history.find((entry) => entry.action === 'label_removed')).toMatchObject({
    payload: { label: labelName },
  });

  const inboxResponse = await request.get('/api/inbox/activities');
  expect(inboxResponse.ok()).toBeTruthy();
  const inbox = (await inboxResponse.json()) as { action: string; identifier: string }[];
  expect(
    inbox.some((entry) => entry.action === 'label_added' && entry.identifier === issue.identifier),
  ).toBe(true);
  expect(
    inbox.some(
      (entry) => entry.action === 'label_removed' && entry.identifier === issue.identifier,
    ),
  ).toBe(true);
});
