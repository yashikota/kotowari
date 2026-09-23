import type { Cycle, Issue, IssueStatus } from './types.ts';

export type IssueListRow =
  | {
      kind: 'group';
      groupBy: IssueGroupBy;
      key: string;
      label: string;
      priority: number | null;
      status: IssueStatus | null;
      level?: number;
      count: number;
      collapsed: boolean;
    }
  | { kind: 'issue'; issue: Issue };

export type IssueGroupBy =
  | 'none'
  | 'priority'
  | 'status'
  | 'project'
  | 'cycle'
  | 'label'
  | 'parent'
  | 'type'
  | 'estimate';
export type IssueOrderBy =
  | 'manual'
  | 'status'
  | 'priority'
  | 'updated'
  | 'created'
  | 'dueDate'
  | 'title'
  | 'estimate'
  | 'linkCount'
  | 'timeInStatus';
export type IssueLayout = 'list' | 'board';
export type IssueDisplayProperty =
  | 'id'
  | 'status'
  | 'priority'
  | 'project'
  | 'dueDate'
  | 'milestone'
  | 'cycle'
  | 'estimate'
  | 'labels'
  | 'links'
  | 'pullRequests'
  | 'timeInStatus'
  | 'created'
  | 'updated';
export type CompletedIssuesFilter =
  | 'all'
  | 'pastDay'
  | 'pastWeek'
  | 'pastMonth'
  | 'currentCycle'
  | 'none';

export const DEFAULT_DISPLAY_PROPERTIES = [
  'id',
  'status',
  'priority',
  'project',
  'dueDate',
  'milestone',
  'cycle',
  'estimate',
  'labels',
  'links',
  'pullRequests',
] as const;

const PRIORITY_ORDER = [1, 2, 3, 4, 0] as const;
const STATUS_ORDER: IssueStatus[] = ['backlog', 'todo', 'in_progress', 'done', 'canceled'];

export function buildIssueListRows(
  issues: Issue[],
  collapsedGroups: ReadonlySet<string> = new Set(),
  groupBy: IssueGroupBy = 'priority',
  options: { subGroupBy?: IssueGroupBy; showEmptyGroups?: boolean } = {},
): IssueListRow[] {
  if (groupBy === 'none') return issues.map((issue) => ({ kind: 'issue', issue }));
  const rows: IssueListRow[] = [];
  const subGroupBy = options.subGroupBy ?? 'none';

  function appendGroups(subset: Issue[], grouping: IssueGroupBy, parentKey = '', level = 0) {
    for (const groupInfo of issueGroups(subset, grouping, options.showEmptyGroups ?? false)) {
      const group = subset.filter((issue) => matchesGroup(issue, grouping, groupInfo));
      if (group.length === 0 && !options.showEmptyGroups) continue;
      const key = parentKey ? `${parentKey}/${groupInfo.key}` : groupInfo.key;
      const collapsed = collapsedGroups.has(key);
      rows.push({
        kind: 'group',
        groupBy: grouping,
        ...groupInfo,
        ...(level > 0 ? { level } : {}),
        count: group.length,
        collapsed,
        key,
      });
      if (collapsed) continue;
      if (level === 0 && subGroupBy !== 'none' && subGroupBy !== grouping) {
        appendGroups(group, subGroupBy, key, 1);
      } else {
        rows.push(...group.map((issue) => ({ kind: 'issue' as const, issue })));
      }
    }
  }

  appendGroups(issues, groupBy);
  return rows;
}

type GroupInfo = {
  key: string;
  label: string;
  priority: number | null;
  status: IssueStatus | null;
};

function issueGroups(
  issues: Issue[],
  groupBy: IssueGroupBy,
  showEmptyGroups: boolean,
): GroupInfo[] {
  if (groupBy === 'priority')
    return PRIORITY_ORDER.map((priority) => ({
      key: `priority:${priority}`,
      label: String(priority),
      priority,
      status: null,
    }));
  if (groupBy === 'status')
    return STATUS_ORDER.map((status) => ({
      key: `status:${status}`,
      label: status,
      priority: null,
      status,
    }));
  if (groupBy === 'project')
    return [
      ...new Set([
        ...issues.map((issue) => issue.projectSlug || ''),
        ...(showEmptyGroups ? [''] : []),
      ]),
    ]
      .sort((a, b) => (a || 'No project').localeCompare(b || 'No project'))
      .map((project) => ({
        key: `project:${project || 'none'}`,
        label: project || 'No project',
        priority: null,
        status: null,
      }));
  if (groupBy === 'cycle')
    return [
      ...new Set([
        ...issues.map((issue) => issue.cycleNumber ?? null),
        ...(showEmptyGroups ? [null] : []),
      ]),
    ]
      .sort((a, b) => (a ?? Number.MAX_SAFE_INTEGER) - (b ?? Number.MAX_SAFE_INTEGER))
      .map((cycle) => ({
        key: `cycle:${cycle ?? 'none'}`,
        label: cycle === null ? 'No cycle' : `Cycle ${cycle}`,
        priority: null,
        status: null,
      }));
  if (groupBy === 'label')
    return [
      ...new Set([
        ...issues.flatMap((issue) => issue.labels.map((label) => label.name)),
        ...(showEmptyGroups || issues.some((issue) => issue.labels.length === 0) ? [''] : []),
      ]),
    ]
      .sort((a, b) => a.localeCompare(b))
      .map((label) => ({
        key: `label:${label || 'none'}`,
        label: label || 'No label',
        priority: null,
        status: null,
      }));
  if (groupBy === 'type')
    return [
      ...new Set([
        ...issues.map((issue) => issue.type ?? ''),
        ...(showEmptyGroups ? ['', 'bug', 'feature', 'improvement', 'task'] : []),
      ]),
    ]
      .sort((a, b) => a.localeCompare(b))
      .map((type) => ({
        key: `type:${type || 'none'}`,
        label: type,
        priority: null,
        status: null,
      }));
  if (groupBy === 'estimate')
    return [
      ...new Set([
        ...issues.map((issue) => issue.estimate ?? null),
        ...(showEmptyGroups ? [null] : []),
      ]),
    ]
      .sort((a, b) => (a ?? Number.MAX_SAFE_INTEGER) - (b ?? Number.MAX_SAFE_INTEGER))
      .map((estimate) => ({
        key: `estimate:${estimate ?? 'none'}`,
        label: estimate === null ? '' : String(estimate),
        priority: null,
        status: null,
      }));
  return [
    ...new Set([
      ...issues.map((issue) => issue.parentIdentifier ?? null),
      ...(showEmptyGroups ? [null] : []),
    ]),
  ]
    .sort((a, b) => (a ?? 'No parent').localeCompare(b ?? 'No parent'))
    .map((parent) => ({
      key: `parent:${parent ?? 'none'}`,
      label: parent ?? 'No parent',
      priority: null,
      status: null,
    }));
}

function matchesGroup(issue: Issue, groupBy: IssueGroupBy, groupInfo: GroupInfo): boolean {
  if (groupBy === 'priority') return issue.priority === groupInfo.priority;
  if (groupBy === 'status') return issue.status === groupInfo.status;
  if (groupBy === 'project') return (issue.projectSlug || 'No project') === groupInfo.label;
  if (groupBy === 'label')
    return groupInfo.label === 'No label'
      ? issue.labels.length === 0
      : issue.labels.some((label) => label.name === groupInfo.label);
  if (groupBy === 'cycle')
    return (
      (issue.cycleNumber == null ? 'No cycle' : `Cycle ${issue.cycleNumber}`) === groupInfo.label
    );
  if (groupBy === 'type') return (issue.type ?? '') === groupInfo.label;
  if (groupBy === 'estimate')
    return (issue.estimate == null ? '' : String(issue.estimate)) === groupInfo.label;
  return (issue.parentIdentifier ?? 'No parent') === groupInfo.label;
}

export function filterCompletedIssues(
  issues: Issue[],
  filter: CompletedIssuesFilter,
  cycles: Cycle[],
  now = Date.now(),
): Issue[] {
  if (filter === 'all') return issues;
  if (filter === 'none') return issues.filter((issue) => !isCompleted(issue));
  const ranges: Partial<Record<CompletedIssuesFilter, number>> = {
    pastDay: 24 * 60 * 60 * 1000,
    pastWeek: 7 * 24 * 60 * 60 * 1000,
    pastMonth: 30 * 24 * 60 * 60 * 1000,
  };
  const activeCycle = cycles.find((cycle) => cycle.status === 'active');
  const start = activeCycle ? Date.parse(activeCycle.startsAt) : Number.NaN;
  const end = activeCycle ? Date.parse(activeCycle.endsAt) : Number.NaN;
  const cutoff = now - (ranges[filter] ?? 0);
  return issues.filter((issue) => {
    if (!isCompleted(issue)) return true;
    const completedAt = issue.completedAt ? Date.parse(issue.completedAt) : Number.NaN;
    if (!Number.isFinite(completedAt)) return false;
    if (filter === 'currentCycle') return completedAt >= start && completedAt <= end;
    return completedAt >= cutoff;
  });
}

export function includeNestedIssueMatches(
  matchingIssues: Issue[],
  candidates: Issue[],
  mode: 'showMatching' | 'showAll',
): Issue[] {
  if (mode === 'showMatching' || matchingIssues.length === 0) return matchingIssues;

  const includedIds = new Set(matchingIssues.map((issue) => issue.id));
  let added = true;
  while (added) {
    added = false;
    for (const issue of candidates) {
      if (
        issue.parentId !== null &&
        includedIds.has(issue.parentId) &&
        !includedIds.has(issue.id)
      ) {
        includedIds.add(issue.id);
        added = true;
      }
    }
  }
  return candidates.filter((issue) => includedIds.has(issue.id));
}

function isCompleted(issue: Issue): boolean {
  return issue.status === 'done' || issue.status === 'canceled';
}

const PRIORITY_RANK = new Map([
  [1, 0],
  [2, 1],
  [3, 2],
  [4, 3],
  [0, 4],
]);

export function sortIssues(
  issues: Issue[],
  orderBy: IssueOrderBy,
  direction?: 'asc' | 'desc',
): Issue[] {
  if (orderBy === 'manual') return [...issues];
  const resolvedDirection =
    direction ??
    (orderBy === 'updated' || orderBy === 'created' || orderBy === 'timeInStatus' ? 'desc' : 'asc');

  return [...issues].sort((a, b) => {
    let comparison = 0;
    if (orderBy === 'status') {
      comparison = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    } else if (orderBy === 'priority') {
      comparison = (PRIORITY_RANK.get(a.priority) ?? 5) - (PRIORITY_RANK.get(b.priority) ?? 5);
    } else if (orderBy === 'updated') {
      comparison = Date.parse(a.updatedAt) - Date.parse(b.updatedAt);
    } else if (orderBy === 'created') {
      comparison = Date.parse(a.createdAt) - Date.parse(b.createdAt);
    } else if (orderBy === 'dueDate') {
      comparison =
        (a.dueDate ? Date.parse(a.dueDate) : Infinity) -
        (b.dueDate ? Date.parse(b.dueDate) : Infinity);
    } else if (orderBy === 'estimate') {
      comparison = (a.estimate ?? Infinity) - (b.estimate ?? Infinity);
    } else if (orderBy === 'linkCount') {
      comparison = (a.externalLinks?.length ?? 0) - (b.externalLinks?.length ?? 0);
    } else if (orderBy === 'timeInStatus') {
      comparison =
        Date.parse(a.statusChangedAt ?? a.updatedAt) - Date.parse(b.statusChangedAt ?? b.updatedAt);
    } else {
      comparison = a.title.localeCompare(b.title);
    }
    return (
      (comparison || a.sortOrder - b.sortOrder || a.number - b.number) *
      (resolvedDirection === 'desc' ? -1 : 1)
    );
  });
}
