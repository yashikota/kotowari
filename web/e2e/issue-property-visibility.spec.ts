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

  await page.goto(`/issues/${issue.identifier}`);
  await page.setViewportSize({ width: 930, height: 900 });
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
  await expect(projectProperties.getByRole('combobox', { name: 'Project' })).toHaveValue('Project');
  await expect(coreProperties.getByRole('combobox', { name: 'Estimate' })).toHaveValue(
    'No estimate',
  );
  await expect(coreProperties.getByRole('combobox', { name: 'Cycle' })).toHaveValue('No cycle');
  await expect(coreProperties.getByRole('combobox', { name: 'Estimate' })).toBeVisible();
  await expect(labelProperties).toBeVisible();
  await expect(coreProperties.getByRole('combobox', { name: 'Cycle' })).toBeVisible();
  const orderedProperties = [
    coreProperties.getByRole('combobox', { name: 'Status' }),
    coreProperties.getByRole('combobox', { name: 'Priority' }),
    coreProperties.getByRole('combobox', { name: 'Assignee' }),
    projectProperties.getByRole('combobox', { name: 'Project' }),
    coreProperties.getByRole('combobox', { name: 'Estimate' }),
    labelProperties.getByRole('button', { name: 'Change labels' }),
    coreProperties.getByRole('combobox', { name: 'Cycle' }),
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
  for (let index = 1; index < propertyRowBounds.length; index += 1) {
    const previous = propertyRowBounds[index - 1]!;
    const current = propertyRowBounds[index]!;
    if (Math.abs(current.y - previous.y) < 1) {
      expect(current.x).toBeGreaterThanOrEqual(previous.x + previous.width - 1);
    } else {
      expect(current.y).toBeGreaterThanOrEqual(previous.y + previous.height - 1);
    }
  }
  expect(await optionalProperties.getByRole('combobox', { name: 'Cycle' }).count()).toBe(0);
  const cycleRowY = propertyRowBounds.at(-1)?.y ?? null;
  expect(cycleRowY).not.toBeNull();
  expect(cycleRowY).toBeGreaterThanOrEqual(propertyRowBounds[0]!.y);
  const statusRadius = await properties
    .locator('div[class*="row"]')
    .first()
    .evaluate((row) => Number.parseFloat(getComputedStyle(row).borderTopLeftRadius));
  expect(statusRadius).toBeGreaterThan(12);
  const addPropertyBounds = await optionalProperties
    .getByRole('button', { name: 'Add property' })
    .boundingBox();
  expect(addPropertyBounds).not.toBeNull();
  expect(addPropertyBounds!.y).toBeGreaterThanOrEqual(cycleRowY!);
  expect(addPropertyBounds!.y - cycleRowY!).toBeLessThan(48);

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
});
