import { describe, expect, it } from 'vite-plus/test';
import { cycleProgressTimeline } from './cycle-progress.ts';
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
