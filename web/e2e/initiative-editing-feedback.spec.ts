import { expect, test } from '@playwright/test';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import ja from '../src/i18n/locales/ja.json' with { type: 'json' };
import { contrastFailures } from './contrast.ts';

const fixtures: string[] = [];
test.afterEach(async ({ request }) => {
  for (const slug of fixtures.splice(0)) await request.delete(`/api/initiatives/${slug}`);
});

for (const scheme of ['light', 'dark']) {
  for (const language of ['en', 'ja']) {
    const labels = language === 'en' ? en : ja;
    test(`initiative edits retain fields and retry the latest patch in ${language}/${scheme}`, async ({
      page,
      request,
    }, testInfo) => {
      await page.route('**/api/workspace', async (route) => {
        const response = await route.fetch();
        return route.fulfill({ json: { ...(await response.json()), locale: language } });
      });
      await page.addInitScript((color) => {
        localStorage.setItem('kotowari.color-scheme', color);
        localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
      }, scheme);
      await page.setViewportSize({ width: 360, height: 900 });
      const slug = `initiative-edit-${language}-${scheme}-${Date.now()}`;
      fixtures.push(slug);
      expect(
        (await request.post('/api/initiatives', { data: { slug, name: slug } })).ok(),
      ).toBeTruthy();
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const patches: unknown[] = [];
      await page.route(`**/api/initiatives/${slug}`, async (route) => {
        if (route.request().method() !== 'PATCH') return route.continue();
        patches.push(route.request().postDataJSON());
        if (patches.length === 1) {
          await gate;
          return route.fulfill({ status: 503, json: { error: 'Initiative saving unavailable' } });
        }
        await route.continue();
      });
      try {
        await page.goto(`/initiatives/${slug}`);
        const name = page.getByRole('textbox', { name: labels.initiatives.name, exact: true });
        const description = page.getByRole('textbox', {
          name: labels.initiatives.description,
          exact: true,
        });
        const date = page.getByLabel(labels.initiatives.targetDate, { exact: true });
        await name.fill('Revised initiative');
        await description.fill('Keep this purpose while saving');
        await date.fill('2026-11-08');
        await page.getByRole('button', { name: labels.initiatives.save, exact: true }).click();
        await expect.poll(() => patches.length).toBe(1);
        await expect(description).toHaveAttribute('readonly', '');
        await page
          .locator('form')
          .evaluate((form) =>
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
          );
        expect(patches).toHaveLength(1);
        release();
        const retry = page.getByRole('button', { name: labels.initiativeSave.retry, exact: true });
        await expect(retry).toBeFocused();
        await expect(description).toHaveValue('Keep this purpose while saving');
        await expect(name).toHaveValue('Revised initiative');
        await retry.scrollIntoViewIfNeeded();
        expect(await contrastFailures(page, 'form')).toEqual([]);
        await page.screenshot({ path: testInfo.outputPath('initiative-save-failure.png') });
        await description.fill('Revised purpose after failure');
        await expect(retry).toBeHidden();
        await page.getByRole('button', { name: labels.initiatives.save, exact: true }).click();
        await expect(
          page.getByRole('status').filter({ hasText: labels.initiativeSave.saved }),
        ).toBeVisible();
        expect(patches).toHaveLength(2);
        expect(patches[1]).toEqual({
          name: 'Revised initiative',
          description: 'Revised purpose after failure',
          targetDate: '2026-11-08',
        });
        const canonical = await (await request.get(`/api/initiatives/${slug}`)).json();
        expect(canonical).toMatchObject(patches[1] as object);
      } finally {
        release();
      }
    });
  }

  test(`initiative confirmed save retries only refresh through navigation in ${scheme}`, async ({
    page,
    request,
  }, testInfo) => {
    await page.addInitScript(
      (color) => localStorage.setItem('kotowari.color-scheme', color),
      scheme,
    );
    const slug = `initiative-saved-${scheme}-${Date.now()}`;
    fixtures.push(slug);
    expect(
      (await request.post('/api/initiatives', { data: { slug, name: slug } })).ok(),
    ).toBeTruthy();
    let writes = 0;
    let reads = 0;
    await page.route(`**/api/initiatives/${slug}`, async (route) => {
      if (route.request().method() === 'PATCH') {
        writes++;
        return route.continue();
      }
      if (writes && ++reads === 1)
        return route.fulfill({
          status: 503,
          json: { error: 'Confirmed save refresh unavailable' },
        });
      await route.continue();
    });
    await page.goto(`/initiatives/${slug}`);
    const description = page.getByRole('textbox', { name: 'Description', exact: true });
    await description.fill('Confirmed initiative purpose');
    await page.getByRole('button', { name: en.initiatives.save, exact: true }).click();
    await expect(
      page.getByRole('button', { name: en.initiativeSave.retryRefresh, exact: true }),
    ).toBeFocused();
    await expect(description).toHaveAttribute('readonly', '');
    await page.getByRole('button', { name: en.nav.initiatives, exact: true }).click();
    const navigation = page.getByRole('dialog', { name: en.unsavedInitiative.title });
    await expect(navigation.getByRole('alert')).toContainText(en.initiativeSave.refreshFailed);
    expect(await contrastFailures(page, '[role="dialog"]')).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath('initiative-navigation-refresh-failure.png'),
    });
    await navigation.getByRole('button', { name: en.unsavedInitiative.save, exact: true }).click();
    await expect(page).toHaveURL('/initiatives');
    expect(writes).toBe(1);
    expect(reads).toBe(2);
  });

  test(`initiative navigation preserves independent property and update drafts in ${scheme}`, async ({
    page,
    request,
  }) => {
    await page.addInitScript(
      (color) => localStorage.setItem('kotowari.color-scheme', color),
      scheme,
    );
    const slug = `initiative-nav-${scheme}-${Date.now()}`;
    fixtures.push(slug);
    expect(
      (await request.post('/api/initiatives', { data: { slug, name: slug } })).ok(),
    ).toBeTruthy();
    await page.goto(`/initiatives/${slug}`);
    const description = page.getByRole('textbox', { name: 'Description', exact: true });
    await description.fill('Independent purpose draft');
    await page.getByRole('button', { name: en.initiatives.favoriteAdd, exact: true }).click();
    await expect(
      page.getByRole('button', { name: en.initiatives.favoriteRemove, exact: true }),
    ).toBeVisible();
    await expect(description).toHaveValue('Independent purpose draft');
    await page
      .getByRole('button', { name: en.initiativeUpdates.postButton, exact: true })
      .first()
      .click();
    const composer = page.getByRole('dialog', { name: en.initiativeUpdates.modalTitle });
    await composer
      .getByRole('textbox', { name: 'Update', exact: true })
      .fill('Independent update draft');
    await composer.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('button', { name: en.nav.initiatives, exact: true }).click();
    const navigation = page.getByRole('dialog', { name: en.unsavedInitiative.title });
    await navigation.getByRole('button', { name: en.unsavedInitiative.stay, exact: true }).click();
    await expect(description).toHaveValue('Independent purpose draft');
    await page
      .getByRole('button', { name: en.initiativeUpdates.postButton, exact: true })
      .first()
      .click();
    await expect(composer.getByRole('textbox', { name: 'Update', exact: true })).toHaveValue(
      'Independent update draft',
    );
    await composer.getByRole('button', { name: 'Cancel', exact: true }).click();
    const order: string[] = [];
    await page.route(`**/api/initiatives/${slug}`, async (route) => {
      if (route.request().method() === 'PATCH') order.push('properties');
      await route.continue();
    });
    await page.route(`**/api/initiatives/${slug}/updates`, async (route) => {
      order.push('update');
      await route.continue();
    });
    await page.getByRole('button', { name: en.nav.initiatives, exact: true }).click();
    await navigation.getByRole('button', { name: en.unsavedInitiative.save, exact: true }).click();
    await expect(page).toHaveURL('/initiatives');
    expect(order).toEqual(['properties', 'update']);
    const canonical = await (await request.get(`/api/initiatives/${slug}`)).json();
    expect(canonical.description).toBe('Independent purpose draft');
    const activities = await (await request.get(`/api/initiatives/${slug}/activities`)).json();
    expect(
      activities.filter(
        (activity: { action: string }) => activity.action === 'status_update_posted',
      ),
    ).toHaveLength(1);
  });
}

for (const entity of ['initiatives', 'projects']) {
  test(`${entity} health-only drafts explain required update text when saving navigation`, async ({
    page,
    request,
  }) => {
    const slug = `health-required-${entity}-${Date.now()}`;
    if (entity === 'initiatives') fixtures.push(slug);
    expect(
      (await request.post(`/api/${entity}`, { data: { slug, name: slug } })).ok(),
    ).toBeTruthy();
    try {
      await page.goto(`/${entity}/${slug}`);
      await page.getByRole('button', { name: 'Post update', exact: true }).first().click();
      const composer = page.getByRole('dialog');
      await composer.getByRole('combobox').click();
      await page.getByRole('listbox').getByRole('option', { name: 'At risk', exact: true }).click();
      await composer.getByRole('button', { name: 'Cancel', exact: true }).click();
      if (entity === 'initiatives')
        await page.getByRole('button', { name: en.nav.initiatives, exact: true }).click();
      else {
        const opener = page.getByRole('button', { name: 'Open navigation', exact: true });
        if (await opener.isVisible()) await opener.click();
        await page.getByRole('link', { name: 'Projects', exact: true }).first().click();
      }
      const title = entity === 'initiatives' ? en.unsavedInitiative : en.unsavedProject;
      const navigation = page.getByRole('dialog', { name: title.title });
      await navigation.getByRole('button', { name: title.save, exact: true }).click();
      await expect(navigation.getByRole('alert')).toContainText(en.healthUpdate.bodyRequired);
      await expect(
        navigation.getByRole('button', { name: title.discard, exact: true }),
      ).toBeEnabled();
      await navigation.getByRole('button', { name: title.stay, exact: true }).click();
      await page.getByRole('button', { name: 'Post update', exact: true }).first().click();
      await expect(composer.getByRole('textbox', { name: 'Update', exact: true })).toBeFocused();
      await composer
        .getByRole('textbox', { name: 'Update', exact: true })
        .fill('Required content completed');
      await composer.getByRole('button', { name: 'Post update', exact: true }).click();
      await expect(composer).toBeHidden();
    } finally {
      if (entity === 'projects') await request.delete(`/api/projects/${slug}`);
    }
  });
}
