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
        const results = await page.evaluate(() => {
          const rgb = (value: string) => {
            const channels = (value.match(/[\d.]+/g) ?? []).map(Number);
            return value.startsWith('color(srgb')
              ? channels.map((channel, index) => (index < 3 ? channel * 255 : channel))
              : channels;
          };
          const blend = (front: number[], back: number[]) => {
            const alpha = front[3] ?? 1;
            return front.slice(0, 3).map((value, i) => value * alpha + back[i]! * (1 - alpha));
          };
          const luminance = (color: number[]) =>
            color
              .slice(0, 3)
              .map((v) => {
                const x = v / 255;
                return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
              })
              .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i]!, 0);
          const failures: { text: string; color: string; background: number[]; ratio: number }[] =
            [];
          for (const element of document.querySelectorAll<HTMLElement>('body *')) {
            if (
              !element.matches('input:not([type=checkbox]):not([type=radio]), textarea, select') &&
              !Array.from(element.childNodes).some(
                (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
              )
            )
              continue;
            if (element.closest('svg, script, style, [disabled], [aria-disabled="true"]')) continue;
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            if (
              !rect.width ||
              !rect.height ||
              rect.bottom < 0 ||
              rect.top >= innerHeight ||
              style.visibility === 'hidden'
            )
              continue;
            const ancestors: Element[] = [];
            let ancestor: Element | null = element;
            let hidden = false;
            while (ancestor) {
              if (Number(getComputedStyle(ancestor).opacity) === 0) hidden = true;
              ancestors.unshift(ancestor);
              ancestor = ancestor.parentElement;
            }
            if (hidden) continue;
            let background = [255, 255, 255];
            for (const parent of ancestors)
              background = blend(rgb(getComputedStyle(parent).backgroundColor), background);
            if (element.matches('input, textarea, select')) {
              const check = (color: string, minimum: number, label: string) => {
                const foreground = luminance(blend(rgb(color), background));
                const surface = luminance(background);
                const ratio =
                  (Math.max(foreground, surface) + 0.05) / (Math.min(foreground, surface) + 0.05);
                if (ratio < minimum) failures.push({ text: label, color, background, ratio });
              };
              if (element.matches(':focus-visible')) check(style.outlineColor, 3, 'Keyboard focus');
              if (element.getAttribute('placeholder'))
                check(getComputedStyle(element, '::placeholder').color, 4.5, 'Input placeholder');
              if (
                style.borderTopStyle !== 'none' &&
                Number.parseFloat(style.borderTopWidth) > 0 &&
                (rgb(style.borderTopColor)[3] ?? 1) > 0
              )
                check(style.borderTopColor, 3, 'Input boundary');
            }
            const a = luminance(blend(rgb(style.color), background));
            const b = luminance(background);
            const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
            const large =
              Number.parseFloat(style.fontSize) >= 24 ||
              (Number.parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700);
            if (ratio < (large ? 3 : 4.5))
              failures.push({
                text: element.textContent!.trim().slice(0, 70),
                color: style.color,
                background,
                ratio,
              });
          }
          return failures;
        });
        failures.push(...results.map((result) => ({ route, ...result })));
        if (route === '/config')
          await page.screenshot({ path: testInfo.outputPath('contrast-settings.png') });
      }
      await page.screenshot({ path: testInfo.outputPath('contrast-document.png') });
      expect(failures).toEqual([]);
    });
  }
}
