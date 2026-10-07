import { expect, test } from '@playwright/test';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import ja from '../src/i18n/locales/ja.json' with { type: 'json' };
import { contrastFailures } from './contrast.ts';

for (const scheme of ['light', 'dark']) {
  for (const [locale, labels] of [
    ['en', en],
    ['ja', ja],
  ] as const) {
    test(`milestone deletion cancels, preserves drafts and retries in ${locale}/${scheme}`, async ({
      page,
      request,
    }, testInfo) => {
      const slug = `milestone-delete-${locale}-${scheme}-${Date.now()}`;
      expect(
        (await request.post('/api/projects', { data: { slug, name: slug } })).ok(),
      ).toBeTruthy();
      const first = await (
        await request.post(`/api/projects/${slug}/milestones`, { data: { name: 'Keep' } })
      ).json();
      const second = await (
        await request.post(`/api/projects/${slug}/milestones`, { data: { name: 'Remove' } })
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
      let nativeConfirm = false;
      page.on('dialog', async (dialog) => {
        nativeConfirm = true;
        await dialog.dismiss();
      });
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const deletes: string[] = [];
      let patches = 0;
      await page.route(`**/api/projects/${slug}/milestones/${second.id}`, async (route) => {
        if (route.request().method() === 'PATCH') patches++;
        if (route.request().method() !== 'DELETE') return route.continue();
        deletes.push(route.request().url());
        if (deletes.length === 1) {
          await gate;
          return route.fulfill({ status: 503, json: { error: 'Deletion unavailable' } });
        }
        return route.continue();
      });
      try {
        await page.goto(`/projects/${slug}`);
        const row = page.locator(`[data-milestone-id="${second.id}"]`);
        const name = row.getByRole('textbox', {
          name: `${labels.projectMilestones.name}: Remove`,
          exact: true,
        });
        await name.fill('Unsaved milestone name');
        const remove = row.locator('[data-milestone-remove]');
        await remove.click();
        const dialog = page.getByRole('dialog', {
          name: labels.milestoneDeletion.title,
          exact: true,
        });
        const cancel = dialog.getByRole('button', { name: labels.common.cancel, exact: true });
        await expect(cancel).toBeFocused();
        await expect(dialog).toContainText('Remove');
        expect(patches).toBe(0);
        await cancel.click();
        await expect(dialog).not.toBeVisible();
        await expect(remove).toBeFocused();
        await expect(name).toHaveValue('Unsaved milestone name');
        expect(deletes).toHaveLength(0);
        await remove.click();
        const confirm = dialog.getByRole('button', { name: labels.ui.delete, exact: true });
        expect((await confirm.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        await confirm.click();
        await expect(dialog.getByRole('status')).toContainText(labels.milestoneDeletion.deleting);
        await expect(cancel).toBeDisabled();
        await expect(confirm).toBeDisabled();
        await page.keyboard.press('Escape');
        await expect(dialog).toBeVisible();
        expect(deletes).toHaveLength(1);
        release();
        const retry = dialog.getByRole('button', {
          name: labels.milestoneDeletion.retry,
          exact: true,
        });
        await expect(retry).toBeFocused();
        await expect(dialog.getByRole('alert')).toContainText('Deletion unavailable');
        expect(await contrastFailures(page, '[role="dialog"]')).toEqual([]);
        await page.screenshot({ path: testInfo.outputPath('milestone-delete-failure.png') });
        await cancel.click();
        await expect(remove).toBeFocused();
        await expect(name).toHaveValue('Unsaved milestone name');
        await remove.click();
        await confirm.click();
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await expect(row).toHaveCount(0);
        await expect(
          page.locator(`[data-milestone-id="${first.id}"] [data-milestone-remove]`),
        ).toBeFocused();
        await expect(
          page.getByRole('status').filter({ hasText: labels.milestoneDeletion.deleted }),
        ).toBeVisible();
        const stored = await (await request.get(`/api/projects/${slug}`)).json();
        expect(stored.milestones.map((item: { id: number }) => item.id)).toEqual([first.id]);
        expect(deletes).toHaveLength(2);
        expect(patches).toBe(0);
        expect(nativeConfirm).toBe(false);
      } finally {
        release();
        await request.delete(`/api/projects/${slug}`);
      }
    });
  }
}

for (const focusOrigin of ['automatic', 'dialog'] as const) {
  test(`confirmed milestone deletion retries project refresh without another DELETE from ${focusOrigin} focus`, async ({
    page,
    request,
  }) => {
    const slug = `milestone-delete-refresh-${Date.now()}`;
    expect((await request.post('/api/projects', { data: { slug, name: slug } })).ok()).toBeTruthy();
    const milestone = await (
      await request.post(`/api/projects/${slug}/milestones`, { data: { name: 'Only milestone' } })
    ).json();
    let releaseRefresh!: () => void;
    const refreshGate = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    let deletes = 0;
    let failRefresh = false;
    await page.route(`**/api/projects/${slug}/milestones/${milestone.id}`, async (route) => {
      if (route.request().method() !== 'DELETE') return route.continue();
      deletes++;
      const response = await route.fetch();
      failRefresh = true;
      return route.fulfill({ response });
    });
    await page.route(`**/api/projects/${slug}`, async (route) => {
      if (route.request().method() === 'GET' && failRefresh) {
        failRefresh = false;
        await refreshGate;
        return route.fulfill({ status: 503, json: { error: 'Refresh unavailable' } });
      }
      return route.continue();
    });
    try {
      await page.goto(`/projects/${slug}`);
      await page.locator(`[data-milestone-id="${milestone.id}"] [data-milestone-remove]`).click();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: en.ui.delete, exact: true })
        .click();
      const dialog = page.getByRole('dialog', { name: en.milestoneDeletion.deleted, exact: true });
      await expect(dialog.getByRole('status')).toContainText(en.milestoneDeletion.refreshing);
      if (focusOrigin === 'dialog')
        await dialog.evaluate((element) => (element as HTMLElement).focus());
      releaseRefresh();
      const retry = dialog.getByRole('button', { name: en.milestoneDeletion.refresh, exact: true });
      await expect(dialog.getByRole('alert')).toContainText(en.milestoneDeletion.refreshFailed);
      await expect(retry).toBeFocused();
      expect(deletes).toBe(1);
      expect((await (await request.get(`/api/projects/${slug}`)).json()).milestones).toHaveLength(
        0,
      );
      await retry.click();
      await expect(dialog).toHaveCount(0);
      await expect(page.locator('[data-milestone-create]')).toBeFocused();
      expect(deletes).toBe(1);
      await expect(
        page.getByRole('status').filter({ hasText: en.milestoneDeletion.deleted }),
      ).toBeVisible();
    } finally {
      releaseRefresh();
      await request.delete(`/api/projects/${slug}`);
    }
  });
}

test('switching deletion targets preserves the other row draft and unlinks assigned issues', async ({
  page,
  request,
}) => {
  const slug = `milestone-delete-target-${Date.now()}`;
  expect((await request.post('/api/projects', { data: { slug, name: slug } })).ok()).toBeTruthy();
  const first = await (
    await request.post(`/api/projects/${slug}/milestones`, {
      data: { name: 'Keep', description: 'Original' },
    })
  ).json();
  const second = await (
    await request.post(`/api/projects/${slug}/milestones`, { data: { name: 'Remove' } })
  ).json();
  const issue = await (
    await request.post('/api/issues', {
      data: {
        title: slug,
        projectId: (await (await request.get(`/api/projects/${slug}`)).json()).id,
      },
    })
  ).json();
  expect(
    (
      await request.patch(`/api/issues/${issue.identifier}`, { data: { milestoneId: second.id } })
    ).ok(),
  ).toBeTruthy();
  const deletes: number[] = [];
  await page.route(`**/api/projects/${slug}/milestones/*`, async (route) => {
    const id = Number(route.request().url().split('/').at(-1));
    if (route.request().method() === 'PATCH')
      return route.fulfill({ status: 503, json: { error: 'Retained write failure' } });
    if (route.request().method() !== 'DELETE') return route.continue();
    deletes.push(id);
    if (id === first.id)
      return route.fulfill({ status: 503, json: { error: 'First deletion failed' } });
    return route.continue();
  });
  try {
    await page.goto(`/projects/${slug}`);
    const keep = page.locator(`[data-milestone-id="${first.id}"]`);
    const description = keep.getByRole('textbox', {
      name: `${en.projectMilestones.description}: Keep`,
      exact: true,
    });
    await description.fill('Retained other row draft');
    await keep.getByRole('button', { name: en.milestoneSave.save, exact: true }).click();
    await expect(keep.getByRole('alert')).toContainText('Retained write failure');
    await keep.locator('[data-milestone-remove]').click();
    const dialog = page.getByRole('dialog', { name: en.milestoneDeletion.title, exact: true });
    await dialog.getByRole('button', { name: en.ui.delete, exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('First deletion failed');
    await dialog.getByRole('button', { name: en.common.cancel, exact: true }).click();
    await expect(keep.locator('[data-milestone-remove]')).toBeFocused();
    const remove = page.locator(`[data-milestone-id="${second.id}"]`);
    await remove.locator('[data-milestone-remove]').click();
    await expect(dialog.getByRole('alert')).toHaveCount(0);
    await expect(dialog).toContainText('Remove');
    await dialog.getByRole('button', { name: en.ui.delete, exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(remove).toHaveCount(0);
    await expect(description).toHaveValue('Retained other row draft');
    await expect(keep.getByRole('alert')).toContainText('Retained write failure');
    expect(deletes).toEqual([first.id, second.id]);
    const linked = await (await request.get(`/api/issues/${issue.identifier}`)).json();
    expect(linked.milestoneId).toBeNull();
  } finally {
    await request.delete(`/api/issues/${issue.identifier}`);
    await request.delete(`/api/projects/${slug}`);
  }
});

for (const dismiss of ['button', 'escape'] as const) {
  test(`confirmed deletion refresh failure can be dismissed with ${dismiss}`, async ({
    page,
    request,
  }) => {
    const slug = `milestone-dismiss-${dismiss}-${Date.now()}`;
    expect((await request.post('/api/projects', { data: { slug, name: slug } })).ok()).toBeTruthy();
    const milestone = await (
      await request.post(`/api/projects/${slug}/milestones`, { data: { name: 'Deleted' } })
    ).json();
    let deletes = 0;
    let refreshReads = 0;
    await page.route(`**/api/projects/${slug}/milestones/${milestone.id}`, async (route) => {
      if (route.request().method() !== 'DELETE') return route.continue();
      deletes++;
      return route.continue();
    });
    await page.route(`**/api/projects/${slug}`, async (route) => {
      if (route.request().method() === 'GET' && deletes > 0 && ++refreshReads === 1)
        return route.fulfill({ status: 503, json: { error: 'Refresh unavailable' } });
      return route.continue();
    });
    try {
      await page.goto(`/projects/${slug}`);
      await page.locator(`[data-milestone-id="${milestone.id}"] [data-milestone-remove]`).click();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: en.ui.delete, exact: true })
        .click();
      const dialog = page.getByRole('dialog', { name: en.milestoneDeletion.deleted, exact: true });
      await expect(dialog.getByRole('alert')).toContainText('Refresh unavailable');
      if (dismiss === 'button')
        await dialog.getByRole('button', { name: en.ui.close, exact: true }).click();
      else await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(page.locator('[data-milestone-create]')).toBeFocused();
      expect(deletes).toBe(1);
      expect(refreshReads).toBe(1);
      await expect(page.locator(`[data-milestone-id="${milestone.id}"]`)).toHaveCount(0);
      const form = page.getByRole('form', { name: en.projectMilestones.heading, exact: true });
      await form
        .getByRole('textbox', { name: en.projectMilestones.name, exact: true })
        .fill('Continue working');
      await form.getByRole('button', { name: en.projectMilestones.add, exact: true }).click();
      await expect(form.getByRole('status')).toContainText(en.milestoneCreation.saved);
      expect(deletes).toBe(1);
      const stored = await (await request.get(`/api/projects/${slug}`)).json();
      expect(stored.milestones.map((item: { name: string }) => item.name)).toEqual([
        'Continue working',
      ]);
    } finally {
      await request.delete(`/api/projects/${slug}`);
    }
  });
}

for (const outcome of ['success', 'failure'] as const) {
  test(`late deletion refresh ${outcome} does not affect the next project`, async ({
    page,
    request,
  }) => {
    const slug = `milestone-delete-scope-${outcome}-${Date.now()}`;
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
      await request.post(`/api/projects/${slug}/milestones`, { data: { name: 'Old milestone' } })
    ).json();
    let deleted = false;
    let held = false;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(`**/api/projects/${slug}/milestones/${milestone.id}`, async (route) => {
      if (route.request().method() !== 'DELETE') return route.continue();
      const response = await route.fetch();
      deleted = true;
      return route.fulfill({ response });
    });
    await page.route(`**/api/projects/${slug}`, async (route) => {
      if (route.request().method() !== 'GET' || !deleted) return route.continue();
      held = true;
      await gate;
      if (outcome === 'failure')
        return route.fulfill({ status: 503, json: { error: 'Old refresh failure' } });
      return route.continue();
    });
    try {
      await page.goto(`/projects/${next}`);
      await page.getByRole('link', { name: slug, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/projects/${slug}$`));
      await page.locator(`[data-milestone-id="${milestone.id}"] [data-milestone-remove]`).click();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: en.ui.delete, exact: true })
        .click();
      await expect.poll(() => held).toBe(true);
      await page.goBack();
      await expect(page).toHaveURL(new RegExp(`/projects/${next}$`));
      const form = page.getByRole('form', { name: en.projectMilestones.heading, exact: true });
      const name = form.getByRole('textbox', { name: en.projectMilestones.name, exact: true });
      await name.fill('New project draft');
      const response = page.waitForResponse(
        (r) => r.url().endsWith(`/api/projects/${slug}`) && r.request().method() === 'GET',
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
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(
        page.getByRole('status').filter({ hasText: en.milestoneDeletion.deleted }),
      ).toHaveCount(0);
      await expect(page.getByRole('alert')).toHaveCount(0);
      await form.getByRole('button', { name: en.projectMilestones.add, exact: true }).click();
      await expect(form.getByRole('status')).toContainText(en.milestoneCreation.saved);
      expect(
        (await (await request.get(`/api/projects/${next}`)).json()).milestones.map(
          (item: { name: string }) => item.name,
        ),
      ).toEqual(['New project draft']);
    } finally {
      release();
      await request.delete(`/api/projects/${slug}`);
      await request.delete(`/api/projects/${next}`);
    }
  });
}

test('unsaved navigation cannot save a milestone while its DELETE is pending', async ({
  page,
  request,
}) => {
  const slug = `milestone-delete-pending-${Date.now()}`;
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
    await request.post(`/api/projects/${slug}/milestones`, { data: { name: 'Original' } })
  ).json();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let patches = 0;
  await page.route(`**/api/projects/${slug}/milestones/${milestone.id}`, async (route) => {
    if (route.request().method() === 'DELETE') {
      await gate;
      return route.fulfill({ status: 503, json: { error: 'Deletion unavailable' } });
    }
    if (route.request().method() === 'PATCH') patches++;
    return route.continue();
  });
  try {
    await page.goto(`/projects/${next}`);
    await page.getByRole('link', { name: slug, exact: true }).click();
    const row = page.locator(`[data-milestone-id="${milestone.id}"]`);
    await row
      .getByRole('textbox', { name: `${en.projectMilestones.name}: Original`, exact: true })
      .fill('Retained changed name');
    await row.locator('[data-milestone-remove]').click();
    await page
      .getByRole('dialog', { name: en.milestoneDeletion.title, exact: true })
      .getByRole('button', { name: en.ui.delete, exact: true })
      .click();
    await page.goBack();
    const navigation = page.getByRole('dialog', { name: en.unsavedProject.title, exact: true });
    const save = navigation.getByRole('button', { name: en.unsavedProject.save, exact: true });
    await expect(navigation.getByRole('status')).toContainText(en.milestoneDeletion.deleting);
    await expect(save).toBeDisabled();
    await expect(
      navigation.getByRole('button', { name: en.unsavedProject.discard, exact: true }),
    ).toBeDisabled();
    expect(patches).toBe(0);
    release();
    await expect(save).toBeEnabled();
    await save.click();
    await expect(page).toHaveURL(new RegExp(`/projects/${next}$`));
    expect(patches).toBe(1);
    expect((await (await request.get(`/api/projects/${slug}`)).json()).milestones[0].name).toBe(
      'Retained changed name',
    );
  } finally {
    release();
    await request.delete(`/api/projects/${slug}`);
    await request.delete(`/api/projects/${next}`);
  }
});
