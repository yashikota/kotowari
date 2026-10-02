import { expect, test } from '@playwright/test';

for (const scheme of ['light', 'dark']) {
  test(`inbox mobile toolbar and notification focus in ${scheme}`, async ({
    page,
    request,
  }, testInfo) => {
    await page.addInitScript((value) => {
      localStorage.setItem('kotowari.color-scheme', value);
      localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
    }, scheme);
    await page.setViewportSize({ width: 360, height: 800 });
    const title = `InboxLayout${Date.now()} ${'LongTaskTitleWithoutSpaces'.repeat(8)}`;
    const response = await request.post('/api/issues', { data: { title, status: 'todo' } });
    expect(response.ok()).toBeTruthy();
    const issue = await response.json();
    await page.goto('/inbox');
    await expect(page.getByRole('heading', { name: 'Inbox', level: 2 })).toBeVisible();
    for (const name of ['Add filter', 'Display options', 'Notification actions']) {
      const button = page.getByRole('button', { name, exact: true });
      await expect(button).toBeVisible();
      const bounds = (await button.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(360);
    }
    const row = page
      .getByRole('region', { name: 'Notifications' })
      .getByRole('button', { name: new RegExp(issue.identifier) })
      .first();
    await row.focus();
    expect(
      await row.evaluate((element) => Number.parseFloat(getComputedStyle(element).outlineWidth)),
    ).toBeGreaterThanOrEqual(2);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBeTruthy();
    await page.screenshot({ path: testInfo.outputPath(`inbox-${scheme}.png`) });
    await row.press('Enter');
    const detail = page.getByRole('region', { name: 'Notification details' });
    await expect(detail).toBeFocused();
    await expect(detail.getByRole('heading', { name: title })).toBeVisible();
    expect(
      await detail.evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBeTruthy();
    await page.screenshot({ path: testInfo.outputPath(`inbox-detail-${scheme}.png`) });
    await detail.getByRole('button', { name: 'Back to inbox', exact: true }).click();
    await expect(row).toBeFocused();
    await request.delete(`/api/issues/${issue.identifier}`);
  });
}
