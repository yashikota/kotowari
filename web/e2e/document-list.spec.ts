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
  await expect(
    page.getByText('No documents match the current filters.', { exact: true }),
  ).toBeVisible();
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

test('document projects group and filter the list', async ({ page }) => {
  await page.route('**/api/pages', (route) =>
    route.fulfill({
      json: [
        {
          id: 1,
          slug: 'design-note',
          title: 'Design note',
          projectId: 10,
          parentId: null,
          status: 'draft',
          tags: [],
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
        {
          id: 2,
          slug: 'personal-note',
          title: 'Personal note',
          projectId: null,
          parentId: null,
          status: 'draft',
          tags: [],
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      ],
    }),
  );
  await page.route('**/api/projects', (route) =>
    route.fulfill({
      json: [{ id: 10, slug: 'design', name: 'Design', status: 'planned', labels: [] }],
    }),
  );
  await page.goto('/pages');
  await expect(page.getByRole('heading', { name: 'Design · 1', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No project · 1', exact: true })).toBeVisible();
  const list = page.getByRole('list', { name: 'Pages', exact: true });
  await page.getByRole('combobox', { name: 'Filter documents by project' }).selectOption('10');
  await expect(list.getByRole('listitem')).toHaveCount(1);
  await expect(list).toContainText('Design note');
  await page.getByRole('combobox', { name: 'Filter documents by project' }).selectOption('none');
  await expect(list).toContainText('Personal note');
  await page.getByRole('combobox', { name: 'Document grouping' }).selectOption('none');
  await expect(page.getByRole('heading', { name: 'No project · 1', exact: true })).toHaveCount(0);
});

test('document display settings and date properties survive reload', async ({ page }) => {
  await page.route('**/api/pages', (route) =>
    route.fulfill({
      json: [
        {
          id: 1,
          slug: 'note',
          title: 'Note',
          projectId: null,
          parentId: null,
          status: 'draft',
          tags: [],
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-02-01T00:00:00Z',
        },
      ],
    }),
  );
  await page.goto('/pages');
  await page.getByRole('checkbox', { name: 'Created', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Last edited', exact: true }).check();
  await page.getByRole('combobox', { name: 'Document grouping' }).selectOption('none');
  await page.getByRole('combobox', { name: 'Document ordering' }).selectOption('updated');
  await page.getByRole('button', { name: 'Ascending', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Document grouping' })).toHaveValue('none');
  await expect(page.getByRole('combobox', { name: 'Document ordering' })).toHaveValue('updated');
  await expect(page.getByRole('button', { name: 'Descending', exact: true })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Created', exact: true })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Last edited', exact: true })).toBeChecked();
  const list = page.getByRole('list', { name: 'Pages', exact: true });
  await expect(list.locator('time')).toHaveCount(2);
  await expect(list.locator('time').first()).toHaveAttribute('datetime', '2026-01-01T00:00:00Z');
  await page.getByRole('checkbox', { name: 'Created', exact: true }).uncheck();
  await expect(list.locator('time')).toHaveCount(1);
});

test('document date filters distinguish creation from editing and can be cleared', async ({
  page,
}) => {
  const now = new Date().toISOString();
  await page.route('**/api/pages', (route) =>
    route.fulfill({
      json: [
        {
          id: 1,
          slug: 'recent',
          title: 'Recent note',
          projectId: null,
          parentId: null,
          status: 'draft',
          tags: [],
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 2,
          slug: 'old',
          title: 'Old revised note',
          projectId: null,
          parentId: null,
          status: 'draft',
          tags: [],
          createdAt: '2020-01-01T12:00:00Z',
          updatedAt: now,
        },
      ],
    }),
  );
  await page.goto('/pages');
  const list = page.getByRole('list', { name: 'Pages', exact: true });
  await page.getByRole('combobox', { name: 'Filter date range' }).selectOption('last:1w');
  await expect(list.getByRole('listitem')).toHaveCount(1);
  await expect(list).toContainText('Recent note');
  await page.getByRole('combobox', { name: 'Filter date field' }).selectOption('updatedAt');
  await expect(list.getByRole('listitem')).toHaveCount(2);
  await page.getByRole('combobox', { name: 'Filter date range' }).selectOption('custom');
  await page.getByRole('combobox', { name: 'Filter date field' }).selectOption('createdAt');
  await page.getByRole('textbox', { name: 'On or after', exact: true }).fill('2020-01-01');
  await page.getByRole('textbox', { name: 'On or before', exact: true }).fill('2020-01-02');
  await expect(list.getByRole('listitem')).toHaveCount(1);
  await expect(list).toContainText('Old revised note');
  await page.getByRole('combobox', { name: 'Filter date range' }).selectOption('all');
  await expect(list.getByRole('listitem')).toHaveCount(2);
});

test('inactive project document visibility can be enabled and is remembered', async ({ page }) => {
  await page.route('**/api/pages', (route) =>
    route.fulfill({
      json: [
        {
          id: 1,
          slug: 'finished-note',
          title: 'Finished note',
          projectId: 10,
          parentId: null,
          status: 'draft',
          tags: [],
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      ],
    }),
  );
  await page.route('**/api/projects', (route) =>
    route.fulfill({
      json: [{ id: 10, slug: 'finished', name: 'Finished', status: 'completed', labels: [] }],
    }),
  );
  await page.goto('/pages');
  await expect(
    page.getByText('No documents match the current filters.', { exact: true }),
  ).toBeVisible();
  const toggle = page.getByRole('checkbox', { name: 'Show inactive projects', exact: true });
  await toggle.check();
  const list = page.getByRole('list', { name: 'Pages', exact: true });
  await expect(list).toContainText('Finished note');
  await page.reload();
  await expect(toggle).toBeChecked();
  await expect(list).toContainText('Finished note');
  await toggle.uncheck();
  await expect(list).toHaveCount(0);
});
