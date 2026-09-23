import { expect, test, type APIResponse } from '@playwright/test';

async function json<T>(res: APIResponse): Promise<T> {
  if (!res.ok()) {
    throw new Error(`${res.status()} ${await res.text()}`);
  }
  return (await res.json()) as T;
}

test('ADR list, detail, link, and append-only', async ({ page, request }) => {
  const stamp = `${Date.now()}`;
  const issueTitle = `Work ${stamp}`;
  const adrTitle = `Decision ${stamp}`;
  const issue = await json<{ identifier: string; number: number }>(
    await request.post('/api/issues', { data: { title: issueTitle } }),
  );
  const adr = await json<{ identifier: string; body: string }>(
    await request.post('/api/adrs', { data: { title: adrTitle } }),
  );
  if (!adr.body.includes('評価関数') || !adr.body.includes('選んだ候補:')) {
    throw new Error(`template body missing MADR sections: ${adr.body}`);
  }

  await page.goto('/adrs');
  await expect(page.getByRole('heading', { name: 'ADRs' })).toBeVisible();
  await page.getByRole('link', { name: new RegExp(adrTitle) }).click();
  await expect(page).toHaveURL(new RegExp(`/adrs/${adr.identifier}`));
  await expect(page.getByRole('heading', { name: adr.identifier })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('ADR status')).toBeVisible();
  await expect(page.getByLabel('Supersedes ADR number')).toBeVisible();
  await page
    .getByRole('radiogroup', { name: 'Document view' })
    .first()
    .getByText('Edit', { exact: true })
    .click();
  await expect(page.getByLabel('Markdown body').first()).toHaveValue(/評価関数/);

  await page.getByLabel('Link issue').selectOption(String(issue.number));
  await page.getByRole('button', { name: 'Link', exact: true }).click();
  await expect(page.getByRole('link', { name: issue.identifier })).toBeVisible();

  await page.getByRole('link', { name: issue.identifier }).click();
  await expect(page).toHaveURL(new RegExp(`/issues/${issue.identifier}`));
  await expect(page.getByRole('link', { name: adr.identifier })).toBeVisible();
});

test('new ADR only inherits an issue on its detail route', async ({ page, request }) => {
  const issue = await json<{ identifier: string; number: number }>(
    await request.post('/api/issues', { data: { title: `Context ${Date.now()}` } }),
  );
  await page.goto('/issues');
  await page.getByLabel('Find issues').fill(issue.identifier);
  await page
    .getByRole('listbox', { name: 'Issues' })
    .getByRole('option')
    .filter({ hasText: issue.identifier })
    .click();
  await expect(page).toHaveURL(new RegExp(`/issues/${issue.identifier}`));
  await page.keyboard.press('p');
  await expect(page.getByText(`Will link issue ${issue.number}`, { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('link', { name: 'ADRs', exact: true }).click();
  await page.keyboard.press('p');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText(/Will link issue/)).toHaveCount(0);
});

test('returning to a cached list reflects an ADR unlink immediately', async ({ page, request }) => {
  const issue = await json<{ identifier: string; number: number }>(
    await request.post('/api/issues', { data: { title: `Unlink ${Date.now()}` } }),
  );
  const adr = await json<{ identifier: string }>(
    await request.post('/api/adrs', {
      data: { title: 'Linked decision', issueNumbers: [issue.number] },
    }),
  );
  await page.goto('/issues');
  await page.getByLabel('Find issues').fill(issue.identifier);
  const row = page
    .getByRole('listbox', { name: 'Issues' })
    .getByRole('option')
    .filter({ hasText: issue.identifier });
  await expect(row.getByText('1 ADR', { exact: true })).toBeVisible();
  await row.click();
  await page.getByRole('button', { name: `Unlink ${adr.identifier}`, exact: true }).click();
  await expect(page.getByText('No linked decisions.', { exact: true })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Primary' })
    .getByRole('link', { name: 'Issues' })
    .click();
  await page.getByLabel('Find issues').fill(issue.identifier);
  await expect(row).toBeVisible();
  await expect(row.getByText('1 ADR', { exact: true })).toHaveCount(0);
});
