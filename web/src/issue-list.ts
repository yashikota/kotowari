import type { Issue } from './types.ts';

export type IssueListRow =
  | { kind: 'group'; priority: number; count: number; collapsed: boolean }
  | { kind: 'issue'; issue: Issue };

const PRIORITY_ORDER = [1, 2, 3, 4, 0] as const;

export function buildIssueListRows(
  issues: Issue[],
  collapsedPriorities: ReadonlySet<number> = new Set(),
): IssueListRow[] {
  const rows: IssueListRow[] = [];
  for (const priority of PRIORITY_ORDER) {
    const group = issues.filter((issue) => issue.priority === priority);
    if (group.length === 0) continue;
    const collapsed = collapsedPriorities.has(priority);
    rows.push({ kind: 'group', priority, count: group.length, collapsed });
    if (!collapsed) {
      rows.push(...group.map((issue) => ({ kind: 'issue' as const, issue })));
    }
  }
  return rows;
}
