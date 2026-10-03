import { expect, test } from '@playwright/test';

for (const scheme of ['light', 'dark']) {
  for (const kind of ['issue', 'project']) {
    test(`${kind} status initial loading and failure cannot overwrite existing statuses in ${scheme}`, async ({
      page,
      request,
    }, testInfo) => {
      const endpoint = `/api/${kind}-workflow-statuses`;
      const original = await (await request.get(endpoint)).json();
      const name = `Existing review ${Date.now()}`;
      const id = `existing-${Date.now()}`;
      expect(
        (
          await request.put(endpoint, {
            data: {
              statuses: [
                ...original,
                { id, name, category: kind === 'issue' ? 'in_progress' : 'started' },
              ],
            },
          })
        ).ok(),
      ).toBeTruthy();
      let reads = 0;
      let writes = 0;
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route(`**${endpoint}`, async (route) => {
        if (route.request().method() === 'PUT') {
          writes++;
          return route.continue();
        }
        reads++;
        if (reads === 1) {
          await gate;
          return route.fulfill({ status: 503, body: 'Status list temporarily unavailable' });
        }
        return route.continue();
      });
      await page.addInitScript((value) => {
        localStorage.setItem('kotowari.color-scheme', value);
        localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
      }, scheme);
      await page.setViewportSize({ width: 360, height: 800 });
      try {
        await page.goto('/config');
        const section = page.getByRole('region', {
          name: kind === 'issue' ? 'Issue statuses' : 'Project statuses',
          exact: true,
        });
        await expect(section.getByRole('status')).toHaveText('Loading statuses…');
        await expect(section.getByRole('textbox')).toHaveCount(0);
        await expect(
          section.getByRole('button', { name: 'Save workflow', exact: true }),
        ).toHaveCount(0);
        expect(writes).toBe(0);
        release();
        const alert = section.getByRole('alert');
        await expect(alert).toContainText('Statuses could not be loaded');
        await expect(alert).toContainText('Status list temporarily unavailable');
        await expect(section.getByRole('textbox')).toHaveCount(0);
        await expect(section.getByRole('status')).toHaveCount(0);
        const other = page.getByRole('region', {
          name: kind === 'issue' ? 'Project statuses' : 'Issue statuses',
          exact: true,
        });
        await expect(other.getByLabel('Status name: Backlog', { exact: true })).toBeEnabled();
        const retry = alert.getByRole('button', { name: 'Retry loading statuses', exact: true });
        await retry.focus();
        await page.screenshot({ path: testInfo.outputPath(`${kind}-initial-load-failure.png`) });
        await retry.press('Enter');
        await expect(alert).toHaveCount(0);
        await expect(section.getByLabel(`Status name: ${name}`, { exact: true })).toHaveValue(name);
        await expect(section.getByLabel('Status name: Backlog', { exact: true })).toBeFocused();
        expect(reads).toBe(2);
        expect(writes).toBe(0);
        const nextDescription = `Preserve existing custom status ${Date.now()}`;
        await section.getByLabel(`Description: ${name}`, { exact: true }).fill(nextDescription);
        await section.getByRole('button', { name: 'Save workflow', exact: true }).click();
        await expect(section.getByRole('status')).toHaveText(
          kind === 'issue' ? 'Issue workflow saved.' : 'Project workflow saved.',
        );
        const confirmed = await (await request.get(endpoint)).json();
        expect(confirmed.find((status: { id: string }) => status.id === id).description).toBe(
          nextDescription,
        );
        expect(confirmed.length).toBe(original.length + 1);
        expect(writes).toBe(1);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        ).toBeTruthy();
      } finally {
        release();
        await request.put(endpoint, { data: { statuses: original } });
      }
    });
  }
}

for (const kind of ['issue', 'project']) {
  test(`${kind} refresh failure keeps loaded fields and unsaved edits through retry`, async ({
    page,
    request,
  }) => {
    const endpoint = `/api/${kind}-workflow-statuses`;
    const original = await (await request.get(endpoint)).json();
    const workspaceOriginal = await (await request.get('/api/workspace')).json();
    await page.goto('/config');
    const section = page.getByRole('region', {
      name: kind === 'issue' ? 'Issue statuses' : 'Project statuses',
      exact: true,
    });
    const description = section.getByLabel('Description: In Progress', { exact: true });
    await expect(description).toBeEnabled();
    const next = `Keep this local workflow draft ${Date.now()}`;
    await description.fill(next);
    let reads = 0;
    let writes = 0;
    await page.route(`**${endpoint}`, (route) => {
      if (route.request().method() === 'PUT') {
        writes++;
        return route.continue();
      }
      reads++;
      if (reads === 1)
        return route.fulfill({ status: 503, body: 'Status refresh temporarily unavailable' });
      return route.continue();
    });
    try {
      const workspace = page.getByRole('region', { name: 'Workspace', exact: true });
      await workspace
        .getByRole('textbox', { name: 'Name', exact: true })
        .fill(`Refresh status list ${Date.now()}`);
      await workspace.getByRole('button', { name: 'Save workspace', exact: true }).click();
      const alert = section.getByRole('alert');
      await expect(alert).toContainText('Status refresh temporarily unavailable');
      await expect(description).toBeEnabled();
      await expect(description).toHaveValue(next);
      await section
        .getByRole('alert')
        .getByRole('button', { name: 'Retry loading statuses' })
        .click();
      await expect(alert).toHaveCount(0);
      await expect(description).toHaveValue(next);
      expect(reads).toBe(2);
      expect(writes).toBe(0);
      await section.getByRole('button', { name: 'Save workflow', exact: true }).click();
      await expect(section.getByRole('status')).toHaveText(
        kind === 'issue' ? 'Issue workflow saved.' : 'Project workflow saved.',
      );
      const confirmed = await (await request.get(endpoint)).json();
      expect(
        confirmed.find(
          (status: { id: string }) => status.id === (kind === 'issue' ? 'in_progress' : 'started'),
        ).description,
      ).toBe(next);
      expect(writes).toBe(1);
    } finally {
      await request.put(endpoint, { data: { statuses: original } });
      await request.patch('/api/workspace', { data: { name: workspaceOriginal.name } });
    }
  });
}

test('an incomplete status response is recoverable and cannot enable a partial editor', async ({
  page,
}) => {
  let reads = 0;
  await page.route('**/api/issue-workflow-statuses', (route) => {
    reads++;
    if (reads === 1) return route.fulfill({ status: 200, json: [] });
    return route.continue();
  });
  await page.goto('/config');
  const section = page.getByRole('region', { name: 'Issue statuses', exact: true });
  await expect(section.getByRole('alert')).toContainText(
    'The status list returned by the server is incomplete.',
  );
  await expect(section.getByRole('textbox')).toHaveCount(0);
  await section.getByRole('button', { name: 'Retry loading statuses' }).click();
  await expect(section.getByRole('alert')).toHaveCount(0);
  await expect(section.getByLabel('Status name: Backlog')).toBeEnabled();
});
