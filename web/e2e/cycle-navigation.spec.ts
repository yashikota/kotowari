import { expect, test } from '@playwright/test';

test('cycle header navigates to adjacent cycles by search and keyboard shortcuts', async ({
  page,
  request,
}) => {
  const now = Date.now();
  const olderResponse = await request.post('/api/cycles', {
    data: {
      startsAt: new Date(now - 42 * 86_400_000).toISOString(),
      endsAt: new Date(now - 35 * 86_400_000).toISOString(),
      status: 'completed',
    },
  });
  expect(olderResponse.ok()).toBeTruthy();
  const older = (await olderResponse.json()) as { number: number };

  const previousResponse = await request.post('/api/cycles', {
    data: {
      startsAt: new Date(now - 21 * 86_400_000).toISOString(),
      endsAt: new Date(now - 14 * 86_400_000).toISOString(),
      status: 'completed',
    },
  });
  expect(previousResponse.ok()).toBeTruthy();
  const previous = (await previousResponse.json()) as { number: number };

  const currentResponse = await request.post('/api/cycles', {
    data: {
      startsAt: new Date(now - 3 * 86_400_000).toISOString(),
      endsAt: new Date(now + 4 * 86_400_000).toISOString(),
      status: 'active',
    },
  });
  expect(currentResponse.ok()).toBeTruthy();
  const current = (await currentResponse.json()) as { number: number };

  const nextResponse = await request.post('/api/cycles', {
    data: {
      startsAt: new Date(now + 7 * 86_400_000).toISOString(),
      endsAt: new Date(now + 14 * 86_400_000).toISOString(),
      status: 'upcoming',
    },
  });
  expect(nextResponse.ok()).toBeTruthy();
  const next = (await nextResponse.json()) as { number: number };

  await page.goto(`/cycles/${current.number}`);
  const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
  await expect(breadcrumb.getByRole('button', { name: 'Open cycle', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: `Cycle ${current.number}` })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'New issue' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Status' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cycle options' })).toBeVisible();

  await page.getByRole('button', { name: 'Close cycle details' }).click();
  const openDetails = page.getByRole('button', { name: 'Open cycle details' });
  await expect(openDetails).toHaveAttribute('aria-expanded', 'false');
  await openDetails.click();
  await expect(page.getByRole('button', { name: 'Close cycle details' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );

  await page.getByRole('button', { name: 'Open cycle', exact: true }).click();

  const menu = page.getByRole('menu', { name: 'Open cycle' });
  const search = menu.getByRole('textbox', { name: 'Open cycle' });
  await expect(search).toBeFocused();
  await expect(menu.getByText('Next cycle (upcoming)')).toBeVisible();
  await expect(menu.getByText('Previous cycle (completed)')).toBeVisible();
  await expect(
    menu.getByRole('menuitem', { name: new RegExp(`Cycle ${next.number}`) }),
  ).toBeVisible();
  await expect(
    menu.getByRole('menuitem', { name: new RegExp(`Cycle ${previous.number}`) }),
  ).toBeVisible();
  await expect(
    menu.getByRole('menuitem', { name: new RegExp(`Cycle ${older.number}`) }),
  ).toHaveCount(0);

  await search.fill(`Cycle ${older.number}`);
  await expect(
    menu.getByRole('menuitem', { name: new RegExp(`Cycle ${older.number}`) }),
  ).toBeVisible();

  await search.fill(`Cycle ${next.number}`);
  await menu.getByRole('menuitem', { name: new RegExp(`Cycle ${next.number}`) }).click();
  await expect(page).toHaveURL(new RegExp(`/cycles/${next.number}$`));

  await page.goto(`/cycles/${current.number}`);
  await expect(page.getByRole('button', { name: 'Open cycle', exact: true })).toBeVisible();
  await page.keyboard.press('Alt+k');
  await expect(page).toHaveURL(new RegExp(`/cycles/${next.number}$`));

  await page.goto(`/cycles/${current.number}`);
  await expect(page.getByRole('button', { name: 'Open cycle', exact: true })).toBeVisible();
  await page.keyboard.press('Alt+j');
  await expect(page).toHaveURL(new RegExp(`/cycles/${previous.number}$`));
});
