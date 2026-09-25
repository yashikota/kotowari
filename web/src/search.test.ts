import { describe, expect, it } from 'vite-plus/test';
import { filterSearchHits, orderSearchHits, parseSearchPageSearch } from './search.ts';
import type { SearchHit } from './types.ts';

const hits: SearchHit[] = [
  { kind: 'issue', id: 'APP-1', title: 'Zebra issue' },
  { kind: 'project', id: 'alpha', title: 'Alpha project' },
  { kind: 'adr', id: 'ADR-1', title: 'Decision' },
  { kind: 'page', id: 'guide', title: 'Guide' },
  { kind: 'view', id: 'open', title: 'Open work' },
];

describe('search page state', () => {
  it('validates and bounds shareable search parameters', () => {
    expect(parseSearchPageSearch({ q: '  release  ', tab: 'documents', order: 'title' })).toEqual({
      q: 'release',
      tab: 'documents',
      order: 'title',
    });
    expect(parseSearchPageSearch({ q: '   ', tab: 'unknown', order: 'unknown' })).toEqual({});
    expect(parseSearchPageSearch({ q: 'x'.repeat(205) }).q).toHaveLength(200);
  });

  it('filters search categories like Linear tabs while retaining Kotowari-only views in All', () => {
    expect(filterSearchHits(hits, 'all')).toEqual(hits);
    expect(filterSearchHits(hits, 'issues').map((hit) => hit.kind)).toEqual(['issue']);
    expect(filterSearchHits(hits, 'projects').map((hit) => hit.kind)).toEqual(['project']);
    expect(filterSearchHits(hits, 'documents').map((hit) => hit.kind)).toEqual(['adr', 'page']);
  });

  it('orders titles without mutating the source result order', () => {
    expect(orderSearchHits(hits, 'relevance')).toEqual(hits);
    expect(orderSearchHits(hits, 'title').map((hit) => hit.title)).toEqual([
      'Alpha project',
      'Decision',
      'Guide',
      'Open work',
      'Zebra issue',
    ]);
    expect(hits[0]?.title).toBe('Zebra issue');
  });
});
