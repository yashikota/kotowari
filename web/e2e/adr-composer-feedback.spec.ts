import { expect, test } from '@playwright/test';
import { contrastFailures } from './contrast.ts';

for (const scheme of ['light', 'dark']) {
  for (const context of ['create', 'revisit', 'project']) {
    test(`decision composer ${context} retains input and context in ${scheme}`, async ({
      page,
      request,
    }, testInfo) => {
      const slug = `composer-${context}-${scheme}-${Date.now()}`;
      const project = await request.post('/api/projects', { data: { name: slug, slug } });
      expect(project.ok()).toBeTruthy();
      const issue = await (await request.post('/api/issues', { data: { title: slug } })).json();
      const previous = await (
        await request.post('/api/adrs', {
          data: { title: `Previous ${slug}`, projectSlug: slug, issueNumbers: [issue.number] },
        })
      ).json();
      await page.addInitScript(
        (color) => localStorage.setItem('kotowari.color-scheme', color),
        scheme,
      );
      await page.setViewportSize({ width: 360, height: 800 });
      if (context === 'revisit') {
        await page.goto(`/adrs/${previous.identifier}`);
        await page.getByRole('button', { name: 'Revisit decision', exact: true }).click();
      } else if (context === 'project') {
        await page.goto(`/projects/${slug}`);
        await page.getByRole('button', { name: 'New ADR', exact: true }).click();
      } else {
        await page.goto('/adrs');
        await page.getByRole('button', { name: 'Create ADR', exact: true }).first().click();
      }
      const dialog = page.getByRole('dialog', {
        name: context === 'revisit' ? 'Revisit decision' : 'Create ADR',
        exact: true,
      });
      const input = dialog.getByRole('textbox', { name: 'ADR title', exact: true });
      if (context === 'revisit') await expect(input).toHaveValue(previous.title);
      const title = `Retained ${slug}`;
      await input.fill(title);
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const bodies: Record<string, unknown>[] = [];
      await page.route('**/api/adrs', async (route) => {
        if (route.request().method() !== 'POST') return route.continue();
        bodies.push(route.request().postDataJSON());
        if (bodies.length === 1) {
          await gate;
          return route.fulfill({ status: 503, json: { error: 'Decision creation unavailable' } });
        }
        return route.continue();
      });
      try {
        await input.press('Control+Enter');
        await expect.poll(() => bodies.length).toBe(1);
        await expect(input).toBeDisabled();
        await expect(dialog.getByRole('button', { name: 'Create', exact: true })).toBeDisabled();
        await page.keyboard.press('Escape');
        await expect(dialog).toBeVisible();
        release();
        await expect(dialog.getByRole('alert')).toContainText('Decision creation unavailable');
        await expect(input).toHaveValue(title);
        const retry = dialog.getByRole('button', { name: 'Retry creating decision', exact: true });
        await expect(retry).toBeFocused();
        expect(await contrastFailures(page, '[role="dialog"]')).toEqual([]);
        await page.screenshot({ path: testInfo.outputPath('decision-creation-failure.png') });
        await retry.click();
        await expect(dialog).toHaveCount(0);
        await expect(page).toHaveURL(/\/adrs\/ADR-\d+$/);
        expect(bodies).toHaveLength(2);
        expect(bodies[1]).toEqual(bodies[0]);
        const saved = await (await request.get(`/api/adrs/${page.url().split('/').at(-1)}`)).json();
        expect(saved.title).toBe(title);
        expect(saved.projectSlug ?? null).toBe(context === 'create' ? null : slug);
        expect(saved.supersedes).toBe(context === 'revisit' ? previous.number : null);
        expect(saved.issueNumbers).toEqual(context === 'revisit' ? [issue.number] : []);
        const all = await (await request.get('/api/adrs')).json();
        expect(all.filter((item: { title: string }) => item.title === title)).toHaveLength(1);
      } finally {
        release();
      }
    });
  }
}
