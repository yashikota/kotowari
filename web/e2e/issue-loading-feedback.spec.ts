import { expect, test } from '@playwright/test';
import { fillIssueSearch } from './issue-list-controls.ts';
import { contrastFailures } from './contrast.ts';

for (const scheme of ['light', 'dark']) {
  test(`issue loading preserves error and retries in ${scheme}`, async ({
    page,
    request,
  }, testInfo) => {
    const title = `Load recovery ${scheme} ${Date.now()}`;
    const response = await request.post('/api/issues', { data: { title } });
    const issue = (await response.json()) as { identifier: string };
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let reads = 0;
    await page.addInitScript((color) => {
      localStorage.setItem('kotowari.color-scheme', color);
      localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
    }, scheme);
    await page.setViewportSize({ width: 360, height: 800 });
    await page.route(`**/api/issues/${issue.identifier}`, async (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      reads++;
      if (reads === 2) await gate;
      if (reads <= 2)
        return route.fulfill({ status: 503, json: { error: 'Issue read unavailable' } });
      return route.continue();
    });
    try {
      await page.goto(`/issues/${issue.identifier}`);
      const failure = page.getByRole('alert');
      await expect(failure).toContainText('Issue could not be loaded');
      await expect(failure).toContainText('Issue read unavailable');
      const retry = failure.getByRole('button', { name: 'Retry loading issue' });
      const back = failure.getByRole('button', { name: 'Back to issues' });
      for (const button of [retry, back])
        expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      expect(await contrastFailures(page, '[role="alert"]')).toEqual([]);
      await retry.click();
      await expect(retry).toBeDisabled();
      await expect(failure.getByRole('status')).toContainText('Loading');
      expect(reads).toBe(2);
      await expect(back).toBeEnabled();
      release();
      await expect(retry).toBeEnabled();
      await expect(retry).toBeFocused();
      await page.screenshot({ path: testInfo.outputPath('issue-load-failure.png') });
      await retry.click();
      await expect(failure).toHaveCount(0);
      const input = page.getByRole('textbox', { name: 'Issue title', exact: true });
      await expect(input).toHaveValue(title);
      await expect(input).toBeFocused();
      expect(reads).toBe(3);
    } finally {
      release();
      await request.delete(`/api/issues/${issue.identifier}`);
    }
  });
}

test('a late read failure cannot replace the next issue with an error screen', async ({
  page,
  request,
}) => {
  const stamp = `Late read ${Date.now()}`;
  const issues: { identifier: string; title: string }[] = [];
  for (let index = 0; index < 2; index++) {
    const response = await request.post('/api/issues', { data: { title: `${stamp} ${index}` } });
    issues.push(await response.json());
  }
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested!: () => void;
  const started = new Promise<void>((resolve) => {
    requested = resolve;
  });
  let oldId = '';
  await page.route('**/api/issues/*', async (route) => {
    if (route.request().method() !== 'GET' || oldId) return route.continue();
    oldId = route.request().url().split('/').at(-1)!;
    requested();
    await gate;
    return route.fulfill({ status: 503, json: { error: 'Previous issue read failed' } });
  });
  try {
    await page.goto('/issues');
    await fillIssueSearch(page, stamp);
    const rows = page.getByRole('listbox', { name: 'Issues' }).getByRole('option');
    await expect(rows).toHaveCount(2);
    await rows.first().click();
    await started;
    await page.getByRole('button', { name: 'Navigate to next issue' }).click();
    const other = issues.find((issue) => issue.identifier !== oldId)!;
    const title = page.getByRole('textbox', { name: 'Issue title', exact: true });
    await expect(title).toHaveValue(other.title);
    const completed = page.waitForResponse((response) =>
      response.url().endsWith(`/api/issues/${oldId}`),
    );
    release();
    await completed;
    await expect(title).toHaveValue(other.title);
    await expect(page.getByRole('alert')).toHaveCount(0);
    await title.fill(`${other.title} edited`);
    await title.press('Enter');
    await expect(page.getByRole('status').filter({ hasText: 'Task changes saved' })).toBeVisible();
    await expect(title).toHaveValue(`${other.title} edited`);
  } finally {
    release();
    for (const issue of issues) await request.delete(`/api/issues/${issue.identifier}`);
  }
});

test('a failed issue can return to its list while retry is pending', async ({ page, request }) => {
  const response = await request.post('/api/issues', {
    data: { title: `Leave read failure ${Date.now()}` },
  });
  const issue = (await response.json()) as { identifier: string };
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let reads = 0;
  await page.route(`**/api/issues/${issue.identifier}`, async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    if (++reads === 2) await gate;
    return route.fulfill({ status: 503, json: { error: 'Read unavailable' } });
  });
  try {
    await page.goto(`/issues/${issue.identifier}`);
    await page.getByRole('button', { name: 'Retry loading issue' }).click();
    await expect(page.getByRole('button', { name: 'Retry loading issue' })).toBeDisabled();
    const settled = page.waitForResponse((response) =>
      response.url().endsWith(`/api/issues/${issue.identifier}`),
    );
    await page.getByRole('button', { name: 'Back to issues' }).click();
    await expect(page).toHaveURL(/\/issues$/);
    release();
    await settled;
    await expect(page.getByRole('listbox', { name: 'Issues' })).toBeVisible();
    await expect(page.getByText('Read unavailable', { exact: true })).toHaveCount(0);
  } finally {
    release();
    await request.delete(`/api/issues/${issue.identifier}`);
  }
});

test('revisiting a previously failed issue starts a fresh load', async ({ page, request }) => {
  const stamp = `Revisit load ${Date.now()}`;
  const issues: { identifier: string; title: string }[] = [];
  for (let index = 0; index < 2; index++) {
    const response = await request.post('/api/issues', { data: { title: `${stamp} ${index}` } });
    issues.push(await response.json());
  }
  try {
    await page.goto('/issues');
    await fillIssueSearch(page, stamp);
    const rows = page.getByRole('listbox', { name: 'Issues' }).getByRole('option');
    await expect(rows).toHaveCount(2);
    await rows.first().click();
    const title = page.getByRole('textbox', { name: 'Issue title', exact: true });
    await expect(title).toBeVisible();
    const firstTitle = await title.inputValue();
    const other = issues.find((issue) => issue.title !== firstTitle)!;
    let reads = 0;
    await page.route(`**/api/issues/${other.identifier}`, async (route) => {
      if (route.request().method() === 'GET' && ++reads === 1)
        return route.fulfill({ status: 503, json: { error: 'First visit unavailable' } });
      return route.continue();
    });
    await page.getByRole('button', { name: 'Navigate to next issue' }).click();
    await expect(page.getByRole('alert')).toContainText('First visit unavailable');
    await page.goBack();
    await expect(title).toHaveValue(firstTitle);
    await page.goForward();
    await expect(title).toHaveValue(other.title);
    await expect(page.getByRole('alert')).toHaveCount(0);
  } finally {
    for (const issue of issues) await request.delete(`/api/issues/${issue.identifier}`);
  }
});
