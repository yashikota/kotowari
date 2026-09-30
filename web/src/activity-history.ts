import type { Activity, Comment } from './types.ts';

export type ActivityTimelineEntry = {
  kind: 'activity';
  id: number;
  createdAt: string;
  activity: Activity;
};

export type CommentTimelineEntry = {
  kind: 'comment';
  id: number;
  createdAt: string;
  comment: Comment;
};

export type PriorityActivityGroupEntry = {
  kind: 'priority-group';
  id: number;
  createdAt: string;
  activities: Activity[];
};

export type IssueTimelineEntry =
  | ActivityTimelineEntry
  | CommentTimelineEntry
  | PriorityActivityGroupEntry;

export function groupPriorityActivityHistory(
  entries: Array<ActivityTimelineEntry | CommentTimelineEntry>,
): IssueTimelineEntry[] {
  const priorityEntries = entries.filter(
    (entry): entry is ActivityTimelineEntry =>
      entry.kind === 'activity' && entry.activity.action === 'priority_changed',
  );
  if (priorityEntries.length < 2) return entries;

  const latest = priorityEntries.at(-1);
  if (!latest) return entries;
  const group: PriorityActivityGroupEntry = {
    kind: 'priority-group',
    id: latest.id,
    createdAt: latest.createdAt,
    activities: priorityEntries.map((entry) => entry.activity),
  };

  const grouped: IssueTimelineEntry[] = [];
  for (const entry of entries) {
    if (entry.kind !== 'activity' || entry.activity.action !== 'priority_changed') {
      grouped.push(entry);
    } else if (entry.id === latest.id) {
      grouped.push(group);
    }
  }
  return grouped;
}
