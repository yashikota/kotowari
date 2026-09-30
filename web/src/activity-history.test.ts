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
      activityEntry(2, 'priority_changed', '2026-01-02T00:00:00Z'),
      { kind: 'comment', id: comment.id, createdAt: comment.createdAt, comment },
      activityEntry(3, 'status_changed', '2026-01-03T00:00:00Z'),
    ]);

    expect(timeline.map((entry) => entry.kind)).toEqual(['priority-group', 'comment', 'activity']);
    const group = timeline[0];
    expect(group).toMatchObject({
      kind: 'priority-group',
      id: 2,
      createdAt: '2026-01-02T00:00:00Z',
    });
    expect(group?.kind === 'priority-group' ? group.activities.map((item) => item.id) : []).toEqual(
      [1, 2],
    );
  });

  it('keeps priority changes separate when another timeline entry is between them', () => {
    const timeline = groupPriorityActivityHistory([
      activityEntry(1, 'priority_changed', '2026-01-01T00:00:00Z'),
      activityEntry(2, 'status_changed', '2026-01-02T00:00:00Z'),
      activityEntry(3, 'priority_changed', '2026-01-03T00:00:00Z'),
    ]);

    expect(timeline.map((entry) => entry.kind)).toEqual(['activity', 'activity', 'activity']);
  });

  it('leaves a single priority change as an ordinary activity', () => {
    const timeline = groupPriorityActivityHistory([
      activityEntry(1, 'priority_changed', '2026-01-01T00:00:00Z'),
      activityEntry(2, 'created', '2026-01-02T00:00:00Z'),
    ]);
    expect(timeline.map((entry) => entry.kind)).toEqual(['activity', 'activity']);
  });
});
