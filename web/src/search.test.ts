import { describe, expect, it } from 'vite-plus/test';
import { filterSearchHits, orderSearchHits, parseSearchPageSearch } from './search.ts';
import type { SearchHit } from './types.ts';

const hits: SearchHit[] = [
  { kind: 'issue', id: 'APP-1', title: 'Zebra issue', status: 'todo' },
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
    expect(parseSearchPageSearch({ status: 'todo,in_progress,todo,unknown' }).status).toBe(
      'todo,in_progress',
    );
  });

  it('filters search categories like Linear tabs while retaining Kotowari-only views in All', () => {
    expect(filterSearchHits(hits, 'all')).toEqual(hits);
    expect(filterSearchHits(hits, 'issues').map((hit) => hit.kind)).toEqual(['issue']);
    expect(filterSearchHits(hits, 'projects').map((hit) => hit.kind)).toEqual(['project']);
    expect(filterSearchHits(hits, 'documents').map((hit) => hit.kind)).toEqual(['adr', 'page']);
    expect(filterSearchHits(hits, 'all', ['todo']).map((hit) => hit.id)).toEqual(['APP-1']);
    expect(filterSearchHits(hits, 'projects', ['todo'])).toEqual([]);
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

  it('ranks exact titles above title, identifier, and document-body matches', () => {
    const matches: SearchHit[] = [
      { kind: 'page', id: 'guide', title: 'Guide', snippet: 'Release planning' },
      { kind: 'issue', id: 'REL-1', title: 'Release planning' },
      { kind: 'project', id: 'release', title: 'Release' },
      { kind: 'adr', id: 'ADR-1', title: 'Release' },
    ];
    expect(orderSearchHits(matches, 'relevance', 'release').map((hit) => hit.id)).toEqual([
      'release',
      'ADR-1',
      'REL-1',
      'guide',
    ]);
    expect(matches[0]?.id).toBe('guide');
  });
});
