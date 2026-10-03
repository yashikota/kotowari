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
        data: { name: `Contrast project ${stamp}`, slug: `contrast-${stamp}` },
      });
      expect(projectResponse.ok()).toBeTruthy();
      const documentResponse = await request.post('/api/pages', {
        data: { title: `Contrast document ${stamp}`, slug: `contrast-${stamp}` },
      });
      expect(documentResponse.ok()).toBeTruthy();
      const failures: unknown[] = [];
      for (const route of [
        '/issues',
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
      ]) {
        await page.goto(route);
        await expect(page.locator('main')).toBeVisible();
        await page.waitForLoadState('networkidle');
        if (route === '/config') {
          const name = page.getByRole('textbox', { name: 'Name', exact: true });
          await name.focus();
          await expect(name).toHaveCSS('outline-width', '2px');
        }
        const results = await contrastFailures(page);
        failures.push(...results.map((result) => ({ route, ...result })));
        if (route === '/config')
          await page.screenshot({ path: testInfo.outputPath('contrast-settings.png') });
      }
      await page.screenshot({ path: testInfo.outputPath('contrast-document.png') });
      expect(failures).toEqual([]);
    });
  }
}
