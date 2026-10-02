import { expect, test } from '@playwright/test';

for (const scheme of ['light', 'dark']) {
  for (const path of ['/views/new', '/views/projects/new']) {
    test(`${path} has readable creation controls in ${scheme}`, async ({ page }, testInfo) => {
      await page.addInitScript((value) => {
        localStorage.setItem('kotowari.color-scheme', value);
        localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
      }, scheme);
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto(path);
      const name = page.getByRole('textbox', { name: 'View name', exact: true });
      await name.fill('A useful view with a long name for planning the next steps');
      await expect(page.getByText('View name', { exact: true })).toBeVisible();
      const description = page.getByRole('textbox', { name: 'Description', exact: true });
      await description.fill('Keep the relevant work together and explain when to use this view.');
      expect((await name.boundingBox())!.width).toBeGreaterThan(220);
      for (const label of ['Create view', 'Cancel']) {
        const button = page.getByRole('button', { name: label, exact: true });
        await expect(button).toBeVisible();
        const bounds = (await button.boundingBox())!;
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(360);
      }
      await page.screenshot({ path: testInfo.outputPath('builder.png') });
    });
  }
}

test('project view storage failure retains input and can retry creation', async ({ page }) => {
  await page.goto('/views/projects/new?priority=1');
  const name = `ProjectViewRecovery${Date.now()}`;
  const input = page.getByRole('textbox', { name: 'View name', exact: true });
  const description = page.getByRole('textbox', { name: 'Description', exact: true });
  await input.fill(name);
  await description.fill('Keep the next important work together.');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    let fail = true;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'kotowari.project-views.v1' && fail) {
        fail = false;
        throw new DOMException('Storage unavailable', 'QuotaExceededError');
      }
      return original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: 'Create view', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('View could not be saved');
  await expect(input).toHaveValue(name);
  await expect(description).toHaveValue('Keep the next important work together.');
  await expect(input).toBeEnabled();
  await expect(page).toHaveURL(/priority=1/);
  await page.getByRole('button', { name: 'Create view', exact: true }).click();
  await expect(page).toHaveURL(/projectView=/);
  const saved = await page.evaluate(
    (value) =>
      JSON.parse(localStorage.getItem('kotowari.project-views.v1') ?? '[]').filter(
        (view: { name: string }) => view.name === value,
      ),
    name,
  );
  expect(saved).toHaveLength(1);
  expect(saved[0].description).toBe('Keep the next important work together.');
  expect(saved[0].search.priority).toBe(1);
  await page.evaluate((value) => {
    const views = JSON.parse(localStorage.getItem('kotowari.project-views.v1') ?? '[]');
    localStorage.setItem(
      'kotowari.project-views.v1',
      JSON.stringify(views.filter((view: { name: string }) => view.name !== value)),
    );
  }, name);
});

test('view preview exposes result titles and prevents focusing preview actions', async ({
  page,
  request,
}) => {
  const title = `AccessiblePreview${Date.now()}`;
  const response = await request.post('/api/issues', { data: { title, status: 'todo' } });
  expect(response.ok()).toBeTruthy();
  const issue = await response.json();
  await page.goto('/views/new');
  const preview = page.getByRole('region', { name: 'Preview results' });
  await expect(preview.getByRole('status')).toContainText('Preview:');
  await page.locator('body').click({ position: { x: 2, y: 2 } });
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/views\/new/);
  await preview.getByText('Review matching results', { exact: true }).click();
  await expect(preview.getByRole('listitem').filter({ hasText: title })).toBeVisible();
  await preview.getByRole('region', { name: 'Matching result titles' }).focus();
  await expect(preview.getByRole('region', { name: 'Matching result titles' })).toBeFocused();
  const visualPreview = page.locator('[inert][aria-label="Preview"]');
  await expect(visualPreview).toHaveCount(1);
  const count = await visualPreview.locator('button, a, input, [tabindex]').count();
  expect(count).toBeGreaterThan(0);
  await page.getByRole('textbox', { name: 'View name', exact: true }).focus();
  await visualPreview
    .locator('button, a, input, [tabindex]')
    .first()
    .evaluate((element) => (element as HTMLElement).focus());
  await expect(page.getByRole('textbox', { name: 'View name', exact: true })).toBeFocused();
  await page.goto('/views/projects/new');
  await expect(
    page.getByRole('region', { name: 'Preview results' }).getByRole('status'),
  ).toContainText('Preview:');
  await expect(page.locator('[inert][aria-label="Preview"]')).toHaveCount(1);
  await request.delete(`/api/issues/${issue.identifier}`);
});

test('many preview titles remain scrollable with visible creation controls', async ({
  page,
  request,
}, testInfo) => {
  const response = await request.post('/api/issues', {
    data: { title: `ManyPreview${Date.now()}`, status: 'todo' },
  });
  expect(response.ok()).toBeTruthy();
  const issue = await response.json();
  const rows = Array.from({ length: 40 }, (_, index) => ({
    ...issue,
    id: 90000 + index,
    identifier: `PREVIEW-${index}`,
    title: `Result ${index} ${'LongTitleWithoutSpaces'.repeat(6)}`,
  }));
  await page.route('**/api/issues*', async (route) => {
    if (
      route.request().method() === 'GET' &&
      new URL(route.request().url()).pathname === '/api/issues'
    )
      await route.fulfill({ json: rows });
    else await route.continue();
  });
  await page.setViewportSize({ width: 360, height: 600 });
  await page.goto('/views/new');
  const summary = page.getByText('Review matching results', { exact: true });
  await summary.focus();
  await summary.press('Enter');
  const results = page.getByRole('region', { name: 'Matching result titles' });
  await results.focus();
  expect(
    await results.evaluate((element) => Number.parseFloat(getComputedStyle(element).outlineWidth)),
  ).toBeGreaterThanOrEqual(2);
  expect(
    await results.evaluate((element) => element.scrollHeight > element.clientHeight),
  ).toBeTruthy();
  await results.press('Control+End');
  await expect(results.getByRole('listitem').last()).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Create view', exact: true })).toBeInViewport();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('many-preview.png') });
  await request.delete(`/api/issues/${issue.identifier}`);
});
