import type { Activity, Cycle, Issue, IssueStatus, Project } from './types.ts';

export type CycleProgressPoint = {
  at: string;
  scope: number;
  started: number;
  completed: number;
};

type CycleProgressIssue = Pick<Issue, 'id' | 'status' | 'createdAt' | 'cycleAddedAt'>;

export type CycleProgressBreakdownBy = 'assignee' | 'label' | 'priority' | 'project';
export type CycleProgressBreakdownItem = {
  key: string;
  value: string;
  count: number;
  share: number;
  color?: string;
};

const breakdownOrder: Partial<Record<CycleProgressBreakdownBy, Record<string, number>>> = {
  assignee: { self: 0, agent: 1, unassigned: 2 },
  priority: { 'priority:1': 0, 'priority:2': 1, 'priority:3': 2, 'priority:4': 3, 'priority:0': 4 },
  label: { 'no-labels': Number.MAX_SAFE_INTEGER },
  project: { 'no-project': Number.MAX_SAFE_INTEGER },
};

export function cycleProgressPointIndexAtRatio(
  points: CycleProgressPoint[],
  ratio: number,
): number | null {
  if (points.length === 0 || !Number.isFinite(ratio)) return null;
  const first = Date.parse(points[0]!.at);
  const last = Date.parse(points.at(-1)!.at);
  if (!Number.isFinite(first) || !Number.isFinite(last)) return null;
  const target = first + Math.min(1, Math.max(0, ratio)) * (last - first);
  let selectedIndex = 0;
  let selectedDistance = Number.POSITIVE_INFINITY;
  for (const [index, point] of points.entries()) {
    const at = Date.parse(point.at);
    if (!Number.isFinite(at)) continue;
    const distance = Math.abs(at - target);
    if (distance < selectedDistance) {
      selectedIndex = index;
      selectedDistance = distance;
    }
  }
  return Number.isFinite(selectedDistance) ? selectedIndex : null;
}

export function cycleProgressBreakdown(
  issues: Pick<Issue, 'assignee' | 'labels' | 'priority' | 'projectId' | 'projectSlug'>[],
  by: CycleProgressBreakdownBy,
  projects: Pick<Project, 'id' | 'slug' | 'name'>[] = [],
): CycleProgressBreakdownItem[] {
  if (issues.length === 0) return [];
  if (by === 'label' && issues.every((issue) => issue.labels.length === 0)) return [];
  const entries = new Map<string, Omit<CycleProgressBreakdownItem, 'share'>>();
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const projectBySlug = new Map(projects.map((project) => [project.slug, project]));
  const add = (key: string, value: string, color?: string) => {
    const entry = entries.get(key);
    if (entry) entry.count++;
    else entries.set(key, { key, value, count: 1, ...(color ? { color } : {}) });
  };

  for (const issue of issues) {
    if (by === 'assignee') {
      const assignee = issue.assignee ?? 'unassigned';
      add(assignee, assignee);
    } else if (by === 'priority') {
      add(`priority:${issue.priority}`, String(issue.priority));
    } else if (by === 'project') {
      const project =
        (issue.projectId == null ? undefined : projectById.get(issue.projectId)) ??
        (issue.projectSlug == null ? undefined : projectBySlug.get(issue.projectSlug));
      if (project) add(`project:${project.id}`, project.name);
      else if (issue.projectId != null || issue.projectSlug) {
        const slug = issue.projectSlug ?? String(issue.projectId);
        add(`project:${slug}`, slug.replaceAll('-', ' '));
      } else add('no-project', '');
    } else if (issue.labels.length > 0) {
      for (const label of issue.labels) add(`label:${label.id}`, label.name, label.color);
    } else add('no-labels', '');
  }

  const total = [...entries.values()].reduce((count, item) => count + item.count, 0);
  const order = breakdownOrder[by];
  return [...entries.values()]
    .sort(
      (left, right) =>
        (order?.[left.key] ?? 0) - (order?.[right.key] ?? 0) ||
        left.value.localeCompare(right.value),
    )
    .map((item) => ({ ...item, share: (item.count / total) * 100 }));
}

export function matchesCycleProgressBreakdown(
  issue: Pick<Issue, 'assignee' | 'labels' | 'priority' | 'projectId' | 'projectSlug'>,
  by: CycleProgressBreakdownBy,
  key: string,
): boolean {
  if (by === 'assignee') return (issue.assignee ?? 'unassigned') === key;
  if (by === 'priority') return `priority:${issue.priority}` === key;
  if (by === 'label') {
    return key === 'no-labels'
      ? issue.labels.length === 0
      : issue.labels.some((label) => `label:${label.id}` === key);
  }
  if (key === 'no-project') return issue.projectId == null && !issue.projectSlug;
  return key === `project:${issue.projectId}` || key === `project:${issue.projectSlug}`;
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
