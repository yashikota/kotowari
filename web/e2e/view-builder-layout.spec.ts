import { expect, test } from '@playwright/test';

for (const scheme of ['light', 'dark']) {
  for (const path of ['/views/new', '/views/projects/new']) {
    test(`${path} has readable creation controls in ${scheme}`, async ({ page }, testInfo) => {
      await page.addInitScript((value) => {
        localStorage.setItem('kotowari.color-scheme', value);
        localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
      }, scheme);
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto(path);
      const name = page.getByRole('textbox', { name: 'View name', exact: true });
      await name.fill('A useful view with a long name for planning the next steps');
      await expect(page.getByText('View name', { exact: true })).toBeVisible();
      const description = page.getByRole('textbox', { name: 'Description', exact: true });
      await description.fill('Keep the relevant work together and explain when to use this view.');
      expect((await name.boundingBox())!.width).toBeGreaterThan(220);
      for (const label of ['Create view', 'Cancel']) {
        const button = page.getByRole('button', { name: label, exact: true });
        await expect(button).toBeVisible();
        const bounds = (await button.boundingBox())!;
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(360);
      }
      await page.screenshot({ path: testInfo.outputPath('builder.png') });
    });
  }
}
