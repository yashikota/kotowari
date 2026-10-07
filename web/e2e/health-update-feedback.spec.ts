import { expect, test } from '@playwright/test';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import ja from '../src/i18n/locales/ja.json' with { type: 'json' };
import { contrastFailures } from './contrast.ts';

const fixtures: { entity: string; slug: string }[] = [];
test.afterEach(async ({ request }) => {
  for (const fixture of fixtures.splice(0).reverse())
    await request.delete(`/api/${fixture.entity}/${fixture.slug}`);
});

for (const outcome of ['success', 'failure']) {
  test(`pending project posting navigation handles ${outcome} with one active dialog`, async ({
    page,
    request,
  }) => {
    const slug = `pending-update-${outcome}-${Date.now()}`;
    const previous = `${slug}-previous`;
    fixtures.push({ entity: 'projects', slug }, { entity: 'projects', slug: previous });
    expect((await request.post('/api/projects', { data: { slug, name: slug } })).ok()).toBeTruthy();
    expect(
      (
        await request.post('/api/projects', {
          data: {
            slug: previous,
            name: previous,
            dependencies: [{ projectSlug: slug, kind: 'related' }],
          },
        })
      ).ok(),
    ).toBeTruthy();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let writes = 0;
    await page.route(`**/api/projects/${slug}/updates`, async (route) => {
      writes++;
      if (writes === 1) {
        await gate;
        if (outcome === 'failure')
          return route.fulfill({ status: 503, json: { error: 'Pending post unavailable' } });
      }
      await route.continue();
    });
    try {
      await page.goto(`/projects/${previous}`);
      await page.getByRole('link', { name: slug, exact: true }).click();
      await expect(page.getByRole('heading').filter({ hasText: slug })).toBeVisible();
      await page
        .getByRole('button', { name: en.projectUpdates.postButton, exact: true })
        .first()
        .click();
      const composer = page.getByRole('dialog', { name: en.projectUpdates.modalTitle });
      await composer
        .getByRole('textbox', { name: 'Update', exact: true })
        .fill('Pending navigation update');
      await composer
        .getByRole('button', { name: en.projectUpdates.postButton, exact: true })
        .click();
      await expect.poll(() => writes).toBe(1);
      await page.evaluate(() => history.back());
      const navigation = page.getByRole('dialog', { name: en.unsavedProject.title });
      await expect(navigation).toBeVisible();
      await expect(page.getByRole('dialog')).toHaveCount(1);
      await expect(
        navigation.getByRole('button', { name: en.unsavedProject.save, exact: true }),
      ).toBeDisabled();
      await expect(
        navigation.getByRole('button', { name: en.unsavedProject.discard, exact: true }),
      ).toBeDisabled();
      await expect(navigation.getByRole('status')).toContainText(en.healthUpdate.posting);
      release();
      if (outcome === 'failure') {
        await expect(navigation.getByRole('alert')).toContainText('Pending post unavailable');
        await navigation.getByRole('button', { name: en.unsavedProject.stay, exact: true }).click();
        const retry = composer.getByRole('button', { name: en.healthUpdate.retry, exact: true });
        await expect(retry).toBeFocused();
        await expect(composer.getByRole('textbox', { name: 'Update', exact: true })).toHaveValue(
          'Pending navigation update',
        );
        await retry.click();
        await expect(composer).toBeHidden();
        await expect(page).toHaveURL(new RegExp(`/projects/${slug}$`));
        expect(writes).toBe(2);
      } else {
        await expect(page).toHaveURL(new RegExp(`/projects/${previous}$`));
        await expect(page.getByRole('heading').filter({ hasText: previous })).toBeVisible();
        await page
          .getByRole('button', { name: en.projectUpdates.postButton, exact: true })
          .first()
          .click();
        const body = composer.getByRole('textbox', { name: 'Update', exact: true });
        await expect(body).toHaveValue('');
        await body.fill('Independent next-project draft');
        await expect(body).toBeFocused();
        await expect(composer.getByRole('alert')).toHaveCount(0);
        expect(writes).toBe(1);
      }
    } finally {
      release();
    }
  });
}

for (const scheme of ['light', 'dark']) {
  test(`project update drafts participate in navigation recovery in ${scheme}`, async ({
    page,
    request,
  }) => {
    await page.addInitScript(
      (value) => localStorage.setItem('kotowari.color-scheme', value),
      scheme,
    );
    const slug = `update-navigation-${scheme}-${Date.now()}`;
    const next = `${slug}-next`;
    fixtures.push({ entity: 'projects', slug: next }, { entity: 'projects', slug });
    expect(
      (await request.post('/api/projects', { data: { slug: next, name: next } })).ok(),
    ).toBeTruthy();
    expect(
      (
        await request.post('/api/projects', {
          data: { slug, name: slug, dependencies: [{ projectSlug: next, kind: 'related' }] },
        })
      ).ok(),
    ).toBeTruthy();
    let writes = 0;
    await page.route(`**/api/projects/${slug}/updates`, async (route) => {
      writes++;
      if (writes === 1)
        return route.fulfill({
          status: 503,
          json: { error: 'Update unavailable during navigation' },
        });
      await route.continue();
    });
    await page.goto(`/projects/${slug}`);
    const composer = page.getByRole('dialog', { name: en.projectUpdates.modalTitle });
    const open = page
      .getByRole('button', { name: en.projectUpdates.postButton, exact: true })
      .first();
    await open.click();
    await composer
      .getByRole('textbox', { name: 'Update', exact: true })
      .fill('Retain this draft before leaving');
    await composer.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('link', { name: next, exact: true }).click();
    const navigation = page.getByRole('dialog', { name: en.unsavedProject.title });
    await expect(navigation).toBeVisible();
    await navigation.getByRole('button', { name: en.unsavedProject.stay, exact: true }).click();
    await open.click();
    await expect(composer.getByRole('textbox', { name: 'Update', exact: true })).toHaveValue(
      'Retain this draft before leaving',
    );
    await composer.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('link', { name: next, exact: true }).click();
    await navigation.getByRole('button', { name: en.unsavedProject.save, exact: true }).click();
    await expect(navigation.getByRole('alert')).toContainText(en.healthUpdate.failed);
    const retry = navigation.getByRole('alert').getByRole('button');
    await expect(retry).toBeFocused();
    await retry.click();
    await expect(page).toHaveURL(new RegExp(`/projects/${next}$`));
    expect(writes).toBe(2);
    const activities = await (await request.get(`/api/projects/${slug}/activities`)).json();
    expect(
      activities.filter(
        (activity: { action: string }) => activity.action === 'status_update_posted',
      ),
    ).toHaveLength(1);
  });
}

for (const entity of ['projects', 'initiatives'] as const) {
  for (const scheme of ['light', 'dark']) {
    const locale = scheme === 'light' ? en : ja;
    const labels = entity === 'projects' ? locale.projectUpdates : locale.initiativeUpdates;
    const healthLabel =
      entity === 'projects'
        ? locale.projectHealth.status.at_risk
        : locale.initiativeList.healthValue.at_risk;
    test(`${entity} retains canceled drafts and recovers failed posting in ${scheme}`, async ({
      page,
      request,
    }, testInfo) => {
      await page.setViewportSize({ width: 360, height: 900 });
      await page.route('**/api/workspace', async (route) => {
        const response = await route.fetch();
        return route.fulfill({
          json: { ...(await response.json()), locale: scheme === 'light' ? 'en' : 'ja' },
        });
      });
      await page.addInitScript(
        ({ scheme, language }) => {
          localStorage.setItem('kotowari.color-scheme', scheme);
          localStorage.setItem('kotowari.language', language);
          localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
        },
        { scheme, language: scheme === 'light' ? 'en' : 'ja' },
      );
      const slug = `health-${entity}-${scheme}-${Date.now()}`;
      fixtures.push({ entity, slug });
      const response = await request.post(`/api/${entity}`, { data: { name: slug, slug } });
      expect(response.ok()).toBeTruthy();
      let writes = 0;
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route(`**/api/${entity}/${slug}/updates`, async (route) => {
        writes++;
        if (writes === 1) {
          await gate;
          await route.fulfill({ status: 503, json: { error: 'Posting temporarily unavailable' } });
        } else await route.continue();
      });
      try {
        await page.goto(`/${entity}/${slug}`);
        const open = page.getByRole('button', { name: labels.postButton, exact: true }).first();
        await open.click();
        const dialog = page.getByRole('dialog', { name: labels.modalTitle });
        const body = dialog.getByRole('textbox', { name: labels.body, exact: true });
        const health = dialog.getByRole('combobox', { name: labels.health, exact: true });
        await health.click();
        await page
          .getByRole('listbox')
          .getByRole('option', { name: healthLabel, exact: true })
          .click();
        await dialog.getByRole('button', { name: locale.common.cancel, exact: true }).click();
        await open.click();
        await expect(health).toHaveValue(healthLabel);
        await body.fill('Keep this update draft');
        await dialog.getByRole('button', { name: locale.common.cancel, exact: true }).click();
        await open.click();
        await expect(body).toHaveValue('Keep this update draft');
        await expect(health).toHaveValue(healthLabel);
        await dialog.getByRole('button', { name: labels.postButton, exact: true }).click();
        await expect.poll(() => writes).toBe(1);
        await expect(body).toHaveAttribute('readonly', '');
        await expect(health).toHaveAttribute('readonly', '');
        await expect(
          dialog.getByRole('button', { name: locale.common.cancel, exact: true }),
        ).toBeDisabled();
        await dialog
          .locator('form')
          .evaluate((form) =>
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
          );
        await page.keyboard.press('Escape');
        await expect(dialog).toBeVisible();
        expect(writes).toBe(1);
        release();
        const retry = dialog.getByRole('button', { name: locale.healthUpdate.retry, exact: true });
        await expect(retry).toBeFocused();
        await expect(body).toHaveValue('Keep this update draft');
        expect(await contrastFailures(page, '[role="dialog"]')).toEqual([]);
        await page.screenshot({ path: testInfo.outputPath('health-update-failure.png') });
        await body.fill('Revised update after failure');
        await expect(retry).toBeHidden();
        await dialog.getByRole('button', { name: labels.postButton, exact: true }).click();
        await expect(dialog).toBeHidden();
        expect(writes).toBe(2);
        await expect(
          page.getByRole('status').filter({ hasText: locale.healthUpdate.posted }),
        ).toBeVisible();
        const activities = await (await request.get(`/api/${entity}/${slug}/activities`)).json();
        const posts = activities.filter(
          (activity: { action: string }) => activity.action === 'status_update_posted',
        );
        expect(posts).toHaveLength(1);
        expect(posts[0].payload).toEqual({
          health: 'at_risk',
          body: 'Revised update after failure',
        });
      } finally {
        release();
      }
    });

    test(`${entity} retries confirmed refresh without a duplicate post in ${scheme}`, async ({
      page,
      request,
    }, testInfo) => {
      await page.addInitScript(
        (value) => localStorage.setItem('kotowari.color-scheme', value),
        scheme,
      );
      const slug = `posted-${entity}-${scheme}-${Date.now()}`;
      fixtures.push({ entity, slug });
      expect(
        (await request.post(`/api/${entity}`, { data: { name: slug, slug } })).ok(),
      ).toBeTruthy();
      let writes = 0;
      let refreshes = 0;
      await page.route(`**/api/${entity}/${slug}/updates`, async (route) => {
        writes++;
        await route.continue();
      });
      await page.route(`**/api/${entity}/${slug}/activities`, async (route) => {
        if (writes && ++refreshes === 1)
          return route.fulfill({ status: 503, json: { error: 'Activity refresh unavailable' } });
        await route.continue();
      });
      await page.goto(`/${entity}/${slug}`);
      const draftDescription = page.getByRole('textbox', {
        name: en.initiatives.description,
        exact: true,
      });
      if (entity === 'initiatives')
        await draftDescription.fill('Independent unsaved initiative description');
      const open = page
        .getByRole('button', { name: en.projectUpdates.postButton, exact: true })
        .first();
      await open.click();
      const dialog = page.getByRole('dialog');
      const body = dialog.getByRole('textbox', { name: 'Update', exact: true });
      await body.fill('Already posted update');
      await dialog.getByRole('button', { name: 'Post update', exact: true }).click();
      const retry = dialog.getByRole('button', { name: en.healthUpdate.retryRefresh, exact: true });
      await expect(retry).toBeFocused();
      await expect(dialog.getByRole('status')).toHaveText(en.healthUpdate.posted);
      await expect(body).toHaveAttribute('readonly', '');
      await dialog.getByRole('button', { name: en.ui.close, exact: true }).click();
      await open.click();
      await expect(retry).toBeFocused();
      expect(await contrastFailures(page, '[role="dialog"]')).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath('health-update-refresh-failure.png') });
      await retry.click();
      await expect(dialog).toBeHidden();
      await expect(page.getByText('Already posted update', { exact: true })).toBeVisible();
      if (entity === 'initiatives')
        await expect(draftDescription).toHaveValue('Independent unsaved initiative description');
      expect(writes).toBe(1);
      expect(refreshes).toBe(2);
      const activities = await (await request.get(`/api/${entity}/${slug}/activities`)).json();
      expect(
        activities.filter(
          (activity: { action: string }) => activity.action === 'status_update_posted',
        ),
      ).toHaveLength(1);
    });
  }
}
