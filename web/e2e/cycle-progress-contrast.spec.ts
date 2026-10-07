import { expect, test } from '@playwright/test';
import { contrastRatio } from '../src/design-system/contrast.ts';
import { contrastFailures } from './contrast.ts';

for (const scheme of ['light', 'dark']) {
  test(`cycle progress colors remain visible in ${scheme}`, async ({ page, request }, testInfo) => {
    await page.addInitScript(
      (value) => localStorage.setItem('kotowari.color-scheme', value),
      scheme,
    );
    const now = Date.now();
    const cycleResponse = await request.post('/api/cycles', {
      data: {
        startsAt: new Date(now - 86400000).toISOString(),
        endsAt: new Date(now + 86400000).toISOString(),
        status: 'active',
      },
    });
    expect(cycleResponse.ok()).toBeTruthy();
    const cycle = await cycleResponse.json();
    for (const [index, color] of ['#ffffff', '#000000', '#ffff00'].entries()) {
      const labelResponse = await request.post('/api/labels', {
        data: { name: `Contrast ${scheme} ${index} ${now}`, color },
      });
      expect(labelResponse.ok()).toBeTruthy();
      const label = await labelResponse.json();
      for (const status of ['done', 'todo']) {
        const response = await request.post('/api/issues', {
          data: {
            title: `Progress ${index} ${status}`,
            cycleId: cycle.id,
            status,
            estimate: 2,
            priority: 3,
            labelIds: [label.id],
          },
        });
        expect(response.ok()).toBeTruthy();
      }
    }
    await page.goto(`/cycles/${cycle.number}`);
    const expand = page.getByRole('button', { name: 'Expand progress section', exact: true });
    if (await expand.isVisible()) await expand.click();
    const grouping = page.getByRole('combobox', { name: 'Group cycle progress by' });
    await expect(grouping).toBeVisible();
    await expect(page.locator('.mantine-Progress-section').first()).toBeVisible();
    expect(await contrastFailures(page)).toEqual([]);
    for (const name of ['Priority', 'Labels']) {
      await grouping.click();
      await page.getByRole('option', { name, exact: true }).click();
      const rings = page.locator('#cycle-progress-content .mantine-RingProgress-root circle');
      await expect(rings.first()).toBeVisible();
      const colors = await rings.evaluateAll((elements) =>
        elements.map((element) => {
          const hex = (rgb: string) =>
            '#' +
            rgb
              .match(/[\d.]+/g)!
              .slice(0, 3)
              .map((value) => Math.round(Number(value)).toString(16).padStart(2, '0'))
              .join('');
          let parent: Element | null = element;
          while (parent && getComputedStyle(parent).backgroundColor === 'rgba(0, 0, 0, 0)')
            parent = parent.parentElement;
          return {
            color: hex(getComputedStyle(element).stroke),
            background: hex(getComputedStyle(parent!).backgroundColor),
          };
        }),
      );
      for (const pair of colors)
        expect(
          contrastRatio(pair.color, pair.background),
          JSON.stringify(pair),
        ).toBeGreaterThanOrEqual(3);
      expect(await contrastFailures(page, '#cycle-progress-content')).toEqual([]);
    }
    await page.locator('#cycle-progress-content [role="img"]').first().hover();
    await expect(page.locator('.mantine-Tooltip-tooltip')).toBeVisible();
    expect(await contrastFailures(page, '.mantine-Tooltip-tooltip')).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('cycle-label-progress.png') });
  });
}
