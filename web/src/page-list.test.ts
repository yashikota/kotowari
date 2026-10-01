import { describe, expect, it } from 'vite-plus/test';
import {
  groupPageList,
  projectPageList,
  parseDocumentDisplay,
  DEFAULT_DOCUMENT_DISPLAY,
} from './page-list.ts';
import type { Page } from './types.ts';

const page = (id: number, title: string, extra: Partial<Page> = {}): Page => ({
  id,
  title,
  slug: `doc-${id}`,
  body: '',
  parentId: null,
  projectId: null,
  status: 'draft',
  date: null,
  tags: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...extra,
});

describe('document list projection', () => {
  it('sorts siblings while keeping descendants below their parents', () => {
    const input = [page(1, 'Zulu'), page(2, 'Alpha child', { parentId: 1 }), page(3, 'Beta')];
    expect(
      projectPageList(input, '', 'name', 'asc').map(({ page, depth }) => [page.id, depth]),
    ).toEqual([
      [3, 0],
      [1, 0],
      [2, 1],
    ]);
    expect(input.map((item) => item.id)).toEqual([1, 2, 3]);
  });
  it('retains ancestors for title, slug, and tag matches', () => {
    const input = [
      page(1, 'Parent'),
      page(2, 'Child', { parentId: 1, tags: ['Architecture'] }),
      page(3, 'Other'),
    ];
    for (const query of ['child', 'doc-2', ' ARCHITECTURE ']) {
      expect(projectPageList(input, query, 'name', 'asc').map(({ page }) => page.id)).toEqual([
        1, 2,
      ]);
    }
  });
  it('orders creation and edit dates in either direction', () => {
    const input = [
      page(1, 'Old'),
      page(2, 'New', { createdAt: '2026-02-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z' }),
    ];
    for (const order of ['created', 'updated'] as const) {
      expect(projectPageList(input, '', order, 'desc').map(({ page }) => page.id)).toEqual([2, 1]);
      expect(projectPageList(input, '', order, 'asc').map(({ page }) => page.id)).toEqual([1, 2]);
    }
  });
  it('terminates on malformed parent cycles and includes each page once', () => {
    const input = [page(1, 'A', { parentId: 2 }), page(2, 'B', { parentId: 1 })];
    expect(projectPageList(input, 'A', 'name', 'asc').map(({ page }) => page.id)).toEqual([1, 2]);
    expect(projectPageList(input, 'missing', 'name', 'asc')).toEqual([]);
  });
});

it('groups documents by project and filters unassigned documents', () => {
  const pages = [
    page(1, 'Zulu', { projectId: 10 }),
    page(2, 'Alpha'),
    page(3, 'Child', { projectId: 10, parentId: 1 }),
    page(4, 'Other', { projectId: 20 }),
  ];
  const projects = [
    { id: 10, name: 'Design', slug: 'design' },
    { id: 20, name: 'Release', slug: 'release' },
  ];
  const rows = groupPageList(pages, projects, '', 'name', 'asc', 'project', 'all');
  expect(rows.map(({ page }) => page.id)).toEqual([1, 3, 4, 2]);
  expect(rows.filter((row) => row.heading).map((row) => row.heading)).toEqual([
    { name: 'Design', count: 2 },
    { name: 'Release', count: 1 },
    { name: null, count: 1 },
  ]);
  expect(
    groupPageList(pages, projects, '', 'name', 'asc', 'project', 'none').map(({ page }) => page.id),
  ).toEqual([2]);
  expect(
    groupPageList(pages, projects, 'Child', 'name', 'asc', 'project', '10').map(
      ({ page }) => page.id,
    ),
  ).toEqual([1, 3]);
  expect(
    groupPageList(pages, projects, '', 'name', 'asc', 'none', '20')[0]?.heading,
  ).toBeUndefined();
});

it('validates saved document display settings and recovers invalid storage', () => {
  for (const raw of [undefined, 'broken', 'null', '{"order":"unknown","showCreated":"yes"}']) {
    expect(parseDocumentDisplay(raw)).toEqual(DEFAULT_DOCUMENT_DISPLAY);
  }
  expect(
    parseDocumentDisplay(
      '{"grouping":"none","order":"updated","direction":"desc","showCreated":true,"showUpdated":true}',
    ),
  ).toEqual({
    grouping: 'none',
    order: 'updated',
    direction: 'desc',
    showCreated: true,
    showUpdated: true,
    showInactive: false,
  });
});

it('hides completed, canceled, and archived projects while retaining unassigned and unknown projects', () => {
  const pages = [
    page(1, 'Active', { projectId: 10 }),
    page(2, 'Completed', { projectId: 20 }),
    page(3, 'Canceled', { projectId: 30 }),
    page(4, 'Archived', { projectId: 40 }),
    page(5, 'Unassigned'),
    page(6, 'Unknown', { projectId: 99 }),
  ];
  const projects = [
    { id: 10, name: 'Active', slug: 'active', status: 'started' },
    { id: 20, name: 'Completed', slug: 'completed', status: 'completed' },
    { id: 30, name: 'Canceled', slug: 'canceled', status: 'canceled' },
    { id: 40, name: 'Archived', slug: 'archived', status: 'started', archivedAt: '2026-01-01' },
  ];
  expect(
    groupPageList(pages, projects, '', 'name', 'asc', 'none', 'all').map(({ page }) => page.id),
  ).toEqual([1, 5, 6]);
  expect(
    groupPageList(pages, projects, '', 'name', 'asc', 'none', 'all', undefined, true),
  ).toHaveLength(6);
  expect(groupPageList(pages, projects, '', 'name', 'asc', 'none', '20')).toEqual([]);
});
