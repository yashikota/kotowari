import { expect, test } from '@playwright/test';

for (const scheme of ['light', 'dark']) {
  for (const width of [360, 1280]) {
    test(`property choices remain readable and focused in ${scheme} at ${width}px`, async ({
      page,
      request,
    }, testInfo) => {
      const statuses = await (await request.get('/api/issue-workflow-statuses')).json();
      const longName =
        'Waiting for a clear outcome and the context needed to make the next decision';
      await page.route('**/api/issue-workflow-statuses', (route) =>
        route.fulfill({
          json: statuses.map((status: { id: string }) =>
            status.id === 'todo' ? { ...status, name: longName } : status,
          ),
        }),
      );
      await page.addInitScript((value) => {
        localStorage.setItem('kotowari.color-scheme', value);
        localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
      }, scheme);
      await page.setViewportSize({ width, height: 800 });
      const issue = await (
        await request.post('/api/issues', {
          data: { title: 'Read task property choices', status: 'todo' },
        })
      ).json();
      try {
        await page.goto(`/issues/${issue.identifier}`);
        const status = page.getByRole('combobox', { name: 'Status', exact: true });
        await expect(status).toHaveValue(longName);
        await page.getByRole('button', { name: 'Issue options' }).focus();
        await page.keyboard.press('s');
        await expect(status).toBeFocused();
        const option = page.getByRole('option', { name: longName, exact: true });
        await expect(option).toBeVisible();
        const bounds = (await option.boundingBox())!;
        expect(bounds.width).toBeGreaterThanOrEqual(220);
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
        expect(
          await option.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
        ).toBeTruthy();
        expect(bounds.height).toBeGreaterThan(40);
        await page.screenshot({ path: testInfo.outputPath('property-menu.png') });
        await status.press('Escape');
        await expect(status).toHaveAttribute('aria-expanded', 'false');
        await page.getByRole('button', { name: 'Issue options' }).focus();
        await page.keyboard.press('p');
        const priority = page.getByRole('combobox', { name: 'Priority', exact: true });
        await expect(priority).toBeFocused();
        await expect(page.getByRole('option', { name: 'Urgent', exact: true })).toBeVisible();
        await priority.press('Escape');
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        ).toBeTruthy();
      } finally {
        await request.delete(`/api/issues/${issue.identifier}`);
      }
    });
  }
}

test('property shortcuts respect pending writes and recover focus after failure', async ({
  page,
  request,
}) => {
  const issue = await (
    await request.post('/api/issues', {
      data: { title: 'Keep property shortcuts consistent while saving', status: 'todo' },
    })
  ).json();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**/api/issues/${issue.identifier}`, async (route) => {
    if (route.request().method() !== 'PATCH') return route.continue();
    await gate;
    await route.fulfill({ status: 503, body: 'Temporary assignment failure' });
  });
  try {
    await page.goto(`/issues/${issue.identifier}`);
    const options = page.getByRole('button', { name: 'Issue options' });
    await options.focus();
    await page.keyboard.press('a');
    const assignee = page.getByRole('combobox', { name: 'Assignee', exact: true });
    await expect(assignee).toBeFocused();
    await page.getByRole('option', { name: 'Agent', exact: true }).click();
    await expect(assignee).toHaveValue('Agent');
    const status = page.getByRole('combobox', { name: 'Status', exact: true });
    await expect(status).toBeDisabled();
    await expect(page.getByRole('listbox')).toBeHidden();
    await options.focus();
    await page.keyboard.press('s');
    await expect(status).toHaveAttribute('aria-expanded', 'false');
    await expect(options).toBeFocused();
    await page.keyboard.press('l');
    await expect(page.getByRole('dialog', { name: 'Change labels' })).toBeHidden();
    release();
    await expect(page.getByRole('alert')).toContainText('Temporary assignment failure');
    await expect(assignee).toHaveValue('Unassigned');
    await expect(status).toBeEnabled();
    await page.keyboard.press('s');
    await expect(status).toHaveAttribute('aria-expanded', 'true');
    await expect(status).toBeFocused();
    await status.press('Escape');
    await expect(status).toHaveAttribute('aria-expanded', 'false');
  } finally {
    release();
    await request.delete(`/api/issues/${issue.identifier}`);
  }
});
