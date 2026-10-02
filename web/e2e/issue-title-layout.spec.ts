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
    await request.delete(`/api/issues/${issue.identifier}`);
  });
}
