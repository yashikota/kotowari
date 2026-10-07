import { expect, test } from '@playwright/test';
import { fillIssueSearch } from './issue-list-controls.ts';

for (const scenario of ['retry', 'navigation', 'stay']) {
  test(`queued issue title save preserves context during ${scenario}`, async ({
    page,
    request,
  }) => {
    const stamp = `Title queue ${Date.now()}`;
    const issues: { identifier: string; title: string }[] = [];
    for (let index = 0; index < (scenario === 'retry' ? 1 : 2); index++) {
      const created = await request.post('/api/issues', { data: { title: `${stamp} ${index}` } });
      expect(created.ok()).toBeTruthy();
      issues.push(await created.json());
    }
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const writes: Record<string, unknown>[] = [];
    let titleAttempts = 0;
    let priorityAttempts = 0;
    try {
      if (scenario !== 'retry') {
        await page.goto('/issues');
        await fillIssueSearch(page, stamp);
        const rows = page.getByRole('listbox', { name: 'Issues' }).getByRole('option');
        await expect(rows).toHaveCount(2);
        await rows.first().click();
      } else await page.goto(`/issues/${issues[0]!.identifier}`);
      const identifier = new URL(page.url()).pathname.split('/').at(-1)!;
      const original = issues.find((issue) => issue.identifier === identifier)!;
      const draft = `${original.title} queued`;
      await page.route(`**/api/issues/${identifier}`, async (route) => {
        if (route.request().method() !== 'PATCH') return route.continue();
        const body = route.request().postDataJSON();
        writes.push(body);
        if ('title' in body && ++titleAttempts === 1)
          return route.fulfill({ status: 503, json: { error: 'Title unavailable' } });
        if ('priority' in body && ++priorityAttempts === 1) {
          await gate;
          if (scenario === 'retry')
            return route.fulfill({ status: 503, json: { error: 'Priority unavailable' } });
        }
        return route.continue();
      });
      const title = page.getByRole('textbox', { name: 'Issue title', exact: true });
      await expect(title).toHaveValue(original.title);
      await title.fill(draft);
      await title.press('Enter');
      const failure = page
        .getByRole('alert')
        .filter({ hasText: 'Task changes could not be saved' });
      await expect(failure).toContainText('Title unavailable');
      const priority = page.getByRole('combobox', { name: 'Priority', exact: true });
      await priority.click();
      await page.getByRole('option', { name: 'Urgent', exact: true }).click();
      await expect(title).toHaveAttribute('readonly', '');
      await title.focus();
      await title.press('Enter');
      await title.focus();
      await title.press('Enter');
      expect(writes).toEqual([{ title: draft }, { priority: 1 }]);
      if (scenario === 'retry') {
        release();
        await expect(failure).toContainText('Priority unavailable');
        await expect(title).toHaveValue(draft);
        expect(writes).toHaveLength(2);
        await failure.getByRole('button', { name: 'Retry saving', exact: true }).click();
        await expect
          .poll(async () => (await (await request.get(`/api/issues/${identifier}`)).json()).title)
          .toBe(draft);
        await expect(title).not.toHaveAttribute('readonly');
        expect(writes).toEqual([
          { title: draft },
          { priority: 1 },
          { priority: 1 },
          { title: draft },
        ]);
        expect((await (await request.get(`/api/issues/${identifier}`)).json()).priority).toBe(1);
      } else {
        await page.getByRole('button', { name: 'Navigate to next issue' }).click();
        const other = issues.find((issue) => issue.identifier !== identifier)!;
        const dialog = page.getByRole('dialog', { name: 'Unsaved title changes' });
        await expect(dialog).toBeVisible();
        await expect(dialog.getByRole('button', { name: 'Leave without saving' })).toBeDisabled();
        await expect(page).toHaveURL(new RegExp(`/issues/${identifier}$`));
        if (scenario === 'stay') {
          await dialog.getByRole('button', { name: 'Stay on this page', exact: true }).click();
          await expect(dialog).not.toBeVisible();
        }
        release();
        if (scenario === 'stay') {
          await expect
            .poll(async () => (await (await request.get(`/api/issues/${identifier}`)).json()).title)
            .toBe(draft);
          await expect(title).not.toHaveAttribute('readonly');
          await expect(page).toHaveURL(new RegExp(`/issues/${identifier}$`));
          await page.getByRole('button', { name: 'Navigate to next issue' }).click();
        }
        await expect(page).toHaveURL(new RegExp(`/issues/${other.identifier}$`));
        expect(writes).toEqual([{ title: draft }, { priority: 1 }, { title: draft }]);
        expect((await (await request.get(`/api/issues/${identifier}`)).json()).title).toBe(draft);
        await expect(title).toHaveValue(other.title);
        await expect(title).not.toHaveAttribute('readonly');
        await expect(failure).toHaveCount(0);
        await expect(dialog).not.toBeVisible();
        await expect
          .poll(() =>
            page.evaluate(
              () =>
                document.activeElement === document.body ||
                Boolean(document.activeElement?.matches('[data-route-content]')),
            ),
          )
          .toBeTruthy();
      }
    } finally {
      release();
      for (const issue of issues) await request.delete(`/api/issues/${issue.identifier}`);
    }
  });
}
