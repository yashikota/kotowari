import { expect, test } from '@playwright/test';

test('Linear-style G sequences navigate to supported personal and workspace views', async ({
  page,
}) => {
  await page.goto('/projects');

  const destinations = [
    ['i', /\/inbox(?:$|[?#])/],
    ['j', /\/agent(?:$|[?#])/],
    ['m', /\/issues\?assignee=self(?:$|&)/],
    ['b', /\/issues\?status=backlog(?:$|&)/],
    ['e', /\/issues(?:$|[?#])/],
    ['c', /\/cycles(?:$|[?#])/],
    ['v', /\/cycles\?scope=current(?:$|&)/],
    ['w', /\/cycles\?scope=upcoming(?:$|&)/],
    ['p', /\/projects(?:$|[?#])/],
    ['n', /\/initiatives(?:$|[?#])/],
    ['s', /\/config(?:$|[?#])/],
  ] as const;

  for (const [key, destination] of destinations) {
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('g');
    await page.keyboard.press(key);
    await expect(page).toHaveURL(destination);
  }

  await page.keyboard.press('?');
  const shortcuts = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(shortcuts).toContainText('G, then I');
  await expect(shortcuts).toContainText('G, then W');
  await expect(shortcuts).toContainText('Snooze the selected inbox notification');
});

test('global navigation sequences remain ordinary text while an input is focused', async ({
  page,
}) => {
  await page.goto('/search');
  const search = page.getByRole('textbox', { name: 'Search' });
  await search.focus();
  await page.keyboard.press('g');
  await page.keyboard.press('i');

  await expect(search).toHaveValue('gi');
  await expect(page).toHaveURL(/\/search(?:\?|$)/);
});
