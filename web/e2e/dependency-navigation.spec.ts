import { expect, test } from '@playwright/test';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import ja from '../src/i18n/locales/ja.json' with { type: 'json' };
import { contrastFailures } from './contrast.ts';

for (const scheme of ['light', 'dark']) {
  for (const [locale, labels] of [
    ['en', en],
    ['ja', ja],
  ] as const) {
    test(`project navigation saves milestone and dependency drafts sequentially in ${locale}/${scheme}`, async ({
      page,
      request,
    }, testInfo) => {
      const slug = `dependency-nav-${locale}-${scheme}-${Date.now()}`;
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
      await page.route('**/api/workspace', async (route) => {
        const response = await route.fetch();
        return route.fulfill({ json: { ...(await response.json()), locale } });
      });
      await page.addInitScript((color) => {
        localStorage.setItem('kotowari.color-scheme', color);
        localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
      }, scheme);
      await page.setViewportSize({ width: 360, height: 800 });
      const order: string[] = [];
      let dependencies = 0;
      await page.route(`**/api/projects/${slug}/milestones`, (route) => {
        if (route.request().method() === 'POST') order.push('milestone');
        return route.continue();
      });
      await page.route(`**/api/projects/${slug}/dependencies`, (route) => {
        if (route.request().method() !== 'POST') return route.continue();
        order.push('dependency');
        dependencies++;
        if (dependencies === 1)
          return route.fulfill({ status: 503, json: { error: 'Dependency unavailable' } });
        return route.continue();
      });
      try {
        await page.goto(`/projects/${slug}`);
        const form = page.getByRole('form', { name: labels.projectDependencies.form, exact: true });
        const selected = form.getByLabel(labels.projectDependencies.project, { exact: true });
        const kind = form.getByLabel(labels.projectDependencies.kind, { exact: true });
        await selected.selectOption(target);
        await kind.selectOption('related');
        const prompt = page.waitForEvent('dialog');
        await page.evaluate(() => {
          setTimeout(() => location.reload(), 0);
        });
        const reload = await prompt;
        expect(reload.type()).toBe('beforeunload');
        await reload.dismiss();
        const navigation = page.getByRole('dialog', {
          name: labels.unsavedProject.title,
          exact: true,
        });
        await page.getByRole('link', { name: next, exact: true }).click();
        await navigation
          .getByRole('button', { name: labels.unsavedProject.stay, exact: true })
          .click();
        await expect(selected).toHaveValue(target);
        await expect(kind).toHaveValue('related');
        await page
          .getByRole('form', { name: labels.projectMilestones.heading, exact: true })
          .getByRole('textbox', { name: labels.projectMilestones.name, exact: true })
          .fill('Plan milestone');
        await page.getByRole('link', { name: next, exact: true }).click();
        const save = navigation.getByRole('button', {
          name: labels.unsavedProject.save,
          exact: true,
        });
        await save.click();
        await expect(navigation.getByRole('alert')).toContainText(labels.dependencySave.failed);
        await expect(save).toBeFocused();
        expect(order).toEqual(['milestone', 'dependency']);
        expect(await contrastFailures(page, '[role="dialog"]')).toEqual([]);
        await page.screenshot({ path: testInfo.outputPath('dependency-navigation-failure.png') });
        await save.click();
        await expect(page).toHaveURL(new RegExp(`/projects/${next}$`));
        expect(order).toEqual(['milestone', 'dependency', 'dependency']);
        const project = await (await request.get(`/api/projects/${slug}`)).json();
        expect(project.milestones).toHaveLength(1);
        expect(project.dependencies).toContainEqual({ projectSlug: target, kind: 'related' });
      } finally {
        for (const key of [slug, next, target]) await request.delete(`/api/projects/${key}`);
      }
    });
  }
}

for (const intent of ['discard', 'refresh', 'remove'] as const) {
  test(`dependency navigation handles ${intent} without unintended writes`, async ({
    page,
    request,
  }) => {
    const slug = `dependency-nav-${intent}-${Date.now()}`;
    const target = `${slug}-target`;
    expect(
      (await request.post('/api/projects', { data: { slug: target, name: target } })).ok(),
    ).toBeTruthy();
    expect(
      (
        await request.post('/api/projects', {
          data: {
            slug,
            name: slug,
            ...(intent === 'remove'
              ? { dependencies: [{ projectSlug: target, kind: 'blocks' }] }
              : {}),
          },
        })
      ).ok(),
    ).toBeTruthy();
    let writes = 0;
    let failRefresh = false;
    const path = `/api/projects/${slug}/dependencies${intent === 'remove' ? `/${target}` : ''}`;
    await page.route(`**${path}`, async (route) => {
      if (!['POST', 'DELETE'].includes(route.request().method())) return route.continue();
      writes++;
      if (intent === 'remove' && writes === 1)
        return route.fulfill({ status: 503, json: { error: 'Removal unavailable' } });
      const response = await route.fetch();
      if (intent === 'refresh') failRefresh = true;
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
      if (intent === 'remove') {
        await page
          .getByRole('button', {
            name: en.projectDependencies.remove.replace('{{project}}', target),
            exact: true,
          })
          .click();
        await expect(form.locator('..').getByRole('alert')).toContainText('Removal unavailable');
      } else {
        await form.getByLabel(en.projectDependencies.project, { exact: true }).selectOption(target);
        if (intent === 'refresh') {
          await form.getByRole('button', { name: en.projectDependencies.add, exact: true }).click();
          await expect(form.locator('..').getByRole('alert')).toContainText(
            en.dependencySave.refreshFailed,
          );
        }
      }
      await page.getByRole('link', { name: 'Projects', exact: true }).first().click();
      const dialog = page.getByRole('dialog', { name: en.unsavedProject.title, exact: true });
      if (intent === 'discard')
        await dialog.getByRole('button', { name: en.unsavedProject.discard, exact: true }).click();
      else await dialog.getByRole('button', { name: en.unsavedProject.save, exact: true }).click();
      await expect(page).toHaveURL(/\/projects$/);
      expect(writes).toBe(intent === 'discard' ? 0 : intent === 'refresh' ? 1 : 2);
      const dependencies =
        (await (await request.get(`/api/projects/${slug}`)).json()).dependencies ?? [];
      expect(dependencies).toHaveLength(intent === 'refresh' ? 1 : 0);
    } finally {
      await request.delete(`/api/projects/${slug}`);
      await request.delete(`/api/projects/${target}`);
    }
  });
}

test('staying during sequential saving stops later dependency writes and preserves newer input', async ({
  page,
  request,
}) => {
  const slug = `dependency-stay-${Date.now()}`;
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
  let milestones = 0;
  const dependencies: unknown[] = [];
  await page.route(`**/api/projects/${slug}/milestones`, async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    milestones++;
    await gate;
    return route.continue();
  });
  await page.route(`**/api/projects/${slug}/dependencies`, (route) => {
    if (route.request().method() === 'POST') dependencies.push(route.request().postDataJSON());
    return route.continue();
  });
  try {
    await page.goto(`/projects/${slug}`);
    const form = page.getByRole('form', { name: en.projectDependencies.form, exact: true });
    const project = form.getByLabel(en.projectDependencies.project, { exact: true });
    const kind = form.getByLabel(en.projectDependencies.kind, { exact: true });
    await project.selectOption(target);
    const creation = page.getByRole('form', { name: en.projectMilestones.heading, exact: true });
    await creation
      .getByRole('textbox', { name: en.projectMilestones.name, exact: true })
      .fill('One milestone');
    await page.getByRole('link', { name: next, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: en.unsavedProject.title, exact: true });
    await dialog.getByRole('button', { name: en.unsavedProject.save, exact: true }).click();
    await expect(dialog.getByRole('status')).toContainText(en.milestoneCreation.creating);
    await dialog.getByRole('button', { name: en.unsavedProject.stay, exact: true }).click();
    await kind.selectOption('blocked_by');
    release();
    await expect(creation.getByRole('status')).toContainText(en.milestoneCreation.saved);
    expect(dependencies).toEqual([]);
    await expect(project).toHaveValue(target);
    await expect(kind).toHaveValue('blocked_by');
    await expect(page).toHaveURL(new RegExp(`/projects/${slug}$`));
    await page.getByRole('link', { name: next, exact: true }).click();
    await dialog.getByRole('button', { name: en.unsavedProject.save, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${next}$`));
    expect(milestones).toBe(1);
    expect(dependencies).toEqual([{ projectSlug: target, kind: 'blocked_by' }]);
  } finally {
    release();
    for (const key of [slug, next, target]) await request.delete(`/api/projects/${key}`);
  }
});
