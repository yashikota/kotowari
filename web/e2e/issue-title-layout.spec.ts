import { expect, test } from '@playwright/test';

for (const scheme of ['light', 'dark']) {
  test(`issue title editing shares wrapping and commit behavior in ${scheme} mode`, async ({
    page,
    request,
  }, testInfo) => {
    await page.addInitScript(
      (value) => localStorage.setItem('kotowari.color-scheme', value),
      scheme,
    );
    const title = `A long task title explaining the intended outcome and enough context to understand the next action ${Date.now()}`;
    const response = await request.post('/api/issues', { data: { title } });
    expect(response.ok()).toBeTruthy();
    const issue = await response.json();
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`/issues/${issue.identifier}`);
    const input = page.getByRole('textbox', { name: 'Issue title', exact: true });
    await expect(input).toHaveValue(title);
    await expect(input).toHaveJSProperty('tagName', 'TEXTAREA');
    const priority = page.getByRole('combobox', { name: 'Priority', exact: true });
    const status = page.getByRole('combobox', { name: 'Status', exact: true });
    const coreProperties = page.getByRole('group', { name: 'Core properties', exact: true });
    await expect(coreProperties.getByText('Status', { exact: true })).toBeVisible();
    await expect(coreProperties.getByText('Priority', { exact: true })).toBeVisible();
    const statusBounds = await status.boundingBox();
    const priorityBounds = await priority.boundingBox();
    expect(statusBounds).not.toBeNull();
    expect(priorityBounds).not.toBeNull();
    expect(Math.abs(statusBounds!.y - priorityBounds!.y)).toBeLessThan(2);
    expect(priorityBounds!.x).toBeGreaterThan(statusBounds!.x);
    expect(priorityBounds!.height).toBeGreaterThanOrEqual(36);
    await priority.click();
    await expect(page.getByRole('listbox')).toBeVisible();
    await priority.press('Escape');
    await expect(page.getByRole('listbox')).toBeHidden();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBeTruthy();
    expect(
      await input.evaluate((element) => element.scrollHeight <= element.clientHeight + 1),
    ).toBeTruthy();
    await input.fill(`${title} revised`);
    await expect
      .poll(() =>
        input.evaluate((element) => Number.parseFloat(getComputedStyle(element).outlineWidth)),
      )
      .toBeGreaterThanOrEqual(2);
    await page.screenshot({ path: testInfo.outputPath(`issue-title-${scheme}.png`) });
    await input.press('Enter');
    await expect
      .poll(async () => (await (await request.get(`/api/issues/${issue.identifier}`)).json()).title)
      .toBe(`${title} revised`);
    await page.reload();
    await expect(input).toHaveValue(`${title} revised`);
    await page.evaluate(() =>
      localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' })),
    );
    await page.reload();
    await expect(input).toHaveValue(`${title} revised`);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBeTruthy();
    await page.screenshot({ path: testInfo.outputPath(`issue-properties-${scheme}-large.png`) });
    await request.delete(`/api/issues/${issue.identifier}`);
  });
}
