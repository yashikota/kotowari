import { expect, test } from '@playwright/test';
import { contrastFailures } from './contrast.ts';

for (const scheme of ['light', 'dark']) {
  for (const field of ['title', 'status', 'evaluation', 'projectSlug', 'supersedes']) {
    test(`decision ${field} retains failed edits and retries in ${scheme}`, async ({
      page,
      request,
    }, testInfo) => {
      const slug = `decision-properties-${field.toLowerCase()}-${scheme}-${Date.now()}`;
      expect(
        (await request.post('/api/projects', { data: { name: slug, slug } })).ok(),
      ).toBeTruthy();
      const previous = await (
        await request.post('/api/adrs', { data: { title: `Previous ${slug}` } })
      ).json();
      const response = await request.post('/api/adrs', { data: { title: slug } });
      expect(response.ok()).toBeTruthy();
      const adr = await response.json();
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
      await page.route(`**/api/adrs/${adr.identifier}`, async (route) => {
        if (route.request().method() !== 'PATCH') return route.continue();
        bodies.push(route.request().postDataJSON());
        if (bodies.length === 1) {
          await gate;
          return route.fulfill({ status: 503, json: { error: 'Decision saving unavailable' } });
        }
        return route.continue();
      });
      try {
        await page.goto(`/adrs/${adr.identifier}`);
        const title = page.getByRole('textbox', { name: 'ADR title', exact: true });
        const labels = {
          title: 'ADR title',
          status: 'ADR status',
          evaluation: 'Evaluation',
          projectSlug: 'ADR project',
          supersedes: 'Supersedes ADR number',
        };
        const input = page.getByLabel(labels[field as keyof typeof labels], { exact: true });
        const value =
          field === 'status'
            ? 'deprecated'
            : field === 'projectSlug'
              ? slug
              : field === 'supersedes'
                ? String(previous.number)
                : `Retained ${field}`;
        await expect(input).toBeEnabled();
        if (field === 'status' || field === 'projectSlug') await input.selectOption(value);
        else {
          await input.fill(value);
          await input.blur();
        }
        await expect.poll(() => bodies.length).toBe(1);
        await expect(input).toBeDisabled();
        await expect(page.getByRole('button', { name: 'Publish', exact: true })).toBeDisabled();
        release();
        await expect(page.getByRole('alert')).toContainText('Decision saving unavailable');
        await expect(input).toHaveValue(value);
        await expect(input).toBeEnabled();
        await expect(page.getByRole('button', { name: 'Publish', exact: true })).toBeDisabled();
        expect(await contrastFailures(page)).toEqual([]);
        await page.screenshot({ path: testInfo.outputPath('decision-properties-failure.png') });
        await page.getByRole('button', { name: 'Retry saving properties', exact: true }).click();
        await expect(page.getByRole('alert')).toHaveCount(0);
        await expect(
          page.getByRole('status').filter({ hasText: 'Document properties saved' }),
        ).toBeVisible();
        await expect(title).toBeFocused();
        await expect(page.getByRole('button', { name: 'Publish', exact: true })).toBeEnabled();
        expect(bodies).toHaveLength(2);
        expect(bodies[1]).toEqual(bodies[0]);
        const saved = await (await request.get(`/api/adrs/${adr.identifier}`)).json();
        expect(saved[field]).toEqual(field === 'supersedes' ? previous.number : value);
        if (field === 'supersedes') await expect(input).toBeDisabled();
      } finally {
        release();
      }
    });
  }
}

test('decision option loading fails locally and can be retried', async ({ page, request }) => {
  const adr = await (
    await request.post('/api/adrs', { data: { title: `Decision options ${Date.now()}` } })
  ).json();
  let fail = true;
  await page.route('**/api/adrs', (route) =>
    fail
      ? route.fulfill({ status: 503, json: { error: 'Decision options unavailable' } })
      : route.continue(),
  );
  await page.goto(`/adrs/${adr.identifier}`);
  await expect(page.getByRole('alert')).toContainText('Decision options unavailable');
  const project = page.getByLabel('ADR project', { exact: true });
  await expect(project).toBeDisabled();
  await expect(page.getByLabel('Link issue', { exact: true })).toBeDisabled();
  fail = false;
  await page.getByRole('button', { name: 'Retry loading document options', exact: true }).click();
  await expect(project).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('saving another decision property includes earlier failed changes', async ({
  page,
  request,
}) => {
  const adr = await (
    await request.post('/api/adrs', { data: { title: `Combined decision ${Date.now()}` } })
  ).json();
  const bodies: Record<string, unknown>[] = [];
  await page.route(`**/api/adrs/${adr.identifier}`, (route) => {
    if (route.request().method() !== 'PATCH') return route.continue();
    bodies.push(route.request().postDataJSON());
    return bodies.length === 1
      ? route.fulfill({ status: 503, json: { error: 'Decision saving unavailable' } })
      : route.continue();
  });
  await page.goto(`/adrs/${adr.identifier}`);
  await page.getByLabel('ADR status', { exact: true }).selectOption('deprecated');
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByLabel('ADR title', { exact: true }).fill('Combined decision changes');
  await page.getByLabel('ADR title', { exact: true }).press('Enter');
  await expect(
    page.getByRole('status').filter({ hasText: 'Document properties saved' }),
  ).toBeVisible();
  expect(bodies[1]).toEqual({ status: 'deprecated', title: 'Combined decision changes' });
});
