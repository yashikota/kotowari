import { expect, test } from '@playwright/test';

for (const scheme of ['light', 'dark']) {
  test(`shared document header keeps its title and actions usable in ${scheme} mode`, async ({
    page,
    request,
  }, testInfo) => {
    await page.addInitScript(
      (value) => localStorage.setItem('kotowari.color-scheme', value),
      scheme,
    );
    const slug = `header-${scheme}-${Date.now()}`;
    const title =
      'A long document title explaining the decision and its implementation details without losing the next action';
    const response = await request.post('/api/pages', { data: { title, slug } });
    expect(response.ok()).toBeTruthy();
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`/pages/${slug}`);
    const header = page
      .getByTestId('workspace-panel')
      .locator('header')
      .filter({ has: page.getByRole('heading', { name: title, exact: true }) });
    await expect(header.getByRole('heading', { level: 2 })).toHaveText(title);
    const action = header.getByRole('button', { name: 'Delete', exact: true });
    await expect(action).toBeVisible();
    const titleEditor = page.getByRole('textbox', { name: 'Page title', exact: true });
    await expect(titleEditor).toHaveJSProperty('tagName', 'TEXTAREA');
    await expect(titleEditor).toHaveValue(title);
    expect(
      await titleEditor.evaluate((element) => element.scrollHeight <= element.clientHeight + 1),
    ).toBeTruthy();
    for (const width of [360, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      const headerBounds = await header.boundingBox();
      const titleBounds = await header.getByRole('heading', { level: 2 }).boundingBox();
      const actionBounds = await action.boundingBox();
      expect(headerBounds).not.toBeNull();
      expect(titleBounds).not.toBeNull();
      expect(actionBounds).not.toBeNull();
      expect(actionBounds!.x + actionBounds!.width).toBeLessThanOrEqual(
        headerBounds!.x + headerBounds!.width + 1,
      );
      expect(titleBounds!.x + titleBounds!.width).toBeLessThanOrEqual(
        headerBounds!.x + headerBounds!.width + 1,
      );
      expect(actionBounds!.y + actionBounds!.height).toBeLessThanOrEqual(
        headerBounds!.y + headerBounds!.height + 1,
      );
    }
    await page.setViewportSize({ width: 360, height: 800 });
    await page.screenshot({ path: testInfo.outputPath(`document-header-${scheme}.png`) });
    await titleEditor.fill(`${title} revised`);
    await expect
      .poll(() =>
        titleEditor.evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).outlineWidth),
        ),
      )
      .toBeGreaterThanOrEqual(2);
    await titleEditor.press('Enter');
    await expect
      .poll(async () => (await (await request.get(`/api/pages/${slug}`)).json()).title)
      .toBe(`${title} revised`);
    await request.delete(`/api/pages/${slug}`);
  });
}
