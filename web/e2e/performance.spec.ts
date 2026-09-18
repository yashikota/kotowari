import { expect, test } from '@playwright/test';

test('large lists stay bounded, reuse data, and isolate modal keyboard input', async ({ page }) => {
  const issues = Array.from({ length: 5000 }, (_, i) => ({
    id: i + 1,
    number: i + 1,
    identifier: `ISS-${i + 1}`,
    title: `Performance issue ${i + 1}`,
    status: 'todo',
    priority: 0,
    labels: [],
    adrNumbers: [],
    depth: 0,
    sortOrder: i,
    body: '',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  }));
  const requests = new Map<string, number>();
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    requests.set(path, (requests.get(path) ?? 0) + 1);
    const body =
      path === '/api/issues'
        ? issues
        : /^\/api\/issues\/ISS-\d+$/.test(path)
          ? issues[Number(path.split('-').at(-1)) - 1]
          : path === '/api/workspace'
            ? { name: 'Performance', timezone: 'UTC' }
            : path === '/api/revision'
              ? { revision: '1' }
              : path.includes('/documents/')
                ? { body: '# Benchmark', revision: '1' }
                : [];
    await route.fulfill({ json: body });
  });
  await page.goto('/issues');
  const list = page.getByRole('listbox', { name: 'Issues' });
  await expect(list).toBeVisible();
  expect(await list.getByRole('option').count()).toBeLessThan(60);
  await expect(list.getByRole('option').first()).toHaveAttribute('aria-setsize', '5000');
  await list.focus();
  await page.keyboard.press('j');
  const selected = await list.locator('[aria-selected="true"]').getAttribute('aria-posinset');
  const paletteButton = page.getByRole('button', { name: /Command palette/ });
  await paletteButton.click();
  const dialog = page.getByRole('dialog', { name: 'Command palette' });
  await expect(dialog).toBeVisible();
  await page.getByLabel('Command search').fill('j');
  await expect(list.locator('[aria-selected="true"]')).toHaveAttribute('aria-posinset', selected!);
  await page.keyboard.press('Escape');
  await expect(paletteButton).toBeFocused();
  await list.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(list.getByRole('option', { name: /ISS-5000\b/ })).toBeVisible();
  expect(await list.getByRole('option').count()).toBeLessThan(60);
  await page.getByRole('link', { name: 'Board', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Board', exact: true })).toBeVisible();
  expect(await page.locator('.card').count()).toBeLessThan(80);
  for (const path of [
    '/api/workspace',
    '/api/projects',
    '/api/cycles',
    '/api/labels',
    '/api/issues',
  ])
    expect(requests.get(path), path).toBe(1);
});

test('IME does not submit creation and modal focus is contained', async ({ page }) => {
  await page.goto('/issues');
  await page.getByRole('heading', { name: 'Issues', exact: true }).click();
  await page.keyboard.press('c');
  const title = page.getByPlaceholder('Issue title');
  await title.fill('日本語の入力');
  await title.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true });
  await expect(title).toBeVisible();
  await title.press('Enter');
  await expect(title).toHaveValue('日本語の入力\n');
  await expect(page.getByRole('dialog', { name: 'Create issue' })).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByLabel('Issue cycle', { exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(title).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('optimistic status is visible before the response and rolls back on rejection', async ({
  page,
  request,
}) => {
  const issue = (await (
    await request.post('/api/issues', { data: { title: 'Optimistic rollback', status: 'todo' } })
  ).json()) as { identifier: string };
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**/api/issues/${issue.identifier}`, async (route) => {
    if (route.request().method() !== 'PATCH') return route.continue();
    await held;
    await route.fulfill({ status: 409, json: { error: 'Changed externally' } });
  });
  await page.goto(`/issues/${issue.identifier}`);
  const status = page.getByLabel('Status', { exact: true });
  await expect(status).toHaveValue('todo');
  await status.selectOption('done');
  await expect(status).toHaveValue('done');
  release();
  await expect(status).toHaveValue('todo');
  await expect(page.getByRole('alert')).toContainText('Changed externally');
});

test('reduced motion disables modal animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/issues');
  await page.getByRole('button', { name: /Command palette/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.getByRole('dialog').evaluate((el) => getComputedStyle(el).animationName)).toBe(
    'none',
  );
});

test('AI composer uses Enter for newline and Ctrl+Enter for one submission', async ({
  page,
  request,
}) => {
  const adr = (await (
    await request.post('/api/adrs', { data: { title: 'Keyboard AI' } })
  ).json()) as { identifier: string };
  let submissions = 0;
  let sent = '';
  await page.route(`**/api/ai/adrs/${adr.identifier}`, async (route) => {
    if (route.request().method() === 'POST') {
      submissions++;
      sent = route.request().postDataJSON().prompt;
    }
    await route.fulfill({ json: { busy: false, sessionId: 'test', events: [], permissions: [] } });
  });
  await page.goto(`/adrs/${adr.identifier}`);
  await page.getByRole('button', { name: `Ask AI about ${adr.identifier}` }).click();
  const message = page.getByLabel('Message to AI');
  await message.fill('first line');
  await message.press('Enter');
  await message.press('a');
  await expect(message).toHaveValue('first line\na');
  expect(submissions).toBe(0);
  await message.dispatchEvent('keydown', { key: 'Enter', ctrlKey: true, isComposing: true });
  expect(submissions).toBe(0);
  await message.press('Control+Enter');
  await expect(message).toHaveValue('');
  expect(submissions).toBe(1);
  expect(sent).toBe('first line\na');
});

test('creation shortcut and button share one pending operation', async ({ page }) => {
  let submissions = 0;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/issues', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    submissions++;
    await pending;
    await route.continue();
  });
  await page.goto('/issues');
  await page.getByRole('heading', { name: 'Issues', exact: true }).click();
  await page.keyboard.press('c');
  const dialog = page.getByRole('dialog', { name: 'Create issue' });
  await page.getByPlaceholder('Issue title').fill('Create once');
  await page.keyboard.press('Control+Enter');
  await expect.poll(() => submissions).toBe(1);
  await dialog.getByRole('button', { name: 'Create', exact: true }).click();
  release();
  await expect(dialog).toHaveCount(0);
  expect(submissions).toBe(1);
});
