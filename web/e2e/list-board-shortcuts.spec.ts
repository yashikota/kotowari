import { expect, test } from '@playwright/test';

async function expectClipboardToMatchPageURL(page: import('@playwright/test').Page) {
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(page.url());
}

test('issue list shortcuts switch layouts and copy the current page URL', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/issues?view=active');

  await page.getByRole('button', { name: 'Display options' }).focus();
  await page.keyboard.press('Control+b');
  await expect(page).toHaveURL(/layout=board/);
  await page.keyboard.press('Control+Shift+c');
  await expectClipboardToMatchPageURL(page);

  await page.keyboard.press('Control+b');
  await expect(page).toHaveURL(/layout=list/);
  await page.keyboard.press('?');
  const shortcuts = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(shortcuts).toContainText('Switch between list and board layouts');
  await expect(shortcuts).toContainText('Copy the current page URL');
});

test('saved issue views switch layouts with the keyboard and save the new layout', async ({
  page,
  request,
}) => {
  const slug = `keyboard-layout-${Date.now()}`;
  const created = await request.post('/api/views', {
    data: { name: 'Keyboard layout', slug, display: 'list' },
  });
  expect(created.ok(), await created.text()).toBeTruthy();

  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(`/views/${slug}`);
  await page.getByRole('button', { name: 'Display options' }).focus();
  await page.keyboard.press('Control+b');
  await expect
    .poll(async () => {
      const response = await request.get(`/api/views/${slug}`);
      return ((await response.json()) as { display: string }).display;
    })
    .toBe('board');
  await page.keyboard.press('Control+Shift+c');
  await expectClipboardToMatchPageURL(page);
});

test('cycle issue lists switch layouts and copy their current page URL', async ({
  page,
  request,
}) => {
  const now = Date.now();
  const created = await request.post('/api/cycles', {
    data: {
      startsAt: new Date(now - 3 * 86_400_000).toISOString(),
      endsAt: new Date(now + 4 * 86_400_000).toISOString(),
      status: 'active',
    },
  });
  expect(created.ok(), await created.text()).toBeTruthy();
  const cycle = (await created.json()) as { number: number };

  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(`/cycles/${cycle.number}`);
  await page.getByRole('button', { name: 'Display options' }).focus();
  await page.keyboard.press('Control+b');
  await page.getByRole('button', { name: 'Display options' }).click();
  await expect(page.getByRole('radio', { name: 'Board' })).toBeChecked();
  await page.keyboard.press('Escape');

  await page.keyboard.press('Control+Shift+c');
  await expectClipboardToMatchPageURL(page);
});
