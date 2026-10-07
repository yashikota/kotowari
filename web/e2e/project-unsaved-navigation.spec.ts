import { expect, test } from '@playwright/test';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import ja from '../src/i18n/locales/ja.json' with { type: 'json' };
import { contrastFailures } from './contrast.ts';

for (const scheme of ['light', 'dark']) {
  for (const [locale, labels] of [
    ['en', en],
    ['ja', ja],
  ] as const) {
    test(`project drafts survive navigation and retry in ${locale}/${scheme}`, async ({
      page,
      request,
    }, testInfo) => {
      const slug = `unsaved-${locale}-${scheme}-${Date.now()}`;
      const otherSlug = `${slug}-next`;
      const otherName = `Next ${slug}`;
      expect(
        (await request.post('/api/projects', { data: { slug: otherSlug, name: otherName } })).ok(),
      ).toBeTruthy();
      expect(
        (
          await request.post('/api/projects', {
            data: {
              slug,
              name: `Project ${slug}`,
              summary: 'Persisted summary',
              description: 'Persisted description',
              dependencies: [{ projectSlug: otherSlug, kind: 'related' }],
            },
          })
        ).ok(),
      ).toBeTruthy();
      await page.route('**/api/workspace', async (route) => {
        const response = await route.fetch();
        return route.fulfill({ json: { ...(await response.json()), locale } });
      });
      await page.addInitScript((color) => {
        localStorage.setItem('kotowari.color-scheme', color);
        localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
      }, scheme);
      await page.setViewportSize({ width: 360, height: 800 });
      const writes: Record<string, unknown>[] = [];
      let allowSave = false;
      await page.route(`**/api/projects/${slug}`, async (route) => {
        if (route.request().method() !== 'PATCH') return route.continue();
        writes.push(route.request().postDataJSON());
        if (!allowSave)
          return route.fulfill({ status: 503, json: { error: 'Project save unavailable' } });
        return route.continue();
      });
      try {
        await page.goto(`/projects/${slug}`);
        const summary = page.getByRole('textbox', { name: labels.ui.projectSummary, exact: true });
        const description = page.getByRole('textbox', {
          name: labels.ui.projectDescription,
          exact: true,
        });
        await summary.fill('Retained summary');
        await description.fill('Retained description');
        await page
          .getByRole('heading')
          .filter({ hasText: `Project ${slug}` })
          .click();
        await expect(
          page.getByRole('status').filter({ hasText: labels.projectSave.saving }),
        ).toHaveCount(0);
        await expect(page.getByRole('alert')).toContainText('Project save unavailable');
        const link = page.getByRole('link', { name: otherName, exact: true });
        await link.click();
        const dialog = page.getByRole('dialog', { name: labels.unsavedProject.title, exact: true });
        const stay = dialog.getByRole('button', { name: labels.unsavedProject.stay, exact: true });
        await expect(stay).toBeFocused();
        await stay.click();
        await expect(dialog).not.toBeVisible();
        await expect(link).toBeFocused();
        await expect(summary).toHaveValue('Retained summary');
        await expect(description).toHaveValue('Retained description');
        await link.click();
        const retry = dialog.getByRole('button', { name: labels.unsavedProject.save, exact: true });
        const before = writes.length;
        await retry.click();
        await expect.poll(() => writes.length).toBe(before + 1);
        await expect(retry).toBeEnabled();
        await expect(retry).toBeFocused();
        expect(writes.at(-1)).toEqual({
          summary: 'Retained summary',
          description: 'Retained description',
        });
        expect(await contrastFailures(page, '[role="dialog"]')).toEqual([]);
        await page.screenshot({ path: testInfo.outputPath('project-unsaved-retry.png') });
        allowSave = true;
        await retry.click();
        await expect(page).toHaveURL(new RegExp(`/projects/${otherSlug}$`));
        const persisted = await (await request.get(`/api/projects/${slug}`)).json();
        expect(persisted.summary).toBe('Retained summary');
        expect(persisted.description).toBe('Retained description');
        await expect(
          page.getByRole('textbox', { name: labels.ui.projectSummary, exact: true }),
        ).toHaveValue('');
      } finally {
        await request.delete(`/api/projects/${slug}`);
        await request.delete(`/api/projects/${otherSlug}`);
      }
    });
  }
}

test('project refresh retains failed summary and description drafts', async ({ page, request }) => {
  const slug = `refresh-drafts-${Date.now()}`;
  expect(
    (
      await request.post('/api/projects', {
        data: {
          slug,
          name: slug,
          summary: 'Original summary',
          description: 'Original description',
        },
      })
    ).ok(),
  ).toBeTruthy();
  await page.route(`**/api/projects/${slug}`, async (route) => {
    if (route.request().method() === 'PATCH')
      return route.fulfill({ status: 503, json: { error: 'Project save unavailable' } });
    return route.continue();
  });
  try {
    await page.goto(`/projects/${slug}`);
    const summary = page.getByRole('textbox', { name: en.ui.projectSummary, exact: true });
    const description = page.getByRole('textbox', { name: en.ui.projectDescription, exact: true });
    await summary.fill('Unsaved summary');
    await description.fill('Unsaved description');
    const milestone = page.getByRole('textbox', { name: en.projectMilestones.name, exact: true });
    await milestone.fill('Refresh after creation');
    await page.getByRole('button', { name: en.projectMilestones.add, exact: true }).click();
    await expect(
      page.getByRole('textbox', {
        name: `${en.projectMilestones.name}: Refresh after creation`,
        exact: true,
      }),
    ).toBeVisible();
    await expect(summary).toHaveValue('Unsaved summary');
    await expect(description).toHaveValue('Unsaved description');
    const persisted = await (await request.get(`/api/projects/${slug}`)).json();
    expect(persisted.summary).toBe('Original summary');
    expect(persisted.description).toBe('Original description');
    await expect(page.getByRole('alert')).toContainText('Project save unavailable');
  } finally {
    await request.delete(`/api/projects/${slug}`);
  }
});

test('saving another project property retains a failed description', async ({ page, request }) => {
  const slug = `description-property-${Date.now()}`;
  expect(
    (
      await request.post('/api/projects', {
        data: { slug, name: slug, description: 'Original description' },
      })
    ).ok(),
  ).toBeTruthy();
  await page.route(`**/api/projects/${slug}`, async (route) => {
    if (route.request().method() !== 'PATCH') return route.continue();
    if ('description' in route.request().postDataJSON())
      return route.fulfill({ status: 503, json: { error: 'Description unavailable' } });
    return route.continue();
  });
  try {
    await page.goto(`/projects/${slug}`);
    const description = page.getByRole('textbox', { name: en.ui.projectDescription, exact: true });
    await description.fill('Retained description');
    await page.getByRole('heading').filter({ hasText: slug }).click();
    await expect(page.getByRole('alert')).toContainText('Description unavailable');
    await page.getByRole('combobox', { name: 'Priority', exact: true }).selectOption('2');
    await expect
      .poll(async () => (await (await request.get(`/api/projects/${slug}`)).json()).priority)
      .toBe(2);
    await expect(page.getByRole('status').filter({ hasText: en.projectSave.saving })).toHaveCount(
      0,
    );
    await expect(description).toHaveValue('Retained description');
    await expect(page.getByRole('status').filter({ hasText: en.projectSave.saved })).toHaveCount(0);
    expect((await (await request.get(`/api/projects/${slug}`)).json()).description).toBe(
      'Original description',
    );
  } finally {
    await request.delete(`/api/projects/${slug}`);
  }
});

for (const scenario of ['pending navigation', 'stay while pending', 'discard', 'undo']) {
  test(`project text navigation handles ${scenario}`, async ({ page, request }) => {
    const slug = `project-choice-${Date.now()}`;
    const otherSlug = `${slug}-next`;
    expect(
      (await request.post('/api/projects', { data: { slug: otherSlug, name: otherSlug } })).ok(),
    ).toBeTruthy();
    expect(
      (
        await request.post('/api/projects', {
          data: {
            slug,
            name: slug,
            summary: 'Original summary',
            description: 'Original description',
            dependencies: [{ projectSlug: otherSlug, kind: 'related' }],
          },
        })
      ).ok(),
    ).toBeTruthy();
    const writes: unknown[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const pending = scenario.includes('pending');
    await page.route(`**/api/projects/${slug}`, async (route) => {
      if (route.request().method() !== 'PATCH') return route.continue();
      writes.push(route.request().postDataJSON());
      if (!pending)
        return route.fulfill({ status: 503, json: { error: 'Project save unavailable' } });
      if (writes.length === 1) await gate;
      return route.continue();
    });
    try {
      await page.goto(`/projects/${slug}`);
      const summary = page.getByRole('textbox', { name: en.ui.projectSummary, exact: true });
      const description = page.getByRole('textbox', {
        name: en.ui.projectDescription,
        exact: true,
      });
      const link = page.getByRole('link', { name: otherSlug, exact: true });
      const heading = page.getByRole('heading').filter({ hasText: slug }).first();
      await summary.fill('First summary');
      await heading.click();
      await expect.poll(() => writes.length).toBe(1);
      if (pending) {
        await summary.fill('Latest summary');
        await link.click();
        const dialog = page.getByRole('dialog', { name: en.unsavedProject.title, exact: true });
        await expect(dialog).toBeVisible();
        await expect(
          dialog.getByRole('button', { name: en.unsavedProject.discard, exact: true }),
        ).toBeDisabled();
        await expect(page).toHaveURL(new RegExp(`/projects/${slug}$`));
        if (scenario === 'stay while pending') {
          await dialog.getByRole('button', { name: en.unsavedProject.stay, exact: true }).click();
          await expect(dialog).not.toBeVisible();
        }
        release();
        await expect
          .poll(async () => (await (await request.get(`/api/projects/${slug}`)).json()).summary)
          .toBe('Latest summary');
        if (scenario === 'stay while pending') {
          await expect(
            page.getByRole('status').filter({ hasText: en.projectSave.saving }),
          ).toHaveCount(0);
          await expect(page).toHaveURL(new RegExp(`/projects/${slug}$`));
          await expect(summary).toHaveValue('Latest summary');
          await link.click();
        }
        await expect(page).toHaveURL(new RegExp(`/projects/${otherSlug}$`));
        expect(writes).toEqual([{ summary: 'First summary' }, { summary: 'Latest summary' }]);
      } else {
        await expect(page.getByRole('alert')).toContainText('Project save unavailable');
        await description.fill('Unsaved description');
        await heading.click();
        await expect.poll(() => writes.length).toBe(2);
        await expect(
          page.getByRole('status').filter({ hasText: en.projectSave.saving }),
        ).toHaveCount(0);
        if (scenario === 'undo') {
          await summary.fill('Original summary');
          await description.fill('Original description');
          await link.click();
          await expect(page).toHaveURL(new RegExp(`/projects/${otherSlug}$`));
          await expect(page.getByRole('dialog')).toHaveCount(0);
        } else {
          await link.click();
          const dialog = page.getByRole('dialog', { name: en.unsavedProject.title, exact: true });
          await dialog
            .getByRole('button', { name: en.unsavedProject.discard, exact: true })
            .click();
          await expect(page).toHaveURL(new RegExp(`/projects/${otherSlug}$`));
        }
        const persisted = await (await request.get(`/api/projects/${slug}`)).json();
        expect(persisted.summary).toBe('Original summary');
        expect(persisted.description).toBe('Original description');
        expect(writes).toHaveLength(2);
      }
    } finally {
      release();
      await request.delete(`/api/projects/${slug}`);
      await request.delete(`/api/projects/${otherSlug}`);
    }
  });
}

for (const scenario of ['browser back', 'reload']) {
  test(`project description is protected during ${scenario}`, async ({ page, request }) => {
    const slug = `browser-project-${Date.now()}`;
    expect(
      (
        await request.post('/api/projects', {
          data: { slug, name: slug, description: 'Persisted description' },
        })
      ).ok(),
    ).toBeTruthy();
    await page.route(`**/api/projects/${slug}`, async (route) => {
      if (route.request().method() === 'PATCH')
        return route.fulfill({ status: 503, json: { error: 'Description unavailable' } });
      return route.continue();
    });
    try {
      await page.goto('/projects');
      await page.locator(`a[href="/projects/${slug}"]`).click();
      const description = page.getByRole('textbox', {
        name: en.ui.projectDescription,
        exact: true,
      });
      await description.fill('Retained description');
      await page.getByRole('heading').filter({ hasText: slug }).click();
      await expect(page.getByRole('alert')).toContainText('Description unavailable');
      if (scenario === 'reload') {
        const prompt = page.waitForEvent('dialog');
        await page.evaluate(() => {
          setTimeout(() => location.reload(), 0);
        });
        const dialog = await prompt;
        expect(dialog.type()).toBe('beforeunload');
        await dialog.dismiss();
        await expect(description).toHaveValue('Retained description');
        await expect(page).toHaveURL(new RegExp(`/projects/${slug}$`));
      } else {
        await page.evaluate(() => history.back());
        const dialog = page.getByRole('dialog', { name: en.unsavedProject.title, exact: true });
        await expect(
          dialog.getByRole('button', { name: en.unsavedProject.stay, exact: true }),
        ).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(dialog).not.toBeVisible();
        await expect(description).toHaveValue('Retained description');
        await page.evaluate(() => history.back());
        await dialog.getByRole('button', { name: en.unsavedProject.discard, exact: true }).click();
        await expect(page).toHaveURL(/\/projects$/);
      }
      expect((await (await request.get(`/api/projects/${slug}`)).json()).description).toBe(
        'Persisted description',
      );
    } finally {
      await request.delete(`/api/projects/${slug}`);
    }
  });
}
