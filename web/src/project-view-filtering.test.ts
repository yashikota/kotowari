import { describe, expect, it, vi } from 'vite-plus/test';
import type { Project } from './types.ts';
import { parseProjectFilterGroup } from './project-views.ts';
import { matchesProjectViewSearch } from './project-view-filtering.ts';

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: 1,
    name: 'Release dashboard',
    slug: 'release-dashboard',
    description: '',
    status: 'planned',
    priority: 4,
    startDate: null,
    targetDate: null,
    progress: 0,
    milestones: [],
    createdAt: '2030-01-01T00:00:00Z',
    updatedAt: '2030-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('matchesProjectViewSearch', () => {
  it('uses OR between active facets only for an advanced filter group', () => {
    const statusMatch = project({ workflowStatus: 'in_progress' });
    const priorityMatch = project({ id: 2, slug: 'backlog', priority: 0 });
    const noMatch = project({ id: 3, slug: 'other' });
    const search = {
      status: ['in_progress'],
      priority: ['0'],
      advancedFilter: true,
      filterOperator: 'or' as const,
    };

    expect(matchesProjectViewSearch(statusMatch, search)).toBe(true);
    expect(matchesProjectViewSearch(priorityMatch, search)).toBe(true);
    expect(matchesProjectViewSearch(noMatch, search)).toBe(false);
    expect(matchesProjectViewSearch(statusMatch, { ...search, filterOperator: 'and' })).toBe(false);
    expect(matchesProjectViewSearch(statusMatch, { ...search, advancedFilter: false })).toBe(false);
  });

  it('keeps multiple values within one facet as OR conditions', () => {
    expect(
      matchesProjectViewSearch(project({ priority: 0 }), {
        priority: ['0', '4'],
        advancedFilter: true,
        filterOperator: 'and',
      }),
    ).toBe(true);
  });

  it('evaluates nested advanced filter groups using their own operators', () => {
    const group = {
      kind: 'group' as const,
      operator: 'or' as const,
      children: [
        { kind: 'condition' as const, field: 'status' as const, value: 'started' },
        {
          kind: 'group' as const,
          operator: 'and' as const,
          children: [
            { kind: 'condition' as const, field: 'priority' as const, value: '0' },
            {
              kind: 'condition' as const,
              field: 'title' as const,
              operator: 'contains' as const,
              value: 'dashboard',
            },
          ],
        },
      ],
    };

    expect(
      matchesProjectViewSearch(project({ workflowStatus: 'started' }), {
        advancedFilterGroup: group,
      }),
    ).toBe(true);
    expect(matchesProjectViewSearch(project({ priority: 0 }), { advancedFilterGroup: group })).toBe(
      true,
    );
    expect(
      matchesProjectViewSearch(project({ slug: 'no-match' }), { advancedFilterGroup: group }),
    ).toBe(false);
  });

  it('filters project leads without introducing multi-user assignment values', () => {
    const group = {
      kind: 'group' as const,
      operator: 'and' as const,
      children: [{ kind: 'condition' as const, field: 'lead' as const, value: 'self' }],
    };
    expect(
      matchesProjectViewSearch(project({ lead: 'self' }), { advancedFilterGroup: group }),
    ).toBe(true);
    expect(matchesProjectViewSearch(project({ lead: '' }), { advancedFilterGroup: group })).toBe(
      false,
    );
    expect(
      matchesProjectViewSearch(project({ lead: '' }), {
        advancedFilterGroup: {
          ...group,
          children: [{ kind: 'condition', field: 'lead', value: 'none' }],
        },
      }),
    ).toBe(true);
  });

  it('matches date presets, missing dates, and custom ranges', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2030, 0, 15, 12));
    try {
      const matchesDate = (
        target: Partial<Project>,
        value: string,
        condition: {
          field: 'targetDate' | 'latestUpdateDate';
          operator?: 'is' | 'isNot';
          dateFrom?: string;
          dateTo?: string;
        } = {
          field: 'targetDate',
        },
      ) =>
        matchesProjectViewSearch(project(target), {
          advancedFilterGroup: {
            kind: 'group',
            operator: 'and',
            children: [{ kind: 'condition', ...condition, value }],
          },
        });

      expect(matchesDate({ targetDate: '2030-01-14' }, 'overdue')).toBe(true);
      expect(matchesDate({ targetDate: '2030-01-15' }, 'overdue')).toBe(false);
      expect(matchesDate({ targetDate: '2030-01-16' }, 'within:1d')).toBe(true);
      expect(matchesDate({ targetDate: '2030-01-17' }, 'within:1d')).toBe(false);
      expect(matchesDate({ targetDate: null }, 'no-date')).toBe(true);
      expect(
        matchesDate({ targetDate: '2030-01-16' }, 'no-date', {
          field: 'targetDate',
          operator: 'isNot',
        }),
      ).toBe(true);
      expect(
        matchesDate({ targetDate: '2030-01-16' }, 'custom', {
          field: 'targetDate',
          dateFrom: '2030-01-16',
          dateTo: '2030-01-17',
        }),
      ).toBe(true);
      expect(
        matchesDate({ targetDate: '2030-01-18' }, 'custom', {
          field: 'targetDate',
          dateFrom: '2030-01-16',
          dateTo: '2030-01-17',
        }),
      ).toBe(false);
      expect(matchesDate({ targetDate: null }, 'custom')).toBe(true);
      expect(
        matchesDate({ targetDate: null }, 'custom', {
          field: 'targetDate',
          operator: 'isNot',
        }),
      ).toBe(true);
      expect(
        matchesDate({ healthUpdatedAt: '2030-01-14T12:00:00' }, 'last:1d', {
          field: 'latestUpdateDate',
        }),
      ).toBe(true);
      expect(
        matchesDate({ healthUpdatedAt: '2030-01-14T11:59:00' }, 'last:1d', {
          field: 'latestUpdateDate',
        }),
      ).toBe(false);
      expect(matchesDate({ healthUpdatedAt: null }, 'never', { field: 'latestUpdateDate' })).toBe(
        true,
      );
      expect(
        matchesDate({ healthUpdatedAt: '2030-01-14T12:00:00' }, 'custom', {
          field: 'latestUpdateDate',
          dateFrom: '2030-01-14',
          dateTo: '2030-01-14',
        }),
      ).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('parses a bounded advanced filter group from shared-view search state', () => {
    const group = {
      kind: 'group',
      operator: 'and',
      children: [
        { kind: 'condition', field: 'status', operator: 'is', value: 'started' },
        {
          kind: 'group',
          operator: 'or',
          children: [{ kind: 'condition', field: 'priority', operator: 'isNot', value: '4' }],
        },
      ],
    };
    expect(parseProjectFilterGroup(JSON.stringify(group))).toEqual(group);
    expect(
      parseProjectFilterGroup({ kind: 'group', operator: 'xor', children: [] }),
    ).toBeUndefined();
  });
});
