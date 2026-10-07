import { expect, test } from '@playwright/test';
import { contrastFailures } from './contrast.ts';

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
