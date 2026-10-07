import { expect, test } from '@playwright/test';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import ja from '../src/i18n/locales/ja.json' with { type: 'json' };
import { contrastFailures } from './contrast.ts';

for (const scheme of ['light', 'dark']) {
  for (const [locale, labels] of [
    ['en', en],
    ['ja', ja],
  ] as const) {
    test(`dependency writes retain selection and recover in ${locale}/${scheme}`, async ({
      page,
      request,
    }, testInfo) => {
      const slug = `dependency-${locale}-${scheme}-${Date.now()}`;
      const other = `${slug}-other`;
      const longName = `${other} ${'Long project name '.repeat(8)}`.trim();
      for (const [key, name] of [
        [slug, slug],
        [other, longName],
      ])
        expect(
          (await request.post('/api/projects', { data: { slug: key, name } })).ok(),
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
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const writes: unknown[] = [];
      let deletes = 0;
      await page.route(`**/api/projects/${slug}/dependencies`, async (route) => {
        if (route.request().method() !== 'POST') return route.continue();
        writes.push(route.request().postDataJSON());
        if (writes.length === 1) {
          await gate;
          return route.fulfill({ status: 503, json: { error: 'Dependency unavailable' } });
        }
        return route.continue();
      });
      await page.route(`**/api/projects/${slug}/dependencies/${other}`, async (route) => {
        if (route.request().method() !== 'DELETE') return route.continue();
        deletes++;
        if (deletes === 1)
          return route.fulfill({ status: 503, json: { error: 'Removal unavailable' } });
        return route.continue();
      });
      try {
        await page.goto(`/projects/${slug}`);
        const form = page.getByRole('form', { name: labels.projectDependencies.form, exact: true });
        const section = form.locator('..');
        const project = form.getByLabel(labels.projectDependencies.project, { exact: true });
        const kind = form.getByLabel(labels.projectDependencies.kind, { exact: true });
        const add = form.getByRole('button', { name: labels.projectDependencies.add, exact: true });
        await project.selectOption(other);
        await add.click();
        await expect(project).toBeDisabled();
        await expect(add).toBeDisabled();
        await expect(section.getByRole('status')).toContainText(labels.dependencySave.adding);
        await form.evaluate((node) => (node as HTMLFormElement).requestSubmit());
        expect(writes).toHaveLength(1);
        release();
        const retry = section.getByRole('button', {
          name: labels.dependencySave.retry,
          exact: true,
        });
        await expect(retry).toBeFocused();
        await expect(project).toHaveValue(other);
        expect(await contrastFailures(page)).toEqual([]);
        await page.screenshot({ path: testInfo.outputPath('dependency-failure.png') });
        await kind.selectOption('related');
        await expect(section.getByRole('alert')).toHaveCount(0);
        await add.click();
        await expect(section.getByRole('status')).toContainText(labels.dependencySave.added);
        expect(writes).toEqual([
          { projectSlug: other, kind: 'blocks' },
          { projectSlug: other, kind: 'related' },
        ]);
        const remove = page.getByRole('button', {
          name: labels.projectDependencies.remove.replace('{{project}}', longName),
          exact: true,
        });
        await remove.click();
        await expect(retry).toBeFocused();
        await expect(section.getByRole('alert')).toContainText('Removal unavailable');
        await expect(
          page.getByRole('list', { name: labels.projectDependencies.list, exact: true }),
        ).toContainText(longName);
        await retry.click();
        await expect(section.getByRole('status')).toContainText(labels.dependencySave.removed);
        expect(deletes).toBe(2);
        await expect(project).toBeFocused();
        expect(
          (await (await request.get(`/api/projects/${slug}`)).json()).dependencies ?? [],
        ).toHaveLength(0);
      } finally {
        release();
        await request.delete(`/api/projects/${slug}`);
        await request.delete(`/api/projects/${other}`);
      }
    });
  }
}

for (const action of ['add', 'remove'] as const) {
  test(`confirmed dependency ${action} retries only refresh`, async ({ page, request }) => {
    const slug = `dependency-refresh-${action}-${Date.now()}`;
    const other = `${slug}-other`;
    expect(
      (await request.post('/api/projects', { data: { slug: other, name: other } })).ok(),
    ).toBeTruthy();
    expect(
      (
        await request.post('/api/projects', {
          data: {
            slug,
            name: slug,
            ...(action === 'remove'
              ? { dependencies: [{ projectSlug: other, kind: 'blocks' }] }
              : {}),
          },
        })
      ).ok(),
    ).toBeTruthy();
    let writes = 0;
    let failRefresh = false;
    const path = `/api/projects/${slug}/dependencies${action === 'remove' ? `/${other}` : ''}`;
    await page.route(`**${path}`, async (route) => {
      if (route.request().method() !== (action === 'add' ? 'POST' : 'DELETE'))
        return route.continue();
      writes++;
      const response = await route.fetch();
      failRefresh = true;
      return route.fulfill({ response });
    });
    await page.route(`**/api/projects/${slug}`, async (route) => {
      if (route.request().method() === 'GET' && failRefresh) {
        failRefresh = false;
        return route.fulfill({ status: 503, json: { error: 'Refresh unavailable' } });
      }
      return route.continue();
    });
    try {
      await page.goto(`/projects/${slug}`);
      const form = page.getByRole('form', { name: en.projectDependencies.form, exact: true });
      const section = form.locator('..');
      if (action === 'add') {
        await form.getByLabel(en.projectDependencies.project, { exact: true }).selectOption(other);
        await form.getByRole('button', { name: en.projectDependencies.add, exact: true }).click();
      } else
        await page
          .getByRole('button', {
            name: en.projectDependencies.remove.replace('{{project}}', other),
            exact: true,
          })
          .click();
      const retry = section.getByRole('button', {
        name: en.dependencySave.retryRefresh,
        exact: true,
      });
      await expect(retry).toBeFocused();
      await expect(section.getByRole('alert')).toContainText(en.dependencySave.refreshFailed);
      await expect(form.getByLabel(en.projectDependencies.kind, { exact: true })).toBeDisabled();
      const list = page.getByRole('list', { name: en.projectDependencies.list, exact: true });
      if (action === 'add') await expect(list).toContainText(other);
      else await expect(list).toHaveCount(0);
      await retry.click();
      await expect(section.getByRole('status')).toContainText(
        action === 'add' ? en.dependencySave.added : en.dependencySave.removed,
      );
      expect(writes).toBe(1);
      expect(
        (await (await request.get(`/api/projects/${slug}`)).json()).dependencies ?? [],
      ).toHaveLength(action === 'add' ? 1 : 0);
    } finally {
      await request.delete(`/api/projects/${slug}`);
      await request.delete(`/api/projects/${other}`);
    }
  });
}

test('changing removal targets after failure removes only the newly selected dependency', async ({
  page,
  request,
}) => {
  const slug = `dependency-target-${Date.now()}`;
  const first = `${slug}-first`;
  const second = `${slug}-second`;
  for (const key of [first, second])
    expect(
      (await request.post('/api/projects', { data: { slug: key, name: key } })).ok(),
    ).toBeTruthy();
  expect(
    (
      await request.post('/api/projects', {
        data: {
          slug,
          name: slug,
          dependencies: [
            { projectSlug: first, kind: 'related' },
            { projectSlug: second, kind: 'related' },
          ],
        },
      })
    ).ok(),
  ).toBeTruthy();
  const deletes: string[] = [];
  await page.route(`**/api/projects/${slug}/dependencies/*`, async (route) => {
    if (route.request().method() !== 'DELETE') return route.continue();
    deletes.push(route.request().url());
    if (deletes.length === 1)
      return route.fulfill({ status: 503, json: { error: 'First remove unavailable' } });
    return route.continue();
  });
  try {
    await page.goto(`/projects/${slug}`);
    await page
      .getByRole('button', {
        name: en.projectDependencies.remove.replace('{{project}}', first),
        exact: true,
      })
      .click();
    await expect(page.getByRole('alert')).toContainText('First remove unavailable');
    await page
      .getByRole('button', {
        name: en.projectDependencies.remove.replace('{{project}}', second),
        exact: true,
      })
      .click();
    await expect(
      page.getByRole('status').filter({ hasText: en.dependencySave.removed }),
    ).toBeVisible();
    expect(deletes.map((value) => value.split('/').pop())).toEqual([first, second]);
    expect((await (await request.get(`/api/projects/${slug}`)).json()).dependencies).toEqual([
      { projectSlug: first, kind: 'related' },
    ]);
  } finally {
    for (const key of [slug, first, second]) await request.delete(`/api/projects/${key}`);
  }
});

for (const outcome of ['success', 'failure'] as const) {
  test(`late dependency write ${outcome} preserves the next project's selection and focus`, async ({
    page,
    request,
  }) => {
    const slug = `dependency-scope-${outcome}-${Date.now()}`;
    const next = `${slug}-next`;
    const target = `${slug}-target`;
    for (const key of [next, target])
      expect(
        (await request.post('/api/projects', { data: { slug: key, name: key } })).ok(),
      ).toBeTruthy();
    expect(
      (
        await request.post('/api/projects', {
          data: { slug, name: slug, dependencies: [{ projectSlug: next, kind: 'related' }] },
        })
      ).ok(),
    ).toBeTruthy();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(`**/api/projects/${slug}/dependencies`, async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      await gate;
      if (outcome === 'failure')
        return route.fulfill({ status: 503, json: { error: 'Old dependency unavailable' } });
      return route.continue();
    });
    try {
      await page.goto(`/projects/${slug}`);
      const form = page.getByRole('form', { name: en.projectDependencies.form, exact: true });
      const selection = form.getByLabel(en.projectDependencies.project, { exact: true });
      await selection.selectOption(target);
      await form.getByRole('button', { name: en.projectDependencies.add, exact: true }).click();
      await expect(selection).toBeDisabled();
      await page.getByRole('link', { name: next, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/projects/${next}$`));
      await selection.selectOption(target);
      await selection.focus();
      const response = page.waitForResponse(
        (response) =>
          response.url().endsWith(`/api/projects/${slug}/dependencies`) &&
          response.request().method() === 'POST',
      );
      release();
      await response;
      await page.evaluate(
        async () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      await expect(selection).toHaveValue(target);
      await expect(selection).toBeFocused();
      await expect(form.locator('..').getByRole('alert')).toHaveCount(0);
      await form.getByRole('button', { name: en.projectDependencies.add, exact: true }).click();
      await expect(form.locator('..').getByRole('status')).toContainText(en.dependencySave.added);
      expect(
        (await (await request.get(`/api/projects/${next}`)).json()).dependencies,
      ).toContainEqual({ projectSlug: target, kind: 'blocks' });
    } finally {
      release();
      for (const key of [slug, next, target]) await request.delete(`/api/projects/${key}`);
    }
  });
}
