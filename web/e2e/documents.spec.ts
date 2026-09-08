import { expect, test } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

test('document diagrams, external edits, conflict recovery, history and export', async ({
  page,
  request,
}) => {
  const adr = (await (
    await request.post('/api/adrs', {
      data: {
        title: `Viewer ${Date.now()}`,
        body: '# Architecture\n\n![System](assets/diagram.html)\n\n| Choice | Cost |\n|---|---|\n| A | Low |',
      },
    })
  ).json()) as { identifier: string; number: number };
  const dir = join(process.env.E2E_KOTOWARI_HOME!, 'adr', String(adr.number).padStart(5, '0'));
  await mkdir(join(dir, 'assets'), { recursive: true });
  await writeFile(
    join(dir, 'assets', 'diagram.html'),
    '<style>h1{color:red}</style><h1>System diagram</h1><script>document.body.innerHTML="SCRIPT RAN"</script>',
  );
  await page.goto(`/adrs/${adr.identifier}`);
  const editor = page.locator('.document-editor').first();
  await expect(editor.getByRole('table')).toBeVisible();
  await expect(
    editor.frameLocator('iframe').getByRole('heading', { name: 'System diagram' }),
  ).toBeVisible();
  await expect(editor.locator('iframe')).toHaveAttribute('sandbox', '');
  await expect(editor.frameLocator('iframe').getByText('SCRIPT RAN')).toHaveCount(0);
  await editor.getByRole('button', { name: 'Edit', exact: true }).click();
  await editor.getByLabel('Markdown body').fill('My unsaved draft');
  const readme = join(dir, 'README.md');
  const raw = await readFile(readme, 'utf8');
  await writeFile(readme, raw.replace('# Architecture', '# Changed externally'));
  await expect(editor.getByRole('alert')).toContainText('changed on disk');
  await expect(editor.getByLabel('Markdown body')).toHaveValue('My unsaved draft');
  await expect(editor.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
  // A reload recovers the draft and retains its old base revision.
  page.once('dialog', (dialog) => dialog.accept());
  await page.reload();
  await expect(editor.getByLabel('Markdown body')).toHaveValue('My unsaved draft');
  await editor.getByRole('button', { name: 'Compare versions' }).click();
  await expect(editor.getByText('# Changed externally', { exact: false }).first()).toBeVisible();
  await editor.getByRole('button', { name: 'Use current version as base' }).click();
  await editor.getByLabel('Markdown body').fill('Merged decision');
  await editor.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(editor.getByRole('status')).toHaveText('Saved');
  await editor.getByRole('button', { name: 'History', exact: true }).click();
  await editor
    .getByRole('button', { name: /Restore as draft/ })
    .first()
    .click();
  await expect(editor.getByLabel('Markdown body')).toHaveValue(/Changed externally/);
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Export with assets' }).click();
  expect((await download).suggestedFilename()).toMatch(/adr-.*\.zip/);
});

test('ACP conversation shows permission, result and cancellation', async ({ page, request }) => {
  const adr = (await (
    await request.post('/api/adrs', { data: { title: `ACP ${Date.now()}` } })
  ).json()) as { identifier: string };
  await page.goto(`/adrs/${adr.identifier}`);
  await page.getByRole('button', { name: `Ask AI about ${adr.identifier}` }).click();
  const panel = page.getByRole('region', { name: 'AI assistant' });
  await panel.getByLabel('Message to AI').fill('Compare the options');
  await panel.getByRole('button', { name: 'Send', exact: true }).click();
  await panel.getByRole('button', { name: 'Allow once' }).click();
  await expect(panel.getByText('The ADR comparison is ready.')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: `Ask AI about ${adr.identifier}` }).click();
  await expect(panel.getByText('The ADR comparison is ready.')).toBeVisible();
  await panel.getByLabel('Message to AI').fill('Wait forever');
  await panel.getByRole('button', { name: 'Send', exact: true }).click();
  await panel.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(panel.getByRole('status')).toHaveText('Ready');
});
