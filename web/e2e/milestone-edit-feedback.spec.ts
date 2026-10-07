import { expect, test } from '@playwright/test';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import ja from '../src/i18n/locales/ja.json' with { type: 'json' };
import { contrastFailures } from './contrast.ts';

for (const scheme of ['light', 'dark']) {
  for (const [locale, labels] of [
    ['en', en],
    ['ja', ja],
  ] as const) {
    test(`milestone row saves retain input and retry in ${locale}/${scheme}`, async ({
      page,
      request,
    }, testInfo) => {
      const slug = `row-${locale}-${scheme}-${Date.now()}`;
      expect(
        (await request.post('/api/projects', { data: { slug, name: slug } })).ok(),
      ).toBeTruthy();
      const first = await (
        await request.post(`/api/projects/${slug}/milestones`, {
          data: { name: 'First', description: 'Original description', targetDate: '2027-02-10' },
        })
      ).json();
      const second = await (
        await request.post(`/api/projects/${slug}/milestones`, { data: { name: 'Second' } })
      ).json();
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
      await page.route(`**/api/projects/${slug}/milestones/${first.id}`, async (route) => {
        if (route.request().method() !== 'PATCH') return route.continue();
        writes.push(route.request().postDataJSON());
        if (writes.length === 1) {
          await gate;
          return route.fulfill({ status: 503, json: { error: 'Milestone save unavailable' } });
        }
        return route.continue();
      });
      try {
        await page.goto(`/projects/${slug}`);
        const row = page.locator(`[data-milestone-id="${first.id}"]`);
        const other = page.locator(`[data-milestone-id="${second.id}"]`);
        const name = row.getByRole('textbox', {
          name: `${labels.projectMilestones.name}: First`,
          exact: true,
        });
        await name.fill('  Retained name  ');
        await name.press('Tab');
        await expect(row.getByRole('status')).toContainText(labels.milestoneSave.saving);
        await expect(name).toHaveAttribute('readonly', '');
        await expect(
          row.getByRole('button', { name: labels.milestoneSave.save, exact: true }),
        ).toBeDisabled();
        await expect(
          other.getByRole('button', {
            name: labels.projectMilestones.remove.replace('{{name}}', 'Second'),
            exact: true,
          }),
        ).toBeDisabled();
        const otherName = other.getByRole('textbox', {
          name: `${labels.projectMilestones.name}: Second`,
          exact: true,
        });
        await expect(otherName).toBeEditable();
        release();
        await expect(row.getByRole('alert')).toContainText('Milestone save unavailable');
        await expect(name).toHaveValue('  Retained name  ');
        const retry = row.getByRole('button', { name: labels.milestoneSave.retry, exact: true });
        await retry.scrollIntoViewIfNeeded();
        expect(await contrastFailures(page, `[data-milestone-id="${first.id}"]`)).toEqual([]);
        await page.screenshot({ path: testInfo.outputPath('milestone-row-failure.png') });
        await retry.click();
        await expect(row.getByRole('status')).toContainText(labels.milestoneSave.saved);
        await expect(
          row.getByRole('textbox', {
            name: `${labels.projectMilestones.name}: Retained name`,
            exact: true,
          }),
        ).toHaveValue('Retained name');
        expect(writes).toEqual([
          { name: 'Retained name', description: 'Original description', targetDate: '2027-02-10' },
          { name: 'Retained name', description: 'Original description', targetDate: '2027-02-10' },
        ]);
        const date = row.getByLabel(`${labels.projectMilestones.targetDate}: Retained name`, {
          exact: true,
        });
        await date.fill('');
        await page.getByRole('heading').filter({ hasText: slug }).click();
        await expect
          .poll(
            async () =>
              (await (await request.get(`/api/projects/${slug}`)).json()).milestones.find(
                (item: { id: number }) => item.id === first.id,
              ).targetDate,
          )
          .toBeNull();
        await expect(row.getByRole('status')).toContainText(labels.milestoneSave.saved);
        const currentName = row.getByRole('textbox', {
          name: `${labels.projectMilestones.name}: Retained name`,
          exact: true,
        });
        await currentName.fill('   ');
        await row.getByRole('button', { name: labels.milestoneSave.save, exact: true }).click();
        await expect(currentName).toBeFocused();
        await expect(row).toContainText(labels.milestoneCreation.nameRequired);
        expect(writes).toHaveLength(3);
        await currentName.fill('Final name');
        await currentName.press('Tab');
        await expect(row.getByRole('status')).toContainText(labels.milestoneSave.saved);
        expect(writes.at(-1)).toEqual({
          name: 'Final name',
          description: 'Original description',
          targetDate: null,
        });
      } finally {
        release();
        await request.delete(`/api/projects/${slug}`);
      }
    });
  }
}

test('failed milestone edits survive project refresh and navigation retry', async ({
  page,
  request,
}) => {
  const slug = `row-navigation-${Date.now()}`;
  const next = `${slug}-next`;
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
  const milestone = await (
    await request.post(`/api/projects/${slug}/milestones`, { data: { name: 'Existing' } })
  ).json();
  let allow = false;
  const writes: unknown[] = [];
  await page.route(`**/api/projects/${slug}/milestones/${milestone.id}`, async (route) => {
    if (route.request().method() !== 'PATCH') return route.continue();
    writes.push(route.request().postDataJSON());
    if (!allow) return route.fulfill({ status: 503, json: { error: 'Milestone unavailable' } });
    return route.continue();
  });
  try {
    await page.goto(`/projects/${slug}`);
    const row = page.locator(`[data-milestone-id="${milestone.id}"]`);
    const description = row.getByRole('textbox', {
      name: `${en.projectMilestones.description}: Existing`,
      exact: true,
    });
    await description.fill('Retained row description');
    await row.getByRole('button', { name: en.milestoneSave.save, exact: true }).click();
    await expect(row.getByRole('alert')).toContainText('Milestone unavailable');
    await page.getByRole('combobox', { name: 'Priority', exact: true }).selectOption('2');
    await expect
      .poll(async () => (await (await request.get(`/api/projects/${slug}`)).json()).priority)
      .toBe(2);
    await expect(description).toHaveValue('Retained row description');
    const form = page.getByRole('form', { name: en.projectMilestones.heading, exact: true });
    await form
      .getByRole('textbox', { name: en.projectMilestones.name, exact: true })
      .fill('Added while dirty');
    await form.getByRole('button', { name: en.projectMilestones.add, exact: true }).click();
    await expect(form.getByRole('status')).toContainText(en.milestoneCreation.saved);
    await expect(description).toHaveValue('Retained row description');
    const link = page.getByRole('link', { name: next, exact: true });
    await link.click();
    const dialog = page.getByRole('dialog', { name: en.unsavedProject.title, exact: true });
    await expect(
      dialog.getByRole('button', { name: en.unsavedProject.stay, exact: true }),
    ).toBeFocused();
    await dialog.getByRole('button', { name: en.unsavedProject.stay, exact: true }).click();
    await expect(description).toHaveValue('Retained row description');
    await link.click();
    const save = dialog.getByRole('button', { name: en.unsavedProject.save, exact: true });
    await save.click();
    await expect(dialog.getByRole('alert')).toContainText('Milestone unavailable');
    await expect(save).toBeEnabled();
    allow = true;
    await save.click();
    await expect(page).toHaveURL(new RegExp(`/projects/${next}$`));
    const stored = await (await request.get(`/api/projects/${slug}`)).json();
    expect(
      stored.milestones.find((item: { id: number }) => item.id === milestone.id).description,
    ).toBe('Retained row description');
    expect(writes.at(-1)).toEqual({
      name: 'Existing',
      description: 'Retained row description',
      targetDate: null,
    });
  } finally {
    await request.delete(`/api/projects/${slug}`);
    await request.delete(`/api/projects/${next}`);
  }
});

for (const delayed of ['property', 'refresh'] as const) {
  test(`an older project ${delayed} response preserves a confirmed milestone edit`, async ({
    page,
    request,
  }) => {
    const slug = `row-overlap-${delayed}-${Date.now()}`;
    expect((await request.post('/api/projects', { data: { slug, name: slug } })).ok()).toBeTruthy();
    const milestone = await (
      await request.post(`/api/projects/${slug}/milestones`, { data: { name: 'Before' } })
    ).json();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let armed = false;
    let captured = false;
    await page.route(`**/api/projects/${slug}`, async (route) => {
      const method = route.request().method();
      if (!armed || (delayed === 'property' ? method !== 'PATCH' : method !== 'GET'))
        return route.continue();
      armed = false;
      const response = await route.fetch();
      captured = true;
      await gate;
      return route.fulfill({ response });
    });
    try {
      await page.goto(`/projects/${slug}`);
      const row = page.locator(`[data-milestone-id="${milestone.id}"]`);
      await expect(row).toBeVisible();
      armed = true;
      if (delayed === 'property') {
        await page.getByRole('combobox', { name: 'Priority', exact: true }).selectOption('2');
      } else {
        const form = page.getByRole('form', { name: en.projectMilestones.heading, exact: true });
        await form
          .getByRole('textbox', { name: en.projectMilestones.name, exact: true })
          .fill('New milestone');
        await form.getByRole('button', { name: en.projectMilestones.add, exact: true }).click();
      }
      await expect.poll(() => captured).toBe(true);
      const name = row.getByRole('textbox', {
        name: `${en.projectMilestones.name}: Before`,
        exact: true,
      });
      await name.fill('Confirmed newer name');
      await name.press('Tab');
      await expect(row.getByRole('status')).toContainText(en.milestoneSave.saved);
      release();
      if (delayed === 'property') {
        await expect(
          page.getByRole('status').filter({ hasText: en.projectSave.saving }),
        ).toHaveCount(0);
      } else {
        await expect(
          page
            .getByRole('form', { name: en.projectMilestones.heading, exact: true })
            .getByRole('status'),
        ).toContainText(en.milestoneCreation.saved);
      }
      await expect(
        row.getByRole('textbox', {
          name: `${en.projectMilestones.name}: Confirmed newer name`,
          exact: true,
        }),
      ).toHaveValue('Confirmed newer name');
      const stored = await (await request.get(`/api/projects/${slug}`)).json();
      expect(stored.milestones.find((item: { id: number }) => item.id === milestone.id).name).toBe(
        'Confirmed newer name',
      );
    } finally {
      release();
      await request.delete(`/api/projects/${slug}`);
    }
  });
}

test('navigation waits for every milestone draft and preserves a revised failed payload', async ({
  page,
  request,
}) => {
  const slug = `row-all-${Date.now()}`;
  const next = `${slug}-next`;
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
  const rows = [];
  for (const name of ['One', 'Two'])
    rows.push(
      await (await request.post(`/api/projects/${slug}/milestones`, { data: { name } })).json(),
    );
  let allow = false;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const writes: { id: number; body: unknown }[] = [];
  await page.route(`**/api/projects/${slug}/milestones/*`, async (route) => {
    if (route.request().method() !== 'PATCH') return route.continue();
    const id = Number(route.request().url().split('/').at(-1));
    writes.push({ id, body: route.request().postDataJSON() });
    if (!allow) return route.fulfill({ status: 503, json: { error: 'Write unavailable' } });
    if (id === rows[1].id) await gate;
    return route.continue();
  });
  try {
    await page.goto(`/projects/${slug}`);
    for (const [index, item] of rows.entries()) {
      const row = page.locator(`[data-milestone-id="${item.id}"]`);
      const name = row.getByRole('textbox', {
        name: `${en.projectMilestones.name}: ${item.name}`,
        exact: true,
      });
      await name.fill(`Failed ${index}`);
      await name.press('Tab');
      await expect(row.getByRole('alert')).toContainText('Write unavailable');
    }
    const first = page.locator(`[data-milestone-id="${rows[0].id}"]`);
    await first
      .getByRole('textbox', { name: `${en.projectMilestones.name}: One`, exact: true })
      .fill('Revised first');
    await first
      .getByRole('textbox', { name: `${en.projectMilestones.name}: One`, exact: true })
      .press('Tab');
    await expect(first.getByRole('alert')).toContainText('Write unavailable');
    await page.getByRole('link', { name: next, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: en.unsavedProject.title, exact: true });
    allow = true;
    await dialog.getByRole('button', { name: en.unsavedProject.save, exact: true }).click();
    await expect.poll(() => writes.filter((item) => item.id === rows[1].id).length).toBe(2);
    await expect(page).toHaveURL(new RegExp(`/projects/${slug}$`));
    await expect(
      dialog.getByRole('button', { name: en.unsavedProject.discard, exact: true }),
    ).toBeDisabled();
    release();
    await expect(page).toHaveURL(new RegExp(`/projects/${next}$`));
    const stored = await (await request.get(`/api/projects/${slug}`)).json();
    expect(stored.milestones.map((item: { name: string }) => item.name)).toEqual([
      'Revised first',
      'Failed 1',
    ]);
    expect(writes.at(-2)).toEqual({
      id: rows[0].id,
      body: { name: 'Revised first', description: '', targetDate: null },
    });
  } finally {
    release();
    await request.delete(`/api/projects/${slug}`);
    await request.delete(`/api/projects/${next}`);
  }
});

test('explicit milestone save restores focus after failure and successful retry', async ({
  page,
  request,
}) => {
  const slug = `row-focus-${Date.now()}`;
  expect((await request.post('/api/projects', { data: { slug, name: slug } })).ok()).toBeTruthy();
  const milestone = await (
    await request.post(`/api/projects/${slug}/milestones`, { data: { name: 'Original' } })
  ).json();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let writes = 0;
  await page.route(`**/api/projects/${slug}/milestones/${milestone.id}`, async (route) => {
    if (route.request().method() !== 'PATCH') return route.continue();
    writes++;
    await gate;
    if (writes === 1) return route.fulfill({ status: 503, json: { error: 'Write failed' } });
    return route.continue();
  });
  try {
    await page.goto(`/projects/${slug}`);
    const row = page.locator(`[data-milestone-id="${milestone.id}"]`);
    await row
      .getByRole('textbox', { name: `${en.projectMilestones.name}: Original`, exact: true })
      .fill('Updated');
    await row.getByRole('button', { name: en.milestoneSave.save, exact: true }).click();
    await expect(row.getByRole('status')).toContainText(en.milestoneSave.saving);
    release();
    const retry = row.getByRole('button', { name: en.milestoneSave.retry, exact: true });
    await expect(retry).toBeFocused();
    expect(writes).toBe(1);
    await retry.click();
    await expect(row.getByRole('status')).toContainText(en.milestoneSave.saved);
    await expect(
      row.getByRole('textbox', { name: `${en.projectMilestones.name}: Updated`, exact: true }),
    ).toBeFocused();
    expect(writes).toBe(2);
  } finally {
    release();
    await request.delete(`/api/projects/${slug}`);
  }
});
