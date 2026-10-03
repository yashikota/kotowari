import { expect, test } from '@playwright/test';
import { contrastFailures } from './contrast.ts';

for (const scheme of ['light', 'dark']) {
  for (const kind of ['issues', 'projects']) {
    test(`${kind} hidden groups remain readable and operable in ${scheme}`, async ({
      page,
      request,
    }, testInfo) => {
      await page.addInitScript(
        (color) => localStorage.setItem('kotowari.color-scheme', color),
        scheme,
      );
      const stamp = `${kind}-${scheme}-${Date.now()}`;
      for (const status of kind === 'issues' ? ['todo', 'in_progress'] : ['planned', 'started']) {
        const response = await request.post(`/api/${kind}`, {
          data:
            kind === 'issues'
              ? { title: `${stamp}-${status}`, status }
              : { name: `${stamp}-${status}`, slug: `${stamp}-${status}`, status },
        });
        expect(response.ok()).toBeTruthy();
      }
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto(`/${kind}`);
      if (kind === 'issues')
        await page.getByRole('tab', { name: 'All issues', exact: true }).click();
      await page.getByRole('button', { name: 'Display options', exact: true }).click();
      if (kind === 'issues')
        await page.getByRole('combobox', { name: 'Grouping', exact: true }).selectOption('status');
      if (kind === 'projects') await page.getByRole('tab', { name: 'Board', exact: true }).click();
      await page
        .getByRole('button', { name: 'Group ordering', exact: true })
        .click({ timeout: 5000 });
      const hide = page.getByRole('button', { name: /^Hide / }).first();
      const label = (await hide.getAttribute('aria-label'))!.replace(/^Hide /, '');
      await hide.click();
      const show = page.getByRole('button', { name: `Show ${label}`, exact: true });
      await expect(show).toBeEnabled();
      expect((await show.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      if (kind === 'issues') {
        await expect(page).toHaveURL(/hiddenGroups=/);
        await page.reload();
        await page.getByRole('button', { name: 'Display options', exact: true }).click();
        await page.getByRole('button', { name: 'Group ordering', exact: true }).click();
        await expect(show).toBeEnabled();
      }
      await expect(show.locator('..')).toHaveCSS('opacity', '1');
      expect(await contrastFailures(page, '.mantine-Popover-dropdown')).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath('hidden-group.png') });
      await show.click();
      await expect(page.getByRole('button', { name: `Hide ${label}`, exact: true })).toBeVisible();
      const move = page.getByRole('button', { name: `Move ${label} down`, exact: true });
      await expect(move).toBeEnabled();
      expect((await move.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await move.click();
      if (kind === 'issues') {
        await expect(page).toHaveURL(/groupOrder=/);
        await page.reload();
        await page.getByRole('button', { name: 'Display options', exact: true }).click();
        await page.getByRole('button', { name: 'Group ordering', exact: true }).click();
        await expect(page.getByRole('listitem').first()).not.toContainText(label);
      }
    });
  }
}
