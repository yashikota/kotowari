import { contrastFailures } from './contrast.ts';
import { expect, test } from '@playwright/test';

test('issue creation stays locked across button and keyboard submission until saved', async ({
  page,
  request,
}) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let submissions = 0;
  await page.route('**/api/issues', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    submissions += 1;
    await pending;
    await route.continue();
  });
  await page.goto('/drafts');
  await page.getByRole('button', { name: 'Create issue' }).click();
  const composer = page.getByRole('dialog', { name: /^Create issue/ });
  const title = composer.getByRole('textbox', { name: 'Issue title', exact: true });
  await title.fill(`Guarded creation ${Date.now()}`);
  await composer.getByRole('button', { name: 'Create', exact: true }).click();
  await expect.poll(() => submissions).toBe(1);
  await expect(title).toBeDisabled();
  await expect(composer.locator('fieldset')).toHaveAttribute('aria-busy', 'true');
  await title.dispatchEvent('keydown', {
    key: 'Enter',
    code: 'Enter',
    ctrlKey: true,
    bubbles: true,
  });
  await page.keyboard.press('Escape');
  await expect(composer).toBeVisible();
  expect(submissions).toBe(1);
  release();
  await expect(composer).toHaveCount(0);
  await expect(page).toHaveURL(/\/issues\/[A-Z]+-\d+$/);
  expect(submissions).toBe(1);
  const identifier = new URL(page.url()).pathname.split('/').at(-1)!;
  await request.delete(`/api/issues/${identifier}`);
});

for (const scheme of ['light', 'dark']) {
  test(`failed creation unlocks the composer and retains input for retry in ${scheme}`, async ({
    page,
    request,
  }) => {
    await page.addInitScript((color) => {
      localStorage.setItem('kotowari.color-scheme', color);
      localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
    }, scheme);
    await page.setViewportSize({ width: 360, height: 800 });
    let submissions = 0;
    await page.route('**/api/issues', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      submissions += 1;
      if (submissions === 1)
        return route.fulfill({ status: 500, json: { error: 'Creation unavailable' } });
      await route.continue();
    });
    await page.goto('/drafts');
    await page.getByRole('button', { name: 'New issue', exact: true }).click();
    const composer = page.getByRole('dialog', { name: /^Create issue/ });
    const title = composer.getByRole('textbox', { name: 'Issue title', exact: true });
    const value = `Retry creation ${Date.now()}`;
    await title.fill(value);
    const save = composer.getByRole('button', { name: 'Create', exact: true });
    expect(await contrastFailures(page, '[role=dialog]')).toEqual([]);
    await save.click();
    await expect.poll(() => submissions).toBe(1);
    await expect(title).toBeEnabled();
    await expect(title).toHaveValue(value);
    await expect(save).toBeEnabled();
    expect(await contrastFailures(page, '[role=dialog]')).toEqual([]);
    await save.click();
    await expect(composer).toHaveCount(0);
    await expect(page).toHaveURL(/\/issues\/[A-Z]+-\d+$/);
    expect(submissions).toBe(2);
    const identifier = new URL(page.url()).pathname.split('/').at(-1)!;
    await request.delete(`/api/issues/${identifier}`);
  });
}

test('copied labels wait for metadata and survive a stale response after reopening', async ({
  page,
  request,
}) => {
  const labelResponse = await request.post('/api/labels', {
    data: { name: `Copy label ${Date.now()}`, color: '#336699' },
  });
  expect(labelResponse.ok()).toBeTruthy();
  const label = (await labelResponse.json()) as { id: number };
  const sourceResponse = await request.post('/api/issues', {
    data: { title: `Labeled copy ${Date.now()}`, labelIds: [label.id] },
  });
  expect(sourceResponse.ok()).toBeTruthy();
  const source = (await sourceResponse.json()) as { identifier: string };
  await page.goto(`/issues/${source.identifier}`);
  const options = page.getByRole('button', { name: 'Issue options' });
  await expect(options).toBeVisible();
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let loads = 0;
  await page.route('**/api/labels', async (route) => {
    loads += 1;
    if (loads === 1) {
      await pending;
      await route.fulfill({ json: [] });
    } else await route.continue();
  });
  let submissions = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/issues')
      submissions += 1;
  });
  await options.click();
  await page.getByRole('menuitem', { name: 'Make a copy' }).click();
  const composer = page.getByRole('dialog', { name: /^Create issue/ });
  const save = composer.getByRole('button', { name: 'Create', exact: true });
  await expect.poll(() => loads).toBe(1);
  await expect(save).toBeDisabled();
  await expect(composer.getByRole('status')).toHaveText('Loading issue properties…');
  await composer.getByRole('textbox', { name: 'Issue title', exact: true }).press('Control+Enter');
  expect(submissions).toBe(0);
  await page.keyboard.press('Escape');
  await expect(composer).toHaveCount(0);
  await options.click();
  await page.getByRole('menuitem', { name: 'Make a copy' }).click();
  await expect(save).toBeEnabled();
  const staleResponse = page.waitForResponse(
    (response) => new URL(response.url()).pathname === '/api/labels',
  );
  release();
  await staleResponse;
  await expect(save).toBeEnabled();
  await save.click();
  await expect(composer).toHaveCount(0);
  await expect(page).not.toHaveURL(`/issues/${source.identifier}`);
  const identifier = new URL(page.url()).pathname.split('/').at(-1)!;
  const copiedResponse = await request.get(`/api/issues/${identifier}`);
  const copied = (await copiedResponse.json()) as { labels: { id: number }[] };
  expect(copied.labels.map((entry) => entry.id)).toContain(label.id);
  expect(submissions).toBe(1);
  await request.delete(`/api/issues/${identifier}`);
  await request.delete(`/api/issues/${source.identifier}`);
});

test('metadata errors keep the composer editable and block saving until reload succeeds', async ({
  page,
  request,
}) => {
  let unavailable = true;
  await page.route('**/api/labels', async (route) => {
    if (unavailable) return route.fulfill({ status: 500, json: { error: 'Labels unavailable' } });
    await route.continue();
  });
  await page.goto('/drafts');
  await page.getByRole('button', { name: 'Create issue' }).click();
  const composer = page.getByRole('dialog', { name: /^Create issue/ });
  const title = composer.getByRole('textbox', { name: 'Issue title', exact: true });
  const value = `Recovered metadata ${Date.now()}`;
  await title.fill(value);
  await expect(composer.getByRole('alert')).toContainText('Issue properties could not be loaded');
  const save = composer.getByRole('button', { name: 'Create', exact: true });
  await expect(save).toBeDisabled();
  unavailable = false;
  await composer.getByRole('button', { name: 'Reload issue properties' }).click();
  await expect(save).toBeEnabled();
  await expect(title).toHaveValue(value);
  await expect(composer.getByRole('alert')).toHaveCount(0);
  await save.click();
  await expect(composer).toHaveCount(0);
  await expect(page).toHaveURL(/\/issues\/[A-Z]+-\d+$/);
  const identifier = new URL(page.url()).pathname.split('/').at(-1)!;
  await request.delete(`/api/issues/${identifier}`);
});
