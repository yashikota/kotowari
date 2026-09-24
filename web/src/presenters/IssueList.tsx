import { useNavigate } from '@tanstack/react-router';
import type * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useIntent, useKeyboard } from '../application/Root.tsx';
import { useIssueProjection } from '../application/issues.ts';
import { useWindowedRows } from '../application/windowing.ts';
import { sortOrderForDrop } from '../board.ts';
import {
  buildIssueListRows,
  DEFAULT_DISPLAY_PROPERTIES,
  sortIssues,
  type IssueDisplayProperty,
  type IssueGroupBy,
  type IssueOrderBy,
  type IssueListRow,
} from '../issue-list.ts';
import type { IssueBoardColumnProps } from '../components/IssueBoardColumn.tsx';
import { localToday } from '../due.ts';
import { actionFromKeyboard } from '../keymap.ts';
import type { Issue } from '../types.ts';
import { useIssueWorkflow } from '../workflow.tsx';

type Props = {
  issues: Issue[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  openOnSelect?: boolean;
  groupBy?: IssueGroupBy;
  orderBy?: IssueOrderBy;
  subGroupBy?: IssueGroupBy;
  showEmptyGroups?: boolean;
  showSubIssues?: boolean;
  direction?: 'asc' | 'desc';
  displayProperties?: IssueDisplayProperty[];
};

export function useIssueListPresenter({
  issues: initialIssues,
  selectedId,
  onSelect,
  openOnSelect = true,
  groupBy = 'priority',
  orderBy = 'manual',
  subGroupBy = 'none',
  showEmptyGroups = false,
  showSubIssues = true,
  direction,
  displayProperties,
}: Props) {
  const sendIntent = useIntent();
  const { statuses: workflowStatuses } = useIssueWorkflow();
  const projectedIssues = useIssueProjection(initialIssues);
  const visibleIssues = showSubIssues
    ? projectedIssues
    : projectedIssues.filter((issue) => issue.parentId == null);
  const issues = sortIssues(visibleIssues, orderBy, direction);
  const navigate = useNavigate();
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const rows = buildIssueListRows(issues, new Set(collapsedGroups), groupBy, {
    subGroupBy,
    showEmptyGroups,
    issueStatuses: workflowStatuses,
  });
  const issueRows = rows.filter(
    (row): row is Extract<(typeof rows)[number], { kind: 'issue' }> => row.kind === 'issue',
  );
  const ids = useMemo(() => issueRows.map((row) => row.issue.identifier), [issueRows]);
  const issuePositions = new Map(issueRows.map((row, index) => [row.issue.identifier, index + 1]));
  const childCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const issue of projectedIssues)
      if (issue.parentId) counts.set(issue.parentId, (counts.get(issue.parentId) ?? 0) + 1);
    return counts;
  }, [projectedIssues]);
  const selectedRow = rows.findIndex(
    (row) => row.kind === 'issue' && row.issue.identifier === selectedId,
  );
  const windowed = useWindowedRows(rows.length, 36, selectedRow);

  useKeyboard((e) => {
    const action = actionFromKeyboard(e);
    if (action !== 'move-down' && action !== 'move-up' && action !== 'open') {
      return false;
    }
    if (ids.length === 0) {
      return false;
    }
    e.preventDefault();
    const idx = ids.indexOf(selectedId ?? '');
    if (action === 'move-down') {
      const id = ids[Math.min(idx + 1, ids.length - 1)] ?? ids[0];
      if (id) {
        onSelect(id);
      }
    }
    if (action === 'move-up') {
      const id = ids[Math.max(idx - 1, 0)] ?? ids[0];
      if (id) {
        onSelect(id);
      }
    }
    if (action === 'open') {
      const id = selectedId ?? ids[0];
      if (id) {
        if (openOnSelect) {
          void navigate({
            to: '/issues/$identifier',
            params: { identifier: id },
            state: { issueIds: ids },
          });
        } else {
          onSelect(id);
        }
      }
    }

    return true;
  }, true);

  useEffect(() => {
    if (selectedId) {
      sendIntent('issue.focus', selectedId);
    }
    return () => {
      sendIntent('issue.focus', null);
    };
  }, [selectedId, sendIntent]);

  if (rows.length === 0) {
    return { _view: 0 as const, issues, rows, handlers: {} };
  }

  const today = localToday();

  return {
    _view: 1 as const,
    selectedId,
    issues,
    displayProperties: displayProperties ?? [...DEFAULT_DISPLAY_PROPERTIES],
    rows,
    issuePositions,
    issueCount: issueRows.length,
    childCounts,
    windowed,
    today,
    handlers: {
      onClick0: (issue: Issue) => {
        onSelect(issue.identifier);
        if (openOnSelect) {
          return navigate({
            to: '/issues/$identifier',
            params: { identifier: issue.identifier },
            state: { issueIds: ids },
          });
        }
      },
      onToggleGroup1: (key: string) => {
        setCollapsedGroups((current) =>
          current.includes(key) ? current.filter((value) => value !== key) : [...current, key],
        );
      },
      onCreateInGroup2: (row: Extract<IssueListRow, { kind: 'group' }>) => {
        if (row.groupBy === 'priority') sendIntent('issue.create', { priority: row.priority ?? 0 });
      },
    },
  };
}

type BoardProps = {
  issues: Issue[];
  onOpen: (id: string) => void;
  onMove: (id: string, status: string, sortOrder: number) => void;
  orderBy?: IssueOrderBy;
  direction?: 'asc' | 'desc';
  showSubIssues?: boolean;
};

function columnIssues(
  issues: Issue[],
  status: string,
  orderBy: IssueOrderBy,
  direction?: 'asc' | 'desc',
): Issue[] {
  const matching = issues.filter((issue) => (issue.workflowStatus ?? issue.status) === status);
  if (orderBy !== 'manual') return sortIssues(matching, orderBy, direction);
  return matching.sort((a, b) => a.sortOrder - b.sortOrder || a.number - b.number);
}

export function useIssueBoardPresenter({
  issues: initialIssues,
  onOpen,
  onMove,
  orderBy = 'manual',
  direction,
  showSubIssues = true,
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
        issues: columnIssues(issues, status.id, orderBy, direction),
      })),
    [issues, orderBy, direction, workflowStatuses],
  );
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
      onOpen1: (...args: Parameters<IssueBoardColumnProps['onOpen']>) => {
        const handle: IssueBoardColumnProps['onOpen'] = onOpen;
        return handle(...args);
      },
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
