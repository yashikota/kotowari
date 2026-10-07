import { expect, test } from '@playwright/test';
import { fillIssueSearch } from './issue-list-controls.ts';

for (const scenario of ['retry', 'navigation']) {
  test(`queued issue title save preserves context during ${scenario}`, async ({
    page,
    request,
  }) => {
    const stamp = `Title queue ${Date.now()}`;
    const issues: { identifier: string; title: string }[] = [];
    for (let index = 0; index < (scenario === 'navigation' ? 2 : 1); index++) {
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
      if (scenario === 'navigation') {
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
        await expect(page).toHaveURL(new RegExp(`/issues/${other.identifier}$`));
        await expect(title).toHaveValue(other.title);
        await title.focus();
        await title.evaluate((element) => element.blur());
        const response = page.waitForResponse(
          (response) =>
            response.url().endsWith(`/api/issues/${identifier}`) &&
            response.request().method() === 'PATCH',
        );
        release();
        await response;
        await page.evaluate(
          async () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
            ),
        );
        expect(writes).toEqual([{ title: draft }, { priority: 1 }]);
        await expect(title).toHaveValue(other.title);
        await expect(title).not.toHaveAttribute('readonly');
        await expect(failure).toHaveCount(0);
        expect(await page.evaluate(() => document.activeElement === document.body)).toBeTruthy();
      }
    } finally {
      release();
      for (const issue of issues) await request.delete(`/api/issues/${issue.identifier}`);
    }
  });
}
