import { describe, expect, it } from 'vite-plus/test';
import { groupPriorityActivityHistory } from './activity-history.ts';
import type { Activity, Comment } from './types.ts';

const activity = (id: number, action: string, createdAt: string): Activity => ({
  id,
  entityType: 'issue',
  entityId: 1,
  action,
  payload: {},
  createdAt,
});

const activityEntry = (id: number, action: string, createdAt: string) => ({
  kind: 'activity' as const,
  id,
  createdAt,
  activity: activity(id, action, createdAt),
});

const comment: Comment = { id: 2, issueId: 1, body: 'A note', createdAt: '2026-01-02T00:00:00Z' };

describe('groupPriorityActivityHistory', () => {
  it('puts repeated priority changes into one group at the latest change time', () => {
    const timeline = groupPriorityActivityHistory([
      activityEntry(1, 'priority_changed', '2026-01-01T00:00:00Z'),
      { kind: 'comment', id: comment.id, createdAt: comment.createdAt, comment },
      activityEntry(3, 'status_changed', '2026-01-03T00:00:00Z'),
      activityEntry(4, 'priority_changed', '2026-01-04T00:00:00Z'),
    ]);

    expect(timeline.map((entry) => entry.kind)).toEqual(['comment', 'activity', 'priority-group']);
    const group = timeline[2];
    expect(group).toMatchObject({
      kind: 'priority-group',
      id: 4,
      createdAt: '2026-01-04T00:00:00Z',
    });
    expect(group?.kind === 'priority-group' ? group.activities.map((item) => item.id) : []).toEqual(
      [1, 4],
    );
  });

  it('leaves a single priority change as an ordinary activity', () => {
    const timeline = groupPriorityActivityHistory([
      activityEntry(1, 'priority_changed', '2026-01-01T00:00:00Z'),
      activityEntry(2, 'created', '2026-01-02T00:00:00Z'),
    ]);
    expect(timeline.map((entry) => entry.kind)).toEqual(['activity', 'activity']);
  });
});
