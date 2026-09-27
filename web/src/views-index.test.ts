import { describe, expect, it } from 'vite-plus/test';
import { sortViewCollection } from './presenters/ViewsIndexPages.tsx';

describe('sortViewCollection', () => {
  const views = [
    { name: 'Zebra', updatedAt: '2026-03-01T00:00:00.000Z' },
    { name: 'alpha', updatedAt: '2026-03-03T00:00:00.000Z' },
    { name: 'Beta', updatedAt: '2026-03-02T00:00:00.000Z' },
  ];

  it('sorts names case-insensitively without mutating the input', () => {
    const sorted = sortViewCollection(views, 'name', 'asc');

    expect(sorted.map((view) => view.name)).toEqual(['alpha', 'Beta', 'Zebra']);
    expect(views.map((view) => view.name)).toEqual(['Zebra', 'alpha', 'Beta']);
  });

  it('sorts by update time in the selected direction', () => {
    expect(sortViewCollection(views, 'updated', 'desc').map((view) => view.name)).toEqual([
      'alpha',
      'Beta',
      'Zebra',
    ]);
    expect(sortViewCollection(views, 'updated', 'asc').map((view) => view.name)).toEqual([
      'Zebra',
      'Beta',
      'alpha',
    ]);
  });
});
