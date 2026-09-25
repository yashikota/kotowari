import { describe, expect, it } from 'vite-plus/test';
import {
  filterSearchHits,
  orderSearchHits,
  parseCustomDateTimeframe,
  parseSearchDateFilter,
  parseSearchPageSearch,
} from './search.ts';
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
    expect(
      parseSearchPageSearch({
        q: '  release  ',
        tab: 'documents',
        ordering: 'createdAt',
        includeArchived: 'true',
      }),
    ).toEqual({
      q: 'release',
      tab: 'documents',
      ordering: 'createdAt',
      includeArchived: true,
    });
    expect(
      parseSearchPageSearch({
        q: '   ',
        tab: 'unknown',
        ordering: 'unknown',
        includeArchived: 'sometimes',
      }),
    ).toEqual({});
    expect(parseSearchPageSearch({ q: 'x'.repeat(205) }).q).toHaveLength(200);
    expect(
      parseSearchPageSearch({
        status: 'todo,in_progress,todo,unknown',
        created: 'P4D',
        updated: 'P1W',
      }),
    ).toEqual({ status: 'todo,in_progress', updated: 'P1W' });
  });

  it('filters search categories like Linear tabs while retaining Kotowari-only views in All', () => {
    expect(filterSearchHits(hits, 'all')).toEqual(hits);
    expect(filterSearchHits(hits, 'issues').map((hit) => hit.kind)).toEqual(['issue']);
    expect(filterSearchHits(hits, 'projects').map((hit) => hit.kind)).toEqual(['project']);
    expect(filterSearchHits(hits, 'documents').map((hit) => hit.kind)).toEqual(['adr', 'page']);
    expect(filterSearchHits(hits, 'all', ['todo']).map((hit) => hit.id)).toEqual(['APP-1']);
    expect(filterSearchHits(hits, 'projects', ['todo'])).toEqual([]);
  });

  it('excludes archived issues unless the search option explicitly includes them', () => {
    const archivedIssue: SearchHit = {
      kind: 'issue',
      id: 'APP-2',
      title: 'Archived issue',
      status: 'todo',
      archived: true,
    };
    expect(filterSearchHits([...hits, archivedIssue], 'all').map((hit) => hit.id)).not.toContain(
      'APP-2',
    );
    expect(
      filterSearchHits([...hits, archivedIssue], 'all', [], {}, Date.now(), true).map(
        (hit) => hit.id,
      ),
    ).toContain('APP-2');
  });

  it('combines created and updated date filters for issue results', () => {
    const now = Date.parse('2026-09-25T12:00:00.000Z');
    const datedHits: SearchHit[] = [
      {
        kind: 'issue',
        id: 'APP-1',
        title: 'Recent issue',
        status: 'todo',
        createdAt: '2026-09-01T12:00:00.000Z',
        updatedAt: '2026-09-24T12:00:00.000Z',
      },
      {
        kind: 'issue',
        id: 'APP-2',
        title: 'Old update',
        status: 'todo',
        createdAt: '2026-09-01T12:00:00.000Z',
        updatedAt: '2026-09-10T12:00:00.000Z',
      },
      {
        kind: 'issue',
        id: 'APP-3',
        title: 'Old issue',
        status: 'todo',
        createdAt: '2026-08-10T12:00:00.000Z',
        updatedAt: '2026-09-24T12:00:00.000Z',
      },
      { kind: 'project', id: 'launch', title: 'Recent project' },
    ];
    expect(
      filterSearchHits(
        datedHits,
        'all',
        [],
        {
          created: { operator: 'after', value: { kind: 'relative', window: 'P1M' } },
          updated: { operator: 'after', value: { kind: 'relative', window: 'P1W' } },
        },
        now,
      ).map((hit) => hit.id),
    ).toEqual(['APP-1']);
  });

  it('parses Linear relative, comparison, and shareable custom date filters', () => {
    expect(parseSearchDateFilter('P1W')).toEqual({
      operator: 'after',
      value: { kind: 'relative', window: 'P1W' },
    });
    expect(parseSearchDateFilter('before:P3D')).toEqual({
      operator: 'before',
      value: { kind: 'relative', window: 'P3D' },
    });
    expect(parseSearchDateFilter('in:2026-09-01..2026-09-30')).toEqual({
      operator: 'in',
      value: { kind: 'range', start: '2026-09-01', end: '2026-09-30' },
    });
    expect(parseSearchDateFilter('in:2026-02-30..2026-09-30')).toBeUndefined();
    expect(parseSearchDateFilter('before:P4D')).toBeUndefined();
  });

  it('parses custom day, month, quarter, half-year, and year timeframes', () => {
    const now = new Date('2026-09-25T12:00:00.000Z');
    expect(parseCustomDateTimeframe('2027/05/20', now)).toEqual({
      start: '2027-05-20',
      end: '2027-05-20',
    });
    expect(parseCustomDateTimeframe('May 2027', now)).toEqual({
      start: '2027-05-01',
      end: '2027-05-31',
    });
    expect(parseCustomDateTimeframe('2027年5月', now)).toEqual({
      start: '2027-05-01',
      end: '2027-05-31',
    });
    expect(parseCustomDateTimeframe('Q4', now)).toEqual({
      start: '2026-10-01',
      end: '2026-12-31',
    });
    expect(parseCustomDateTimeframe('2027 Q2', now)).toEqual({
      start: '2027-04-01',
      end: '2027-06-30',
    });
    expect(parseCustomDateTimeframe('H1 2027', now)).toEqual({
      start: '2027-01-01',
      end: '2027-06-30',
    });
    expect(parseCustomDateTimeframe('2027年上期', now)).toEqual({
      start: '2027-01-01',
      end: '2027-06-30',
    });
    expect(parseCustomDateTimeframe('2028', now)).toEqual({
      start: '2028-01-01',
      end: '2028-12-31',
    });
    expect(parseCustomDateTimeframe('2026-02-30', now)).toBeUndefined();
  });

  it('applies before/after cutoffs and inclusive custom timeframes', () => {
    const now = Date.parse('2026-09-25T12:00:00.000Z');
    const datedHits: SearchHit[] = [
      { kind: 'issue', id: 'APP-1', title: 'Recent', createdAt: '2026-09-24T00:00:00Z' },
      { kind: 'issue', id: 'APP-2', title: 'Cutoff', createdAt: '2026-09-18T23:00:00Z' },
      { kind: 'issue', id: 'APP-3', title: 'Old', createdAt: '2026-09-10T00:00:00Z' },
    ];
    expect(
      filterSearchHits(
        datedHits,
        'issues',
        [],
        { created: { operator: 'after', value: { kind: 'relative', window: 'P1W' } } },
        now,
      ).map((hit) => hit.id),
    ).toEqual(['APP-1', 'APP-2']);
    expect(
      filterSearchHits(
        datedHits,
        'issues',
        [],
        { created: { operator: 'before', value: { kind: 'relative', window: 'P1W' } } },
        now,
      ).map((hit) => hit.id),
    ).toEqual(['APP-3']);
    expect(
      filterSearchHits(
        datedHits,
        'issues',
        [],
        {
          created: {
            operator: 'in',
            value: { kind: 'range', start: '2026-09-18', end: '2026-09-24' },
          },
        },
        now,
      ).map((hit) => hit.id),
    ).toEqual(['APP-1', 'APP-2']);
  });

  it('orders results by recent updates or creation while keeping source arrays intact', () => {
    expect(orderSearchHits(hits, 'relevance')).toEqual(hits);
    const datedHits: SearchHit[] = [
      {
        kind: 'issue',
        id: 'APP-1',
        title: 'Older',
        createdAt: '2026-09-01',
        updatedAt: '2026-09-03',
      },
      {
        kind: 'project',
        id: 'project',
        title: 'New',
        createdAt: '2026-09-04',
        updatedAt: '2026-09-05',
      },
      {
        kind: 'page',
        id: 'page',
        title: 'Latest created',
        createdAt: '2026-09-06',
        updatedAt: '2026-09-02',
      },
    ];
    expect(orderSearchHits(datedHits, 'updatedAt').map((hit) => hit.id)).toEqual([
      'project',
      'APP-1',
      'page',
    ]);
    expect(orderSearchHits(datedHits, 'createdAt').map((hit) => hit.id)).toEqual([
      'page',
      'project',
      'APP-1',
    ]);
    expect(orderSearchHits(hits, 'createdAt')).toEqual(hits);
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
