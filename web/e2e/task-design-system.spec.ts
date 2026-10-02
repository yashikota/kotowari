import { expect, test } from '@playwright/test';
import { fillIssueSearch } from './issue-list-controls.ts';

for (const scheme of ['light', 'dark']) {
  test(`board surfaces and keyboard focus follow the ${scheme} theme`, async ({
    page,
    request,
  }, testInfo) => {
    await page.addInitScript(
      (value) => localStorage.setItem('kotowari.color-scheme', value),
      scheme,
    );
    const title = `Theme board ${scheme} ${Date.now()}`;
    const response = await request.post('/api/issues', { data: { title, status: 'todo' } });
    expect(response.ok()).toBeTruthy();
    const issue = await response.json();
    await page.goto('/issues?layout=board');
    await fillIssueSearch(page, title);
    const card = page.locator('[data-issue-board-card]').filter({ hasText: title });
    await expect(card).toBeVisible();
    const surface = await card.evaluate((element) => ({
      card: getComputedStyle(element).backgroundColor,
      body: getComputedStyle(document.body).backgroundColor,
    }));
    expect(surface.card).toBe(surface.body);
    await page.getByRole('checkbox', { name: `Select ${issue.identifier}`, exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(card).toBeFocused();
    await expect
      .poll(() =>
        card.evaluate((element) => Number.parseFloat(getComputedStyle(element).outlineWidth)),
      )
      .toBeGreaterThanOrEqual(2);
    await page.screenshot({ path: testInfo.outputPath(`board-${scheme}.png`) });
    await request.delete(`/api/issues/${issue.identifier}`);
  });
}

test.describe('touch selection', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test('issue selection stays discoverable in list and board layouts without hover', async ({
    page,
    request,
  }) => {
    const title = `Touch selection ${Date.now()}`;
    const response = await request.post('/api/issues', { data: { title, status: 'todo' } });
    expect(response.ok()).toBeTruthy();
    const issue = await response.json();
    for (const layout of ['list', 'board']) {
      await page.goto(`/issues?layout=${layout}`);
      await fillIssueSearch(page, title);
      const checkbox = page.getByRole('checkbox', {
        name: `Select ${issue.identifier}`,
        exact: true,
      });
      await expect(checkbox).toBeVisible();
      expect(
        await checkbox.evaluate((element) => {
          let current: Element | null = element;
          while (current) {
            if (getComputedStyle(current).opacity === '0') return false;
            current = current.parentElement;
          }
          return true;
        }),
      ).toBeTruthy();
      await checkbox.check();
      await expect(checkbox).toBeChecked();
      await checkbox.uncheck();
    }
    await request.delete(`/api/issues/${issue.identifier}`);
  });
});
