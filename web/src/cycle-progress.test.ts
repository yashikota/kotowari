import { describe, expect, it } from 'vite-plus/test';
import {
  cycleProgressPointIndexAtRatio,
  cycleProgressBreakdown,
  matchesCycleProgressBreakdown,
  cycleProgressTimeline,
} from './cycle-progress.ts';
import type { Activity, Cycle, Issue } from './types.ts';

const cycle: Cycle = {
  id: 1,
  number: 1,
  startsAt: '2026-09-01T00:00:00Z',
  endsAt: '2026-09-05T00:00:00Z',
  status: 'active',
  createdAt: '2026-08-20T00:00:00Z',
  updatedAt: '2026-08-20T00:00:00Z',
};

function issue(
  id: number,
  status: Issue['status'],
  createdAt: string,
  cycleAddedAt: string,
): Pick<Issue, 'id' | 'status' | 'createdAt' | 'cycleAddedAt'> {
  return { id, status, createdAt, cycleAddedAt };
}

function statusChange(
  id: number,
  entityId: number,
  from: string,
  to: string,
  createdAt: string,
): Activity {
  return {
    id,
    entityType: 'issue',
    entityId,
    action: 'status_changed',
    payload: { from, to },
    createdAt,
  };
}

describe('cycleProgressTimeline', () => {
  it('reconstructs scope additions and status changes from activity history', () => {
    const points = cycleProgressTimeline(
      cycle,
      [
        issue(10, 'done', '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z'),
        issue(11, 'done', '2026-08-25T00:00:00Z', '2026-09-03T00:00:00Z'),
      ],
      [
        statusChange(1, 10, 'todo', 'in_progress', '2026-09-02T09:00:00Z'),
        statusChange(2, 10, 'in_progress', 'done', '2026-09-04T12:00:00Z'),
        statusChange(3, 11, 'todo', 'done', '2026-09-04T16:00:00Z'),
      ],
      new Date('2026-09-04T18:00:00Z'),
    );

    expect(points).toEqual([
      { at: '2026-09-01T00:00:00.000Z', scope: 1, started: 0, completed: 0 },
      { at: '2026-09-02T09:00:00.000Z', scope: 1, started: 1, completed: 0 },
      { at: '2026-09-03T00:00:00.000Z', scope: 2, started: 1, completed: 0 },
      { at: '2026-09-04T12:00:00.000Z', scope: 2, started: 0, completed: 1 },
      { at: '2026-09-04T16:00:00.000Z', scope: 2, started: 0, completed: 2 },
      { at: '2026-09-04T18:00:00.000Z', scope: 2, started: 0, completed: 2 },
      { at: '2026-09-05T00:00:00.000Z', scope: 2, started: 0, completed: 2 },
    ]);
  });

  it('tracks in-progress and completed work as issues change or reopen', () => {
    const points = cycleProgressTimeline(
      cycle,
      [issue(10, 'todo', '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z')],
      [
        statusChange(1, 10, 'todo', 'in_progress', '2026-09-02T00:00:00Z'),
        statusChange(2, 10, 'in_progress', 'done', '2026-09-03T00:00:00Z'),
        statusChange(3, 10, 'done', 'todo', '2026-09-04T00:00:00Z'),
      ],
      new Date('2026-09-04T12:00:00Z'),
    );

    expect(points.at(-4)).toMatchObject({ scope: 1, started: 0, completed: 1 });
    expect(points.at(-3)).toMatchObject({ scope: 1, started: 0, completed: 0 });
  });

  it('ignores non-status activity and issues added after cycle end', () => {
    const points = cycleProgressTimeline(
      cycle,
      [issue(10, 'todo', '2026-09-01T00:00:00Z', '2026-09-06T00:00:00Z')],
      [
        {
          id: 1,
          entityType: 'issue',
          entityId: 10,
          action: 'commented',
          payload: {},
          createdAt: '2026-09-02T00:00:00Z',
        },
      ],
      new Date('2026-09-03T00:00:00Z'),
    );

    expect(points.every((point) => point.scope === 0)).toBe(true);
  });

  it('returns no points for an invalid date range', () => {
    expect(
      cycleProgressTimeline(
        { ...cycle, endsAt: cycle.startsAt },
        [],
        [],
        new Date('2026-09-02T00:00:00Z'),
      ),
    ).toEqual([]);
  });
});

describe('cycleProgressPointIndexAtRatio', () => {
  const points = [
    { at: '2026-09-01T00:00:00.000Z', scope: 0, started: 0, completed: 0 },
    { at: '2026-09-02T00:00:00.000Z', scope: 1, started: 0, completed: 0 },
    { at: '2026-09-05T00:00:00.000Z', scope: 2, started: 1, completed: 1 },
  ];

  it('selects the nearest timeline point while clamping pointer positions', () => {
    expect(cycleProgressPointIndexAtRatio(points, 0)).toBe(0);
    expect(cycleProgressPointIndexAtRatio(points, 0.2)).toBe(1);
    expect(cycleProgressPointIndexAtRatio(points, 0.95)).toBe(2);
    expect(cycleProgressPointIndexAtRatio(points, -1)).toBe(0);
    expect(cycleProgressPointIndexAtRatio(points, 2)).toBe(2);
  });

  it('ignores empty or invalid pointer input', () => {
    expect(cycleProgressPointIndexAtRatio([], 0.5)).toBeNull();
    expect(cycleProgressPointIndexAtRatio(points, Number.NaN)).toBeNull();
    expect(
      cycleProgressPointIndexAtRatio(
        [{ at: 'not-a-date', scope: 0, started: 0, completed: 0 }],
        0.5,
      ),
    ).toBeNull();
  });
});

describe('cycleProgressBreakdown', () => {
  const issue = (
    overrides: Partial<
      Pick<
        Issue,
        'assignee' | 'labels' | 'priority' | 'projectId' | 'projectSlug' | 'status' | 'estimate'
      >
    > = {},
  ): Pick<
    Issue,
    'assignee' | 'labels' | 'priority' | 'projectId' | 'projectSlug' | 'status' | 'estimate'
  > => ({
    assignee: undefined,
    labels: [],
    priority: 0,
    projectId: null,
    projectSlug: null,
    status: 'todo',
    estimate: null,
    ...overrides,
  });

  it('groups single-user assignees and weights active and completed estimates', () => {
    expect(
      cycleProgressBreakdown(
        [
          issue({ assignee: 'self', status: 'in_progress' }),
          issue({ assignee: 'self', status: 'done', estimate: 3 }),
          issue({ assignee: 'agent' }),
          issue({ status: 'canceled', estimate: 2 }),
        ],
        'assignee',
      ).map(
        ({
          key,
          issueCount,
          estimateTotal,
          estimateStarted,
          estimateCompleted,
          progressPercent,
        }) => [key, issueCount, estimateTotal, estimateStarted, estimateCompleted, progressPercent],
      ),
    ).toEqual([
      ['self', 2, 4, 1, 3, 81],
      ['agent', 1, 1, 0, 0, 0],
      ['unassigned', 1, 2, 0, 2, 100],
    ]);
  });

  it('has no segments when the cycle has no issues', () => {
    expect(cycleProgressBreakdown([], 'assignee')).toEqual([]);
  });

  it('leaves the label breakdown empty when no issue has labels', () => {
    expect(cycleProgressBreakdown([issue({ assignee: 'self' })], 'label')).toEqual([]);
  });

  it('groups priority and project values with stable priority ordering', () => {
    const issues = [
      issue({ priority: 0, projectId: 2, projectSlug: 'harbor' }),
      issue({ priority: 3, projectId: 1, projectSlug: 'kotowari' }),
      issue({ priority: 1 }),
    ];
    const priorities = cycleProgressBreakdown(issues, 'priority');
    expect(priorities.map(({ key }) => key)).toEqual(['priority:1', 'priority:3', 'priority:0']);
    expect(
      cycleProgressBreakdown(issues, 'project', [
        { id: 1, slug: 'kotowari', name: 'Kotowari' },
        { id: 2, slug: 'harbor', name: 'Harbor' },
      ]).map(({ key, value }) => [key, value]),
    ).toEqual([
      ['project:2', 'Harbor'],
      ['project:1', 'Kotowari'],
      ['no-project', ''],
    ]);
  });

  it('counts each label membership and gives unlabeled issues a distinct group', () => {
    const labels = cycleProgressBreakdown(
      [
        issue({
          labels: [
            { id: 2, name: 'Feature', color: '#aabbcc' },
            { id: 1, name: 'Bug', color: '#112233' },
          ],
        }),
        issue(),
      ],
      'label',
    );
    expect(
      labels.map(({ key, value, issueCount, color }) => [key, value, issueCount, color]),
    ).toEqual([
      ['label:1', 'Bug', 1, '#112233'],
      ['label:2', 'Feature', 1, '#aabbcc'],
      ['no-labels', '', 1, undefined],
    ]);
    labels.forEach((item) => expect(item.estimateTotal).toBe(1));
  });

  it('matches an issue to the selected breakdown group', () => {
    const issue = {
      assignee: 'agent' as const,
      priority: 2,
      projectId: 7,
      projectSlug: 'harbor',
      labels: [{ id: 3, name: 'Bug', color: 'red' }],
    };
    expect(matchesCycleProgressBreakdown(issue, 'assignee', 'agent')).toBe(true);
    expect(matchesCycleProgressBreakdown(issue, 'priority', 'priority:2')).toBe(true);
    expect(matchesCycleProgressBreakdown(issue, 'label', 'label:3')).toBe(true);
    expect(matchesCycleProgressBreakdown(issue, 'project', 'project:7')).toBe(true);
    expect(matchesCycleProgressBreakdown(issue, 'project', 'project:harbor')).toBe(true);
    expect(matchesCycleProgressBreakdown(issue, 'project', 'no-project')).toBe(false);
  });
});
