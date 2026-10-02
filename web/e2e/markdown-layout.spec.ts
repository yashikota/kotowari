import { expect, test } from '@playwright/test';

test('long document content keeps horizontal scrolling inside code and tables', async ({
  page,
  request,
}, testInfo) => {
  const slug = `markdown-layout-${Date.now()}`;
  expect(
    (await request.post('/api/pages', { data: { title: 'Readable document', slug } })).ok(),
  ).toBeTruthy();
  const path = `/api/documents/pages/${slug}/body`;
  const document = await (await request.get(path)).json();
  const url = `https://example.com/${'long-link-'.repeat(30)}`;
  const columns = Array.from({ length: 12 }, (_, index) => `Column ${index}`);
  const body = `# Reading layout\n\n[${url}](${url})\n\n\`\`\`text\n${'long-code-sequence '.repeat(40)}\n\`\`\`\n\n| ${columns.join(' | ')} |\n| ${columns.map(() => '---').join(' | ')} |\n| ${columns.map(() => 'Useful value').join(' | ')} |`;
  expect(
    (await request.put(path, { data: { body, revision: document.revision } })).ok(),
  ).toBeTruthy();
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(`/pages/${slug}`);
  const editor = page.getByRole('region', { name: 'Document editor', exact: true });
  await expect(editor.getByRole('link', { name: url, exact: true })).toBeVisible();
  await expect(editor.getByRole('table')).toBeVisible();
  expect(
    await editor.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
  ).toBeTruthy();
  const code = editor.locator('pre');
  expect(await code.evaluate((element) => element.scrollWidth > element.clientWidth)).toBeTruthy();
  await expect(code).toHaveCSS('overflow-x', 'auto');
  await expect(editor.getByRole('table')).toHaveCSS('overflow-x', 'auto');
  expect(
    (await editor.getByRole('columnheader').first().boundingBox())!.width,
  ).toBeGreaterThanOrEqual(100);
  expect(
    await editor
      .getByRole('table')
      .evaluate((element) => element.scrollWidth > element.clientWidth),
  ).toBeTruthy();
  await editor.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('markdown-mobile.png') });
  const sizes: number[] = [];
  for (const fontSize of ['small', 'large']) {
    await page.evaluate(
      (value) =>
        localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: value })),
      fontSize,
    );
    await page.reload();
    const heading = editor.getByRole('heading', { name: 'Reading layout', exact: true });
    await expect(heading).toBeVisible();
    sizes.push(
      await heading.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
    );
    expect(
      await editor.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
    ).toBeTruthy();
  }
  expect(sizes[1]).toBeGreaterThan(sizes[0]!);
  await request.delete(`/api/pages/${slug}`);
});
