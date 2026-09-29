import { useMemo, useState } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { useIssueProjection } from '../application/issues.ts';
import { useWindowedRows } from '../application/windowing.ts';
import { sortOrderForDrop } from '../board.ts';
import { sortIssues } from '../issue-list.ts';
import type { IssueOrderBy } from '../issue-list.ts';
import type { IssueBoardColumnProps } from '../issue-board.ts';
import type { Issue } from '../types.ts';
import type { IssueNavigationState } from '../focus.ts';
import { useIssueWorkflow } from '../workflow.tsx';

type BoardProps = {
  issues: Issue[];
  onOpen: (id: string, state: IssueNavigationState) => void;
  onMove: (id: string, status: string, sortOrder: number) => void;
  find?: string;
  orderBy?: IssueOrderBy;
  direction?: 'asc' | 'desc';
  showSubIssues?: boolean;
  completedByRecency?: boolean;
};

function columnIssues(
  issues: Issue[],
  status: string,
  orderBy: IssueOrderBy,
  direction?: 'asc' | 'desc',
  completedByRecency = false,
): Issue[] {
  const matching = issues.filter((issue) => (issue.workflowStatus ?? issue.status) === status);
  if (orderBy !== 'manual') return sortIssues(matching, orderBy, direction, { completedByRecency });
  if (completedByRecency) return sortIssues(matching, 'manual', direction, { completedByRecency });
  return matching.sort((a, b) => a.sortOrder - b.sortOrder || a.number - b.number);
}

export function useIssueBoardPresenter({
  issues: initialIssues,
  onOpen,
  onMove,
  find = '',
  orderBy = 'manual',
  direction,
  showSubIssues = true,
  completedByRecency = false,
}: BoardProps) {
  const { statuses: workflowStatuses } = useIssueWorkflow();
  const projectedIssues = useIssueProjection(initialIssues);
  const issues = showSubIssues
    ? projectedIssues
    : projectedIssues.filter((issue) => issue.parentId == null);
  const [dragId, setDragId] = useState<string | null>(null);
  const columns = useMemo(
    () =>
      workflowStatuses.map((status) => ({
        status: status.id,
        category: status.category,
        name: status.name,
        issues: columnIssues(issues, status.id, orderBy, direction, completedByRecency),
      })),
    [issues, orderBy, direction, completedByRecency, workflowStatuses],
  );
  const issueIds = useMemo(
    () => columns.flatMap((column) => column.issues.map((issue) => issue.identifier)),
    [columns],
  );
  const issueReturnTo = useRouterState({ select: (state) => state.location.href });
  return {
    _view: 0 as const,
    onOpen,
    onMove,
    dragId,
    columns,
    handlers: {
      onDrag0: (...args: Parameters<IssueBoardColumnProps['onDrag']>) => {
        const handle: IssueBoardColumnProps['onDrag'] = setDragId;
        return handle(...args);
      },
      onOpen1: (id: string) =>
        onOpen(id, {
          issueIds,
          issueReturnTo,
          issueListFind: find,
          issueListSelectedId: id,
          issueListScrollTop: 0,
          issueListLayout: 'board',
        }),
      onMove2: (...args: Parameters<IssueBoardColumnProps['onMove']>) => {
        const handle: IssueBoardColumnProps['onMove'] = onMove;
        return handle(...args);
      },
    },
  };
}

export function useBoardColumnPresenter({
  issues,
  status,
  category,
  name,
  dragId,
  onDrag,
  onOpen,
  onMove,
}: IssueBoardColumnProps) {
  const windowed = useWindowedRows(issues.length, 100);
  function drop(beforeId: string | null) {
    if (dragId) onMove(dragId, status, sortOrderForDrop(issues, dragId, beforeId));
    onDrag(null);
  }
  return {
    _view: 0 as const,
    issues,
    status,
    category,
    name,
    dragId,
    windowed,
    handlers: {
      onDragOver0: (e: Parameters<NonNullable<React.ComponentProps<'div'>['onDragOver']>>[0]) =>
        e.preventDefault(),
      onDrop1: (e: Parameters<NonNullable<React.ComponentProps<'div'>['onDrop']>>[0]) => {
        e.preventDefault();
        drop(null);
      },
      onDragStart2: (issue: Issue) => onDrag(issue.identifier),
      onDragEnd3: () => onDrag(null),
      onDragOver4: (
        e: Parameters<NonNullable<React.ComponentProps<'button'>['onDragOver']>>[0],
      ) => {
        e.preventDefault();
        e.stopPropagation();
      },
      onDrop5: (
        issue: Issue,
        e: Parameters<NonNullable<React.ComponentProps<'button'>['onDrop']>>[0],
      ) => {
        e.preventDefault();
        e.stopPropagation();
        drop(issue.identifier);
      },
      onClick6: (issue: Issue) => onOpen(issue.identifier),
    },
  };
}
