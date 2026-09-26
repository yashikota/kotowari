import { describe, expect, it } from 'vite-plus/test';
import {
  buildInitiativeList,
  initiativeActiveProjectCount,
  parseInitiativeListSearch,
} from './initiative-list.ts';
import type { Initiative, Project } from './types.ts';

function initiative(
  slug: string,
  status: Initiative['status'],
  options: Partial<Initiative> = {},
): Initiative {
  return {
    id: 1,
    name: slug,
    slug,
    description: '',
    status,
    projectSlugs: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...options,
  };
}

function project(slug: string, status: string): Project {
  return {
    id: 1,
    name: slug,
    slug,
    description: '',
    status,
    priority: 0,
    startDate: null,
    targetDate: null,
    progress: 0,
    milestones: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

describe('initiative list search', () => {
  it('parses only supported filters and ignores malformed values', () => {
    expect(
      parseInitiativeListSearch({
        scope: 'planned',
        statusFilter: ['active', 'invalid', 'active'],
        priorityFilter: ['2', '9', '2'],
        healthFilter: ['on_track', 'invalid'],
        labelFilter: ['Launch', ''],
        projects: 'withProjects',
        targetDateFrom: '2026-03-01',
        targetDateTo: 'not-a-date',
        orderBy: 'targetDate',
        direction: 'desc',
        displayProperties: ['id', 'teams', 'id'],
      }),
    ).toEqual({
      scope: 'planned',
      statusFilter: ['active'],
      priorityFilter: [2],
      healthFilter: ['on_track'],
      labelFilter: ['Launch'],
      projects: 'withProjects',
      targetDateFrom: '2026-03-01',
      orderBy: 'targetDate',
      direction: 'desc',
      displayProperties: ['id'],
    });
  });

  it('combines view scope, filters, and text search without mutating source data', () => {
    const source = [
      initiative('launch', 'active', {
        description: 'Ship new site',
        targetDate: '2026-04-01',
        projectSlugs: ['one'],
      }),
      initiative('cleanup', 'planned', { targetDate: '2026-05-01' }),
      initiative('archive', 'completed', { projectSlugs: ['one'] }),
    ];
    const groups = buildInitiativeList({
      initiatives: source,
      projects: [project('one', 'started')],
      search: {
        scope: 'active',
        q: 'NEW SITE',
        projects: 'withProjects',
        targetDateFrom: '2026-03-01',
      },
    });

    expect(groups.map((group) => group.initiatives.map((item) => item.slug))).toEqual([['launch']]);
    expect(source.map((item) => item.slug)).toEqual(['launch', 'cleanup', 'archive']);
  });

  it('orders and groups initiatives by status while leaving null target dates last', () => {
    const initiatives = [
      initiative('undated', 'active'),
      initiative('b', 'planned', { targetDate: '2026-03-01' }),
      initiative('a', 'planned', { targetDate: '2026-02-01' }),
    ];
    const groups = buildInitiativeList({
      initiatives,
      projects: [],
      search: { groupBy: 'status', orderBy: 'targetDate' },
    });
    expect(groups.map((group) => group.key)).toEqual(['planned', 'active']);
    expect(groups[0]?.initiatives.map((item) => item.slug)).toEqual(['a', 'b']);
    expect(groups[1]?.initiatives.map((item) => item.slug)).toEqual(['undated']);
    const descending = buildInitiativeList({
      initiatives,
      projects: [],
      search: { orderBy: 'targetDate', direction: 'desc' },
    });
    expect(descending[0]?.initiatives.map((item) => item.slug)).toEqual(['b', 'a', 'undated']);
  });

  it('filters on priority, health, and labels and sorts completed initiatives last when undated', () => {
    const initiatives = [
      initiative('healthy', 'active', {
        priority: 2,
        health: 'on_track',
        labels: ['Launch'],
        completedAt: null,
      }),
      initiative('at-risk', 'active', {
        priority: 2,
        health: 'at_risk',
        labels: ['Launch'],
      }),
      initiative('other-priority', 'active', {
        priority: 3,
        health: 'on_track',
        labels: ['Launch'],
      }),
      initiative('completed', 'completed', {
        priority: 2,
        health: 'on_track',
        labels: ['Launch'],
        completedAt: '2026-03-01T00:00:00Z',
      }),
    ];
    const filtered = buildInitiativeList({
      initiatives,
      projects: [],
      search: { priorityFilter: [2], healthFilter: ['on_track'], labelFilter: ['Launch'] },
    });
    expect(filtered[0]?.initiatives.map((item) => item.slug)).toEqual(['healthy', 'completed']);
    const sorted = buildInitiativeList({
      initiatives,
      projects: [],
      search: { orderBy: 'completed' },
    });
    expect(sorted[0]?.initiatives.map((item) => item.slug)).toEqual([
      'completed',
      'healthy',
      'at-risk',
      'other-priority',
    ]);
  });

  it('counts only linked non-completed projects as active', () => {
    const item = initiative('launch', 'active', {
      projectSlugs: ['started', 'custom-started', 'planned', 'done', 'missing'],
    });
    expect(
      initiativeActiveProjectCount(
        item,
        [
          project('started', 'started'),
          { ...project('custom-started', 'backlog'), workflowStatus: 'in-progress' },
          project('planned', 'planned'),
          project('done', 'completed'),
          project('unrelated', 'planned'),
        ],
        [{ id: 'in-progress', name: 'Doing', category: 'started' }],
      ),
    ).toBe(2);
  });
});
