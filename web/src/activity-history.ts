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
  const grouped: IssueTimelineEntry[] = [];
  for (let index = 0; index < entries.length;) {
    const entry = entries[index]!;
    if (entry.kind !== 'activity' || entry.activity.action !== 'priority_changed') {
      grouped.push(entry);
      index += 1;
      continue;
    }

    let end = index + 1;
    while (end < entries.length) {
      const candidate = entries[end];
      if (candidate?.kind !== 'activity' || candidate.activity.action !== 'priority_changed') {
        break;
      }
      end += 1;
    }

    const run = entries.slice(index, end);
    if (run.length < 2) {
      grouped.push(entry);
      index = end;
      continue;
    }

    const activities = run.flatMap((item) => (item.kind === 'activity' ? [item.activity] : []));
    const latest = run.at(-1)!;
    grouped.push({
      kind: 'priority-group',
      id: latest.id,
      createdAt: latest.createdAt,
      activities,
    });
    index = end;
  }
  return grouped;
}
