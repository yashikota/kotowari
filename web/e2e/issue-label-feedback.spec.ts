import { expect, test } from '@playwright/test';

for (const scheme of ['light', 'dark']) {
  test(`label creation and assignment failures preserve the draft without duplicate labels in ${scheme}`, async ({
    page,
    request,
  }, testInfo) => {
    const response = await request.post('/api/issues', {
      data: { title: `Label recovery ${Date.now()}` },
    });
    expect(response.ok()).toBeTruthy();
    const issue = await response.json();
    const name = `A long label for an important outcome that must stay readable ${Date.now()}`;
    let creations = 0;
    let assignments = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/labels', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      creations++;
      if (creations === 1) {
        await gate;
        return route.fulfill({ status: 503, json: { error: 'Label creation unavailable' } });
      }
      return route.continue();
    });
    await page.route(`**/api/issues/${issue.identifier}`, async (route) => {
      if (route.request().method() !== 'PATCH') return route.continue();
      assignments++;
      if (assignments === 1)
        return route.fulfill({ status: 503, json: { error: 'Label assignment unavailable' } });
      return route.continue();
    });
    await page.addInitScript((color) => {
      localStorage.setItem('kotowari.color-scheme', color);
      localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
    }, scheme);
    await page.setViewportSize({ width: 360, height: 800 });
    try {
      await page.goto(`/issues/${issue.identifier}`);
      await page.getByRole('button', { name: 'Change labels', exact: true }).click();
      const popup = page.getByRole('dialog', { name: 'Change labels', exact: true });
      const input = popup.getByRole('textbox', { name: 'Change labels', exact: true });
      await input.fill(name);
      await popup.getByRole('button', { name: `Create “${name}”`, exact: true }).click();
      await expect(input).toBeDisabled();
      await page.keyboard.press('Control+Enter');
      expect(creations).toBe(1);
      release();
      await expect(page.getByRole('alert')).toContainText('Label creation unavailable');
      await expect(input).toHaveValue(name);
      await expect(input).toBeEnabled();
      await page.screenshot({ path: testInfo.outputPath('label-create-failure.png') });
      await page.getByRole('button', { name: 'Retry saving labels', exact: true }).click();
      await expect(page.getByRole('alert')).toContainText('Label assignment unavailable');
      expect(creations).toBe(2);
      if (
        (await page
          .getByRole('button', { name: 'Change labels', exact: true })
          .getAttribute('aria-expanded')) === 'false'
      )
        await page.getByRole('button', { name: 'Change labels', exact: true }).click();
      await expect(input).toHaveValue(name);
      const choice = popup.getByRole('checkbox', { name, exact: true });
      await expect(choice).toBeVisible();
      expect((await choice.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      expect(
        await choice.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
      ).toBeTruthy();
      await expect
        .poll(async () => {
          const box = await popup.boundingBox();
          return Boolean(box && box.y >= 0 && box.y + box.height <= 800);
        })
        .toBeTruthy();
      await page.screenshot({
        path: testInfo.outputPath('label-assignment-failure.png'),
        animations: 'disabled',
      });
      await page.getByRole('button', { name: 'Retry saving labels', exact: true }).click();
      await expect(page.getByRole('alert')).toHaveCount(0);
      await expect(page.getByRole('status').filter({ hasText: 'Labels saved' })).toBeVisible();
      if (!(await popup.isVisible()))
        await page.getByRole('button', { name: 'Change labels', exact: true }).click();
      await expect(choice).toHaveAttribute('aria-checked', 'true');
      await expect(input).toHaveValue('');
      expect(creations).toBe(2);
      expect(assignments).toBe(2);
      const labels = await (await request.get('/api/labels')).json();
      expect(labels.filter((label: { name: string }) => label.name === name)).toHaveLength(1);
      await choice.click();
      await expect
        .poll(
          async () =>
            (await (await request.get(`/api/issues/${issue.identifier}`)).json()).labels.length,
        )
        .toBe(0);
      if (!(await popup.isVisible()))
        await page.getByRole('button', { name: 'Change labels', exact: true }).click();
      await expect(choice).toHaveAttribute('aria-checked', 'false');
      expect(
        (await (await request.get(`/api/issues/${issue.identifier}`)).json()).labels,
      ).toHaveLength(0);
    } finally {
      release();
      await request.delete(`/api/issues/${issue.identifier}`);
    }
  });
}
