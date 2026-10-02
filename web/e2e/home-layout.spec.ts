import { expect, test } from '@playwright/test';

for (const scheme of ['light', 'dark']) {
  test(`home links stay readable and actionable in ${scheme}`, async ({
    page,
    request,
  }, testInfo) => {
    const title = `HomeResource${Date.now()} ${'LongResourceTitleWithoutSpaces'.repeat(8)}`;
    const response = await request.post('/api/workspace/resources', {
      data: { title, url: 'https://example.com/planning' },
    });
    expect(response.ok()).toBeTruthy();
    const resource = await response.json();
    await page.addInitScript((value) => {
      localStorage.setItem('kotowari.color-scheme', value);
      localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
    }, scheme);
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/');
    const link = page.getByRole('link', { name: title, exact: true });
    await link.scrollIntoViewIfNeeded();
    await link.focus();
    expect((await link.boundingBox())!.width).toBeGreaterThan(250);
    expect(
      await link.evaluate((element) => Number.parseFloat(getComputedStyle(element).outlineWidth)),
    ).toBeGreaterThanOrEqual(2);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBeTruthy();
    await page.screenshot({ path: testInfo.outputPath('home-resource.png') });
    await request.delete(`/api/workspace/resources/${resource.id}`);
  });
}

test('resource dialog retains input after failure and prevents duplicate submission', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add resource', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Add resource' });
  const url = dialog.getByRole('textbox', { name: 'URL', exact: true });
  const title = dialog.getByRole('textbox', { name: 'Title (optional)', exact: true });
  const resourceTitle = `RecoverResource${Date.now()}`;
  await url.fill('https://example.com/recovery');
  await title.fill(resourceTitle);
  let attempts = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/workspace/resources', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    attempts += 1;
    if (attempts === 1) {
      await gate;
      await route.fulfill({ status: 503, body: 'Temporary resource failure' });
    } else await route.continue();
  });
  await dialog.getByRole('button', { name: 'Add link', exact: true }).click();
  await expect(url).toBeDisabled();
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  await dialog.locator('form').evaluate((form) => (form as HTMLFormElement).requestSubmit());
  expect(attempts).toBe(1);
  release();
  await expect(dialog.getByRole('alert')).toContainText('Temporary resource failure');
  await expect(url).toHaveValue('https://example.com/recovery');
  await expect(title).toHaveValue(resourceTitle);
  await expect(url).toBeEnabled();
  await dialog.getByRole('button', { name: 'Add link', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('link', { name: resourceTitle, exact: true })).toBeVisible();
  expect(attempts).toBe(2);
  const workspace = await (await request.get('/api/workspace')).json();
  const resources = workspace.resources.filter(
    (resource: { title: string }) => resource.title === resourceTitle,
  );
  expect(resources).toHaveLength(1);
  await request.delete(`/api/workspace/resources/${resources[0].id}`);
});
