import { describe, expect, it } from 'vite-plus/test';
import {
  buildIssueListRows,
  buildIssueFacetOptions,
  DEFAULT_DISPLAY_PROPERTIES,
  filterCompletedIssues,
  formatIssueCreatedDate,
  includeNestedIssueMatches,
  sortIssues,
} from './issue-list.ts';
import type { Cycle, Issue, Project } from './types.ts';

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
    milestoneId: null,
    cycleId: null,
    parentId: null,
    depth: 0,
    dueDate: null,
    reminderAt: null,
    sortOrder: number,
    labels: [],
    adrNumbers: [],
    externalLinks: [],
    relations: [],
    isFavorite: false,
    createdAt: '',
    updatedAt: '',
    completedAt: null,
  };
}

describe('issue list display defaults', () => {
  it('shows the created date by default without adding workspace-only milestone metadata', () => {
    expect(DEFAULT_DISPLAY_PROPERTIES).toContain('created');
    expect(DEFAULT_DISPLAY_PROPERTIES).not.toContain('milestone');
  });

  it('formats the issue creation date as a compact localized month and day', () => {
    const value = '2026-06-27T12:39:56Z';
    expect(formatIssueCreatedDate(value, 'en-US')).toBe(
      new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value)),
    );
    expect(formatIssueCreatedDate(value, 'ja-JP')).toBe(
      new Intl.DateTimeFormat('ja-JP', { month: 'short', day: 'numeric' }).format(new Date(value)),
    );
  });
});

describe('issue list facets', () => {
  it('counts unique labels, projects, and priorities in Linear order', () => {
    const feature = { id: 1, name: 'Feature', color: '#7c3aed' };
    const improvement = { id: 2, name: 'Improvement', color: '#2563eb' };
    const issues = [
      { ...issue(1, 2), projectSlug: 'core', labels: [feature, improvement] },
      { ...issue(2, 2), projectSlug: 'core', labels: [feature] },
      { ...issue(3, 4), projectSlug: 'docs', labels: [improvement] },
      { ...issue(4, 0), projectSlug: null, labels: [] },
    ];
    const projects = [
      { slug: 'core', name: 'Core' },
      { slug: 'docs', name: 'Docs' },
    ] as Project[];

    expect(buildIssueFacetOptions('priority', issues, projects)).toEqual([
      { value: '2', label: '2', count: 2 },
      { value: '4', label: '4', count: 1 },
      { value: '0', label: '0', count: 1 },
    ]);
    expect(buildIssueFacetOptions('labels', issues, projects)).toEqual([
      { value: 'Feature', label: 'Feature', count: 2, color: '#7c3aed' },
      { value: 'Improvement', label: 'Improvement', count: 2, color: '#2563eb' },
    ]);
    expect(buildIssueFacetOptions('projects', issues, projects)).toEqual([
      { value: 'core', label: 'Core', count: 2 },
      { value: 'docs', label: 'Docs', count: 1 },
    ]);
  });
});

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

  it('groups by issue type and estimate, including unassigned values', () => {
    const issues: Issue[] = [
      { ...issue(1, 1), type: 'feature', estimate: 8 },
      { ...issue(2, 1), type: 'bug', estimate: 3 },
      issue(3, 1),
    ];
    const byType = buildIssueListRows(issues, new Set(), 'type');
    expect(byType.filter((row) => row.kind === 'group').map((row) => row.key)).toEqual([
      'type:none',
      'type:bug',
      'type:feature',
    ]);

    const byEstimate = buildIssueListRows(issues, new Set(), 'estimate');
    expect(byEstimate.filter((row) => row.kind === 'group').map((row) => row.key)).toEqual([
      'estimate:3',
      'estimate:8',
      'estimate:none',
    ]);
  });

  it('groups by label, including issues without a label', () => {
    const rows = buildIssueListRows(
      [{ ...issue(1, 1), labels: [{ id: 1, name: 'frontend', color: '#fff' }] }, issue(2, 1)],
      new Set(),
      'label',
    );
    expect(rows.filter((row) => row.kind === 'group').map((row) => row.label)).toEqual([
      'No label',
      'frontend',
    ]);
    expect(rows.filter((row) => row.kind === 'issue').map((row) => row.issue.number)).toEqual([
      2, 1,
    ]);
  });

  it('removes headers when grouping is disabled', () => {
    const rows = buildIssueListRows([issue(1, 1), issue(2, 2)], new Set(), 'none');
    expect(rows).toEqual([
      { kind: 'issue', issue: issue(1, 1) },
      { kind: 'issue', issue: issue(2, 2) },
    ]);
  });

  it('shows the known empty priority and status groups when requested', () => {
    const rows = buildIssueListRows([issue(1, 1)], new Set(), 'status', {
      showEmptyGroups: true,
    });
    expect(rows.filter((row) => row.kind === 'group').map((row) => row.label)).toEqual([
      'backlog',
      'todo',
      'in_progress',
      'done',
      'canceled',
    ]);
    expect(rows.filter((row) => row.kind === 'issue')).toHaveLength(1);
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

  it('orders estimates numerically and leaves unestimated issues at the end', () => {
    const rows = [
      { ...issue(1, 1), estimate: 13 },
      { ...issue(2, 1), estimate: null },
      { ...issue(3, 1), estimate: 3 },
    ];
    expect(sortIssues(rows, 'estimate').map((row) => row.number)).toEqual([3, 1, 2]);
  });

  it('reverses an explicit direction for non-manual orderings', () => {
    expect(sortIssues(issues, 'title', 'desc').map((row) => row.number)).toEqual([1, 3, 2]);
  });

  it('orders by workflow status, external link count, and status age', () => {
    const rows = [
      {
        ...issue(1, 1),
        status: 'done' as const,
        adrNumbers: [1],
        externalLinks: [
          { id: 1, url: 'https://example.test', kind: 'link' as const, createdAt: '' },
        ],
        statusChangedAt: '2026-04-03',
      },
      { ...issue(2, 1), status: 'backlog' as const, adrNumbers: [], statusChangedAt: '2026-04-01' },
      {
        ...issue(3, 1),
        status: 'todo' as const,
        adrNumbers: [1, 2],
        externalLinks: [
          { id: 1, url: 'https://one.test', kind: 'link' as const, createdAt: '' },
          { id: 2, url: 'https://two.test', kind: 'document' as const, createdAt: '' },
        ],
        statusChangedAt: '2026-04-02',
      },
    ];
    expect(sortIssues(rows, 'status').map((row) => row.number)).toEqual([2, 3, 1]);
    expect(sortIssues(rows, 'linkCount').map((row) => row.number)).toEqual([2, 1, 3]);
    expect(sortIssues(rows, 'timeInStatus').map((row) => row.number)).toEqual([1, 3, 2]);
  });
});

describe('display issue filters', () => {
  it('includes descendants of matching issues only in show-all mode', () => {
    const parent = issue(1, 1);
    const child = { ...issue(2, 1), parentId: parent.id, depth: 1 };
    const grandchild = { ...issue(3, 1), parentId: child.id, depth: 2 };
    const unrelated = issue(4, 1);
    const candidates = [unrelated, grandchild, child, parent];

    expect(includeNestedIssueMatches([parent], candidates, 'showMatching')).toEqual([parent]);
    expect(includeNestedIssueMatches([parent], candidates, 'showAll')).toEqual([
      grandchild,
      child,
      parent,
    ]);
  });

  it('limits completed work by age or the active cycle while retaining open issues', () => {
    const now = Date.parse('2026-09-23T12:00:00Z');
    const open = issue(1, 1);
    const yesterday = {
      ...issue(2, 1),
      status: 'done' as const,
      completedAt: '2026-09-22T12:00:00Z',
    };
    const old = { ...issue(3, 1), status: 'done' as const, completedAt: '2026-09-01T12:00:00Z' };
    const currentCycle: Cycle[] = [
      {
        id: 1,
        number: 4,
        startsAt: '2026-09-20T00:00:00Z',
        endsAt: '2026-09-30T23:59:59Z',
        status: 'active',
        createdAt: '',
        updatedAt: '',
      },
    ];

    expect(filterCompletedIssues([open, yesterday, old], 'pastDay', [], now)).toEqual([
      open,
      yesterday,
    ]);
    expect(
      filterCompletedIssues([open, yesterday, old], 'currentCycle', currentCycle, now),
    ).toEqual([open, yesterday]);
    expect(filterCompletedIssues([open, yesterday, old], 'none', [], now)).toEqual([open]);
  });
});
