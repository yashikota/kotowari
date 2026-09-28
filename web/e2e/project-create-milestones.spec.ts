import { expect, test } from '@playwright/test';

test('new projects can be created with described, dated milestones', async ({ page, request }) => {
  const projectName = `Milestone plan ${Date.now()}`;
  const milestoneName = 'Public preview';
  const description = 'Invite customers and verify the launch checklist.';

  await page.goto('/projects');
  await page.getByRole('button', { name: 'New project' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'New project' });
  await dialog.getByLabel('Project name').fill(projectName);
  const milestones = dialog.getByRole('button', { name: 'Milestones', exact: true });
  await expect(milestones).toHaveAttribute('aria-expanded', 'false');
  await milestones.click();
  await expect(milestones).toHaveAttribute('aria-expanded', 'true');
  await milestones.click();
  await expect(milestones).toHaveAttribute('aria-expanded', 'false');
  await dialog.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(milestones).toHaveCount(0);
  await expect(dialog.getByText('Create milestone')).toBeVisible();
  await dialog.getByLabel('Milestone name').fill(milestoneName);
  await dialog.getByLabel('Milestone description').fill(description);
  await dialog.getByRole('button', { name: 'Choose date' }).click();
  const dateInput = page.getByLabel('Set Target date');
  await dateInput.fill('2026/12/01');
  await dateInput.press('Enter');
  const addMilestone = dialog.getByRole('button', { name: 'Add milestone' });
  await expect(addMilestone).toBeInViewport();
  await addMilestone.click();
  await expect(dialog.getByText(milestoneName)).toBeVisible();
  await dialog.getByRole('button', { name: 'Create project' }).click();

  await expect(page).toHaveURL(/\/projects\/[^/]+$/);
  const projectSlug = new URL(page.url()).pathname.split('/').pop();
  if (!projectSlug) throw new Error('expected created project route');
  const response = await request.get(`/api/projects/${projectSlug}`);
  await expect(await response.json()).toMatchObject({
    milestones: [{ name: milestoneName, description, targetDate: '2026-12-01' }],
  });
  const milestoneDescription = page.getByLabel(`Milestone description: ${milestoneName}`);
  await expect(milestoneDescription).toHaveValue(description);
  await milestoneDescription.fill('Checklist validated with launch partners.');
  await expect(milestoneDescription).toHaveValue('Checklist validated with launch partners.');
  await milestoneDescription.blur();
  await expect
    .poll(async () => {
      const refreshed = await request.get(`/api/projects/${projectSlug}`);
      const value = await refreshed.json();
      return value.milestones[0]?.description;
    })
    .toBe('Checklist validated with launch partners.');
});
