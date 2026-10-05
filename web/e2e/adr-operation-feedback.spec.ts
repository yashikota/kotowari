import { expect, test } from '@playwright/test';
import { contrastFailures } from './contrast.ts';

for (const scheme of ['light', 'dark']) {
  for (const kind of ['publish', 'link', 'unlink'] as const) {
    test(`decision ${kind} blocks duplicate actions and retries in ${scheme}`, async ({
      page,
      request,
    }, testInfo) => {
      const issue = await (
        await request.post('/api/issues', { data: { title: `Operation issue ${Date.now()}` } })
      ).json();
      const adr = await (
        await request.post('/api/adrs', {
          data: {
            title: `Operation decision ${Date.now()}`,
            issueNumbers: kind === 'unlink' ? [issue.number] : [],
          },
        })
      ).json();
      await page.addInitScript((color) => {
        localStorage.setItem('kotowari.color-scheme', color);
        localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
      }, scheme);
      await page.setViewportSize({ width: 360, height: 800 });
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const url =
        kind === 'publish'
          ? `/api/adrs/${adr.identifier}/publish`
          : `/api/adrs/${adr.identifier}/links/issues${kind === 'unlink' ? `/${issue.number}` : ''}`;
      const writes: { method: string; body: string | null }[] = [];
      await page.route(`**${url}`, async (route) => {
        writes.push({ method: route.request().method(), body: route.request().postData() });
        if (writes.length === 1) {
          await gate;
          return route.fulfill({ status: 503, json: { error: 'Decision operation unavailable' } });
        }
        return route.continue();
      });
      try {
        await page.goto(`/adrs/${adr.identifier}`);
        const title = page.getByLabel('ADR title', { exact: true });
        const publish = page.getByRole('button', { name: 'Publish', exact: true });
        const choice = page.getByLabel('Link issue', { exact: true });
        await expect(choice).toBeEnabled();
        if (kind === 'link') await choice.selectOption(String(issue.number));
        const trigger =
          kind === 'publish'
            ? publish
            : page.getByRole('button', {
                name: kind === 'link' ? 'Link' : `Unlink ${issue.identifier}`,
                exact: true,
              });
        await trigger.click();
        await expect.poll(() => writes.length).toBe(1);
        await expect(trigger).toBeDisabled();
        await expect(title).toBeDisabled();
        await expect(choice).toBeDisabled();
        release();
        await expect(page.getByRole('alert')).toContainText('Decision operation unavailable');
        const retry = page.getByRole('button', { name: 'Retry operation', exact: true });
        await expect(retry).toBeFocused();
        if (kind === 'link') await expect(choice).toHaveValue(String(issue.number));
        expect(await contrastFailures(page)).toEqual([]);
        await page.screenshot({ path: testInfo.outputPath('decision-operation-failure.png') });
        let reads = 0;
        await page.route(`**/api/adrs/${adr.identifier}`, (route) => {
          if (route.request().method() === 'GET') {
            reads++;
            return route.fulfill({
              status: 503,
              json: { error: 'Read unavailable after operation' },
            });
          }
          return route.continue();
        });
        await retry.click();
        await expect(page.getByRole('alert')).toHaveCount(0);
        await expect(
          page.getByRole('status').filter({
            hasText:
              kind === 'publish'
                ? 'Decision published'
                : kind === 'link'
                  ? 'Issue linked'
                  : 'Issue unlinked',
          }),
        ).toBeVisible();
        await expect(kind === 'publish' ? publish : choice).toBeFocused();
        expect(writes).toHaveLength(2);
        expect(writes[1]).toEqual(writes[0]);
        expect(reads).toBe(0);
        const saved = await (await request.get(`/api/adrs/${adr.identifier}`)).json();
        if (kind === 'publish') expect(saved.status).toBe('accepted');
        else expect(saved.issueNumbers.includes(issue.number)).toBe(kind === 'link');
        if (kind === 'link') await expect(choice).toHaveValue('');
        if (kind === 'unlink')
          await expect(
            page.getByRole('button', { name: `Unlink ${issue.identifier}`, exact: true }),
          ).toHaveCount(0);
      } finally {
        release();
      }
    });
  }
}
