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
      { kind: 'group', priority: 4, count: 1, collapsed: false },
      { kind: 'issue', issue: issue(7, 4) },
    ]);
  });

  it('keeps the group header and hides its issue rows when collapsed', () => {
    expect(buildIssueListRows([issue(1, 2), issue(2, 2)], new Set([2]))).toEqual([
      { kind: 'group', priority: 2, count: 2, collapsed: true },
    ]);
  });
});
