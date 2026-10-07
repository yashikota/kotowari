import { expect, test } from '@playwright/test';
import { fillIssueSearch } from './issue-list-controls.ts';

for (const outcome of ['success', 'failure']) {
  test(`late archive ${outcome} does not change the next issue`, async ({ page, request }) => {
    const stamp = `Archive context ${Date.now()}`;
    const issues: { identifier: string; title: string }[] = [];
    for (let index = 0; index < 2; index++) {
      const response = await request.post('/api/issues', { data: { title: `${stamp} ${index}` } });
      expect(response.ok()).toBeTruthy();
      issues.push(await response.json());
    }
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let heldId = '';
    let completed!: () => void;
    const completion = new Promise<void>((resolve) => {
      completed = resolve;
    });
    await page.route('**/api/issues/*', async (route) => {
      if (route.request().method() !== 'PATCH' || heldId) return route.continue();
      heldId = route.request().url().split('/').at(-1)!;
      await gate;
      if (outcome === 'failure')
        await route.fulfill({ status: 503, json: { error: 'Old archive failed' } });
      else await route.continue();
      completed();
    });
    try {
      await page.goto('/issues');
      await fillIssueSearch(page, stamp);
      const rows = page.getByRole('listbox', { name: 'Issues' }).getByRole('option');
      await expect(rows).toHaveCount(2);
      await rows.first().click();
      const title = page.getByRole('textbox', { name: 'Issue title', exact: true });
      await expect(title).toBeVisible();
      await page.getByRole('button', { name: 'Issue options' }).click();
      await page.getByRole('menuitem', { name: 'Archive', exact: true }).click();
      await expect(page.locator('[data-issue-archive-feedback]').getByRole('status')).toBeVisible();
      await page.getByRole('button', { name: 'Navigate to next issue' }).click();
      const other = issues.find((issue) => issue.identifier !== heldId)!;
      await expect(page).toHaveURL(new RegExp(`/issues/${other.identifier}$`));
      await expect(title).toHaveValue(other.title);
      const oldResponse = page.waitForResponse(
        (response) =>
          response.url().endsWith(`/api/issues/${heldId}`) &&
          response.request().method() === 'PATCH',
      );
      release();
      await completion;
      await oldResponse;
      await expect(title).toHaveValue(other.title);
      await expect(page.locator('[data-issue-archive-feedback]').getByRole('alert')).toHaveCount(0);
      await expect(page.locator('[data-issue-archive-feedback]').getByRole('status')).toHaveCount(
        0,
      );
      await expect(title).not.toHaveAttribute('readonly');
      await page.getByRole('button', { name: 'Issue options' }).click();
      await expect(page.getByRole('menuitem', { name: 'Archive', exact: true })).toBeEnabled();
    } finally {
      release();
      for (const issue of issues) await request.delete(`/api/issues/${issue.identifier}`);
    }
  });
}

for (const scheme of ['light', 'dark']) {
  test(`archive and restore retain failed title and unsaved body in ${scheme}`, async ({
    page,
    request,
  }) => {
    const original = `Retained archive draft ${Date.now()}`;
    const response = await request.post('/api/issues', {
      data: { title: original, body: 'Original body' },
    });
    const issue = (await response.json()) as { identifier: string };
    try {
      await page.addInitScript(
        (color) => localStorage.setItem('kotowari.color-scheme', color),
        scheme,
      );
      await page.goto(`/issues/${issue.identifier}`);
      const editor = page.getByRole('region', { name: 'Document editor' }).first();
      await editor.getByRole('button', { name: 'Edit description', exact: true }).click();
      const body = editor.getByLabel('Markdown body');
      await body.fill('Unsaved body retained through archive');
      await page.route(`**/api/issues/${issue.identifier}`, async (route) => {
        if (route.request().method() === 'PATCH' && 'title' in route.request().postDataJSON())
          return route.fulfill({ status: 503, json: { error: 'Title unavailable' } });
        return route.continue();
      });
      const title = page.getByRole('textbox', { name: 'Issue title', exact: true });
      await title.fill(`${original} edited`);
      await title.press('Enter');
      await expect(page.getByRole('alert')).toContainText('Title unavailable');
      const options = page.getByRole('button', { name: 'Issue options' });
      await options.click();
      await page.getByRole('menuitem', { name: 'Archive', exact: true }).click();
      await expect(page.locator('[data-issue-archive-feedback]').getByRole('status')).toContainText(
        'Archive change saved',
      );
      await options.click();
      await page.getByRole('menuitem', { name: 'Restore', exact: true }).click();
      await expect(title).toHaveValue(`${original} edited`);
      await expect(body).toHaveValue('Unsaved body retained through archive');
      await expect(page.getByRole('alert')).toContainText('Title unavailable');
      const persisted = await (await request.get(`/api/issues/${issue.identifier}`)).json();
      expect(persisted.title).toBe(original);
      expect(persisted.archivedAt).toBeFalsy();
    } finally {
      await request.delete(`/api/issues/${issue.identifier}`);
    }
  });
}

test('next issue does not expose the previous title while its request is pending', async ({
  page,
  request,
}) => {
  const stamp = `Navigation loading ${Date.now()}`;
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
    await page.route(`**/api/issues/${other.identifier}`, async (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      requested();
      await gate;
      return route.continue();
    });
    await page.getByRole('button', { name: 'Navigate to next issue' }).click();
    await started;
    await expect(page).toHaveURL(new RegExp(`/issues/${other.identifier}$`));
    const displayed = await page
      .locator('textarea[aria-label="Issue title"]')
      .evaluateAll((nodes) => nodes.map((node) => (node as HTMLTextAreaElement).value));
    expect(displayed).not.toContain(firstTitle);
    release();
    await expect(title).toHaveValue(other.title);
  } finally {
    release();
    for (const issue of issues) await request.delete(`/api/issues/${issue.identifier}`);
  }
});

test('instant issue archive rejection leaves focus on its shared retry action', async ({
  page,
  request,
}) => {
  const created = await request.post('/api/issues', {
    data: { title: `Instant archive ${Date.now()}` },
  });
  expect(created.ok()).toBeTruthy();
  const { identifier } = await created.json();
  const writes: unknown[] = [];
  await page.route(`**/api/issues/${identifier}`, async (route) => {
    if (route.request().method() !== 'PATCH') return route.continue();
    writes.push(route.request().postDataJSON());
    if (writes.length === 1)
      return route.fulfill({ status: 503, json: { error: 'Archive unavailable' } });
    return route.continue();
  });
  try {
    await page.goto(`/issues/${identifier}`);
    const options = page.getByRole('button', { name: 'Issue options', exact: true });
    await options.click();
    await page.getByRole('menuitem', { name: 'Archive', exact: true }).click();
    await expect(page.getByRole('menu')).toHaveCount(0);
    const feedback = page.locator('[data-issue-archive-feedback]');
    const retry = feedback.getByRole('button', { name: 'Retry archive change', exact: true });
    await expect(retry).toBeFocused();
    await retry.press('Enter');
    await expect(feedback.getByRole('status')).toContainText('Archive change saved');
    expect((await (await request.get(`/api/issues/${identifier}`)).json()).archivedAt).toBeTruthy();
    expect(writes).toEqual([{ archived: true }, { archived: true }]);
  } finally {
    await request.delete(`/api/issues/${identifier}`);
  }
});
