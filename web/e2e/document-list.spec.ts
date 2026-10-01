import { expect, test } from '@playwright/test';

test('document list searches, sorts and opens creation directly', async ({ page }) => {
  const documents = [
    {
      id: 1,
      slug: 'zulu',
      title: 'Zulu note',
      parentId: null,
      status: 'draft',
      tags: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 2,
      slug: 'alpha',
      title: 'Alpha plan',
      parentId: null,
      status: 'draft',
      tags: ['Design'],
      createdAt: '2026-02-01T00:00:00Z',
      updatedAt: '2026-02-01T00:00:00Z',
    },
  ];
  await page.route('**/api/pages', (route) => route.fulfill({ json: documents }));
  await page.goto('/pages');
  const list = page.getByRole('list', { name: 'Pages', exact: true });
  await expect(list.getByRole('listitem').first()).toContainText('Alpha plan');
  await page.getByRole('button', { name: 'Ascending', exact: true }).click();
  await expect(list.getByRole('listitem').first()).toContainText('Zulu note');
  await page.getByRole('combobox', { name: 'Document ordering' }).selectOption('created');
  await expect(list.getByRole('listitem').first()).toContainText('Alpha plan');
  await page.getByRole('textbox', { name: 'Search documents' }).fill('Design');
  await expect(list.getByRole('listitem')).toHaveCount(1);
  await expect(list).toContainText('Alpha plan');
  await page.getByRole('textbox', { name: 'Search documents' }).fill('missing');
  await expect(page.getByText('No documents match your search.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Create page', exact: true }).click();
  await expect(page.getByRole('dialog', { name: /^Create page/ })).toBeVisible();
});

test('empty document list offers creation without the command palette', async ({ page }) => {
  await page.route('**/api/pages', (route) => route.fulfill({ json: [] }));
  await page.goto('/pages');
  await expect(
    page.getByText('Create documents to keep notes, decisions, and plans.', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Create page', exact: true })
    .filter({ hasText: 'Create page' })
    .last()
    .click();
  await expect(page.getByRole('dialog', { name: /^Create page/ })).toBeVisible();
});
