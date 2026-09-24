import { expect, test } from '@playwright/test';

test('project dependencies are reciprocal, survive reload, and can be removed', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const blockerName = `Blocker ${stamp}`;
  const blockedName = `Blocked ${stamp}`;
  const blockerSlug = `blocker-${stamp}`;
  const blockedSlug = `blocked-${stamp}`;
  for (const project of [
    { name: blockerName, slug: blockerSlug },
    { name: blockedName, slug: blockedSlug },
  ]) {
    const response = await request.post('/api/projects', { data: project });
    expect(response.ok()).toBeTruthy();
  }

  await page.goto(`/projects/${blockerSlug}`);
  const dependencyForm = page.getByRole('form', { name: 'Add project dependency' });
  await dependencyForm.getByLabel('Project').selectOption(blockedSlug);
  await dependencyForm.getByLabel('Relationship').selectOption('blocks');
  await dependencyForm.getByRole('button', { name: 'Add dependency' }).click();
  const blockerResponse = () => request.get(`/api/projects/${blockerSlug}`).then((r) => r.json());
  await expect.poll(blockerResponse).toMatchObject({
    dependencies: [{ projectSlug: blockedSlug, kind: 'blocks' }],
  });
  await page.reload();
  await expect(page.getByRole('list', { name: 'Project dependencies' })).toContainText(blockedName);

  const blockedResponse = await request.get(`/api/projects/${blockedSlug}`);
  expect(await blockedResponse.json()).toMatchObject({
    dependencies: [{ projectSlug: blockerSlug, kind: 'blocked_by' }],
  });

  await page.getByRole('button', { name: `Remove dependency on ${blockedName}` }).click();
  await expect.poll(blockerResponse).toMatchObject({ dependencies: [] });
  await expect
    .poll(async () => {
      const response = await request.get(`/api/projects/${blockedSlug}`);
      return await response.json();
    })
    .toMatchObject({ dependencies: [] });
});
