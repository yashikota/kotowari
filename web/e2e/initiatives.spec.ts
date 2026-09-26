import { expect, test } from '@playwright/test';

test('initiative list matches Linear views, filters, grouping, ordering, and display options', async ({
  page,
  request,
}) => {
  await page.goto('/initiatives');
  await expect(
    page.getByText(
      'Initiatives are larger, strategic product efforts that set the direction of your company. They bring together projects aligned with a shared goal so you can monitor progress at scale.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Documentation' })).toHaveAttribute(
    'href',
    'https://linear.app/docs/initiatives',
  );
  await page.keyboard.press('n');
  await page.keyboard.press('i');
  const shortcutCreateDialog = page.getByRole('dialog', { name: 'New initiative' });
  await expect(shortcutCreateDialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(shortcutCreateDialog).toBeHidden();

  const stamp = Date.now();
  const activeName = `Active initiative ${stamp}`;
  const plannedName = `Planned initiative ${stamp}`;
  const label = `initiative-${stamp}`;
  const detailLabel = `initiative-detail-${stamp}`;
  const projectSlug = `initiative-list-project-${stamp}`;
  const labelResponse = await request.post('/api/labels', {
    data: { name: label, color: '#7950f2' },
  });
  expect(labelResponse.ok(), await labelResponse.text()).toBeTruthy();
  const detailLabelResponse = await request.post('/api/labels', {
    data: { name: detailLabel, color: '#7950f2' },
  });
  expect(detailLabelResponse.ok(), await detailLabelResponse.text()).toBeTruthy();
  const projectResponse = await request.post('/api/projects', {
    data: {
      name: `Active initiative project ${stamp}`,
      slug: projectSlug,
      status: 'started',
      description: '',
      labels: [label],
    },
  });
  expect(projectResponse.ok(), await projectResponse.text()).toBeTruthy();

  const activeResponse = await request.post('/api/initiatives', {
    data: {
      name: activeName,
      slug: `active-initiative-${stamp}`,
      status: 'active',
      description: 'Ship the next version',
      targetDate: '2026-11-20',
      projectSlugs: [projectSlug],
      priority: 2,
      health: 'on_track',
      labels: [label],
    },
  });
  expect(activeResponse.ok(), await activeResponse.text()).toBeTruthy();
  const active = (await activeResponse.json()) as { id: number };
  const plannedResponse = await request.post('/api/initiatives', {
    data: {
      name: plannedName,
      slug: `planned-initiative-${stamp}`,
      status: 'planned',
      targetDate: '2026-12-10',
      priority: 3,
    },
  });
  expect(plannedResponse.ok(), await plannedResponse.text()).toBeTruthy();

  await page.goto('/initiatives?scope=active');
  await expect(page.getByRole('link', { name: activeName })).toBeVisible();
  await expect(page.getByRole('link', { name: plannedName })).toHaveCount(0);
  await page.getByRole('tab', { name: 'All initiatives' }).click();
  await expect(page.getByRole('link', { name: plannedName })).toBeVisible();

  await page.getByRole('button', { name: 'Add filter' }).click();
  const filterDialog = page.getByRole('dialog');
  await filterDialog.getByRole('button', { name: 'Projects' }).click();
  await filterDialog.getByRole('combobox', { name: 'Projects' }).selectOption('withProjects');
  await expect(page.getByRole('link', { name: activeName })).toBeVisible();
  await expect(page.getByRole('link', { name: plannedName })).toHaveCount(0);
  await expect(
    page.getByRole('group', { name: 'Active filters' }).getByRole('button', {
      name: 'Projects: With projects',
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Add another filter' }).click();
  await filterDialog.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByRole('link', { name: plannedName })).toBeVisible();
  await page.getByRole('button', { name: 'Add filter' }).click();
  await filterDialog.getByRole('button', { name: 'Labels' }).click();
  await filterDialog.getByRole('checkbox', { name: label, exact: true }).click();
  await expect(
    page.getByRole('group', { name: 'Active filters' }).getByRole('button', {
      name: `Labels: ${label}`,
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Add another filter' }).click();
  await filterDialog.getByRole('button', { name: 'Priority' }).click();
  await filterDialog.getByRole('checkbox', { name: 'High', exact: true }).click();
  await page.getByRole('button', { name: 'Add another filter' }).click();
  await filterDialog.getByRole('button', { name: 'Health' }).click();
  await filterDialog.getByRole('checkbox', { name: 'On track', exact: true }).click();
  const activeFilters = new URL(page.url()).searchParams;
  expect(activeFilters.has('priorityFilter')).toBeTruthy();
  expect(activeFilters.has('healthFilter')).toBeTruthy();
  expect(activeFilters.has('labelFilter')).toBeTruthy();
  const activeFilterGroup = page.getByRole('group', { name: 'Active filters' });
  await expect(activeFilterGroup.getByRole('button', { name: 'Priority: High' })).toBeVisible();
  await expect(activeFilterGroup.getByRole('button', { name: 'Health: On track' })).toBeVisible();
  await activeFilterGroup.getByRole('button', { name: 'Remove Health filter' }).click();
  await expect.poll(() => new URL(page.url()).searchParams.has('healthFilter')).toBeFalsy();
  await page.getByRole('button', { name: 'Add another filter' }).click();
  await filterDialog.getByRole('button', { name: 'Health' }).click();
  await filterDialog.getByRole('checkbox', { name: 'On track', exact: true }).click();
  await expect(page.getByRole('link', { name: activeName })).toBeVisible();
  await expect(page.getByRole('link', { name: plannedName })).toHaveCount(0);
  await page.goto('/initiatives?scope=all');
  await expect(page.getByRole('link', { name: plannedName })).toBeVisible();

  await page.getByRole('button', { name: 'Display options' }).click();
  await page.getByRole('combobox', { name: 'Grouping' }).selectOption('status');
  await page.getByRole('combobox', { name: 'Ordering' }).selectOption('targetDate');
  await page.getByRole('checkbox', { name: 'ID' }).check();
  await page.getByRole('checkbox', { name: 'Description' }).check();
  await page.getByRole('checkbox', { name: 'Priority' }).check();
  await page.getByRole('checkbox', { name: 'Health' }).check();
  await page.getByRole('checkbox', { name: 'Labels' }).check();
  await page.getByRole('checkbox', { name: 'Completed' }).check();
  await page.getByRole('checkbox', { name: 'Active projects' }).check();
  await expect(page.getByRole('columnheader', { name: 'ID' }).first()).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Description' }).first()).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Priority' }).first()).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Health' }).first()).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Labels' }).first()).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Completed' }).first()).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Active projects' }).first()).toBeVisible();
  await expect(page.getByText('In progress', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(`#${active.id}`, { exact: true })).toBeVisible();
  await expect(page.getByText('1 active project', { exact: true })).toBeVisible();

  await page.getByRole('textbox', { name: 'Search initiatives' }).fill('next version');
  await expect(page.getByRole('link', { name: activeName })).toBeVisible();
  await expect(page.getByRole('link', { name: plannedName })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('link', { name: activeName })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Description' }).first()).toBeVisible();
  await expect(page.getByText('1 active project', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: activeName }).click();
  await page.getByRole('combobox', { name: 'Priority' }).click();
  await page.getByRole('option', { name: 'Urgent', exact: true }).click();
  await page.getByRole('combobox', { name: 'Health' }).click();
  await page.getByRole('option', { name: 'Off track', exact: true }).click();
  await page.getByRole('combobox', { name: 'Labels' }).click();
  await page.getByRole('option', { name: detailLabel, exact: true }).click();
  await page.getByRole('combobox', { name: 'Status' }).click();
  await page.getByRole('option', { name: 'Completed', exact: true }).click();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect
    .poll(async () => {
      const response = await request.get(`/api/initiatives/active-initiative-${stamp}`);
      return (await response.json()) as {
        status: string;
        priority: number;
        health: string;
        labels: string[];
        completedAt: string;
      };
    })
    .toMatchObject({
      status: 'completed',
      priority: 1,
      health: 'off_track',
      labels: [label, detailLabel],
    });
  await expect
    .poll(async () => {
      const response = await request.get(`/api/initiatives/active-initiative-${stamp}`);
      return (await response.json()) as { completedAt?: string };
    })
    .toHaveProperty('completedAt');
});

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
