import { expect, test } from '@playwright/test';
import { contrastFailures } from './contrast.ts';
import { fillIssueSearch } from './issue-list-controls.ts';

for (const scheme of ['light', 'dark']) {
  test(`issue copy retains its value after clipboard rejection in ${scheme}`, async ({
    page,
    request,
  }, testInfo) => {
    const response = await request.post('/api/issues', {
      data: { title: `Copy feedback ${Date.now()}` },
    });
    const issue = (await response.json()) as { identifier: string };
    try {
      await page.addInitScript((color) => {
        localStorage.setItem('kotowari.color-scheme', color);
        localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
        const state = window as unknown as { copies: string[] };
        state.copies = [];
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: {
            writeText: (text: string) => {
              state.copies.push(text);
              if (state.copies.length === 1)
                return new Promise<void>((_resolve, reject) => {
                  window.addEventListener(
                    'release-copy',
                    () =>
                      reject(new DOMException('Clipboard permission denied', 'NotAllowedError')),
                    { once: true },
                  );
                });
              return Promise.resolve();
            },
          },
        });
      }, scheme);
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto(`/issues/${issue.identifier}`);
      const trigger = page.getByRole('button', { name: 'Copy URL', exact: true });
      const url = page.url();
      await trigger.click();
      await expect(trigger).toBeDisabled();
      const feedback = page.locator('[data-issue-copy-feedback]');
      await expect(feedback.getByRole('status')).toContainText('Copying');
      await page.evaluate(() => window.dispatchEvent(new Event('release-copy')));
      await expect(feedback.getByRole('alert')).toContainText('Clipboard permission denied');
      const retry = feedback.getByRole('button', { name: 'Retry copying' });
      await expect(retry).toBeFocused();
      expect(await contrastFailures(page, '[data-issue-copy-feedback]')).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath('issue-copy-failure.png') });
      await retry.click();
      await expect(feedback.getByRole('alert')).toHaveCount(0);
      await expect(feedback.getByRole('status')).toContainText('Copied');
      await expect(trigger).toBeFocused();
      expect(await page.evaluate(() => (window as unknown as { copies: string[] }).copies)).toEqual(
        [url, url],
      );
    } finally {
      await request.delete(`/api/issues/${issue.identifier}`);
    }
  });
}

for (const scenario of ['editing', 'late failure', 'late success']) {
  test(`issue clipboard preserves context during ${scenario}`, async ({ page, request }) => {
    const stamp = `Clipboard context ${scenario} ${Date.now()}`;
    const issues: { identifier: string; title: string }[] = [];
    for (let index = 0; index < (scenario === 'editing' ? 1 : 2); index++) {
      const response = await request.post('/api/issues', { data: { title: `${stamp} ${index}` } });
      expect(response.ok()).toBeTruthy();
      issues.push(await response.json());
    }
    try {
      await page.addInitScript((success) => {
        let attempts = 0;
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: {
            writeText: () => {
              if (++attempts > 1) return Promise.resolve();
              return new Promise<void>((resolve, reject) => {
                window.addEventListener(
                  'release-copy',
                  () => {
                    if (success) resolve();
                    else reject(new DOMException('Clipboard rejected', 'NotAllowedError'));
                  },
                  { once: true },
                );
              });
            },
          },
        });
      }, scenario === 'late success');
      if (scenario === 'editing') await page.goto(`/issues/${issues[0]!.identifier}`);
      else {
        await page.goto('/issues');
        await fillIssueSearch(page, stamp);
        const rows = page.getByRole('listbox', { name: 'Issues' }).getByRole('option');
        await expect(rows).toHaveCount(2);
        await rows.first().click();
      }
      const oldId = new URL(page.url()).pathname.split('/').at(-1)!;
      const title = page.getByRole('textbox', { name: 'Issue title', exact: true });
      const copy = page.getByRole('button', { name: 'Copy URL', exact: true });
      await expect(copy).toBeVisible();
      await copy.click();
      const feedback = page.locator('[data-issue-copy-feedback]');
      await expect(feedback.getByRole('status')).toContainText('Copying');
      if (scenario === 'editing') await title.focus();
      else {
        await page.getByRole('button', { name: 'Navigate to next issue' }).click();
        const next = issues.find((issue) => issue.identifier !== oldId)!;
        await expect(page).toHaveURL(new RegExp(`/issues/${next.identifier}$`));
        await expect(title).toHaveValue(next.title);
        await title.focus();
        await title.evaluate((element) => element.blur());
      }
      await page.evaluate(async () => {
        window.dispatchEvent(new Event('release-copy'));
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
      });
      if (scenario === 'editing') await expect(title).toBeFocused();
      else expect(await page.evaluate(() => document.activeElement === document.body)).toBeTruthy();
      if (scenario === 'editing')
        await expect(feedback.getByRole('alert')).toContainText('Clipboard rejected');
      else {
        await expect(feedback.getByRole('alert')).toHaveCount(0);
        await expect(feedback.getByRole('status')).toHaveCount(0);
        await expect(copy).toBeEnabled();
        await copy.click();
        await expect(feedback.getByRole('status')).toContainText('Copied');
      }
    } finally {
      for (const issue of issues) await request.delete(`/api/issues/${issue.identifier}`);
    }
  });
}

for (const entry of [
  'menu',
  'keyboard',
  'keyboard from route landing',
  'menu with reduced motion',
]) {
  test(`issue title copy recovers from ${entry}`, async ({ page, request }) => {
    const title = `Copy title ${entry} ${Date.now()}`;
    const response = await request.post('/api/issues', { data: { title } });
    const issue = (await response.json()) as { identifier: string };
    try {
      if (entry.includes('reduced motion')) await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.addInitScript(() => {
        const state = window as unknown as { copies: string[] };
        state.copies = [];
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: {
            writeText: (text: string) => {
              state.copies.push(text);
              return state.copies.length === 1
                ? Promise.reject(new DOMException('Clipboard denied', 'NotAllowedError'))
                : Promise.resolve();
            },
          },
        });
      });
      await page.goto(`/issues/${issue.identifier}`);
      const options = page.getByRole('button', { name: 'Issue options', exact: true });
      await expect(options).toBeVisible();
      if (entry.startsWith('menu')) {
        await options.click();
        await page.getByRole('menuitem', { name: 'Copy', exact: true }).hover();
        await page.getByRole('menuitem', { name: 'Copy title', exact: true }).click();
      } else {
        if (entry === 'keyboard from route landing')
          await page.locator('[data-route-content]').focus();
        else await options.focus();
        await page.keyboard.press('Control+Shift+Quote');
      }
      const retry = page
        .locator('[data-issue-copy-feedback]')
        .getByRole('button', { name: 'Retry copying' });
      await expect(retry).toBeFocused();
      await retry.click();
      await expect(page.locator('[data-issue-copy-feedback]').getByRole('status')).toContainText(
        'Copied',
      );
      await expect(options).toBeFocused();
      expect(await page.evaluate(() => (window as unknown as { copies: string[] }).copies)).toEqual(
        [title, title],
      );
    } finally {
      await request.delete(`/api/issues/${issue.identifier}`);
    }
  });
}
