import type { Activity, Cycle, Issue, IssueStatus } from './types.ts';

export type CycleProgressPoint = {
  at: string;
  scope: number;
  started: number;
  completed: number;
};

type CycleProgressIssue = Pick<Issue, 'id' | 'status' | 'createdAt' | 'cycleAddedAt'>;

export type CycleAssigneeKey = 'self' | 'agent' | 'unassigned';
export type CycleAssigneeShare = {
  assignee: CycleAssigneeKey;
  count: number;
  share: number;
};

export function cycleAssigneeDistribution(issues: Pick<Issue, 'assignee'>[]): CycleAssigneeShare[] {
  if (issues.length === 0) return [];
  const counts: Record<CycleAssigneeKey, number> = { self: 0, agent: 0, unassigned: 0 };
  for (const issue of issues) counts[issue.assignee ?? 'unassigned']++;
  return (Object.keys(counts) as CycleAssigneeKey[])
    .filter((assignee) => counts[assignee] > 0)
    .map((assignee) => ({
      assignee,
      count: counts[assignee],
      share: (counts[assignee] / issues.length) * 100,
    }));
}

const completedStatuses = new Set<IssueStatus>(['done', 'canceled']);

function statusValue(value: unknown): IssueStatus | null {
  return value === 'backlog' ||
    value === 'todo' ||
    value === 'in_progress' ||
    value === 'done' ||
    value === 'canceled'
    ? value
    : null;
}

function timestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function cycleProgressTimeline(
  cycle: Cycle,
  issues: CycleProgressIssue[],
  activities: Activity[],
  now: Date = new Date(),
): CycleProgressPoint[] {
  const start = timestamp(cycle.startsAt);
  const end = timestamp(cycle.endsAt);
  if (start == null || end == null || end <= start) return [];

  const statusChanges = new Map<
    number,
    { at: number; id: number; to: IssueStatus; from: IssueStatus | null }[]
  >();
  for (const activity of activities) {
    if (activity.action !== 'status_changed') continue;
    const at = timestamp(activity.createdAt);
    const to = statusValue(activity.payload.to);
    if (at == null || !to) continue;
    const events = statusChanges.get(activity.entityId) ?? [];
    events.push({
      at,
      id: activity.id,
      to,
      from: statusValue(activity.payload.from),
    });
    statusChanges.set(activity.entityId, events);
  }

  const tracks = issues.flatMap((issue) => {
    const membershipAt = timestamp(issue.cycleAddedAt) ?? timestamp(issue.createdAt) ?? start;
    if (membershipAt > end) return [];
    const events = (statusChanges.get(issue.id) ?? []).sort((a, b) => a.at - b.at || a.id - b.id);
    const lastBeforeMembership = events.filter((event) => event.at < membershipAt).at(-1);
    const firstAfterMembership = events.find((event) => event.at >= membershipAt);
    const initialStatus = lastBeforeMembership?.to ?? firstAfterMembership?.from ?? issue.status;
    return [
      {
        membershipAt,
        events,
        initialStatus,
      },
    ];
  });

  const today = Math.min(end, Math.max(start, now.getTime()));
  const dates = new Set<number>([start, end, today]);
  for (const track of tracks) {
    if (track.membershipAt >= start && track.membershipAt <= end) dates.add(track.membershipAt);
    for (const event of track.events) {
      if (event.at >= Math.max(start, track.membershipAt) && event.at <= end) dates.add(event.at);
    }
  }

  return [...dates]
    .sort((a, b) => a - b)
    .map((at) => {
      let scope = 0;
      let started = 0;
      let completed = 0;
      for (const track of tracks) {
        if (track.membershipAt > at) continue;
        scope++;
        let status = track.initialStatus;
        for (const event of track.events) {
          if (event.at < track.membershipAt || event.at > at) continue;
          status = event.to;
        }
        if (status === 'in_progress') started++;
        if (completedStatuses.has(status)) completed++;
      }
      return { at: new Date(at).toISOString(), scope, started, completed };
    });
}
