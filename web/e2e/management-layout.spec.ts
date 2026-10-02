import { expect, test } from '@playwright/test';

for (const kind of ['templates', 'recurring']) {
  test(`${kind} management rows keep long content and actions reachable on mobile`, async ({
    page,
  }, testInfo) => {
    const name = 'A recurring work or template name with enough detail to understand its purpose';
    await page.route(
      kind === 'templates' ? '**/api/issue-templates' : '**/api/recurring-issues',
      (route) =>
        route.fulfill({
          json: [
            {
              slug: 'long-name',
              name,
              title: 'A detailed task title for the next piece of work',
              body: 'Useful context for this task.',
              enabled: true,
              interval: 1,
              unit: 'week',
              nextDueDate: '2026-10-09',
            },
          ],
        }),
    );
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`/${kind}`);
    const row = page.getByRole('listitem').filter({ hasText: name });
    await expect(row).toBeVisible();
    const action = row.getByRole('button', {
      name: kind === 'templates' ? 'Delete template' : 'Delete schedule',
      exact: true,
    });
    await expect(action).toBeInViewport();
    expect(
      await row.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
    ).toBeTruthy();
    const textBounds = await row.getByText(name, { exact: true }).boundingBox();
    const actionBounds = await action.boundingBox();
    expect(actionBounds!.y).toBeGreaterThan(textBounds!.y + textBounds!.height);
    page.once('dialog', (dialog) => dialog.dismiss());
    await action.click();
    await expect(row).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`${kind}-mobile.png`) });
  });
}
