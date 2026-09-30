import { useMemo, useState } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { useIssueProjection } from '../application/issues.ts';
import { useWindowedRows } from '../application/windowing.ts';
import { sortOrderForDrop } from '../board.ts';
import { sortIssues } from '../issue-list.ts';
import type { IssueOrderBy } from '../issue-list.ts';
import type { IssueBoardColumnProps } from '../issue-board.ts';
import type { Cycle, Issue, Label, Project } from '../types.ts';
import type { IssueNavigationState } from '../focus.ts';
import { useIssueWorkflow } from '../workflow.tsx';
import { useIssueBulkActions } from './IssueBulkActions.ts';
import { useIssueSelection } from './useIssueSelection.ts';
import { useKeyboard } from '../application/Root.tsx';
import { isTypingTarget } from '../keymap.ts';

type BoardProps = {
  issues: Issue[];
  onOpen: (id: string, state: IssueNavigationState) => void;
  onMove: (id: string, status: string, sortOrder: number) => void;
  find?: string;
  orderBy?: IssueOrderBy;
  direction?: 'asc' | 'desc';
  showSubIssues?: boolean;
  completedByRecency?: boolean;
  projects?: Project[];
  cycles?: Cycle[];
  labels?: Label[];
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
  projects = [],
  cycles = [],
  labels = [],
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
  const selection = useIssueSelection(issueIds);
  const { selectedIds: bulkSelectedIds, selectedIdSet: bulkSelectedIdSet } = selection;
  function clearBulkSelection() {
    selection.clear();
  }
  function selectIssueRange(targetId: string, requestedAnchorId?: string) {
    selection.extend(targetId, requestedAnchorId);
  }
  function toggleSelection(id: string, checked: boolean, shiftKey = false) {
    if (shiftKey) {
      selectIssueRange(id);
      return;
    }
    selection.toggle(id, checked);
  }
  const bulkActions = useIssueBulkActions({
    selectedIds: bulkSelectedIds,
    visibleIssues: columns.flatMap((column) => column.issues),
    onClear: clearBulkSelection,
  });
  function moveToAdjacentColumn(id: string, status: string, direction: -1 | 1) {
    const columnIndex = columns.findIndex((column) => column.status === status);
    if (columnIndex < 0) return;
    const targetColumn = columns[columnIndex + direction];
    if (!targetColumn) return;
    onMove(id, targetColumn.status, sortOrderForDrop(targetColumn.issues, id, null));
  }
  return {
    _view: 0 as const,
    onOpen,
    onMove,
    dragId,
    columns,
    bulkSelectedIds,
    bulkSelectedIdSet,
    bulkSelectedArchived: bulkActions.bulkSelectedArchived,
    removableLabels: bulkActions.removableLabels,
    projects,
    cycles,
    labels,
    canReorder: orderBy === 'manual',
    handlers: {
      onDrag0: (...args: Parameters<IssueBoardColumnProps['onDrag']>) => {
        const handle: IssueBoardColumnProps['onDrag'] = setDragId;
        return handle(...args);
      },
      onToggleSelection1: (...args: Parameters<IssueBoardColumnProps['onToggleSelection']>) =>
        toggleSelection(...args),
      onExtendSelection2: (anchorId: string, targetId: string) => {
        const currentAnchor = selection.anchorId ?? anchorId;
        selectIssueRange(targetId, currentAnchor);
      },
      onSelectAll10: () => {
        if (issueIds.length === 0) return;
        selection.select(issueIds);
      },
      onSelectColumn11: (status: string) => {
        const columnIssueIds = columns
          .find((column) => column.status === status)
          ?.issues.map((issue) => issue.identifier);
        if (!columnIssueIds?.length) return;
        selection.select(columnIssueIds);
      },
      onClearBulkSelection9: bulkActions.handlers.onClearBulkSelection,
      onOpen3: (id: string) =>
        onOpen(id, {
          issueIds,
          issueReturnTo,
          issueListFind: find,
          issueListSelectedId: id,
          issueListScrollTop: 0,
          issueListLayout: 'board',
        }),
      onMove4: (...args: Parameters<IssueBoardColumnProps['onMove']>) => {
        const handle: IssueBoardColumnProps['onMove'] = onMove;
        return handle(...args);
      },
      onMoveToAdjacentColumn5: (
        ...args: Parameters<IssueBoardColumnProps['onMoveToAdjacentColumn']>
      ) => moveToAdjacentColumn(...args),
      ...bulkActions.handlers,
    },
  };
}

export function useBoardColumnPresenter({
  issues,
  status,
  category,
  name,
  canReorder,
  dragId,
  onDrag,
  bulkSelectedIdSet,
  onToggleSelection,
  onExtendSelection,
  onSelectAll,
  onSelectColumn,
  onClearSelection,
  onOpen,
  onMove,
  onMoveToAdjacentColumn,
}: IssueBoardColumnProps) {
  const windowed = useWindowedRows(issues.length, 100);
  useKeyboard((event) => {
    if (event.defaultPrevented || event.isComposing || isTypingTarget(event.target)) return false;
    const modified = event.ctrlKey || event.metaKey;
    if (
      modified &&
      event.altKey &&
      !event.shiftKey &&
      !event.repeat &&
      event.key.toLowerCase() === 'a'
    ) {
      event.preventDefault();
      onSelectColumn();
      return true;
    }
    if (
      modified &&
      !event.altKey &&
      !event.shiftKey &&
      !event.repeat &&
      event.key.toLowerCase() === 'a'
    ) {
      event.preventDefault();
      onSelectAll();
      return true;
    }
    if (
      !modified &&
      !event.altKey &&
      !event.shiftKey &&
      event.key === 'Escape' &&
      bulkSelectedIdSet.size > 0
    ) {
      event.preventDefault();
      onClearSelection();
      return true;
    }
    return false;
  });
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
    bulkSelectedIdSet,
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
      onClick6: (issue: Issue, event: React.MouseEvent<HTMLButtonElement>) => {
        if (event.shiftKey) onToggleSelection(issue.identifier, true, true);
        else onOpen(issue.identifier);
      },
      onSelectionChange7: (issue: Issue, checked: boolean, shiftKey: boolean) =>
        onToggleSelection(issue.identifier, checked, shiftKey),
      onKeyDown8: (issue: Issue, event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (
          !event.altKey &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.nativeEvent.isComposing &&
          (event.key === 'ArrowUp' || event.key === 'ArrowDown') &&
          event.shiftKey
        ) {
          const currentIndex = issues.findIndex((item) => item.identifier === issue.identifier);
          const direction = event.key === 'ArrowUp' ? -1 : 1;
          const targetIndex = Math.max(0, Math.min(issues.length - 1, currentIndex + direction));
          const targetIssue = issues[targetIndex];
          if (!targetIssue || targetIndex === currentIndex) {
            event.preventDefault();
            return true;
          }
          onExtendSelection(issue.identifier, targetIssue.identifier);
          const currentColumn = event.currentTarget.closest<HTMLElement>(
            '[data-issue-board-column]',
          );
          const targetCard = (index: number) =>
            currentColumn?.querySelector<HTMLButtonElement>(
              `[data-issue-board-card][data-board-index="${index}"]`,
            );
          const targetViewport = currentColumn?.querySelector<HTMLElement>('[role="region"]');
          event.preventDefault();
          const card = targetCard(targetIndex);
          if (card) card.focus();
          else if (targetViewport) {
            targetViewport.scrollTop = targetIndex * 100;
            requestAnimationFrame(() =>
              requestAnimationFrame(() => targetCard(targetIndex)?.focus()),
            );
          }
          return true;
        }
        if (
          !event.altKey &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey &&
          !event.nativeEvent.isComposing
        ) {
          if (event.key.toLowerCase() === 'x') {
            event.preventDefault();
            onToggleSelection(issue.identifier, !bulkSelectedIdSet.has(issue.identifier));
            return true;
          }
        }
        if (
          canReorder &&
          event.altKey &&
          !event.ctrlKey &&
          !event.metaKey &&
          (event.key === 'ArrowUp' || event.key === 'ArrowDown')
        ) {
          const currentIndex = issues.findIndex((item) => item.identifier === issue.identifier);
          const direction = event.key === 'ArrowUp' ? -1 : 1;
          const nextIndex = event.shiftKey
            ? direction < 0
              ? 0
              : issues.length - 1
            : currentIndex + direction;
          if (nextIndex < 0 || nextIndex >= issues.length || nextIndex === currentIndex) {
            event.preventDefault();
            return true;
          }
          const rest = issues.filter((item) => item.identifier !== issue.identifier);
          const beforeId = rest[nextIndex]?.identifier ?? null;
          event.preventDefault();
          onMove(issue.identifier, status, sortOrderForDrop(issues, issue.identifier, beforeId));
          return true;
        }
        if (
          !event.defaultPrevented &&
          (event.ctrlKey || event.metaKey) &&
          !event.altKey &&
          !event.shiftKey &&
          (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
        ) {
          const direction = event.key === 'ArrowRight' ? 1 : -1;
          event.preventDefault();
          onMoveToAdjacentColumn(issue.identifier, status, direction);
          return true;
        }
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return false;
        const verticalDirection =
          event.key === 'ArrowUp' || event.key.toLowerCase() === 'k'
            ? -1
            : event.key === 'ArrowDown' || event.key.toLowerCase() === 'j'
              ? 1
              : 0;
        const horizontalDirection =
          event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
        if (!verticalDirection && !horizontalDirection) return false;
        const card = event.currentTarget;
        const currentColumn = card.closest<HTMLElement>('[data-issue-board-column]');
        const board = card.closest<HTMLElement>('[data-issue-board]');
        if (!currentColumn || !board) return false;
        const currentIndex = Number(card.dataset.boardIndex);
        const columns = Array.from(
          board.querySelectorAll<HTMLElement>('[data-issue-board-column]'),
        );
        let targetColumnIndex = columns.indexOf(currentColumn);
        let targetIndex = currentIndex;
        if (verticalDirection) {
          targetIndex += verticalDirection;
        } else {
          targetColumnIndex += horizontalDirection;
          while (columns[targetColumnIndex]) {
            const count = Number(columns[targetColumnIndex]?.dataset.boardCount ?? 0);
            if (count > 0) {
              targetIndex = Math.min(currentIndex, count - 1);
              break;
            }
            targetColumnIndex += horizontalDirection;
          }
        }
        const targetColumn = columns[targetColumnIndex];
        const targetViewport = targetColumn?.querySelector<HTMLElement>('[role="region"]');
        const targetCount = Number(targetColumn?.dataset.boardCount ?? 0);
        if (
          !targetColumn ||
          !targetViewport ||
          targetCount === 0 ||
          targetIndex < 0 ||
          targetIndex >= targetCount
        ) {
          event.preventDefault();
          return true;
        }
        const focusTarget = () =>
          targetColumn.querySelector<HTMLButtonElement>(
            `[data-issue-board-card][data-board-index="${targetIndex}"]`,
          );
        event.preventDefault();
        const target = focusTarget();
        if (target) {
          target.focus();
        } else {
          targetViewport.scrollTop = targetIndex * 100;
          requestAnimationFrame(() => requestAnimationFrame(() => focusTarget()?.focus()));
        }
        return true;
      },
    },
  };
}
