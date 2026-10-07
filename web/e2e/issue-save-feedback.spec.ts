import { expect, test } from '@playwright/test';

test('task edits retain failed title and retry the intended property change', async ({
  page,
  request,
}, testInfo) => {
  const response = await request.post('/api/issues', {
    data: { title: `Save feedback ${Date.now()}` },
  });
  expect(response.ok()).toBeTruthy();
  const issue = await response.json();
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/issues/${issue.identifier}`);
    const title = page.getByRole('textbox', { name: 'Issue title', exact: true });
    const priority = page.getByRole('combobox', { name: 'Priority', exact: true });
    await expect(title).toHaveValue(issue.title);
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    let attempts = 0;
    const bodies: Record<string, unknown>[] = [];
    await page.route(`**/api/issues/${issue.identifier}`, async (route) => {
      if (route.request().method() !== 'PATCH') return route.continue();
      attempts++;
      bodies.push(route.request().postDataJSON());
      if (attempts === 1) {
        await pending;
        return route.fulfill({ status: 500, json: { error: 'Save unavailable' } });
      }
      if (attempts === 3)
        return route.fulfill({ status: 500, json: { error: 'Priority unavailable' } });
      return route.continue();
    });
    const revisedTitle = `${issue.title} revised`;
    await title.fill(revisedTitle);
    await title.press('Enter');
    try {
      await expect(
        page.getByRole('status').filter({ hasText: 'Saving task changes' }),
      ).toBeVisible();
      await expect(title).toHaveAttribute('readonly', '');
      await expect(priority).toBeDisabled();
      expect(attempts).toBe(1);
    } finally {
      release();
    }
    const failure = page.getByRole('alert').filter({ hasText: 'Task changes could not be saved' });
    await expect(failure).toContainText('Save unavailable');
    await expect(title).toHaveValue(revisedTitle);
    await page.screenshot({ path: testInfo.outputPath('task-save-failure.png') });
    await failure.getByRole('button', { name: 'Retry saving' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Task changes saved' })).toBeVisible();
    await expect(failure).toHaveCount(0);
    expect(bodies.slice(0, 2)).toEqual([{ title: revisedTitle }, { title: revisedTitle }]);
    await expect(priority).toBeEnabled();
    await priority.click();
    await page.getByRole('option', { name: 'High', exact: true }).click();
    await expect(failure).toContainText('Priority unavailable');
    await expect(priority).toHaveValue('No priority');
    await failure.getByRole('button', { name: 'Retry saving' }).click();
    await expect(priority).toHaveValue('High');
    expect(bodies.slice(2, 4)).toEqual([{ priority: 2 }, { priority: 2 }]);
    await expect
      .poll(
        async () => (await (await request.get(`/api/issues/${issue.identifier}`)).json()).priority,
      )
      .toBe(2);
    await page.reload();
    await expect(title).toHaveValue(revisedTitle);
    await expect(priority).toHaveValue('High');
    let failTitle = true;
    let releasePriority!: () => void;
    const priorityGate = new Promise<void>((resolve) => {
      releasePriority = resolve;
    });
    await page.route(`**/api/issues/${issue.identifier}`, async (route) => {
      if (
        route.request().method() === 'PATCH' &&
        route.request().postDataJSON().title &&
        failTitle
      ) {
        failTitle = false;
        return route.fulfill({ status: 500, json: { error: 'Title unavailable' } });
      }
      if (route.request().method() === 'PATCH' && route.request().postDataJSON().priority === 1)
        await priorityGate;
      return route.fallback();
    });
    const secondTitle = `${revisedTitle} again`;
    await title.fill(secondTitle);
    await title.press('Enter');
    await expect(failure).toContainText('Title unavailable');
    await priority.click();
    await page.getByRole('option', { name: 'Urgent', exact: true }).click();
    await expect(priority).toHaveValue('Urgent');
    await expect(title).toHaveValue(secondTitle);
    try {
      await expect(title).toHaveAttribute('readonly', '');
      await title.focus();
      await title.press('Enter');
    } finally {
      releasePriority();
    }
    await expect
      .poll(async () => (await (await request.get(`/api/issues/${issue.identifier}`)).json()).title)
      .toBe(secondTitle);
  } finally {
    await request.delete(`/api/issues/${issue.identifier}`);
  }
});
