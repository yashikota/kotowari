import type { Issue, IssueStatus } from './types.ts';

export type IssueListRow =
  | {
      kind: 'group';
      groupBy: IssueGroupBy;
      key: string;
      label: string;
      priority: number | null;
      status: IssueStatus | null;
      count: number;
      collapsed: boolean;
    }
  | { kind: 'issue'; issue: Issue };

export type IssueGroupBy = 'none' | 'priority' | 'status' | 'project' | 'cycle' | 'parent';
export type IssueOrderBy = 'manual' | 'priority' | 'updated' | 'dueDate' | 'title';
export type IssueLayout = 'list' | 'board';

const PRIORITY_ORDER = [1, 2, 3, 4, 0] as const;
const STATUS_ORDER: IssueStatus[] = ['backlog', 'todo', 'in_progress', 'done', 'canceled'];

export function buildIssueListRows(
  issues: Issue[],
  collapsedGroups: ReadonlySet<string> = new Set(),
  groupBy: IssueGroupBy = 'priority',
): IssueListRow[] {
  if (groupBy === 'none') return issues.map((issue) => ({ kind: 'issue', issue }));

  const rows: IssueListRow[] = [];
  const groups: {
    key: string;
    label: string;
    priority: number | null;
    status: IssueStatus | null;
  }[] =
    groupBy === 'priority'
      ? PRIORITY_ORDER.map((priority) => ({
          key: `priority:${priority}`,
          label: String(priority),
          priority,
          status: null,
        }))
      : groupBy === 'status'
        ? STATUS_ORDER.map((status) => ({
            key: `status:${status}`,
            label: status,
            priority: null,
            status,
          }))
        : groupBy === 'project'
          ? [...new Set(issues.map((issue) => issue.projectSlug || ''))]
              .sort((a, b) => (a || 'No project').localeCompare(b || 'No project'))
              .map((project) => ({
                key: `project:${project || 'none'}`,
                label: project || 'No project',
                priority: null,
                status: null,
              }))
          : groupBy === 'cycle'
            ? [...new Set(issues.map((issue) => issue.cycleNumber ?? null))]
                .sort((a, b) => (a ?? Number.MAX_SAFE_INTEGER) - (b ?? Number.MAX_SAFE_INTEGER))
                .map((cycle) => ({
                  key: `cycle:${cycle ?? 'none'}`,
                  label: cycle === null ? 'No cycle' : `Cycle ${cycle}`,
                  priority: null,
                  status: null,
                }))
            : [...new Set(issues.map((issue) => issue.parentIdentifier ?? null))]
                .sort((a, b) => (a ?? 'No parent').localeCompare(b ?? 'No parent'))
                .map((parent) => ({
                  key: `parent:${parent ?? 'none'}`,
                  label: parent ?? 'No parent',
                  priority: null,
                  status: null,
                }));

  for (const groupInfo of groups) {
    const group = issues.filter((issue) => {
      if (groupBy === 'priority') return issue.priority === groupInfo.priority;
      if (groupBy === 'status') return issue.status === groupInfo.status;
      if (groupBy === 'project') return (issue.projectSlug || 'No project') === groupInfo.label;
      if (groupBy === 'cycle')
        return (
          (issue.cycleNumber == null ? 'No cycle' : `Cycle ${issue.cycleNumber}`) ===
          groupInfo.label
        );
      return (issue.parentIdentifier ?? 'No parent') === groupInfo.label;
    });
    if (group.length === 0) continue;
    const collapsed = collapsedGroups.has(groupInfo.key);
    rows.push({ kind: 'group', groupBy, ...groupInfo, count: group.length, collapsed });
    if (!collapsed) {
      rows.push(...group.map((issue) => ({ kind: 'issue' as const, issue })));
    }
  }
  return rows;
}

const PRIORITY_RANK = new Map([
  [1, 0],
  [2, 1],
  [3, 2],
  [4, 3],
  [0, 4],
]);

export function sortIssues(issues: Issue[], orderBy: IssueOrderBy): Issue[] {
  if (orderBy === 'manual') return [...issues];

  return [...issues].sort((a, b) => {
    let comparison = 0;
    if (orderBy === 'priority') {
      comparison = (PRIORITY_RANK.get(a.priority) ?? 5) - (PRIORITY_RANK.get(b.priority) ?? 5);
    } else if (orderBy === 'updated') {
      comparison = Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    } else if (orderBy === 'dueDate') {
      comparison =
        (a.dueDate ? Date.parse(a.dueDate) : Infinity) -
        (b.dueDate ? Date.parse(b.dueDate) : Infinity);
    } else {
      comparison = a.title.localeCompare(b.title);
    }
    return comparison || a.sortOrder - b.sortOrder || a.number - b.number;
  });
}
