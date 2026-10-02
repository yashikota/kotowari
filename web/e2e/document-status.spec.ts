import { expect, test } from '@playwright/test';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import ja from '../src/i18n/locales/ja.json' with { type: 'json' };

for (const [locale, labels] of [
  ['en', en],
  ['ja', ja],
] as const) {
  test(`document save feedback follows ${locale} and preserves drafts on failure`, async ({
    page,
    request,
  }) => {
    const slug = `status-${locale}-${Date.now()}`;
    expect((await request.post('/api/pages', { data: { title: slug, slug } })).ok()).toBeTruthy();
    await page.route('**/api/workspace', async (route) => {
      const response = await route.fetch();
      await route.fulfill({ json: { ...(await response.json()), locale } });
    });
    await page.route(`**/api/documents/pages/${slug}/body`, (route) =>
      route.fulfill({ status: 500, json: { error: 'Load unavailable' } }),
    );
    await page.goto(`/pages/${slug}`);
    const editor = page.getByRole('region', { name: labels.ui.documentEditor });
    await expect(editor.getByRole('status')).toHaveText(labels.documentEditorStatus.loadFailed);
    await expect(editor.getByRole('alert')).toBeVisible();
    await page.unroute(`**/api/documents/pages/${slug}/body`);
    await editor
      .getByRole('button', { name: labels.documentEditorStatus.retry, exact: true })
      .click();
    await expect(editor.getByRole('alert')).toHaveCount(0);
    await expect(editor.getByRole('status')).toHaveText(labels.documentEditorStatus.saved);
    await editor.getByRole('radiogroup').getByText(labels.ui.edit, { exact: true }).click();
    const body = editor.getByRole('textbox', { name: labels.ui.markdownBody });
    await body.fill('Preserve this draft');
    await expect(editor.getByRole('status')).toHaveText(labels.documentEditorStatus.unsaved);
    await page.route(`**/api/documents/pages/${slug}/body`, (route) =>
      route.request().method() === 'PUT'
        ? route.fulfill({ status: 500, json: { error: 'Save unavailable' } })
        : route.continue(),
    );
    await editor.getByRole('button', { name: labels.common.save, exact: true }).click();
    await expect(editor.getByRole('status')).toHaveText(labels.documentEditorStatus.failed);
    await expect(body).toHaveValue('Preserve this draft');
    await page.unroute(`**/api/documents/pages/${slug}/body`);
    await editor.getByRole('button', { name: labels.common.save, exact: true }).click();
    await expect(editor.getByRole('status')).toHaveText(labels.documentEditorStatus.saved);
    await request.delete(`/api/pages/${slug}`);
  });
}
