import { expect, test } from '@playwright/test';

test('workspace menu customizes badge visibility and badge style', async ({ page, request }) => {
  const activitiesResponse = await request.get('/api/inbox/activities');
  expect(activitiesResponse.ok()).toBeTruthy();
  const activities = (await activitiesResponse.json()) as { id: number }[];

  await page.goto('/');
  await page.evaluate(
    (readIds) => {
      localStorage.setItem('kotowari.inbox.v1', JSON.stringify({ readIds }));
      localStorage.setItem(
        'kotowari.preferences.v1',
        JSON.stringify({ sidebarLocations: { '/inbox': 'badged' } }),
      );
    },
    activities.map(({ id }) => id),
  );
  await page.reload();

  const workspaceMenu = page.getByRole('button', { name: /Open .* menu/ });
  await workspaceMenu.click();
  await page.getByRole('menuitem', { name: 'Customize sidebar' }).click();

  const dialog = page.getByRole('dialog', { name: 'Customize sidebar' });
  await expect(dialog).toBeVisible();
  const inboxDisplay = dialog.getByRole('combobox', { name: 'Where to show Inbox' });
  await inboxDisplay.click();
  await page.getByRole('option', { name: 'Show when badged' }).click();

  const badgeStyle = dialog.getByRole('combobox', { name: 'Default badge style' });
  await badgeStyle.click();
  await page.getByRole('option', { name: 'Dot' }).click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const preferences = JSON.parse(localStorage.getItem('kotowari.preferences.v1') ?? '{}') as {
          sidebarBadgeStyle?: string;
        };
        return preferences.sidebarBadgeStyle;
      }),
    )
    .toBe('dot');

  await page.keyboard.press('Escape');
  await expect(page.getByRole('link', { name: 'Inbox', exact: true })).toHaveCount(0);

  await workspaceMenu.click();
  await page.getByRole('menuitem', { name: 'Customize sidebar' }).click();
  const reopened = page.getByRole('dialog', { name: 'Customize sidebar' });
  await reopened.getByRole('combobox', { name: 'Where to show Inbox' }).click();
  await page.getByRole('option', { name: 'Always show' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('link', { name: 'Inbox', exact: true })).toBeVisible();
});
