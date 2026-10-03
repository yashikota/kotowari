import { expect, test } from '@playwright/test';

for (const scheme of ['light', 'dark']) {
  for (const kind of ['issue', 'project']) {
    test(`${kind} status edits recover without stale input in ${scheme}`, async ({
      page,
      request,
    }, testInfo) => {
      const endpoint = `/api/${kind}-workflow-statuses`;
      const original = await (await request.get(endpoint)).json();
      const workspaceOriginal = await (await request.get('/api/workspace')).json();
      await page.addInitScript((value) => {
        localStorage.setItem('kotowari.color-scheme', value);
        localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
      }, scheme);
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto('/config');
      const section = page.getByRole('region', {
        name: kind === 'issue' ? 'Issue statuses' : 'Project statuses',
        exact: true,
      });
      const group = section.getByRole('region', {
        name: kind === 'issue' ? 'In Progress' : 'In progress',
        exact: true,
      });
      if (kind === 'project') {
        await group.getByRole('button', { name: 'Create new project status' }).click();
        await expect(section.getByLabel('New status name')).toBeFocused();
      }
      const newName = section.getByLabel('New status name');
      const oldName = `OldReview${Date.now()}`;
      const revisedName = `RevisedReview${Date.now()}LongWorkflowStatusName`;
      const details =
        'Review release notes and associated decisions before completing the planned work. '
          .repeat(3)
          .slice(0, 200);
      await newName.fill(oldName);
      await section.getByLabel('Description', { exact: true }).fill(details);
      let writes = 0;
      let failures = 2;
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const sentNames: string[][] = [];
      await page.route(`**${endpoint}`, async (route) => {
        if (route.request().method() !== 'PUT') return route.continue();
        writes++;
        sentNames.push(
          route
            .request()
            .postDataJSON()
            .statuses.map((status: { name: string }) => status.name),
        );
        if (writes === 1) await gate;
        if (failures > 0) {
          failures--;
          return route.fulfill({ status: 503, body: 'Status settings unavailable' });
        }
        return route.continue();
      });
      try {
        await section.getByRole('button', { name: 'Add status', exact: true }).click();
        await expect(newName).toBeDisabled();
        await expect(section.getByRole('status')).toHaveText(
          kind === 'issue' ? 'Saving issue statuses…' : 'Saving project statuses…',
        );
        await newName.evaluate((input) => (input as HTMLInputElement).form?.requestSubmit());
        expect(writes).toBe(1);
        release();
        const alert = section.getByRole('alert');
        await expect(alert).toContainText('Status settings unavailable');
        await expect(alert).not.toContainText('Workspace');
        await expect(newName).toHaveValue(oldName);
        await newName.fill(revisedName);
        await expect(alert).toHaveCount(0);
        await section.getByRole('button', { name: 'Add status', exact: true }).click();
        await expect(alert).toContainText('Status settings unavailable');
        await expect(newName).toHaveValue(revisedName);
        await expect(section.getByLabel('Description', { exact: true })).toHaveValue(details);
        const retry = alert.getByRole('button', { name: 'Retry saving statuses', exact: true });
        await retry.focus();
        await page.screenshot({ path: testInfo.outputPath(`${kind}-status-failure.png`) });
        await retry.press('Enter');
        const added = section.getByLabel(`Status name: ${revisedName}`, { exact: true });
        await expect(added).toHaveValue(revisedName);
        await expect(added).toBeFocused();
        await expect(alert).toHaveCount(0);
        expect(writes).toBe(3);
        expect(sentNames[0]).toContain(oldName);
        expect(sentNames[1]).toContain(revisedName);
        expect(sentNames[2]).toContain(revisedName);
        expect(sentNames[2]).not.toContain(oldName);

        const rowDescription = section.getByLabel('Description: In Progress', { exact: true });
        const localDescription = `Unsaved ${details}`.slice(0, 200);
        await rowDescription.fill(localDescription);
        const workspace = page.getByRole('region', { name: 'Workspace', exact: true });
        await workspace
          .getByRole('textbox', { name: 'Name', exact: true })
          .fill(`Workflow refresh ${Date.now()}`);
        await workspace.getByRole('button', { name: 'Save workspace', exact: true }).click();
        await expect(workspace.getByRole('status')).toHaveText('Workspace saved');
        await expect(rowDescription).toHaveValue(localDescription);
        const save = section.getByRole('button', { name: 'Save workflow', exact: true });
        await expect(save).toBeEnabled();
        failures = 1;
        await save.click();
        await expect(alert).toContainText('Status settings unavailable');
        await expect(rowDescription).toHaveValue(localDescription);
        await retry.focus();
        await retry.press('Enter');
        await expect(section.getByRole('status')).toHaveText(
          kind === 'issue' ? 'Issue workflow saved.' : 'Project workflow saved.',
        );
        await expect(
          section.locator(
            `[data-workflow-status-id="${kind === 'issue' ? 'in_progress' : 'started'}"] input`,
          ),
        ).toBeFocused();
        await expect(save).toBeDisabled();
        const confirmed = await (await request.get(endpoint)).json();
        expect(
          confirmed.find(
            (status: { id: string }) =>
              status.id === (kind === 'issue' ? 'in_progress' : 'started'),
          ).description,
        ).toBe(localDescription);
        await added.scrollIntoViewIfNeeded();
        await page.screenshot({ path: testInfo.outputPath(`${kind}-status-long-fields.png`) });
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        ).toBeTruthy();
        expect(
          await section
            .locator('[data-workflow-status-id] label')
            .evaluateAll((labels) =>
              labels.every((label) => label.scrollWidth <= label.clientWidth),
            ),
        ).toBeTruthy();
        const remove = section.getByRole('button', { name: `Remove ${revisedName}`, exact: true });
        const removeBounds = await remove.boundingBox();
        expect(removeBounds?.width).toBeGreaterThanOrEqual(44);
        expect(removeBounds?.height).toBeGreaterThanOrEqual(44);
        failures = 1;
        await remove.click();
        await expect(alert).toContainText('Status settings unavailable');
        await expect(added).toHaveValue(revisedName);
        await retry.focus();
        await retry.press('Enter');
        await expect(added).toHaveCount(0);
        await expect(
          section.locator(
            `[data-workflow-status-id="${kind === 'issue' ? 'in_progress' : 'started'}"] input`,
          ),
        ).toBeFocused();
        expect(writes).toBe(7);
      } finally {
        release();
        await request.put(endpoint, { data: { statuses: original } });
        await request.patch('/api/workspace', { data: { name: workspaceOriginal.name } });
      }
    });
  }
}

for (const kind of ['issue', 'project']) {
  test(`${kind} status name validation is local and creation cancel restores focus`, async ({
    page,
  }) => {
    let writes = 0;
    await page.route(`**/api/${kind}-workflow-statuses`, (route) => {
      if (route.request().method() === 'PUT') writes++;
      return route.continue();
    });
    await page.goto('/config');
    const section = page.getByRole('region', {
      name: kind === 'issue' ? 'Issue statuses' : 'Project statuses',
      exact: true,
    });
    const group = section.getByRole('region', {
      name: kind === 'issue' ? 'In Progress' : 'In progress',
      exact: true,
    });
    const create = group.getByRole('button', { name: 'Create new project status', exact: true });
    if (kind === 'project') await create.click();
    const name = section.getByLabel('New status name');
    await name.fill('   ');
    await section.getByRole('button', { name: 'Add status', exact: true }).click();
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(name).toBeFocused();
    await expect(
      section.getByText('Enter a name for the new status.', { exact: true }),
    ).toBeVisible();
    await expect(section.getByRole('alert')).toHaveCount(0);
    expect(writes).toBe(0);
    await name.fill('Valid review');
    await expect(name).not.toHaveAttribute('aria-invalid', 'true');
    if (kind === 'project') {
      await section.getByRole('button', { name: 'Cancel', exact: true }).focus();
      await section.getByRole('button', { name: 'Cancel', exact: true }).press('Enter');
      await expect(name).toHaveCount(0);
      await expect(create).toBeFocused();
      await create.click();
      await expect(name).toHaveValue('');
      await expect(name).toBeFocused();
    }
  });
}

for (const kind of ['issue', 'project']) {
  test(`${kind} status save cannot be replaced by an older refresh response`, async ({
    page,
    request,
  }) => {
    const endpoint = `/api/${kind}-workflow-statuses`;
    const original = await (await request.get(endpoint)).json();
    const workspaceOriginal = await (await request.get('/api/workspace')).json();
    await Promise.all([
      page.waitForResponse(
        (response) => response.url().endsWith(endpoint) && response.request().method() === 'GET',
      ),
      page.goto('/config'),
    ]);
    const section = page.getByRole('region', {
      name: kind === 'issue' ? 'Issue statuses' : 'Project statuses',
      exact: true,
    });
    const description = section.getByLabel('Description: In Progress', { exact: true });
    let holdNext = true;
    let release!: () => void;
    let captured!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const fetched = new Promise<void>((resolve) => {
      captured = resolve;
    });
    await page.route(`**${endpoint}`, async (route) => {
      if (route.request().method() !== 'GET' || !holdNext) return route.continue();
      holdNext = false;
      const response = await route.fetch();
      captured();
      await gate;
      await route.fulfill({
        response,
        headers: { ...response.headers(), 'x-workflow-stale-test': 'true' },
      });
    });
    try {
      const workspace = page.getByRole('region', { name: 'Workspace', exact: true });
      await workspace
        .getByRole('textbox', { name: 'Name', exact: true })
        .fill(`Delayed refresh ${Date.now()}`);
      await workspace.getByRole('button', { name: 'Save workspace', exact: true }).click();
      await fetched;
      const next = `Confirmed workflow description ${Date.now()}`;
      await description.fill(next);
      await section.getByRole('button', { name: 'Save workflow', exact: true }).click();
      await expect(section.getByRole('status')).toHaveText(
        kind === 'issue' ? 'Issue workflow saved.' : 'Project workflow saved.',
      );
      await expect(description).toHaveValue(next);
      const staleResponse = page.waitForResponse(
        (response) => response.headers()['x-workflow-stale-test'] === 'true',
      );
      release();
      await staleResponse;
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      await expect(description).toHaveValue(next);
      await expect(
        section.getByRole('button', { name: 'Save workflow', exact: true }),
      ).toBeDisabled();
      const confirmed = await (await request.get(endpoint)).json();
      expect(
        confirmed.find(
          (status: { id: string }) => status.id === (kind === 'issue' ? 'in_progress' : 'started'),
        ).description,
      ).toBe(next);
    } finally {
      release();
      await request.put(endpoint, { data: { statuses: original } });
      await request.patch('/api/workspace', { data: { name: workspaceOriginal.name } });
    }
  });
}

for (const appearance of [
  { scheme: 'light', fontSize: 'small' },
  { scheme: 'dark', fontSize: 'default' },
]) {
  test(`workflow fields share a readable desktop layout in ${appearance.scheme}`, async ({
    page,
    request,
  }, testInfo) => {
    const originals: Record<string, unknown[]> = {};
    const name = `DetailedReview${Date.now()}LongWorkflowStatusName`.slice(0, 48);
    const description =
      'Review the project plan, implementation and recorded decisions before finishing this work. '
        .repeat(3)
        .slice(0, 200);
    try {
      for (const kind of ['issue', 'project']) {
        const endpoint = `/api/${kind}-workflow-statuses`;
        originals[kind] = await (await request.get(endpoint)).json();
        expect(
          (
            await request.put(endpoint, {
              data: {
                statuses: [
                  ...originals[kind]!,
                  {
                    id: `layout-${kind}-${Date.now()}`,
                    name,
                    description,
                    category: kind === 'issue' ? 'in_progress' : 'started',
                  },
                ],
              },
            })
          ).ok(),
        ).toBeTruthy();
      }
      await page.addInitScript((value) => {
        localStorage.setItem('kotowari.color-scheme', value.scheme);
        localStorage.setItem(
          'kotowari.preferences.v1',
          JSON.stringify({ fontSize: value.fontSize }),
        );
      }, appearance);
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto('/config');
      for (const kind of ['issue', 'project']) {
        const section = page.getByRole('region', {
          name: kind === 'issue' ? 'Issue statuses' : 'Project statuses',
          exact: true,
        });
        const group = section.getByRole('region', {
          name: kind === 'issue' ? 'In Progress' : 'In progress',
          exact: true,
        });
        const nameInput = group.getByLabel(`Status name: ${name}`, { exact: true });
        const descriptionInput = group.getByLabel(`Description: ${name}`, { exact: true });
        await expect(nameInput).toHaveValue(name);
        await expect(descriptionInput).toHaveValue(description);
        const nameBounds = await nameInput.boundingBox();
        const descriptionBounds = await descriptionInput.boundingBox();
        expect(nameBounds?.width).toBeGreaterThan(200);
        expect(descriptionBounds?.x).toBeGreaterThan(nameBounds!.x + nameBounds!.width);
        await nameInput.focus();
        await expect(nameInput).toBeFocused();
        expect(
          await group
            .locator('label')
            .evaluateAll((labels) =>
              labels.every((label) => label.scrollWidth <= label.clientWidth),
            ),
        ).toBeTruthy();
        await group.screenshot({ path: testInfo.outputPath(`${kind}-desktop-fields.png`) });
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBeTruthy();
    } finally {
      for (const [kind, statuses] of Object.entries(originals))
        await request.put(`/api/${kind}-workflow-statuses`, { data: { statuses } });
    }
  });
}

test('workflow retry preserves focus when another setting is edited while waiting', async ({
  page,
  request,
}) => {
  const endpoint = '/api/project-workflow-statuses';
  const original = await (await request.get(endpoint)).json();
  const name = `Focus review ${Date.now()}`;
  let writes = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**${endpoint}`, async (route) => {
    if (route.request().method() !== 'PUT') return route.continue();
    writes++;
    if (writes === 1) return route.fulfill({ status: 503, body: 'Status save unavailable' });
    await gate;
    return route.continue();
  });
  try {
    await page.goto('/config');
    const section = page.getByRole('region', { name: 'Project statuses', exact: true });
    await section
      .getByRole('region', { name: 'In progress', exact: true })
      .getByRole('button', { name: 'Create new project status' })
      .click();
    await section.getByLabel('New status name').fill(name);
    await section.getByRole('button', { name: 'Add status' }).click();
    const retry = section.getByRole('alert').getByRole('button', { name: 'Retry saving statuses' });
    await retry.focus();
    await retry.press('Enter');
    await expect(section.getByLabel('New status name')).toBeDisabled();
    await expect(section.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled();
    const workspaceName = page
      .getByRole('region', { name: 'Workspace', exact: true })
      .getByRole('textbox', { name: 'Name', exact: true });
    await workspaceName.fill('Keep this unsaved workspace draft');
    await workspaceName.focus();
    release();
    await expect(section.getByRole('status')).toHaveText('Project workflow saved.');
    await expect(section.getByLabel(`Status name: ${name}`)).toHaveValue(name);
    await expect(workspaceName).toBeFocused();
    await expect(workspaceName).toHaveValue('Keep this unsaved workspace draft');
    expect(writes).toBe(2);
  } finally {
    release();
    await request.put(endpoint, { data: { statuses: original } });
  }
});
