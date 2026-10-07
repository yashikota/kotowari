import { expect, test } from '@playwright/test';
import { contrastFailures } from './contrast.ts';

for (const scheme of ['light', 'dark']) {
  test(`global error feedback meets AA in ${scheme}`, async ({ page, request }, testInfo) => {
    await page.addInitScript(
      (value) => localStorage.setItem('kotowari.color-scheme', value),
      scheme,
    );
    const response = await request.post('/api/issues', {
      data: { title: 'Contrast error feedback' },
    });
    expect(response.ok()).toBeTruthy();
    const issue = await response.json();
    await page.route(`**/api/issues/${issue.identifier}`, async (route) => {
      if (route.request().method() !== 'PATCH') return route.continue();
      await route.fulfill({ status: 503, json: { error: 'Favorite could not be saved' } });
    });
    await page.goto(`/issues/${issue.identifier}`);
    await page.getByRole('button', { name: 'Add to favorites', exact: true }).click();
    const alert = page.getByRole('alert');
    await expect(alert).toContainText('Favorite could not be saved');
    expect(await contrastFailures(page, '[role="alert"]')).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('error-notice.png') });
    await alert.getByRole('button').click();
    await expect(alert).toBeHidden();
  });
  for (const width of [360, 1280]) {
    test(`creation forms meet AA in ${scheme} at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (value) => localStorage.setItem('kotowari.color-scheme', value),
        scheme,
      );
      for (const [route, action, title, field] of [
        ['/drafts', 'New issue', 'Create issue', 'Issue title'],
        ['/projects', 'New project', 'New project', 'Project name'],
      ]) {
        await page.goto(route!);
        await page.getByRole('button', { name: action!, exact: true }).first().click();
        const dialog = page.getByRole('dialog', { name: title! });
        await expect(dialog).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute('data-mantine-color-scheme', scheme);
        await dialog.getByRole('textbox', { name: field!, exact: true }).focus();
        expect(await contrastFailures(page, '[role="dialog"]')).toEqual([]);
        await page.screenshot({ path: testInfo.outputPath(`${route!.slice(1)}-composer.png`) });
        await dialog.getByRole('combobox', { name: 'Status', exact: true }).click();
        await expect(page.getByRole('option').first()).toBeVisible();
        await page.getByRole('listbox', { name: 'Status', exact: true }).evaluate((element) => {
          element.setAttribute('data-contrast-scope', 'status');
        });
        expect(await contrastFailures(page, '[data-contrast-scope="status"]')).toEqual([]);
        await page.keyboard.press('Escape');
        await page.keyboard.press('Escape');
      }
    });
  }
}
