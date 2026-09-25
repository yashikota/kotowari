import { expect, test } from '@playwright/test';

test('initiatives link projects in both directions and filter project lists', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const firstSlug = `initiative-first-${stamp}`;
  const secondSlug = `initiative-second-${stamp}`;
  const unassignedSlug = `initiative-none-${stamp}`;
  const firstName = `Initiative first ${stamp}`;
  const secondName = `Initiative second ${stamp}`;
  const unassignedName = `Initiative unassigned ${stamp}`;
  const initiativeName = `Platform roadmap ${stamp}`;

  for (const [name, slug] of [
    [firstName, firstSlug],
    [secondName, secondSlug],
    [unassignedName, unassignedSlug],
  ]) {
    const response = await request.post('/api/projects', {
      data: { name, slug, status: 'planned', description: '' },
    });
    expect(response.ok(), await response.text()).toBeTruthy();
  }

  await page.goto('/initiatives');
  await page.getByRole('button', { name: 'New initiative' }).first().click();
  const createDialog = page.getByRole('dialog', { name: 'New initiative' });
  await createDialog.getByLabel('Name').fill(initiativeName);
  await createDialog.getByRole('button', { name: 'Create initiative' }).click();
  await expect(page).toHaveURL(/\/initiatives\/[a-z0-9-]+$/);

  const initiativeSlug = new URL(page.url()).pathname.split('/').pop();
  if (!initiativeSlug) throw new Error('expected initiative detail route');

  const initiativeProjectPicker = page.getByRole('combobox', { name: 'Add projects' });
  await initiativeProjectPicker.click();
  await page.getByRole('option', { name: firstName }).click();
  await initiativeProjectPicker.press('Escape');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect
    .poll(async () => {
      const response = await request.get(`/api/initiatives/${initiativeSlug}`);
      return (await response.json()) as { projectSlugs: string[] };
    })
    .toMatchObject({ projectSlugs: [firstSlug] });

  await page.goto(`/projects/${secondSlug}`);
  const projectInitiativePicker = page.getByRole('combobox', { name: 'Initiative' });
  await projectInitiativePicker.click();
  await page.getByRole('option', { name: initiativeName }).click();
  await expect
    .poll(async () => {
      const response = await request.get(`/api/projects/${secondSlug}`);
      return (await response.json()) as { initiativeSlugs: string[] };
    })
    .toMatchObject({ initiativeSlugs: [initiativeSlug] });

  await page.goto(`/initiatives/${initiativeSlug}`);
  await expect(page.getByRole('button', { name: firstName })).toBeVisible();
  await expect(page.getByRole('button', { name: secondName })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: secondName })).toBeVisible();

  await page.goto('/projects');
  await page.getByRole('button', { name: 'Add filter' }).click();
  await page.getByRole('button', { name: 'Initiative', exact: true }).click();
  const initiativeFilter = page.getByRole('combobox', { name: 'Initiative' });
  await initiativeFilter.click();
  await page.getByRole('option', { name: initiativeName }).click();
  await expect(page).toHaveURL(/initiatives=/);
  await expect(page.getByRole('link', { name: firstName })).toBeVisible();
  await expect(page.getByRole('link', { name: secondName })).toBeVisible();
  await expect(page.getByRole('link', { name: unassignedName })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('link', { name: firstName })).toBeVisible();
  await expect(page.getByRole('link', { name: unassignedName })).toHaveCount(0);

  await page.getByRole('button', { name: new RegExp(`Initiative: .*${initiativeName}`) }).click();
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  const emptyInitiativeFilter = page.getByRole('combobox', { name: 'Initiative' });
  await emptyInitiativeFilter.click();
  await page.getByRole('option', { name: 'No initiatives' }).click();
  await expect(page).toHaveURL(/initiatives=/);
  await expect(page.getByRole('link', { name: unassignedName })).toBeVisible();
  await expect(page.getByRole('link', { name: firstName })).toHaveCount(0);
  await expect(page.getByRole('link', { name: secondName })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('link', { name: unassignedName })).toBeVisible();
});

test('deleting an initiative preserves projects and removes their initiative property', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const projectSlug = `initiative-delete-${stamp}`;
  const projectName = `Delete initiative project ${stamp}`;
  const initiativeName = `Temporary objective ${stamp}`;
  const projectResponse = await request.post('/api/projects', {
    data: { name: projectName, slug: projectSlug, status: 'planned', description: '' },
  });
  expect(projectResponse.ok(), await projectResponse.text()).toBeTruthy();

  const initiativeResponse = await request.post('/api/initiatives', {
    data: {
      name: initiativeName,
      slug: `temporary-objective-${stamp}`,
      status: 'planned',
      projectSlugs: [projectSlug],
    },
  });
  expect(initiativeResponse.ok(), await initiativeResponse.text()).toBeTruthy();
  const initiative = (await initiativeResponse.json()) as { slug: string };

  await page.goto(`/initiatives/${initiative.slug}`);
  const confirmation = page.waitForEvent('dialog').then((dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete initiative', exact: true }).click();
  await confirmation;
  await expect(page).toHaveURL('/initiatives');

  const projectAfterDelete = await request.get(`/api/projects/${projectSlug}`);
  expect(projectAfterDelete.ok()).toBeTruthy();
  expect(await projectAfterDelete.json()).not.toHaveProperty('initiativeSlugs');
  const initiativesAfterDelete = (await (await request.get('/api/initiatives')).json()) as {
    slug: string;
  }[];
  expect(initiativesAfterDelete.some((item) => item.slug === initiative.slug)).toBe(false);
});
