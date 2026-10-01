import { describe, expect, it } from 'vite-plus/test';
import { projectPageList } from './page-list.ts';
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
