import { expect, test } from '@playwright/test';

for (const scheme of ['light', 'dark']) {
  for (const kind of ['cycle', 'automation']) {
    test(`${kind} settings retain failed drafts and share recovery in ${scheme}`, async ({
      page,
      request,
    }, testInfo) => {
      const original = await (await request.get('/api/workspace')).json();
      await page.addInitScript((value) => {
        localStorage.setItem('kotowari.color-scheme', value);
        localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
      }, scheme);
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto('/config');
      const cycle = kind === 'cycle';
      const key = cycle ? 'cycleSettings' : 'issueAutomationSettings';
      const section = page.getByRole('region', {
        name: cycle ? 'Cycle schedule' : 'Issue automations',
        exact: true,
      });
      const field = cycle
        ? section.getByRole('combobox', { name: 'Cycle duration' })
        : section.getByRole('checkbox', { name: 'Auto-close parent issues', exact: true });
      const duration = original.cycleSettings.durationDays === 21 ? 28 : 21;
      const closeParents = !original.issueAutomationSettings.autoCloseParentIssues;
      if (cycle) {
        await field.click();
        await page.getByRole('option', { name: `${duration / 7} weeks`, exact: true }).click();
      } else await field.setChecked(closeParents);
      let attempts = 0;
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route('**/api/workspace', async (route) => {
        if (route.request().method() !== 'PATCH' || !(key in route.request().postDataJSON()))
          return route.continue();
        attempts += 1;
        if (attempts === 1) {
          await gate;
          await route.fulfill({ status: 503, body: 'Temporary settings failure' });
        } else await route.continue();
      });
      try {
        const save = section.getByRole('button', {
          name: cycle ? 'Save cycle schedule' : 'Save issue automations',
          exact: true,
        });
        await save.click();
        await expect(field).toBeDisabled();
        await expect(save).toBeDisabled();
        await expect(section.getByRole('status')).toHaveText(
          cycle ? 'Saving cycle schedule…' : 'Saving issue automations…',
        );
        await section.locator('form').evaluate((form) => (form as HTMLFormElement).requestSubmit());
        expect(attempts).toBe(1);
        release();
        const alert = section.getByRole('alert');
        await expect(alert).toContainText('Temporary settings failure');
        await expect(field).toBeEnabled();
        const workspace = page.getByRole('region', { name: 'Workspace', exact: true });
        await workspace
          .getByRole('textbox', { name: 'Name', exact: true })
          .fill(`Settings refresh ${Date.now()}`);
        await workspace.getByRole('button', { name: 'Save workspace', exact: true }).click();
        await expect(workspace.getByRole('status')).toHaveText('Workspace saved');
        if (cycle) await expect(field).toHaveValue(`${duration / 7} weeks`);
        else expect(await field.isChecked()).toBe(closeParents);
        await alert.scrollIntoViewIfNeeded();
        const retry = alert.getByRole('button', { name: 'Retry saving', exact: true });
        await retry.focus();
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        ).toBeTruthy();
        await page.screenshot({ path: testInfo.outputPath(`${kind}-settings-failure.png`) });
        await retry.press('Enter');
        await expect(alert).toBeHidden();
        await expect(
          section.getByText(cycle ? 'Cycle schedule saved' : 'Issue automations saved', {
            exact: true,
          }),
        ).toBeVisible();
        await expect(field).toBeEnabled();
        await expect(save).toBeFocused();
        expect(attempts).toBe(2);
        const confirmed = await (await request.get('/api/workspace')).json();
        if (cycle) expect(confirmed.cycleSettings.durationDays).toBe(duration);
        else expect(confirmed.issueAutomationSettings.autoCloseParentIssues).toBe(closeParents);
        await page.reload();
        if (cycle) await expect(field).toHaveValue(`${duration / 7} weeks`);
        else expect(await field.isChecked()).toBe(closeParents);
      } finally {
        release();
        await request.patch('/api/workspace', {
          data: {
            name: original.name,
            cycleSettings: original.cycleSettings,
            issueAutomationSettings: original.issueAutomationSettings,
          },
        });
      }
    });
  }

  test(`cycle generation can be retried without rewriting saved settings in ${scheme}`, async ({
    page,
    request,
  }, testInfo) => {
    const original = await (await request.get('/api/workspace')).json();
    await page.addInitScript(
      (value) => localStorage.setItem('kotowari.color-scheme', value),
      scheme,
    );
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/config');
    const section = page.getByRole('region', { name: 'Cycle schedule', exact: true });
    const duration = section.getByRole('combobox', { name: 'Cycle duration' });
    await duration.click();
    await page.getByRole('option', { name: '3 weeks', exact: true }).click();
    let writes = 0;
    let generations = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/workspace', (route) => {
      if (route.request().method() === 'PATCH' && 'cycleSettings' in route.request().postDataJSON())
        writes += 1;
      return route.continue();
    });
    await page.route('**/api/cycles/ensure', async (route) => {
      generations += 1;
      if (generations === 1) {
        await gate;
        await route.fulfill({ status: 503, body: 'Temporary cycle generation failure' });
      } else await route.continue();
    });
    try {
      await section.getByRole('button', { name: 'Save cycle schedule', exact: true }).click();
      await expect(section.getByRole('status')).toHaveText('Preparing cycles…');
      await expect(duration).toBeDisabled();
      expect((await (await request.get('/api/workspace')).json()).cycleSettings.durationDays).toBe(
        21,
      );
      await section.locator('form').evaluate((form) => (form as HTMLFormElement).requestSubmit());
      expect(writes).toBe(1);
      release();
      const alert = section.getByRole('alert');
      await expect(alert).toContainText('Settings saved, but cycles could not be prepared');
      await expect(alert).toContainText('Temporary cycle generation failure');
      await expect(section.getByRole('status')).toHaveText('Cycle schedule saved');
      await expect(duration).toHaveValue('3 weeks');
      await alert.scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath('cycle-generation-failure.png') });
      const retry = alert.getByRole('button', { name: 'Retry preparing cycles', exact: true });
      await retry.focus();
      await retry.press('Enter');
      await expect(alert).toBeHidden();
      await expect(section.getByText('Cycle preparation completed', { exact: true })).toBeVisible();
      await expect(duration).toBeEnabled();
      await expect(
        section.getByRole('button', { name: 'Save cycle schedule', exact: true }),
      ).toBeFocused();
      expect(writes).toBe(1);
      expect(generations).toBe(2);
      await duration.click();
      await page.getByRole('option', { name: '4 weeks', exact: true }).click();
      await expect(section.getByRole('status')).toBeHidden();
    } finally {
      release();
      await request.patch('/api/workspace', { data: { cycleSettings: original.cycleSettings } });
    }
  });
}

test('settings retry keeps focus on a different field when editing continues', async ({
  page,
  request,
}) => {
  const original = await (await request.get('/api/workspace')).json();
  await page.goto('/config');
  const automation = page.getByRole('region', { name: 'Issue automations', exact: true });
  const checkbox = automation.getByRole('checkbox', {
    name: 'Auto-close parent issues',
    exact: true,
  });
  await checkbox.setChecked(!original.issueAutomationSettings.autoCloseParentIssues);
  let attempts = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/workspace', async (route) => {
    if (
      route.request().method() !== 'PATCH' ||
      !('issueAutomationSettings' in route.request().postDataJSON())
    )
      return route.continue();
    attempts += 1;
    if (attempts === 1) return route.fulfill({ status: 503, body: 'Temporary automation failure' });
    await gate;
    return route.continue();
  });
  try {
    await automation.getByRole('button', { name: 'Save issue automations', exact: true }).click();
    const retry = automation
      .getByRole('alert')
      .getByRole('button', { name: 'Retry saving', exact: true });
    await retry.focus();
    await retry.press('Enter');
    await expect(checkbox).toBeDisabled();
    const name = page
      .getByRole('region', { name: 'Workspace', exact: true })
      .getByRole('textbox', { name: 'Name', exact: true });
    await name.fill('Keep editing this unsaved workspace name');
    release();
    await expect(automation.getByRole('status')).toHaveText('Issue automations saved');
    await expect(name).toBeFocused();
    await expect(name).toHaveValue('Keep editing this unsaved workspace name');
    expect(attempts).toBe(2);
  } finally {
    release();
    await request.patch('/api/workspace', {
      data: { issueAutomationSettings: original.issueAutomationSettings },
    });
  }
});
