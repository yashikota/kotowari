import { expect, test, type APIResponse } from '@playwright/test';
import { expandMoreNavigation, fillIssueSearch, returnToIssues } from './issue-list-controls.ts';

test('decision rows share readable mobile titles and keyboard focus', async ({
  page,
}, testInfo) => {
  const title = 'A decision with detailed reasoning that remains readable in a narrow list';
  await page.route('**/api/adrs', (route) =>
    route.fulfill({
      json: [
        {
          number: 12345,
          identifier: 'ADR-12345',
          title,
          status: 'proposed',
          projectSlug: null,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ],
    }),
  );
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/adrs');
  const row = page.getByRole('link').filter({ hasText: title });
  await expect(row).toBeVisible();
  const bounds = await row.getByText(title, { exact: true }).boundingBox();
  expect(bounds!.width).toBeGreaterThan(180);
  expect(
    await row.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
  ).toBeTruthy();
  await page.getByLabel('Filter ADR project').focus();
  await page.keyboard.press('Tab');
  await expect(row).toBeFocused();
  await expect
    .poll(() =>
      row.evaluate((element) => Number.parseFloat(getComputedStyle(element).outlineWidth)),
    )
    .toBeGreaterThanOrEqual(2);
  await page.screenshot({ path: testInfo.outputPath('decision-list-mobile.png') });
});

test('ADR list offers creation and recovers from filters with no results', async ({
  page,
  request,
}) => {
  const slug = `adr-empty-${Date.now()}`;
  const project = await request.post('/api/projects', { data: { name: slug, slug } });
  expect(project.ok()).toBeTruthy();
  const response = await request.post('/api/adrs', { data: { title: slug, projectSlug: slug } });
  expect(response.ok()).toBeTruthy();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/adrs');
  await page.getByRole('button', { name: 'Create ADR', exact: true }).first().click();
  await expect(page.getByRole('dialog', { name: 'Create ADR', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Create ADR', exact: true })).toHaveCount(0);
  await page.getByLabel('Filter ADR project').selectOption(slug);
  await page.getByLabel('Filter ADR status').selectOption('superseded');
  await expect(page.getByText('No decisions match these filters.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(page.getByLabel('Filter ADR status')).toHaveValue('');
  await expect(page.getByLabel('Filter ADR project')).toHaveValue('');
  await expect(page.getByRole('link').filter({ hasText: slug })).toBeVisible();
});

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
  await fillIssueSearch(page, issue.identifier);
  await page
    .getByRole('listbox', { name: 'Issues' })
    .getByRole('option')
    .filter({ hasText: issue.identifier })
    .click();
  await expect(page).toHaveURL(new RegExp(`/issues/${issue.identifier}`));
  await page.getByRole('button', { name: 'New ADR', exact: true }).click();
  await expect(page.getByText(`Will link issue ${issue.number}`, { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expandMoreNavigation(page);
  await page.getByRole('link', { name: 'ADRs', exact: true }).click();
  await expect(page).toHaveURL(/\/adrs$/);
  await expect(page.getByRole('heading', { name: 'ADRs', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
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
  await fillIssueSearch(page, issue.identifier);
  const row = page
    .getByRole('listbox', { name: 'Issues' })
    .getByRole('option')
    .filter({ hasText: issue.identifier });
  await expect(row.getByText('1 ADR', { exact: true })).toBeVisible();
  await row.click();
  await page.getByRole('button', { name: `Unlink ${adr.identifier}`, exact: true }).click();
  await expect(page.getByText('No linked decisions.', { exact: true })).toBeVisible();
  await returnToIssues(page);
  await fillIssueSearch(page, issue.identifier);
  await expect(row).toBeVisible();
  await expect(row.getByText('1 ADR', { exact: true })).toHaveCount(0);
});
