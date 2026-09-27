import { describe, expect, it } from 'vite-plus/test';
import { parseIssueSearch, searchToFilter } from './api.ts';
import { matchesIssueFilterGroup, parseIssueFilterGroup } from './issue-advanced-filter.ts';
import type { Issue } from './types.ts';

function issue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: 1,
    number: 1,
    identifier: 'KOT-1',
    title: 'Ship dashboard search',
    body: '',
    status: 'in_progress',
    workflowStatus: 'started',
    assignee: 'self',
    type: 'feature',
    priority: 2,
    estimate: 3,
    projectId: 7,
    projectSlug: 'dashboard',
    milestoneId: null,
    cycleId: 11,
    cycleNumber: 4,
    parentId: null,
    depth: 0,
    dueDate: null,
    reminderAt: null,
    sortOrder: 0,
    labels: [{ id: 1, name: 'frontend', color: '#fff' }],
    adrNumbers: [],
    externalLinks: [],
    relations: [],
    isFavorite: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    completedAt: null,
    ...overrides,
  };
}

describe('issue advanced filters', () => {
  it('validates and preserves bounded nested groups in issue search', () => {
    const group = {
      kind: 'group',
      operator: 'or',
      children: [
        { kind: 'condition', field: 'status', operator: 'is', value: 'started' },
        {
          kind: 'group',
          operator: 'and',
          children: [
            { kind: 'condition', field: 'priority', operator: 'is', value: '0' },
            { kind: 'condition', field: 'title', operator: 'contains', value: 'dashboard' },
          ],
        },
      ],
    };
    const parsed = parseIssueSearch({
      advancedFilter: 'true',
      advancedFilterGroup: JSON.stringify(group),
    });

    expect(parsed).toEqual({ advancedFilter: true, advancedFilterGroup: group });
    expect(parseIssueFilterGroup('{broken')).toBeUndefined();
    expect(parseIssueFilterGroup({ kind: 'group', operator: 'xor', children: [] })).toBeUndefined();
    expect(parseIssueSearch({ advancedFilterGroup: group })).toMatchObject({
      advancedFilter: true,
    });
    expect(parseIssueFilterGroup({ kind: 'group', operator: 'and' })).toEqual({
      kind: 'group',
      operator: 'and',
      children: [],
    });
    expect(searchToFilter(parsed)).toEqual(searchToFilter({}));
  });

  it('evaluates nested all/any conditions against issue properties', () => {
    const group = parseIssueFilterGroup({
      kind: 'group',
      operator: 'or',
      children: [
        { kind: 'condition', field: 'status', operator: 'is', value: 'started' },
        {
          kind: 'group',
          operator: 'and',
          children: [
            { kind: 'condition', field: 'priority', operator: 'is', value: '0' },
            { kind: 'condition', field: 'title', operator: 'contains', value: 'dashboard' },
          ],
        },
      ],
    });
    expect(group).toBeDefined();
    expect(matchesIssueFilterGroup(issue(), group!)).toBe(true);
    expect(matchesIssueFilterGroup(issue({ workflowStatus: 'todo' }), group!)).toBe(false);
    expect(matchesIssueFilterGroup(issue({ workflowStatus: 'todo', priority: 0 }), group!)).toBe(
      true,
    );
  });

  it('handles not-equal, missing values, multi-labels, and incomplete builder rows', () => {
    const noAssignee = issue({ assignee: undefined, labels: [], estimate: null });
    expect(
      matchesIssueFilterGroup(noAssignee, {
        kind: 'group',
        operator: 'and',
        children: [
          { kind: 'condition', field: 'assignee', operator: 'is', value: 'none' },
          { kind: 'condition', field: 'estimate', operator: 'is', value: 'none' },
          { kind: 'condition', field: 'label', operator: 'isNot', value: 'backend' },
          { kind: 'condition', field: 'project', operator: 'isNot', value: 'other' },
          { kind: 'condition', field: 'title', operator: 'doesNotContain', value: 'unrelated' },
          { kind: 'condition' },
        ],
      }),
    ).toBe(true);
    expect(
      matchesIssueFilterGroup(issue(), {
        kind: 'group',
        operator: 'and',
        children: [{ kind: 'condition', field: 'label', operator: 'is', value: 'other' }],
      }),
    ).toBe(false);
  });

  it('supports issue dates, description text, relations, and empty-value checks', () => {
    const parent = issue({
      id: 7,
      title: 'Parent',
      body: 'dashboard body',
      dueDate: '2026-09-15',
    });
    const child = issue({ id: 8, parentId: parent.id, title: 'Child' });
    const group: import('./issue-advanced-filter.ts').IssueFilterGroup = {
      kind: 'group',
      operator: 'and',
      children: [
        { kind: 'condition', field: 'dueDate', operator: 'onOrAfter', value: '2026-09-01' },
        { kind: 'condition', field: 'createdAt', operator: 'before', value: '2026-02-01' },
        { kind: 'condition', field: 'content', operator: 'contains', value: 'dashboard' },
        { kind: 'condition', field: 'relation', operator: 'is', value: 'parent' },
        { kind: 'condition', field: 'milestone', operator: 'isEmpty' },
        { kind: 'condition', field: 'links', operator: 'is', value: 'no' },
      ],
    };
    for (const condition of group.children) {
      expect(
        matchesIssueFilterGroup(parent, { kind: 'group', operator: 'and', children: [condition] }, [
          parent,
          child,
        ]),
        JSON.stringify(condition),
      ).toBe(true);
    }
    expect(matchesIssueFilterGroup(parent, group, [parent, child])).toBe(true);
    expect(matchesIssueFilterGroup(parent, group)).toBe(false);
    expect(
      matchesIssueFilterGroup(issue({ dueDate: '2026-08-31' }), {
        kind: 'group',
        operator: 'and',
        children: [group.children[0]!],
      }),
    ).toBe(false);
  });

  it('rejects operators that do not apply to a selected field', () => {
    expect(
      parseIssueFilterGroup({
        kind: 'group',
        operator: 'and',
        children: [{ kind: 'condition', field: 'priority', operator: 'before', value: '2' }],
      }),
    ).toEqual({ kind: 'group', operator: 'and', children: [] });
  });

  it('ignores over-deep or oversized untrusted filter trees', () => {
    const tooDeep = {
      kind: 'group',
      operator: 'and',
      children: Array.from({ length: 41 }, () => ({
        kind: 'condition',
        field: 'status',
        value: 'todo',
      })),
    };
    expect(parseIssueFilterGroup(tooDeep)).toBeUndefined();
    expect(parseIssueFilterGroup('x'.repeat(12_001))).toBeUndefined();
  });
});
