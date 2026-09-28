import { expect, test } from '@playwright/test';

test('O sequences open single-user entity pickers and navigate to their selection', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const issueTitle = `Quick-open issue ${stamp}`;
  const issueResponse = await request.post('/api/issues', {
    data: { title: issueTitle, status: 'todo' },
  });
  expect(issueResponse.ok(), await issueResponse.text()).toBeTruthy();
  const issue = (await issueResponse.json()) as { identifier: string };
  const favoriteResponse = await request.patch(`/api/issues/${issue.identifier}`, {
    data: { isFavorite: true },
  });
  expect(favoriteResponse.ok(), await favoriteResponse.text()).toBeTruthy();

  const projectName = `Quick-open project ${stamp}`;
  const projectSlug = `quick-open-project-${stamp}`;
  const projectResponse = await request.post('/api/projects', {
    data: { name: projectName, slug: projectSlug },
  });
  expect(projectResponse.ok(), await projectResponse.text()).toBeTruthy();

  const now = Date.now();
  const cycleResponse = await request.post('/api/cycles', {
    data: {
      startsAt: new Date(now - 86_400_000).toISOString(),
      endsAt: new Date(now + 6 * 86_400_000).toISOString(),
      status: 'active',
    },
  });
  expect(cycleResponse.ok(), await cycleResponse.text()).toBeTruthy();
  const cycle = (await cycleResponse.json()) as { number: number };

  const viewName = `Quick-open view ${stamp}`;
  const viewSlug = `quick-open-view-${stamp}`;
  const viewResponse = await request.post('/api/views', {
    data: { name: viewName, slug: viewSlug },
  });
  expect(viewResponse.ok(), await viewResponse.text()).toBeTruthy();

  const initiativeName = `Quick-open initiative ${stamp}`;
  const initiativeSlug = `quick-open-initiative-${stamp}`;
  const initiativeResponse = await request.post('/api/initiatives', {
    data: {
      name: initiativeName,
      slug: initiativeSlug,
      status: 'active',
      projectSlugs: [],
    },
  });
  expect(initiativeResponse.ok(), await initiativeResponse.text()).toBeTruthy();

  const documentTitle = `Quick-open document ${stamp}`;
  const documentSlug = `quick-open-document-${stamp}`;
  const documentResponse = await request.post('/api/pages', {
    data: { title: documentTitle, slug: documentSlug },
  });
  expect(documentResponse.ok(), await documentResponse.text()).toBeTruthy();

  await page.goto('/issues');
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

  await page.keyboard.press('o');
  await page.keyboard.press('i');
  let picker = page.getByRole('dialog', { name: 'Open issue' });
  const search = picker.getByRole('textbox', { name: 'Command search' });
  await expect(search).toHaveAttribute('placeholder', 'Search issue by name or identifier…');
  await search.fill(issue.identifier);
  await picker.getByRole('option').filter({ hasText: issue.identifier }).click();
  await expect(page).toHaveURL(new RegExp(`/issues/${issue.identifier}$`));

  await page.keyboard.press('o');
  await page.keyboard.press('f');
  picker = page.getByRole('dialog', { name: 'Open favorite' });
  await expect(picker.getByRole('option').filter({ hasText: issue.identifier })).toBeVisible();
  await picker.getByRole('option').filter({ hasText: issue.identifier }).click();

  const pickAndOpen = async (key: string, pickerTitle: string, resultText: string, url: RegExp) => {
    await page.keyboard.press('o');
    await page.keyboard.press(key);
    const targetPicker = page.getByRole('dialog', { name: pickerTitle });
    const option = targetPicker.getByRole('option').filter({ hasText: resultText });
    await option.click();
    await expect(page).toHaveURL(url);
  };

  await pickAndOpen('p', 'Open project', projectName, new RegExp(`/projects/${projectSlug}$`));
  await pickAndOpen(
    'c',
    'Open cycle',
    `Cycle ${cycle.number}`,
    new RegExp(`/cycles/${cycle.number}$`),
  );
  await pickAndOpen('v', 'Open view', viewName, new RegExp(`/views/${viewSlug}$`));
  await pickAndOpen(
    'n',
    'Open initiative',
    initiativeName,
    new RegExp(`/initiatives/${initiativeSlug}$`),
  );

  await page.keyboard.press('o');
  await page.keyboard.press('d');
  picker = page.getByRole('dialog', { name: 'Open document' });
  await picker.getByRole('textbox', { name: 'Command search' }).fill(documentTitle);
  await picker.getByRole('option').filter({ hasText: documentTitle }).click();
  await expect(page).toHaveURL(new RegExp(`/pages/${documentSlug}$`));

  await page.keyboard.press('?');
  const shortcuts = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  for (const shortcut of [
    'O, then I',
    'O, then F',
    'O, then P',
    'O, then C',
    'O, then V',
    'O, then D',
    'O, then N',
  ]) {
    await expect(shortcuts).toContainText(shortcut);
  }
});
