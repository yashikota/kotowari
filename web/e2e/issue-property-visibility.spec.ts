import { expect, test } from '@playwright/test';

test('issue details keep optional properties out of the way until added', async ({
  page,
  request,
}) => {
  const now = Date.now();
  const cycleResponse = await request.post('/api/cycles', {
    data: {
      startsAt: new Date(now + 7 * 86_400_000).toISOString(),
      endsAt: new Date(now + 14 * 86_400_000).toISOString(),
      status: 'upcoming',
    },
  });
  expect(cycleResponse.ok()).toBeTruthy();
  const cycle = (await cycleResponse.json()) as { id: number; number: number };
  const title = `Optional properties ${Date.now()}`;
  const created = await request.post('/api/issues', { data: { title, status: 'todo' } });
  expect(created.ok()).toBeTruthy();
  const issue = (await created.json()) as { identifier: string };

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/issues/${issue.identifier}`);
  const titleInput = page.getByRole('textbox', { name: 'Issue title' });
  const properties = page.getByRole('region', { name: 'Issue properties' });
  const coreProperties = properties.getByRole('group', { name: 'Core properties' });
  const labelProperties = properties.getByRole('group', { name: 'Labels' });
  const projectProperties = properties.getByRole('group', { name: 'Project' });
  const optionalProperties = properties.getByRole('group', { name: 'Optional properties' });
  await expect(coreProperties.getByRole('combobox', { name: 'Status' })).toBeVisible();
  await expect(coreProperties.getByRole('combobox', { name: 'Priority' })).toBeVisible();
  await expect(coreProperties.getByRole('combobox', { name: 'Assignee' })).toBeVisible();
  await expect(projectProperties.getByRole('combobox', { name: 'Project' })).toBeVisible();
  await expect(coreProperties.getByRole('combobox', { name: 'Priority' })).toHaveValue(
    'No priority',
  );
  await expect(projectProperties.getByRole('combobox', { name: 'Project' })).toHaveValue(
    'Add to project',
  );
  await expect(labelProperties.getByRole('button', { name: 'Change labels' })).toContainText(
    'Add label',
  );
  await expect(coreProperties.getByRole('combobox', { name: 'Estimate' })).toHaveValue(
    'No estimate',
  );
  await expect(coreProperties.getByRole('combobox', { name: 'Cycle' })).toHaveValue('No cycle');
  await expect(coreProperties.getByRole('combobox', { name: 'Estimate' })).toBeVisible();
  await expect(labelProperties).toBeVisible();
  await expect(coreProperties.getByRole('combobox', { name: 'Cycle' })).toBeVisible();
  await expect(coreProperties.getByRole('heading', { name: 'Properties', level: 3 })).toBeVisible();
  await expect(labelProperties.getByRole('heading', { name: 'Labels', level: 3 })).toBeVisible();
  await expect(projectProperties.getByRole('heading', { name: 'Project', level: 3 })).toBeVisible();
  const orderedProperties = [
    coreProperties.getByRole('combobox', { name: 'Status' }),
    coreProperties.getByRole('combobox', { name: 'Priority' }),
    coreProperties.getByRole('combobox', { name: 'Assignee' }),
    coreProperties.getByRole('combobox', { name: 'Estimate' }),
    coreProperties.getByRole('combobox', { name: 'Cycle' }),
    labelProperties.getByRole('button', { name: 'Change labels' }),
    projectProperties.getByRole('combobox', { name: 'Project' }),
  ];
  const propertyRowBounds = await Promise.all(
    orderedProperties.map((property) =>
      property.evaluate((element) => {
        const row = element.closest('div[class*="row"]');
        if (!row) throw new Error('Issue property is not inside a property row.');
        const { x, y, width, height } = row.getBoundingClientRect();
        return { x, y, width, height };
      }),
    ),
  );
  expect(propertyRowBounds.length).toBeGreaterThan(0);
  const titleBounds = await titleInput.boundingBox();
  const propertiesBounds = await properties.boundingBox();
  expect(titleBounds).not.toBeNull();
  expect(propertiesBounds).not.toBeNull();
  expect(propertiesBounds!.x).toBeGreaterThan(titleBounds!.x + titleBounds!.width);
  expect(propertiesBounds!.y).toBeLessThanOrEqual(titleBounds!.y + 2);
  expect(propertiesBounds!.width).toBeLessThan(titleBounds!.width);
  for (let index = 1; index < propertyRowBounds.length; index += 1) {
    const previous = propertyRowBounds[index - 1]!;
    const current = propertyRowBounds[index]!;
    expect(current.y).toBeGreaterThanOrEqual(previous.y + previous.height - 1);
  }
  expect(await optionalProperties.getByRole('combobox', { name: 'Cycle' }).count()).toBe(0);
  const cycleRowY = propertyRowBounds.at(-1)?.y ?? null;
  expect(cycleRowY).not.toBeNull();
  const statusRadius = await properties
    .locator('div[class*="row"]')
    .first()
    .evaluate((row) => Number.parseFloat(getComputedStyle(row).borderTopLeftRadius));
  expect(statusRadius).toBeLessThanOrEqual(8);
  const addPropertyBounds = await optionalProperties
    .getByRole('button', { name: 'Add property' })
    .boundingBox();
  expect(addPropertyBounds).not.toBeNull();
  expect(addPropertyBounds!.y).toBeGreaterThan(cycleRowY!);
  expect(addPropertyBounds!.x).toBeGreaterThanOrEqual(propertiesBounds!.x);
  expect(addPropertyBounds!.x + addPropertyBounds!.width).toBeLessThanOrEqual(
    propertiesBounds!.x + propertiesBounds!.width + 1,
  );

  const cyclePicker = coreProperties.getByRole('combobox', { name: 'Cycle' });
  await cyclePicker.click();
  await page.getByRole('option', { name: `Cycle ${cycle.number}` }).click();
  await expect(cyclePicker).toHaveValue(`Cycle ${cycle.number}`);
  await expect
    .poll(async () => {
      const response = await request.get(`/api/issues/${issue.identifier}`);
      return ((await response.json()) as { cycleId: number | null }).cycleId;
    })
    .toBe(cycle.id);
  for (const name of ['Due date', 'Milestone', 'Parent', 'Type']) {
    await expect(properties.getByLabel(name, { exact: true })).toHaveCount(0);
  }

  await optionalProperties.getByRole('button', { name: 'Add property' }).click();
  const propertyMenu = page.getByRole('menu', { name: 'Add property' });
  await expect(propertyMenu.getByRole('menuitem', { name: 'Due date' })).toBeEnabled();
  await expect(propertyMenu.getByRole('menuitem', { name: 'Type' })).toBeEnabled();
  await expect(propertyMenu.getByRole('menuitem', { name: 'Milestone' })).toBeDisabled();
  await propertyMenu.getByRole('menuitem', { name: 'Due date' }).click();

  const dueDate = properties.getByLabel('Due date');
  await expect(dueDate).toBeVisible();
  await dueDate.fill('2030-02-03');
  await expect
    .poll(async () => {
      const response = await request.get(`/api/issues/${issue.identifier}`);
      return ((await response.json()) as { dueDate: string | null }).dueDate;
    })
    .toBe('2030-02-03');

  await page.reload();
  await expect(properties.getByLabel('Due date')).toHaveValue('2030-02-03');
  await expect(properties.getByRole('combobox', { name: 'Cycle' })).toHaveValue(
    `Cycle ${cycle.number}`,
  );
  await optionalProperties.getByRole('button', { name: 'Add property' }).click();
  await page.getByRole('menuitem', { name: 'Due date', exact: true }).click();
  await expect(properties.getByLabel('Due date')).toHaveCount(0);

  const unchanged = await request.get(`/api/issues/${issue.identifier}`);
  expect(await unchanged.json()).toMatchObject({ dueDate: '2030-02-03' });
  await page.reload();
  await expect(properties.getByLabel('Due date')).toHaveCount(0);

  await page.setViewportSize({ width: 930, height: 900 });
  const stackedTitleBounds = await titleInput.boundingBox();
  const stackedPropertiesBounds = await properties.boundingBox();
  expect(stackedTitleBounds).not.toBeNull();
  expect(stackedPropertiesBounds).not.toBeNull();
  expect(Math.abs(stackedPropertiesBounds!.x - stackedTitleBounds!.x)).toBeLessThanOrEqual(1);
  expect(stackedPropertiesBounds!.width).toBeGreaterThanOrEqual(stackedTitleBounds!.width - 1);
  expect(stackedPropertiesBounds!.y).toBeGreaterThan(stackedTitleBounds!.y);
});
