import { expect, test } from '@playwright/test';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import ja from '../src/i18n/locales/ja.json' with { type: 'json' };
import { contrastFailures } from './contrast.ts';

for (const scheme of ['light', 'dark']) {
  for (const [locale, labels] of [
    ['en', en],
    ['ja', ja],
  ] as const) {
    test(`milestone creation validates and retries in ${locale}/${scheme}`, async ({
      page,
      request,
    }, testInfo) => {
      const slug = `milestone-${locale}-${scheme}-${Date.now()}`;
      expect(
        (await request.post('/api/projects', { data: { slug, name: slug } })).ok(),
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
      await page.route(`**/api/projects/${slug}/milestones`, async (route) => {
        if (route.request().method() !== 'POST') return route.continue();
        writes.push(route.request().postDataJSON());
        if (writes.length === 1) {
          await gate;
          return route.fulfill({ status: 503, json: { error: 'Milestone unavailable' } });
        }
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
        const date = form.getByLabel(labels.projectMilestones.targetDate, { exact: true });
        const submit = form.getByRole('button', {
          name: labels.projectMilestones.add,
          exact: true,
        });
        await expect(submit).toHaveCSS('min-height', '44px');
        await submit.click();
        await expect(name).toBeFocused();
        await expect(form).toContainText(labels.milestoneCreation.nameRequired);
        expect(writes).toHaveLength(0);
        await name.fill('  First milestone  ');
        await description.fill('Retained description');
        await date.fill('2027-02-10');
        await submit.click();
        await expect(form.getByRole('status')).toContainText(labels.milestoneCreation.creating);
        await expect(name).toBeDisabled();
        await expect(submit).toBeDisabled();
        await form.evaluate((element) => (element as HTMLFormElement).requestSubmit());
        expect(writes).toHaveLength(1);
        release();
        const retry = form.getByRole('button', {
          name: labels.milestoneCreation.retry,
          exact: true,
        });
        await expect(retry).toBeFocused();
        await expect(name).toHaveValue('  First milestone  ');
        await expect(description).toHaveValue('Retained description');
        await expect(date).toHaveValue('2027-02-10');
        expect(
          await contrastFailures(
            page,
            `form[aria-label=${JSON.stringify(labels.projectMilestones.heading)}]`,
          ),
        ).toEqual([]);
        await page.screenshot({ path: testInfo.outputPath('milestone-creation-failure.png') });
        await name.fill('Revised milestone');
        await expect(form.getByRole('alert')).toHaveCount(0);
        await submit.click();
        await expect(form.getByRole('status')).toContainText(labels.milestoneCreation.saved);
        await expect(name).toHaveValue('');
        const project = await (await request.get(`/api/projects/${slug}`)).json();
        expect(project.milestones).toHaveLength(1);
        expect(project.milestones[0].name).toBe('Revised milestone');
        expect(writes).toEqual([
          {
            name: 'First milestone',
            description: 'Retained description',
            targetDate: '2027-02-10',
          },
          {
            name: 'Revised milestone',
            description: 'Retained description',
            targetDate: '2027-02-10',
          },
        ]);
      } finally {
        release();
        await request.delete(`/api/projects/${slug}`);
      }
    });
  }
}

test('confirmed milestone creation retries refresh without another POST', async ({
  page,
  request,
}) => {
  const slug = `milestone-refresh-${Date.now()}`;
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
      return route.fulfill({ status: 503, json: { error: 'Project refresh unavailable' } });
    }
    return route.continue();
  });
  try {
    await page.goto(`/projects/${slug}`);
    const form = page.getByRole('form', { name: en.projectMilestones.heading, exact: true });
    await form
      .getByRole('textbox', { name: en.projectMilestones.name, exact: true })
      .fill('Confirmed milestone');
    await form.getByRole('button', { name: en.projectMilestones.add, exact: true }).click();
    await expect(form.getByRole('alert')).toContainText(en.milestoneCreation.refreshFailed);
    const retry = form.getByRole('button', {
      name: en.milestoneCreation.retryRefresh,
      exact: true,
    });
    await expect(retry).toBeFocused();
    await expect(
      form.getByRole('textbox', { name: en.projectMilestones.name, exact: true }),
    ).toBeDisabled();
    expect(posts).toBe(1);
    await retry.click();
    await expect(form.getByRole('status')).toContainText(en.milestoneCreation.saved);
    expect(posts).toBe(1);
    expect((await (await request.get(`/api/projects/${slug}`)).json()).milestones).toHaveLength(1);
  } finally {
    await request.delete(`/api/projects/${slug}`);
  }
});

for (const outcome of ['success', 'failure']) {
  test(`late milestone creation ${outcome} does not affect the next project`, async ({
    page,
    request,
  }) => {
    const slug = `milestone-scope-${Date.now()}`;
    const otherSlug = `${slug}-next`;
    expect(
      (await request.post('/api/projects', { data: { slug: otherSlug, name: otherSlug } })).ok(),
    ).toBeTruthy();
    expect(
      (
        await request.post('/api/projects', {
          data: { slug, name: slug, dependencies: [{ projectSlug: otherSlug, kind: 'related' }] },
        })
      ).ok(),
    ).toBeTruthy();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(`**/api/projects/${slug}/milestones`, async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      await gate;
      if (outcome === 'failure')
        return route.fulfill({ status: 503, json: { error: 'Old milestone unavailable' } });
      return route.continue();
    });
    try {
      await page.goto(`/projects/${slug}`);
      const form = page.getByRole('form', { name: en.projectMilestones.heading, exact: true });
      const name = form.getByRole('textbox', { name: en.projectMilestones.name, exact: true });
      await name.fill('Old project milestone');
      await form.getByRole('button', { name: en.projectMilestones.add, exact: true }).click();
      await expect(name).toBeDisabled();
      await page.getByRole('link', { name: otherSlug, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/projects/${otherSlug}$`));
      await expect(name).toBeEnabled();
      await name.fill('New project draft');
      const response = page.waitForResponse(
        (response) =>
          response.url().endsWith(`/api/projects/${slug}/milestones`) &&
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
      await expect(name).toHaveValue('New project draft');
      await expect(name).toBeFocused();
      await expect(form.getByRole('alert')).toHaveCount(0);
      await expect(form.getByRole('status')).toHaveCount(0);
      await form.getByRole('button', { name: en.projectMilestones.add, exact: true }).click();
      await expect(form.getByRole('status')).toContainText(en.milestoneCreation.saved);
      const other = await (await request.get(`/api/projects/${otherSlug}`)).json();
      expect(other.milestones).toHaveLength(1);
      expect(other.milestones[0].name).toBe('New project draft');
      expect((await (await request.get(`/api/projects/${slug}`)).json()).milestones).toHaveLength(
        outcome === 'success' ? 1 : 0,
      );
    } finally {
      release();
      await request.delete(`/api/projects/${slug}`);
      await request.delete(`/api/projects/${otherSlug}`);
    }
  });
}
