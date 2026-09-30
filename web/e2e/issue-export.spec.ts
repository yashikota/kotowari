import { expect, test } from '@playwright/test';
import { fillIssueSearch } from './issue-list-controls.ts';

test('the issue list exports the filtered issues as CSV', async ({ page, request }) => {
  const stamp = Date.now();
  const titles = [`CSV issue ${stamp} A`, `CSV issue ${stamp} B`];
  const identifiers: string[] = [];
  for (const title of titles) {
    const response = await request.post('/api/issues', { data: { title, status: 'todo' } });
    expect(response.ok()).toBeTruthy();
    const issue = (await response.json()) as { identifier: string };
    identifiers.push(issue.identifier);
  }
  const hiddenResponse = await request.post('/api/issues', {
    data: { title: 'CSV issue hidden', status: 'todo' },
  });
  expect(hiddenResponse.ok()).toBeTruthy();

  await page.goto('/issues?groupBy=none');
  await fillIssueSearch(page, String(stamp));
  await expect(page.getByRole('listbox', { name: 'Issues' }).getByRole('option')).toHaveCount(2);

  await page.getByRole('button', { name: 'Display options' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export issues as CSV…' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('issues-all.csv');
  const stream = await download.createReadStream();
  expect(stream).not.toBeNull();
  const decoder = new TextDecoder();
  let csv = '';
  for await (const chunk of stream!) csv += decoder.decode(chunk, { stream: true });
  csv += decoder.decode();
  expect(
    csv
      .replace(/^\uFEFF/, '')
      .split('\r\n', 1)[0]
      ?.split(','),
  ).toHaveLength(34);
  for (const identifier of identifiers) expect(csv).toContain(`"${identifier}"`);
  for (const title of titles) expect(csv).toContain(`"${title}"`);
  expect(csv).not.toContain('CSV issue hidden');
});

test('saved issue views export their filtered issues as CSV', async ({ page, request }) => {
  const stamp = Date.now();
  const title = `Saved CSV issue ${stamp}`;
  const response = await request.post('/api/issues', { data: { title, status: 'todo' } });
  expect(response.ok()).toBeTruthy();
  const issue = (await response.json()) as { identifier: string };
  const slug = `export-view-${stamp}`;
  const viewResponse = await request.post('/api/views', {
    data: { name: `Export view ${stamp}`, slug },
  });
  expect(viewResponse.ok()).toBeTruthy();

  await page.goto(`/views/${slug}`);
  await fillIssueSearch(page, String(stamp));
  await page.getByRole('button', { name: 'Display options' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export issues as CSV…' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe(`view-${slug}-issues.csv`);
  const stream = await download.createReadStream();
  expect(stream).not.toBeNull();
  const decoder = new TextDecoder();
  let csv = '';
  for await (const chunk of stream!) csv += decoder.decode(chunk, { stream: true });
  csv += decoder.decode();
  expect(csv).toContain(`"${issue.identifier}"`);
  expect(csv).toContain(`"${title}"`);
});
