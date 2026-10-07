import { INITIATIVE_COLORS } from '../src/initiative-options.ts';
import { contrastFailures } from './contrast.ts';
import { expect, test } from '@playwright/test';

for (const scheme of ['light', 'dark']) {
  for (const width of [360, 1280]) {
    test(`visible text meets AA contrast in ${scheme} at ${width}px`, async ({
      page,
      request,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 800 });
      await page.addInitScript(
        (color) => localStorage.setItem('kotowari.color-scheme', color),
        scheme,
      );
      const stamp = `${scheme}-${Date.now()}`;
      const issueResponse = await request.post('/api/issues', {
        data: {
          title: `Contrast issue ${stamp}`,
          status: 'in_progress',
          priority: 1,
          body: 'Readable issue content',
          dueDate: '2020-01-02',
        },
      });
      expect(issueResponse.ok()).toBeTruthy();
      const issue = await issueResponse.json();
      const labelResponse = await request.post('/api/labels', {
        data: { name: `Contrast label ${stamp}`, color: '#d4a05a' },
      });
      expect(labelResponse.ok()).toBeTruthy();
      const label = await labelResponse.json();
      expect(
        (
          await request.patch(`/api/issues/${issue.identifier}`, { data: { labelIds: [label.id] } })
        ).ok(),
      ).toBeTruthy();
      const projectResponse = await request.post('/api/projects', {
        data: {
          name: `Contrast project ${stamp}`,
          slug: `contrast-${stamp}`,
          icon: 'bolt',
          iconColor: '#ffffff',
        },
      });
      expect(projectResponse.ok()).toBeTruthy();
      const iconRoutes: string[] = [];
      for (const iconColor of [
        'yellow',
        'orange',
        'grey',
        'blue',
        'purple',
        'pink',
        'red',
        'green',
        '#000000',
        '#eeeeee',
      ]) {
        const slug = `icon-${iconColor.replace('#', '')}-${stamp}`;
        const response = await request.post('/api/projects', {
          data: {
            name: `Icon ${iconColor} ${stamp}`,
            slug,
            icon: 'bolt',
            iconColor,
          },
        });
        expect(response.ok()).toBeTruthy();
        iconRoutes.push(`/projects/${slug}`);
      }
      const initiativeSlugs: string[] = [];
      for (const color of [...INITIATIVE_COLORS, '#ffffff', '#000000', '#eeeeee']) {
        const slug = `initiative-contrast-${color.replace('#', '')}-${stamp}`;
        const response = await request.post('/api/initiatives', {
          data: { name: `Initiative ${color} ${stamp}`, slug, color },
        });
        expect(response.ok()).toBeTruthy();
        initiativeSlugs.push(slug);
      }
      const documentResponse = await request.post('/api/pages', {
        data: { title: `Contrast document ${stamp}`, slug: `contrast-${stamp}` },
      });
      expect(documentResponse.ok()).toBeTruthy();
      const failures: unknown[] = [];
      for (const route of [
        '/',
        '/issues',
        '/board',
        '/projects',
        '/initiatives',
        '/cycles',
        '/inbox',
        '/drafts',
        '/reminders',
        '/reviews',
        '/pages',
        '/adrs',
        '/templates',
        '/recurring',
        '/views',
        '/config',
        `/issues/${issue.identifier}`,
        `/projects/contrast-${stamp}`,
        `/pages/contrast-${stamp}`,
        ...iconRoutes,
      ]) {
        await page.goto(route);
        await expect(page.locator('main')).toBeVisible();
        await page.waitForLoadState('networkidle');
        if (route.startsWith('/projects/')) {
          await expect(page.locator('main [data-contrast-icon]').first()).toBeVisible();
          if (route === `/projects/contrast-${stamp}`)
            await page.screenshot({ path: testInfo.outputPath('contrast-project-icon.png') });
        }
        if (route === '/initiatives') {
          await expect(page.locator('main [data-contrast-icon]').first()).toBeVisible();
          await page.screenshot({ path: testInfo.outputPath('contrast-initiatives.png') });
          for (const slug of initiativeSlugs) {
            const row = page.locator('main tr').filter({
              has: page.locator(`a[href="/initiatives/${slug}"]`),
            });
            await row.scrollIntoViewIfNeeded();
            failures.push(
              ...(await contrastFailures(page)).map((result) => ({ route, ...result })),
            );
          }
        }
        if (route === '/config') {
          const name = page.getByRole('textbox', { name: 'Name', exact: true });
          await expect(page.locator('main [data-combobox-chevron]').first()).toHaveAttribute(
            'data-contrast-icon',
            'Selection indicator',
          );
          await name.focus();
          await expect(name).toHaveCSS('outline-width', '2px');
          await expect(page.getByRole('button', { name: 'Save workspace', exact: true })).toHaveCSS(
            'border-top-color',
            scheme === 'light' ? 'rgb(115, 123, 131)' : 'rgb(166, 167, 171)',
          );
        }
        const results = await contrastFailures(page, 'body', true);
        failures.push(...results.map((result) => ({ route, ...result })));
        const focusTarget = page
          .locator('main :is(button:not(:disabled), a[href], input:not(:disabled)):visible')
          .first();
        if (await focusTarget.count()) {
          await focusTarget.focus();
          failures.push(
            ...(await contrastFailures(page)).map((result) => ({
              route: `${route} focused control`,
              ...result,
            })),
          );
        }
        if (route.startsWith('/projects/icon-yellow-')) {
          await page.getByRole('button', { name: 'Choose project icon' }).click();
          await expect(page.locator('[data-contrast-icon="Selected icon color"]')).toBeVisible();
          failures.push(
            ...(await contrastFailures(page, '.mantine-Popover-dropdown[role="dialog"]')).map(
              (result) => ({
                route: `${route} icon picker`,
                ...result,
              }),
            ),
          );
          await page.screenshot({ path: testInfo.outputPath('contrast-icon-picker.png') });
        }
        if (route === '/config')
          await page.screenshot({ path: testInfo.outputPath('contrast-settings.png') });
      }
      await page.screenshot({ path: testInfo.outputPath('contrast-document.png') });
      for (const slug of initiativeSlugs) await request.delete(`/api/initiatives/${slug}`);
      expect(failures).toEqual([]);
    });
  }
}
