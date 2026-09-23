import { useNavigate } from '@tanstack/react-router';
import type * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useIntent, useKeyboard } from '../application/Root.tsx';
import { useIssueProjection } from '../application/issues.ts';
import { useWindowedRows } from '../application/windowing.ts';
import { sortOrderForDrop } from '../board.ts';
import {
  buildIssueListRows,
  sortIssues,
  type IssueGroupBy,
  type IssueOrderBy,
} from '../issue-list.ts';
import type { IssueBoardColumnProps } from '../components/IssueBoardColumn.tsx';
import { localToday } from '../due.ts';
import { actionFromKeyboard } from '../keymap.ts';
import type { Issue, IssueStatus } from '../types.ts';
import { ISSUE_STATUSES } from '../types.ts';

type Props = {
  issues: Issue[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  openOnSelect?: boolean;
  groupBy?: IssueGroupBy;
  orderBy?: IssueOrderBy;
};

export function useIssueListPresenter({
  issues: initialIssues,
  selectedId,
  onSelect,
  openOnSelect = true,
  groupBy = 'priority',
  orderBy = 'manual',
}: Props) {
  const sendIntent = useIntent();
  const issues = sortIssues(useIssueProjection(initialIssues), orderBy);
  const navigate = useNavigate();
  const ids = useMemo(() => issues.map((i) => i.identifier), [issues]);
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const rows = buildIssueListRows(issues, new Set(collapsedGroups), groupBy);
  const issuePositions = new Map(
    rows
      .filter(
        (row): row is Extract<(typeof rows)[number], { kind: 'issue' }> => row.kind === 'issue',
      )
      .map((row, index) => [row.issue.identifier, index + 1]),
  );
  const childCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const issue of issues)
      if (issue.parentId) counts.set(issue.parentId, (counts.get(issue.parentId) ?? 0) + 1);
    return counts;
  }, [issues]);
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
          void navigate({ to: '/issues/$identifier', params: { identifier: id } });
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

  if (issues.length === 0) {
    return { _view: 0 as const, issues, rows, handlers: {} };
  }

  const today = localToday();

  return {
    _view: 1 as const,
    selectedId,
    issues,
    rows,
    issuePositions,
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
          });
        }
      },
      onToggleGroup1: (key: string) => {
        setCollapsedGroups((current) =>
          current.includes(key) ? current.filter((value) => value !== key) : [...current, key],
        );
      },
    },
  };
}

type BoardProps = {
  issues: Issue[];
  onOpen: (id: string) => void;
  onMove: (id: string, status: IssueStatus, sortOrder: number) => void;
  orderBy?: IssueOrderBy;
};

function columnIssues(issues: Issue[], status: IssueStatus, orderBy: IssueOrderBy): Issue[] {
  const matching = issues.filter((issue) => issue.status === status);
  if (orderBy !== 'manual') return sortIssues(matching, orderBy);
  return matching.sort((a, b) => a.sortOrder - b.sortOrder || a.number - b.number);
}

export function useIssueBoardPresenter({
  issues: initialIssues,
  onOpen,
  onMove,
  orderBy = 'manual',
}: BoardProps) {
  const issues = useIssueProjection(initialIssues);
  const [dragId, setDragId] = useState<string | null>(null);
  const columns = useMemo(
    () =>
      ISSUE_STATUSES.map((status) => ({ status, issues: columnIssues(issues, status, orderBy) })),
    [issues, orderBy],
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
