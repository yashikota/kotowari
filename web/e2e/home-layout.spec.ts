import { expect, test } from '@playwright/test';

for (const scheme of ['light', 'dark']) {
  test(`home links stay readable and actionable in ${scheme}`, async ({
    page,
    request,
  }, testInfo) => {
    const original = await (await request.get('/api/workspace')).json();
    const longName = 'My work and decisions with useful planning context '.repeat(4).trim();
    await request.patch('/api/workspace', { data: { name: longName } });
    const title = `HomeResource${Date.now()} ${'LongResourceTitleWithoutSpaces'.repeat(8)}`;
    const response = await request.post('/api/workspace/resources', {
      data: { title, url: 'https://example.com/planning' },
    });
    expect(response.ok()).toBeTruthy();
    const resource = await response.json();
    try {
      await page.addInitScript((value) => {
        localStorage.setItem('kotowari.color-scheme', value);
        localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
      }, scheme);
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto('/');
      const heading = page.getByRole('textbox', { name: 'Name', exact: true });
      await expect(heading).toHaveValue(longName);
      expect(
        await heading.evaluate(
          (element) =>
            element.clientHeight / Number.parseFloat(getComputedStyle(element).lineHeight),
        ),
      ).toBeGreaterThan(2);
      expect(
        await heading.evaluate((element) => element.scrollHeight <= element.clientHeight + 2),
      ).toBeTruthy();
      await page.screenshot({ path: testInfo.outputPath('home-heading.png') });
      const link = page.getByRole('link', { name: title, exact: true });
      await link.scrollIntoViewIfNeeded();
      await link.focus();
      expect((await link.boundingBox())!.width).toBeGreaterThan(250);
      expect(
        await link.evaluate((element) => Number.parseFloat(getComputedStyle(element).outlineWidth)),
      ).toBeGreaterThanOrEqual(2);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBeTruthy();
      await page.screenshot({ path: testInfo.outputPath('home-resource.png') });
    } finally {
      await request.delete(`/api/workspace/resources/${resource.id}`);
      await request.patch('/api/workspace', { data: { name: original.name } });
    }
  });
}

test('resource dialog retains input after failure and prevents duplicate submission', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add resource', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Add resource' });
  const url = dialog.getByRole('textbox', { name: 'URL', exact: true });
  const title = dialog.getByRole('textbox', { name: 'Title (optional)', exact: true });
  const resourceTitle = `RecoverResource${Date.now()}`;
  await url.fill('https://example.com/recovery');
  await title.fill(resourceTitle);
  let attempts = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/workspace/resources', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    attempts += 1;
    if (attempts === 1) {
      await gate;
      await route.fulfill({ status: 503, body: 'Temporary resource failure' });
    } else await route.continue();
  });
  await dialog.getByRole('button', { name: 'Add link', exact: true }).click();
  await expect(url).toBeDisabled();
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  await dialog.locator('form').evaluate((form) => (form as HTMLFormElement).requestSubmit());
  expect(attempts).toBe(1);
  release();
  await expect(dialog.getByRole('alert')).toContainText('Temporary resource failure');
  await expect(url).toHaveValue('https://example.com/recovery');
  await expect(title).toHaveValue(resourceTitle);
  await expect(url).toBeEnabled();
  await dialog.getByRole('button', { name: 'Add link', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('link', { name: resourceTitle, exact: true })).toBeVisible();
  expect(attempts).toBe(2);
  const workspace = await (await request.get('/api/workspace')).json();
  const resources = workspace.resources.filter(
    (resource: { title: string }) => resource.title === resourceTitle,
  );
  expect(resources).toHaveLength(1);
  await request.delete(`/api/workspace/resources/${resources[0].id}`);
});

test('workspace save preserves drafts through failure and resource refresh', async ({
  page,
  request,
}, testInfo) => {
  const original = await (await request.get('/api/workspace')).json();
  const resourceTitle = `DraftResource${Date.now()}`;
  const draftName = `Workspace draft ${Date.now()}`;
  await page.addInitScript(() => {
    localStorage.setItem('kotowari.color-scheme', 'dark');
    localStorage.setItem('kotowari.preferences.v1', JSON.stringify({ fontSize: 'large' }));
  });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  const name = page.getByRole('textbox', { name: 'Name', exact: true });
  const description = page.getByRole('textbox', { name: 'Description', exact: true });
  await name.fill(draftName);
  await description.fill('Keep my planning context while links change.');
  let attempts = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/workspace', async (route) => {
    if (route.request().method() !== 'PATCH') return route.continue();
    attempts += 1;
    if (attempts === 1) {
      await gate;
      await route.fulfill({ status: 503, body: 'Temporary workspace failure' });
    } else await route.continue();
  });
  try {
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(name).toBeDisabled();
    await expect(page.getByRole('status')).toHaveText('Saving workspace…');
    await name
      .locator('xpath=ancestor::form')
      .evaluate((form) => (form as HTMLFormElement).requestSubmit());
    expect(attempts).toBe(1);
    release();
    const alert = page.getByRole('alert');
    await expect(alert).toContainText('Temporary workspace failure');
    await expect(name).toHaveValue(draftName);
    await expect(name).toBeEnabled();
    await alert.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('home-save-failure.png') });
    await page.getByRole('button', { name: 'Add resource', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Add resource' });
    await dialog
      .getByRole('textbox', { name: 'URL', exact: true })
      .fill('https://example.com/draft');
    await dialog.getByRole('textbox', { name: 'Title (optional)' }).fill(resourceTitle);
    await dialog.getByRole('button', { name: 'Add link', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('link', { name: resourceTitle, exact: true })).toBeVisible();
    await expect(name).toHaveValue(draftName);
    await expect(description).toHaveValue('Keep my planning context while links change.');
    await alert.getByRole('button', { name: 'Retry saving' }).click();
    await expect(alert).toBeHidden();
    await expect(page.getByRole('status')).toHaveText('Saved');
    expect(attempts).toBe(2);
    await description.fill('A newer unsaved plan');
    await expect(page.getByRole('status')).toBeHidden();
    await page.reload();
    await expect(name).toHaveValue(draftName);
    await expect(description).toHaveValue('Keep my planning context while links change.');
  } finally {
    release();
    await request.patch('/api/workspace', {
      data: {
        name: original.name,
        description: original.description,
        url: original.url,
        githubUrl: original.githubUrl,
      },
    });
    const workspace = await (await request.get('/api/workspace')).json();
    for (const resource of workspace.resources.filter(
      (item: { title: string }) => item.title === resourceTitle,
    )) {
      await request.delete(`/api/workspace/resources/${resource.id}`);
    }
  }
});

test('resource deletion reports failure locally, retries once and restores keyboard focus', async ({
  page,
  request,
}, testInfo) => {
  const title = `RemoveResource${Date.now()}`;
  const resource = await (
    await request.post('/api/workspace/resources', {
      data: { title, url: 'https://example.com/remove' },
    })
  ).json();
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  const remove = page.getByRole('button', { name: `Remove resource ${title}`, exact: true });
  let attempts = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**/api/workspace/resources/${resource.id}`, async (route) => {
    if (route.request().method() !== 'DELETE') return route.continue();
    attempts += 1;
    if (attempts === 1) {
      await gate;
      await route.fulfill({ status: 503, body: 'Temporary removal failure' });
    } else await route.continue();
  });
  try {
    await remove.click();
    await expect(page.getByRole('status')).toHaveText('Removing resource…');
    await expect(remove).toBeDisabled();
    await remove.evaluate((button) => (button as HTMLButtonElement).click());
    expect(attempts).toBe(1);
    release();
    const alert = page.getByRole('alert');
    await expect(alert).toContainText('Resource could not be removed');
    await expect(alert).toContainText('Temporary removal failure');
    await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible();
    await alert.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('home-resource-removal-failure.png') });
    const retry = alert.getByRole('button', { name: 'Retry removing' });
    await retry.focus();
    await retry.press('Enter');
    await expect(page.getByRole('link', { name: title, exact: true })).toBeHidden();
    await expect(page.getByRole('status')).toHaveText(`Removed ${title}`);
    await expect(page.getByRole('button', { name: 'Add resource', exact: true })).toBeFocused();
    expect(attempts).toBe(2);
    await page.reload();
    await expect(page.getByRole('link', { name: title, exact: true })).toBeHidden();
  } finally {
    release();
    await request.delete(`/api/workspace/resources/${resource.id}`);
  }
});

test('an earlier workspace response does not erase a newly added resource', async ({
  page,
  request,
}) => {
  const original = await (await request.get('/api/workspace')).json();
  const resourceTitle = `ConcurrentResource${Date.now()}`;
  await page.goto('/');
  await page
    .getByRole('textbox', { name: 'Description', exact: true })
    .fill('Save while adding context');
  let release!: () => void;
  let captured!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const ready = new Promise<void>((resolve) => {
    captured = resolve;
  });
  await page.route('**/api/workspace', async (route) => {
    if (route.request().method() !== 'PATCH') return route.continue();
    const response = await route.fetch();
    const body = await response.json();
    captured();
    await gate;
    await route.fulfill({ json: body });
  });
  try {
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await ready;
    await page.getByRole('button', { name: 'Add resource', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Add resource' });
    await dialog
      .getByRole('textbox', { name: 'URL', exact: true })
      .fill('https://example.com/concurrent');
    await dialog.getByRole('textbox', { name: 'Title (optional)' }).fill(resourceTitle);
    await dialog.getByRole('button', { name: 'Add link', exact: true }).click();
    await expect(dialog).toBeHidden();
    const link = page.getByRole('link', { name: resourceTitle, exact: true });
    await expect(link).toBeVisible();
    release();
    await expect(page.getByRole('status')).toHaveText('Saved');
    await expect(link).toBeVisible();
    await page.reload();
    await expect(link).toBeVisible();
  } finally {
    release();
    await request.patch('/api/workspace', {
      data: {
        name: original.name,
        description: original.description,
        url: original.url,
        githubUrl: original.githubUrl,
      },
    });
    const workspace = await (await request.get('/api/workspace')).json();
    for (const resource of workspace.resources.filter(
      (item: { title: string }) => item.title === resourceTitle,
    )) {
      await request.delete(`/api/workspace/resources/${resource.id}`);
    }
  }
});
