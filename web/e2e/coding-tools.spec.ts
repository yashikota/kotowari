import { expect, test } from '@playwright/test';

test('custom coding tools use saved prompt templates from an issue', async ({
  page,
  request,
  context,
}) => {
  await context.route('https://agent.example/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<title>Agent mock</title>' }),
  );
  const stamp = Date.now();
  const title = `Coding tool issue ${stamp}`;
  const identifier = (await (
    await request.post('/api/issues', {
      data: { title, body: 'Implement this carefully.', status: 'todo' },
    })
  ).json()) as { identifier: string };

  await page.goto('/config');
  const settings = page.getByRole('region', { name: 'Coding tools' });
  await settings.getByLabel('Enable custom web tool').check();
  await settings.getByLabel('Tool name').fill('Browser agent');
  await settings.getByLabel('Custom link URL').fill('javascript:alert(1)');
  await settings.getByLabel('Prompt template').fill('Work on {{issue.identifier}}: {{context}}');
  await settings.getByRole('button', { name: 'Save coding tools' }).click();
  await expect(
    settings.getByText('Enter a valid HTTP or HTTPS URL to enable the custom tool.'),
  ).toBeVisible();

  await settings
    .getByLabel('Custom link URL')
    .fill('https://agent.example/open?prompt={{prompt}}&issue={{issue.identifier}}');
  await settings.getByRole('button', { name: 'Save coding tools' }).click();
  await expect(settings.getByText('Coding tool settings saved locally.')).toBeVisible();
  await page.reload();
  await expect(settings.getByLabel('Enable custom web tool')).toBeChecked();
  await expect(settings.getByLabel('Tool name')).toHaveValue('Browser agent');

  await page.goto(`/issues/${identifier.identifier}`);
  await page.getByRole('button', { name: 'Choose coding tool' }).click();
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('menuitem', { name: 'Open with Browser agent' }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  const openedURL = new URL(popup.url());
  expect(openedURL.origin).toBe('https://agent.example');
  expect(openedURL.searchParams.get('issue')).toBe(identifier.identifier);
  expect(openedURL.searchParams.get('prompt')).toContain(`Work on ${identifier.identifier}:`);
  expect(openedURL.searchParams.get('prompt')).toContain('Implement this carefully.');
});
