import { describe, expect, it } from 'vite-plus/test';
import { buildIssueListRows } from './issue-list.ts';
import type { Issue } from './types.ts';

function issue(number: number, priority: number): Issue {
  return {
    id: number,
    number,
    identifier: `KOT-${number}`,
    title: `Issue ${number}`,
    body: '',
    status: 'todo',
    priority,
    projectId: null,
    cycleId: null,
    parentId: null,
    depth: 0,
    dueDate: null,
    sortOrder: number,
    labels: [],
    adrNumbers: [],
    createdAt: '',
    updatedAt: '',
    completedAt: null,
  };
}

describe('buildIssueListRows', () => {
  it('groups issues in Linear priority order and preserves order within each group', () => {
    const rows = buildIssueListRows([
      issue(1, 3),
      issue(2, 1),
      issue(3, 3),
      issue(4, 0),
      issue(5, 2),
    ]);

    expect(rows.filter((row) => row.kind === 'group').map((row) => row.priority)).toEqual([
      1, 2, 3, 0,
    ]);
    expect(rows.filter((row) => row.kind === 'issue').map((row) => row.issue.identifier)).toEqual([
      'KOT-2',
      'KOT-5',
      'KOT-1',
      'KOT-3',
      'KOT-4',
    ]);
  });

  it('omits empty groups and reports each group count', () => {
    expect(buildIssueListRows([issue(7, 4)])).toEqual([
      {
        kind: 'group',
        groupBy: 'priority',
        key: 'priority:4',
        label: '4',
        priority: 4,
        status: null,
        count: 1,
        collapsed: false,
      },
      { kind: 'issue', issue: issue(7, 4) },
    ]);
  });

  it('keeps the group header and hides its issue rows when collapsed', () => {
    expect(buildIssueListRows([issue(1, 2), issue(2, 2)], new Set(['priority:2']))).toEqual([
      {
        kind: 'group',
        groupBy: 'priority',
        key: 'priority:2',
        label: '2',
        priority: 2,
        status: null,
        count: 2,
        collapsed: true,
      },
    ]);
  });

  it('groups by status in workflow order', () => {
    const rows = buildIssueListRows(
      [
        { ...issue(1, 1), status: 'done' },
        { ...issue(2, 2), status: 'backlog' },
        { ...issue(3, 3), status: 'backlog' },
      ],
      new Set(),
      'status',
    );

    expect(rows.filter((row) => row.kind === 'group').map((row) => row.key)).toEqual([
      'status:backlog',
      'status:done',
    ]);
  });

  it('groups by project and puts unassigned issues in a visible group', () => {
    const rows = buildIssueListRows(
      [
        { ...issue(1, 1), projectSlug: 'web' },
        { ...issue(2, 2), projectSlug: 'core' },
        issue(3, 3),
      ],
      new Set(),
      'project',
    );

    expect(rows.filter((row) => row.kind === 'group').map((row) => row.label)).toEqual([
      'core',
      'No project',
      'web',
    ]);
  });
});
