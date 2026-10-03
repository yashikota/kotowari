import { expandMoreNavigation } from './issue-list-controls.ts';
import { expect, test } from '@playwright/test';
import { contrastFailures } from './contrast.ts';

for (const scheme of ['light', 'dark']) {
  for (const field of ['status', 'title', 'date', 'tags']) {
    test(`document ${field} preserves failed input and retries in ${scheme}`, async ({
      page,
      request,
    }, testInfo) => {
      const slug = `properties-${field}-${scheme}-${Date.now()}`;
      expect((await request.post('/api/pages', { data: { title: slug, slug } })).ok()).toBeTruthy();
      await page.addInitScript((color) => {
        localStorage.setItem('kotowari.color-scheme', color);
        localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
      }, scheme);
      await page.setViewportSize({ width: 360, height: 800 });
      const bodies: Record<string, unknown>[] = [];
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route(`**/api/pages/${slug}`, async (route) => {
        if (route.request().method() !== 'PATCH') return route.continue();
        bodies.push(route.request().postDataJSON());
        if (bodies.length === 1) {
          await gate;
          return route.fulfill({
            status: 503,
            json: { error: 'Document property saving unavailable' },
          });
        }
        return route.continue();
      });
      try {
        await page.goto(`/pages/${slug}`);
        const title = page.getByRole('textbox', { name: 'Page title', exact: true });
        const status = page.getByRole('combobox', { name: 'Page status', exact: true });
        const date = page.getByRole('textbox', { name: 'Document date', exact: true });
        const tags = page.getByRole('textbox', { name: 'Tags', exact: true });
        const input =
          field === 'status' ? status : field === 'title' ? title : field === 'date' ? date : tags;
        const value =
          field === 'status'
            ? 'deprecated'
            : field === 'title'
              ? 'Retained document title'
              : field === 'date'
                ? '2030-01-02'
                : 'important, readable';
        if (field === 'status') await input.selectOption(value);
        else {
          await input.fill(value);
          if (field !== 'date') await input.blur();
        }
        await expect.poll(() => bodies.length).toBe(1);
        await expect(input).toBeDisabled();
        await expect(status).toBeDisabled();
        release();
        await expect(page.getByRole('alert')).toContainText('Document property saving unavailable');
        await expect(input).toBeEnabled();
        await expect(input).toHaveValue(value);
        expect(await contrastFailures(page)).toEqual([]);
        await page.screenshot({ path: testInfo.outputPath('document-properties-failure.png') });
        await page.getByRole('button', { name: 'Retry saving properties', exact: true }).click();
        await expect(page.getByRole('alert')).toHaveCount(0);
        await expect(
          page.getByRole('status').filter({ hasText: 'Document properties saved' }),
        ).toBeVisible();
        await expect(title).toBeFocused();
        expect(bodies).toHaveLength(2);
        expect(bodies[1]).toEqual(bodies[0]);
        await expect(input).toHaveValue(value);
        const saved = await (await request.get(`/api/pages/${slug}`)).json();
        expect(saved[field]).toEqual(field === 'tags' ? ['important', 'readable'] : value);
      } finally {
        release();
        await request.delete(`/api/pages/${slug}`);
      }
    });
  }
}

test('editing another property retains and saves an earlier failed change', async ({
  page,
  request,
}) => {
  const slug = `combined-properties-${Date.now()}`;
  await request.post('/api/pages', { data: { title: slug, slug } });
  const bodies: Record<string, unknown>[] = [];
  await page.route(`**/api/pages/${slug}`, async (route) => {
    if (route.request().method() !== 'PATCH') return route.continue();
    bodies.push(route.request().postDataJSON());
    if (bodies.length === 1)
      return route.fulfill({ status: 503, json: { error: 'Status saving unavailable' } });
    return route.continue();
  });
  await page.goto(`/pages/${slug}`);
  await page.getByRole('combobox', { name: 'Page status', exact: true }).selectOption('deprecated');
  await expect(page.getByRole('alert')).toContainText('Status saving unavailable');
  const title = page.getByRole('textbox', { name: 'Page title', exact: true });
  await title.fill('Combined changes');
  await title.press('Enter');
  await expect(
    page.getByRole('status').filter({ hasText: 'Document properties saved' }),
  ).toBeVisible();
  expect(bodies[1]).toEqual({ status: 'deprecated', title: 'Combined changes' });
  const saved = await (await request.get(`/api/pages/${slug}`)).json();
  expect(saved.status).toBe('deprecated');
  expect(saved.title).toBe('Combined changes');
  await request.delete(`/api/pages/${slug}`);
});

test('document options fail locally and recover without enabling incomplete choices', async ({
  page,
  request,
}) => {
  const slug = `options-${Date.now()}`;
  await request.post('/api/pages', { data: { title: slug, slug } });
  let fail = true;
  await page.route('**/api/pages', (route) =>
    fail
      ? route.fulfill({ status: 503, json: { error: 'Document options unavailable' } })
      : route.continue(),
  );
  await page.goto(`/pages/${slug}`);
  await expect(page.getByRole('alert')).toContainText('Document options unavailable');
  const parent = page.getByRole('combobox', { name: 'Parent page', exact: true });
  await expect(parent).toBeDisabled();
  fail = false;
  await page.getByRole('button', { name: 'Retry loading document options', exact: true }).click();
  await expect(parent).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await request.delete(`/api/pages/${slug}`);
});

test('confirmed document title is fresh in the document list without refetching the edited route', async ({
  page,
  request,
}) => {
  const slug = `fresh-properties-${Date.now()}`;
  await request.post('/api/pages', { data: { title: slug, slug } });
  await page.goto(`/pages/${slug}`);
  let reads = 0;
  await page.route(`**/api/pages/${slug}`, (route) => {
    if (route.request().method() === 'GET') {
      reads++;
      return route.fulfill({ status: 503, json: { error: 'Read unavailable after save' } });
    }
    return route.continue();
  });
  const title = page.getByRole('textbox', { name: 'Page title', exact: true });
  const value = `Updated title ${Date.now()}`;
  await title.fill(value);
  await title.press('Enter');
  await expect(
    page.getByRole('status').filter({ hasText: 'Document properties saved' }),
  ).toBeVisible();
  expect(reads).toBe(0);
  await expect(title).toHaveValue(value);
  await expandMoreNavigation(page);
  await page.getByRole('link', { name: 'Pages', exact: true }).click();
  await expect(page.getByRole('listitem').filter({ hasText: value })).toBeVisible();
  await request.delete(`/api/pages/${slug}`);
});
