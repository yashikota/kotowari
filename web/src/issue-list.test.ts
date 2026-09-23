import { describe, expect, it } from 'vite-plus/test';
import { buildIssueListRows, sortIssues } from './issue-list.ts';
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

  it('groups by cycle and parent, including unassigned work', () => {
    const rows = buildIssueListRows(
      [
        { ...issue(1, 1), cycleNumber: 2, parentIdentifier: 'KOT-9' },
        { ...issue(2, 2), cycleNumber: 1 },
        issue(3, 3),
      ],
      new Set(),
      'cycle',
    );
    expect(rows.filter((row) => row.kind === 'group').map((row) => row.label)).toEqual([
      'Cycle 1',
      'Cycle 2',
      'No cycle',
    ]);

    const parentRows = buildIssueListRows(
      [{ ...issue(1, 1), parentIdentifier: 'KOT-9' }, issue(2, 2)],
      new Set(),
      'parent',
    );
    expect(parentRows.filter((row) => row.kind === 'group').map((row) => row.label)).toEqual([
      'KOT-9',
      'No parent',
    ]);
  });

  it('removes headers when grouping is disabled', () => {
    const rows = buildIssueListRows([issue(1, 1), issue(2, 2)], new Set(), 'none');
    expect(rows).toEqual([
      { kind: 'issue', issue: issue(1, 1) },
      { kind: 'issue', issue: issue(2, 2) },
    ]);
  });
});

describe('sortIssues', () => {
  const issues = [
    { ...issue(1, 3), title: 'Zulu', dueDate: null, updatedAt: '2026-01-01T00:00:00Z' },
    { ...issue(2, 1), title: 'Alpha', dueDate: '2026-02-01', updatedAt: '2026-03-01T00:00:00Z' },
    { ...issue(3, 0), title: 'Beta', dueDate: '2026-01-01', updatedAt: '2026-02-01T00:00:00Z' },
  ];

  it('supports priority, updated, due date, and title sorting without mutating the source', () => {
    expect(sortIssues(issues, 'priority').map((row) => row.number)).toEqual([2, 1, 3]);
    expect(sortIssues(issues, 'updated').map((row) => row.number)).toEqual([2, 3, 1]);
    expect(sortIssues(issues, 'dueDate').map((row) => row.number)).toEqual([3, 2, 1]);
    expect(sortIssues(issues, 'title').map((row) => row.number)).toEqual([2, 3, 1]);
    expect(issues.map((row) => row.number)).toEqual([1, 2, 3]);
  });

  it('preserves the input order in manual mode', () => {
    expect(sortIssues(issues, 'manual')).toEqual(issues);
  });
});
