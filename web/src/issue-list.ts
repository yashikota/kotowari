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

export type IssueGroupBy = 'priority' | 'status' | 'project';

const PRIORITY_ORDER = [1, 2, 3, 4, 0] as const;
const STATUS_ORDER: IssueStatus[] = ['backlog', 'todo', 'in_progress', 'done', 'canceled'];

export function buildIssueListRows(
  issues: Issue[],
  collapsedGroups: ReadonlySet<string> = new Set(),
  groupBy: IssueGroupBy = 'priority',
): IssueListRow[] {
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
        : [...new Set(issues.map((issue) => issue.projectSlug || ''))]
            .sort((a, b) => (a || 'No project').localeCompare(b || 'No project'))
            .map((project) => ({
              key: `project:${project || 'none'}`,
              label: project || 'No project',
              priority: null,
              status: null,
            }));

  for (const groupInfo of groups) {
    const group = issues.filter((issue) => {
      if (groupBy === 'priority') return issue.priority === groupInfo.priority;
      if (groupBy === 'status') return issue.status === groupInfo.status;
      return (issue.projectSlug || 'No project') === groupInfo.label;
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
