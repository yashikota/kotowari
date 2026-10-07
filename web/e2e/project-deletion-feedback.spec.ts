import { expect, test } from '@playwright/test';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import ja from '../src/i18n/locales/ja.json' with { type: 'json' };
import { contrastFailures } from './contrast.ts';

for (const scheme of ['light', 'dark']) {
  for (const [locale, labels] of [
    ['en', en],
    ['ja', ja],
  ] as const) {
    test(`project deletion retains failed drafts and retries in ${locale}/${scheme}`, async ({
      page,
      request,
    }, testInfo) => {
      const slug = `delete-${locale}-${scheme}-${Date.now()}`;
      const name = `Project ${slug}`;
      const created = await request.post('/api/projects', {
        data: {
          slug,
          name,
          summary: 'Persisted summary',
          description: 'Persisted description',
        },
      });
      expect(created.ok()).toBeTruthy();
      await page.route('**/api/workspace', async (route) => {
        const response = await route.fetch();
        return route.fulfill({ json: { ...(await response.json()), locale } });
      });
      await page.addInitScript((color) => {
        localStorage.setItem('kotowari.color-scheme', color);
        localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
      }, scheme);
      await page.setViewportSize({ width: 360, height: 800 });
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const deletes: string[] = [];
      await page.route(`**/api/projects/${slug}`, async (route) => {
        if (route.request().method() === 'PATCH')
          return route.fulfill({ status: 503, json: { error: 'Project save unavailable' } });
        if (route.request().method() !== 'DELETE') return route.continue();
        deletes.push(route.request().url());
        if (deletes.length === 1) {
          await gate;
          return route.fulfill({ status: 503, json: { error: 'Project deletion unavailable' } });
        }
        return route.continue();
      });
      try {
        await page.goto(`/projects/${slug}`);
        const summary = page.getByLabel(labels.ui.projectSummary, { exact: true });
        const description = page.getByLabel(labels.ui.projectDescription, { exact: true });
        await summary.fill('Retained summary draft');
        await description.fill('Retained description draft');
        await page.getByRole('heading').filter({ hasText: name }).click();
        await expect(
          page.getByRole('status').filter({ hasText: labels.projectSave.saving }),
        ).toHaveCount(0);
        await expect(
          page.getByRole('alert').filter({ hasText: labels.projectSave.failed }),
        ).toBeVisible();
        const options = page.getByRole('button', {
          name: labels.issueActions.moreActions,
          exact: true,
        });
        await options.click();
        await page.getByRole('menuitem', { name: labels.ui.delete, exact: true }).click();
        const dialog = page.getByRole('dialog', {
          name: labels.projectDeletion.title,
          exact: true,
        });
        const cancel = dialog.getByRole('button', { name: labels.common.cancel, exact: true });
        const confirm = dialog.getByRole('button', { name: labels.ui.delete, exact: true });
        await expect(cancel).toBeFocused();
        await expect(dialog).toContainText(name);
        expect((await cancel.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        expect((await confirm.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        await cancel.click();
        await expect(dialog).toHaveCount(0);
        await expect(options).toBeFocused();
        expect(deletes).toHaveLength(0);
        await expect(summary).toHaveValue('Retained summary draft');
        await expect(description).toHaveValue('Retained description draft');
        await options.click();
        await page.getByRole('menuitem', { name: labels.ui.delete, exact: true }).click();
        await confirm.click();
        await expect.poll(() => deletes.length).toBe(1);
        await expect(cancel).toBeDisabled();
        await expect(confirm).toBeDisabled();
        await page.keyboard.press('Escape');
        await expect(dialog).toBeVisible();
        expect(deletes).toHaveLength(1);
        release();
        await expect(dialog.getByRole('alert')).toContainText('Project deletion unavailable');
        const retry = dialog.getByRole('button', {
          name: labels.projectDeletion.retry,
          exact: true,
        });
        await expect(retry).toBeFocused();
        await expect(summary).toHaveValue('Retained summary draft');
        await expect(description).toHaveValue('Retained description draft');
        const persisted = await (await request.get(`/api/projects/${slug}`)).json();
        expect(persisted.summary).toBe('Persisted summary');
        expect(persisted.description).toBe('Persisted description');
        expect(await contrastFailures(page, '[role="dialog"]')).toEqual([]);
        await page.screenshot({ path: testInfo.outputPath('project-deletion-failure.png') });
        await retry.click();
        await expect(page).toHaveURL(/\/projects$/);
        await expect(dialog).toHaveCount(0);
        expect(deletes).toEqual([deletes[0], deletes[0]]);
        expect((await request.get(`/api/projects/${slug}`)).status()).toBe(404);
      } finally {
        release();
        await request.delete(`/api/projects/${slug}`);
      }
    });
  }
}

test('project deletion waits for an outstanding property save', async ({ page, request }) => {
  const slug = `delete-save-${Date.now()}`;
  expect(
    (await request.post('/api/projects', { data: { slug, name: 'Save before delete' } })).ok(),
  ).toBeTruthy();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let deletes = 0;
  await page.route(`**/api/projects/${slug}`, async (route) => {
    if (route.request().method() === 'PATCH') {
      await gate;
      return route.fulfill({ status: 503, json: { error: 'Save unavailable' } });
    }
    if (route.request().method() === 'DELETE') deletes++;
    return route.continue();
  });
  try {
    await page.goto(`/projects/${slug}`);
    await page.getByLabel('Project summary', { exact: true }).fill('Unsaved summary');
    const options = page.getByRole('button', { name: 'More actions', exact: true });
    await options.click();
    await expect(page.getByRole('menuitem', { name: 'Delete', exact: true })).toBeDisabled();
    expect(deletes).toBe(0);
    release();
    await expect(page.getByRole('menuitem', { name: 'Delete', exact: true })).toBeEnabled();
    await page.getByRole('menuitem', { name: 'Delete', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Delete project', exact: true });
    await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByLabel('Project summary', { exact: true })).toHaveValue(
      'Unsaved summary',
    );
    expect(deletes).toBe(0);
  } finally {
    release();
    await request.delete(`/api/projects/${slug}`);
  }
});
