import { expect, test } from '@playwright/test';

test('a project can be saved as a template and reused without stale dates', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const sourceSlug = `template-source-${stamp}`;
  const projectName = `Template source ${stamp}`;
  const milestoneDate = '2026-12-01';
  const created = await request.post('/api/projects', {
    data: {
      name: projectName,
      slug: sourceSlug,
      summary: 'Reusable launch plan',
      icon: 'rocket',
      iconColor: 'blue',
      description: '## Launch\nShip a reliable release.',
      status: 'started',
      workflowStatus: 'started',
      lead: 'self',
      priority: 2,
      startDate: '2026-10-01',
      targetDate: '2026-12-15',
      milestones: [{ name: 'Beta', description: 'Validate the flow.', targetDate: milestoneDate }],
    },
  });
  expect(created.ok(), await created.text()).toBeTruthy();

  await page.goto(`/projects/${sourceSlug}`);
  await page.getByRole('button', { name: 'Save as template' }).click();
  const saveDialog = page.getByRole('dialog', { name: 'Save project template' });
  await saveDialog.getByLabel('Template name').fill(`Launch template ${stamp}`);
  await saveDialog.getByRole('button', { name: 'Save as template' }).click();

  const templatesResponse = await request.get('/api/project-templates');
  const templates = (await templatesResponse.json()) as {
    slug: string;
    name: string;
    startDate?: string;
    targetDate?: string;
    lead?: string;
    milestones: Array<{ name: string; description?: string; targetDate?: string }>;
  }[];
  const templateName = `Launch template ${stamp}`;
  const template = templates.find((candidate) => candidate.name === templateName);
  expect(template).toBeDefined();
  expect(template?.startDate).toBeUndefined();
  expect(template?.targetDate).toBeUndefined();
  expect(template?.lead).toBe('self');
  expect(template?.milestones).toEqual([{ name: 'Beta', description: 'Validate the flow.' }]);

  await page.goto('/projects');
  await page.getByRole('button', { name: 'New project' }).first().click();
  const createDialog = page.getByRole('dialog', { name: 'New project' });
  await createDialog.getByRole('combobox', { name: 'Project template' }).click();
  await page.getByRole('option', { name: templateName }).click();
  await expect(createDialog.getByLabel('Summary')).toHaveValue('Reusable launch plan');
  await expect(createDialog.getByLabel('Description')).toHaveValue(
    '## Launch\nShip a reliable release.',
  );
  await expect(createDialog.getByRole('combobox', { name: 'Status' })).toHaveValue('In progress');
  await expect(createDialog.getByRole('combobox', { name: 'Priority' })).toHaveValue('High');
  await expect(createDialog.getByRole('combobox', { name: 'Lead' })).toHaveValue('You');
  await expect(createDialog.getByRole('button', { name: 'Milestones' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(createDialog.getByText('Beta')).toBeVisible();
  await expect(createDialog.getByRole('button', { name: 'Change Target date' })).toHaveText(
    'Target date',
  );

  const newName = `Created from template ${stamp}`;
  await createDialog.getByLabel('Project name').fill(newName);
  await createDialog.getByRole('button', { name: 'Create project' }).click();
  await expect(page).toHaveURL(/\/projects\/[^/]+$/);
  const newSlug = new URL(page.url()).pathname.split('/').pop();
  if (!newSlug) throw new Error('expected created project route');
  const projectResponse = await request.get(`/api/projects/${newSlug}`);
  await expect(await projectResponse.json()).toMatchObject({
    name: newName,
    summary: 'Reusable launch plan',
    icon: 'rocket',
    iconColor: 'blue',
    description: '## Launch\nShip a reliable release.',
    status: 'started',
    priority: 2,
    lead: 'self',
    templateSlug: template?.slug,
    startDate: null,
    targetDate: null,
    milestones: [{ name: 'Beta', description: 'Validate the flow.', targetDate: null }],
  });

  await page.goto('/projects');
  await page.getByRole('button', { name: 'Add filter' }).click();
  await page.getByRole('button', { name: 'Template', exact: true }).click();
  await page.getByRole('combobox', { name: 'Template' }).click();
  await expect(page.getByRole('option', { name: 'No template' })).toBeVisible();
  await page.getByRole('option', { name: templateName }).click();
  await expect(page).toHaveURL(/templates=/);
  await expect(page.getByRole('link', { name: newName })).toBeVisible();
  await expect(page.getByRole('link', { name: projectName })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('link', { name: newName })).toBeVisible();
  await expect(page.getByRole('link', { name: projectName })).toHaveCount(0);

  await page.goto('/projects');
  await page.getByRole('button', { name: 'New project' }).first().click();
  const deleteDialog = page.getByRole('dialog', { name: 'New project' });
  await deleteDialog.getByRole('combobox', { name: 'Project template' }).click();
  await page.getByRole('option', { name: templateName }).click();
  const confirmation = page.waitForEvent('dialog').then((dialog) => dialog.accept());
  await deleteDialog.getByRole('button', { name: 'Delete selected project template' }).click();
  await confirmation;
  await expect
    .poll(async () => {
      const response = await request.get('/api/project-templates');
      const current = (await response.json()) as { name: string }[];
      return current.some((item) => item.name === templateName);
    })
    .toBe(false);
});
