import { expect, test } from '@playwright/test';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import ja from '../src/i18n/locales/ja.json' with { type: 'json' };
import { contrastFailures } from './contrast.ts';

for (const scheme of ['light', 'dark']) {
  for (const [locale, labels] of [
    ['en', en],
    ['ja', ja],
  ] as const) {
    test(`new milestone draft survives navigation and save retry in ${locale}/${scheme}`, async ({
      page,
      request,
    }, testInfo) => {
      const slug = `creation-nav-${locale}-${scheme}-${Date.now()}`;
      const other = `${slug}-next`;
      expect(
        (await request.post('/api/projects', { data: { slug: other, name: other } })).ok(),
      ).toBeTruthy();
      expect(
        (
          await request.post('/api/projects', {
            data: { slug, name: slug, dependencies: [{ projectSlug: other, kind: 'related' }] },
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
      let writes = 0;
      await page.route(`**/api/projects/${slug}/milestones`, async (route) => {
        if (route.request().method() !== 'POST') return route.continue();
        writes++;
        if (writes === 1)
          return route.fulfill({ status: 503, json: { error: 'Create unavailable' } });
        return route.continue();
      });
      try {
        await page.goto(`/projects/${slug}`);
        const form = page.getByRole('form', {
          name: labels.projectMilestones.heading,
          exact: true,
        });
        const name = form.getByRole('textbox', {
          name: labels.projectMilestones.name,
          exact: true,
        });
        const description = form.getByRole('textbox', {
          name: labels.projectMilestones.description,
          exact: true,
        });
        await description.fill('Description without a name');
        await page.getByRole('link', { name: other, exact: true }).click();
        const dialog = page.getByRole('dialog', { name: labels.unsavedProject.title, exact: true });
        const save = dialog.getByRole('button', { name: labels.unsavedProject.save, exact: true });
        await expect(
          dialog.getByRole('button', { name: labels.unsavedProject.stay, exact: true }),
        ).toBeFocused();
        await save.click();
        await expect(dialog.getByRole('alert')).toContainText(
          labels.milestoneCreation.nameRequired,
        );
        expect(writes).toBe(0);
        expect(await contrastFailures(page, '[role="dialog"]')).toEqual([]);
        await page.screenshot({ path: testInfo.outputPath('creation-navigation-validation.png') });
        await dialog.getByRole('button', { name: labels.unsavedProject.stay, exact: true }).click();
        await expect(description).toHaveValue('Description without a name');
        await name.fill('Preserved milestone');
        await page.getByRole('link', { name: other, exact: true }).click();
        await save.click();
        await expect(dialog.getByRole('alert')).toContainText('Create unavailable');
        await expect(save).toBeFocused();
        await save.click();
        await expect(page).toHaveURL(new RegExp(`/projects/${other}$`));
        expect(writes).toBe(2);
        const project = await (await request.get(`/api/projects/${slug}`)).json();
        expect(project.milestones).toHaveLength(1);
        expect(project.milestones[0]).toMatchObject({
          name: 'Preserved milestone',
          description: 'Description without a name',
        });
      } finally {
        await request.delete(`/api/projects/${slug}`);
        await request.delete(`/api/projects/${other}`);
      }
    });
  }
}

test('navigation retries a confirmed milestone refresh without creating twice', async ({
  page,
  request,
}) => {
  const slug = `creation-refresh-nav-${Date.now()}`;
  expect((await request.post('/api/projects', { data: { slug, name: slug } })).ok()).toBeTruthy();
  let posts = 0;
  let failRefresh = false;
  await page.route(`**/api/projects/${slug}/milestones`, async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    posts++;
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
    const form = page.getByRole('form', { name: en.projectMilestones.heading, exact: true });
    await form
      .getByRole('textbox', { name: en.projectMilestones.name, exact: true })
      .fill('Created once');
    await form.getByRole('button', { name: en.projectMilestones.add, exact: true }).click();
    await expect(form.getByRole('alert')).toContainText(en.milestoneCreation.refreshFailed);
    await page.getByRole('link', { name: 'Projects', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: en.unsavedProject.title, exact: true });
    await expect(dialog.getByRole('alert')).toContainText(en.milestoneCreation.refreshFailed);
    await dialog.getByRole('button', { name: en.unsavedProject.save, exact: true }).click();
    await expect(page).toHaveURL(/\/projects$/);
    expect(posts).toBe(1);
    expect((await (await request.get(`/api/projects/${slug}`)).json()).milestones).toHaveLength(1);
  } finally {
    await request.delete(`/api/projects/${slug}`);
  }
});

test('date-only creation draft protects reload and can be discarded on navigation', async ({
  page,
  request,
}) => {
  const slug = `creation-date-nav-${Date.now()}`;
  expect((await request.post('/api/projects', { data: { slug, name: slug } })).ok()).toBeTruthy();
  try {
    await page.goto(`/projects/${slug}`);
    const form = page.getByRole('form', { name: en.projectMilestones.heading, exact: true });
    const date = form.getByRole('textbox', { name: en.projectMilestones.targetDate, exact: true });
    await date.fill('2027-01-01');
    const prompt = page.waitForEvent('dialog');
    await page.evaluate(() => {
      setTimeout(() => location.reload(), 0);
    });
    const browserDialog = await prompt;
    expect(browserDialog.type()).toBe('beforeunload');
    await browserDialog.dismiss();
    await expect(date).toHaveValue('2027-01-01');
    await page.getByRole('link', { name: 'Projects', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: en.unsavedProject.title, exact: true });
    await dialog.getByRole('button', { name: en.unsavedProject.discard, exact: true }).click();
    await expect(page).toHaveURL(/\/projects$/);
    expect((await (await request.get(`/api/projects/${slug}`)).json()).milestones).toHaveLength(0);
  } finally {
    await request.delete(`/api/projects/${slug}`);
  }
});
