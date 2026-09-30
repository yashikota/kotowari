import { expect, test } from '@playwright/test';

test('an issue template can be applied to an existing issue with its shortcut', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const labelName = `Template label ${stamp}`;
  const templateName = `Incident template ${stamp}`;
  const sourceTitle = `Incident response ${stamp}`;
  const targetTitle = `Existing issue ${stamp}`;
  const labelResponse = await request.post('/api/labels', {
    data: { name: labelName, color: '#336699' },
  });
  expect(labelResponse.ok()).toBeTruthy();
  const label = (await labelResponse.json()) as { id: number };

  const sourceResponse = await request.post('/api/issues', {
    data: {
      title: sourceTitle,
      body: '## Impact\n\nDescribe customer impact.\n',
      status: 'in_progress',
      assignee: 'agent',
      type: 'bug',
      priority: 2,
      estimate: 3,
      labelIds: [label.id],
    },
  });
  expect(sourceResponse.ok()).toBeTruthy();
  const source = (await sourceResponse.json()) as { identifier: string };
  const templateResponse = await request.post(`/api/issues/${source.identifier}/templates`, {
    data: { name: templateName },
  });
  expect(templateResponse.ok()).toBeTruthy();

  const targetResponse = await request.post('/api/issues', {
    data: {
      title: targetTitle,
      body: 'Old description',
      status: 'todo',
      type: 'feature',
      priority: 4,
      estimate: 1,
    },
  });
  expect(targetResponse.ok()).toBeTruthy();
  const target = (await targetResponse.json()) as { identifier: string };

  await page.goto(`/issues/${target.identifier}`);
  await expect(page.getByRole('heading', { name: new RegExp(target.identifier) })).toBeVisible();
  await page.keyboard.press('Control+Alt+Shift+t');

  const dialog = page.getByRole('dialog', { name: 'Apply template' });
  await expect(dialog).toBeVisible();
  const templatePicker = dialog.getByRole('combobox', { name: 'Issue template' });
  await templatePicker.click();
  await page.getByRole('option', { name: templateName }).click();
  await expect(
    dialog.getByText(`This will use “${sourceTitle}” as the issue title.`),
  ).toBeVisible();

  const updatedResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/issues/${target.identifier}`) &&
      response.request().method() === 'PATCH',
  );
  await dialog.getByRole('button', { name: 'Apply template', exact: true }).click();
  expect((await updatedResponse).ok()).toBeTruthy();
  await expect(dialog).toHaveCount(0);

  const updatedIssueResponse = await request.get(`/api/issues/${target.identifier}`);
  expect(await updatedIssueResponse.json()).toMatchObject({
    title: sourceTitle,
    body: '## Impact\n\nDescribe customer impact.\n',
    status: 'in_progress',
    assignee: 'agent',
    type: 'bug',
    priority: 2,
    estimate: 3,
    labels: [expect.objectContaining({ id: label.id, name: labelName })],
  });
});
