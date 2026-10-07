import { expect, test } from '@playwright/test';
import { contrastFailures } from './contrast.ts';

for (const scheme of ['light', 'dark']) {
  for (const context of ['pages', 'project']) {
    test(`document creation retains its exact payload and retries from ${context} in ${scheme}`, async ({
      page,
      request,
    }, testInfo) => {
      const slug = `page-composer-${context}-${scheme}-${Date.now()}`;
      const response = await request.post('/api/projects', { data: { name: slug, slug } });
      expect(response.ok()).toBeTruthy();
      const project = await response.json();
      await page.addInitScript((color) => {
        localStorage.setItem('kotowari.color-scheme', color);
        localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
      }, scheme);
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto(context === 'project' ? `/projects/${slug}` : '/pages');
      const open = page.getByRole('button', { name: 'Create page', exact: true }).first();
      await open.click();
      const dialog = page.getByRole('dialog', { name: 'Create page', exact: true });
      const title = dialog.getByRole('textbox', { name: 'Page title', exact: true });
      const choice = dialog.getByLabel('Project', { exact: true });
      await expect(choice).toHaveValue(context === 'project' ? String(project.id) : '');
      const value = '読める文書';
      await title.fill(value);
      const bodies: Record<string, unknown>[] = [];
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route('**/api/pages', async (route) => {
        if (route.request().method() !== 'POST') return route.continue();
        bodies.push(route.request().postDataJSON());
        if (bodies.length === 1) {
          await gate;
          return route.fulfill({ status: 503, json: { error: 'Document creation unavailable' } });
        }
        return route.continue();
      });
      try {
        await title.press('Control+Enter');
        await expect.poll(() => bodies.length).toBe(1);
        await expect(title).toBeDisabled();
        await expect(choice).toBeDisabled();
        await page.keyboard.press('Escape');
        await expect(dialog).toBeVisible();
        release();
        await expect(dialog.getByRole('alert')).toContainText('Document creation unavailable');
        const retry = dialog.getByRole('button', { name: 'Retry creating document', exact: true });
        await expect(retry).toBeFocused();
        expect(await contrastFailures(page, '[role="dialog"]')).toEqual([]);
        await page.screenshot({ path: testInfo.outputPath('document-creation-failure.png') });
        await expect(title).toHaveValue(value);
        await page.keyboard.press('Escape');
        await expect(dialog).toHaveCount(0);
        await open.click();
        await expect(title).toHaveValue(value);
        await expect(choice).toHaveValue(context === 'project' ? String(project.id) : '');
        await retry.click();
        await expect(dialog).toHaveCount(0);
        await expect(page).toHaveURL(new RegExp(`/pages/${bodies[0]!.slug}$`));
        expect(bodies).toHaveLength(2);
        expect(bodies[1]).toEqual(bodies[0]);
        const saved = await (await request.get(`/api/pages/${bodies[0]!.slug}`)).json();
        expect(saved.title).toBe(value);
        expect(saved.projectId ?? null).toBe(context === 'project' ? project.id : null);
      } finally {
        release();
      }
    });
  }
}
