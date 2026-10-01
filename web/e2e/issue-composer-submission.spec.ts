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

test('failed creation unlocks the composer and retains input for retry', async ({
  page,
  request,
}) => {
  let submissions = 0;
  await page.route('**/api/issues', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    submissions += 1;
    if (submissions === 1)
      return route.fulfill({ status: 500, json: { error: 'Creation unavailable' } });
    await route.continue();
  });
  await page.goto('/drafts');
  await page.getByRole('button', { name: 'Create issue' }).click();
  const composer = page.getByRole('dialog', { name: /^Create issue/ });
  const title = composer.getByRole('textbox', { name: 'Issue title', exact: true });
  const value = `Retry creation ${Date.now()}`;
  await title.fill(value);
  const save = composer.getByRole('button', { name: 'Create', exact: true });
  await save.click();
  await expect.poll(() => submissions).toBe(1);
  await expect(title).toBeEnabled();
  await expect(title).toHaveValue(value);
  await expect(save).toBeEnabled();
  await save.click();
  await expect(composer).toHaveCount(0);
  await expect(page).toHaveURL(/\/issues\/[A-Z]+-\d+$/);
  expect(submissions).toBe(2);
  const identifier = new URL(page.url()).pathname.split('/').at(-1)!;
  await request.delete(`/api/issues/${identifier}`);
});
