import type { Cycle, Issue, IssueStatus, IssueWorkflowStatus, Project } from './types.ts';

export type IssueListRow =
  | {
      kind: 'group';
      groupBy: IssueGroupBy;
      key: string;
      label: string;
      priority: number | null;
      status: string | null;
      level?: number;
      count: number;
      collapsed: boolean;
    }
  | { kind: 'issue'; issue: Issue };

export type IssueGroupBy =
  | 'none'
  | 'priority'
  | 'status'
  | 'assignee'
  | 'agent'
  | 'project'
  | 'cycle'
  | 'label'
  | 'parent'
  | 'type'
  | 'estimate';
export type IssueOrderBy =
  | 'manual'
  | 'status'
  | 'assignee'
  | 'priority'
  | 'updated'
  | 'created'
  | 'dueDate'
  | 'title'
  | 'estimate'
  | 'linkCount'
  | 'timeInStatus';
export type IssueLayout = 'list' | 'board';
export type IssueFacetType = 'labels' | 'priority' | 'projects';
export type IssueFacetOption = { value: string; label: string; count: number; color?: string };
export type IssueDisplayProperty =
  | 'id'
  | 'status'
  | 'priority'
  | 'project'
  | 'assignee'
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
  'assignee',
  'priority',
  'project',
  'dueDate',
  'cycle',
  'estimate',
  'labels',
  'links',
  'pullRequests',
  'created',
] as const;

export function formatIssueCreatedDate(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date);
}

export function buildIssueFacetOptions(
  facet: IssueFacetType,
  issues: Issue[],
  projects: Project[],
): IssueFacetOption[] {
  if (facet === 'priority') {
    const counts = new Map<number, number>();
    for (const issue of issues) counts.set(issue.priority, (counts.get(issue.priority) ?? 0) + 1);
    return [1, 2, 3, 4, 0]
      .filter((priority) => (counts.get(priority) ?? 0) > 0)
      .map((priority) => ({
        value: String(priority),
        label: String(priority),
        count: counts.get(priority) ?? 0,
      }));
  }

  if (facet === 'labels') {
    const counts = new Map<number, { label: Issue['labels'][number]; count: number }>();
    for (const issue of issues) {
      const seen = new Set<number>();
      for (const label of issue.labels) {
        if (seen.has(label.id)) continue;
        seen.add(label.id);
        const current = counts.get(label.id);
        counts.set(label.id, { label, count: (current?.count ?? 0) + 1 });
      }
    }
    return [...counts.values()]
      .sort(
        (left, right) =>
          right.count - left.count || left.label.name.localeCompare(right.label.name),
      )
      .map(({ label, count }) => ({
        value: label.name,
        label: label.name,
        count,
        color: label.color,
      }));
  }

  const projectNames = new Map(projects.map((project) => [project.slug, project.name]));
  const counts = new Map<string, number>();
  for (const issue of issues) {
    if (issue.projectSlug) counts.set(issue.projectSlug, (counts.get(issue.projectSlug) ?? 0) + 1);
  }
  return [...counts]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([slug, count]) => ({ value: slug, label: projectNames.get(slug) ?? slug, count }));
}

const PRIORITY_ORDER = [1, 2, 3, 4, 0] as const;
const STATUS_ORDER: IssueStatus[] = ['backlog', 'todo', 'in_progress', 'done', 'canceled'];

export function buildIssueListRows(
  issues: Issue[],
  collapsedGroups: ReadonlySet<string> = new Set(),
  groupBy: IssueGroupBy = 'priority',
  options: {
    subGroupBy?: IssueGroupBy;
    showEmptyGroups?: boolean;
    issueStatuses?: IssueWorkflowStatus[];
  } = {},
): IssueListRow[] {
  if (groupBy === 'none') return issues.map((issue) => ({ kind: 'issue', issue }));
  const rows: IssueListRow[] = [];
  const subGroupBy = options.subGroupBy ?? 'none';

  function appendGroups(subset: Issue[], grouping: IssueGroupBy, parentKey = '', level = 0) {
    for (const groupInfo of issueGroups(
      subset,
      grouping,
      options.showEmptyGroups ?? false,
      options.issueStatuses,
    )) {
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
  status: string | null;
};

function issueGroups(
  issues: Issue[],
  groupBy: IssueGroupBy,
  showEmptyGroups: boolean,
  issueStatuses?: IssueWorkflowStatus[],
): GroupInfo[] {
  if (groupBy === 'priority')
    return PRIORITY_ORDER.map((priority) => ({
      key: `priority:${priority}`,
      label: String(priority),
      priority,
      status: null,
    }));
  if (groupBy === 'status')
    return (issueStatuses ?? STATUS_ORDER.map((id) => ({ id, name: id, category: id }))).map(
      ({ id: status }) => ({
        key: `status:${status}`,
        label: status,
        priority: null,
        status,
      }),
    );
  if (groupBy === 'assignee') {
    const assigned = issues.some((issue) => issue.assignee === 'self');
    const agent = issues.some((issue) => issue.assignee === 'agent');
    const unassigned = issues.some((issue) => !issue.assignee);
    return [
      ...(assigned || showEmptyGroups
        ? [{ key: 'assignee:self', label: '', priority: null, status: null }]
        : []),
      ...(agent || showEmptyGroups
        ? [{ key: 'assignee:agent', label: '', priority: null, status: null }]
        : []),
      ...(unassigned || showEmptyGroups
        ? [{ key: 'assignee:none', label: '', priority: null, status: null }]
        : []),
    ];
  }
  if (groupBy === 'agent') {
    const assigned = issues.some((issue) => issue.assignee === 'agent');
    const unassigned = issues.some((issue) => issue.assignee !== 'agent');
    return [
      ...(assigned || showEmptyGroups
        ? [{ key: 'agent:agent', label: '', priority: null, status: null }]
        : []),
      ...(unassigned || showEmptyGroups
        ? [{ key: 'agent:none', label: '', priority: null, status: null }]
        : []),
    ];
  }
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
  if (groupBy === 'status') return (issue.workflowStatus ?? issue.status) === groupInfo.status;
  if (groupBy === 'assignee')
    return groupInfo.key === 'assignee:self'
      ? issue.assignee === 'self'
      : groupInfo.key === 'assignee:agent'
        ? issue.assignee === 'agent'
        : !issue.assignee;
  if (groupBy === 'agent')
    return groupInfo.key === 'agent:agent'
      ? issue.assignee === 'agent'
      : issue.assignee !== 'agent';
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
    } else if (orderBy === 'assignee') {
      const assigneeOrder = (value: Issue['assignee']) =>
        value === 'self' ? 0 : value === 'agent' ? 1 : 2;
      comparison = assigneeOrder(a.assignee) - assigneeOrder(b.assignee);
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
