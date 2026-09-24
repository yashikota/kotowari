import { expect, test } from '@playwright/test';

test('project status updates publish markdown and persist in project history', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const slug = `status-update-${stamp}`;
  const name = `Status update ${stamp}`;
  const body = `Mitigation is underway.\n\nRisks: **vendor delay**.`;
  const created = await request.post('/api/projects', {
    data: { name, slug, status: 'started' },
  });
  expect(created.ok(), await created.text()).toBeTruthy();

  await page.goto(`/projects/${slug}`);
  await page.getByRole('button', { name: 'Post update' }).click();
  const dialog = page.getByRole('dialog', { name: 'Post a project update' });
  await dialog.getByLabel('Project health').selectOption('at_risk');
  await dialog.getByLabel('Update').fill(body);
  await dialog.getByRole('button', { name: 'Post update' }).click();

  const updates = page.getByRole('region', { name: 'Updates' });
  await expect(updates).toContainText('At risk');
  await expect(updates).toContainText('Mitigation is underway.');
  await expect(updates.getByText('vendor delay')).toHaveCSS('font-weight', /^(?!400$)/);
  await expect(dialog).toBeHidden();

  await expect
    .poll(async () => {
      const response = await request.get(`/api/projects/${slug}/activities`);
      const activities = (await response.json()) as {
        action: string;
        payload: { health?: string; body?: string };
      }[];
      const update = activities.find((activity) => activity.action === 'status_update_posted');
      return update?.payload;
    })
    .toEqual({ health: 'at_risk', body });

  await page.reload();
  await expect(page.getByRole('region', { name: 'Updates' })).toContainText('At risk');
  await expect(page.getByRole('region', { name: 'Updates' })).toContainText(
    'Mitigation is underway.',
  );
  await expect(page.getByRole('combobox', { name: 'Health' })).toHaveValue('at_risk');
});
