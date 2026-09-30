import { useNavigate, useRouter, useRouterState } from '@tanstack/react-router';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useIntent, useKeyboard, useRootMachineFlag } from '../application/Root.tsx';
import { patchIssueOptimistically, useIssueProjection } from '../application/issues.ts';
import { useWindowedRows } from '../application/windowing.ts';
import { sortOrderForDrop } from '../board.ts';
import {
  buildIssueListRows,
  DEFAULT_DISPLAY_PROPERTIES,
  sortIssues,
  type IssueCreateContext,
  type IssueDisplayProperty,
  type IssueGroupBy,
  type IssueOrderBy,
  type IssueListRow,
} from '../issue-list.ts';
import { localToday } from '../due.ts';
import { actionFromKeyboard, isTypingTarget } from '../keymap.ts';
import type { Cycle, Issue, Label, Project } from '../types.ts';
import { useIssueWorkflow } from '../workflow.tsx';
import { useIssueBulkActions } from './IssueBulkActions.ts';

type Props = {
  issues: Issue[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  openOnSelect?: boolean;
  find?: string;
  restoreScrollTop?: number;
  groupBy?: IssueGroupBy;
  orderBy?: IssueOrderBy;
  subGroupBy?: IssueGroupBy;
  showEmptyGroups?: boolean;
  showSubIssues?: boolean;
  direction?: 'asc' | 'desc';
  completedByRecency?: boolean;
  groupOrder?: string[];
  hiddenGroups?: string[];
  displayProperties?: IssueDisplayProperty[];
  projects?: Project[];
  cycles?: Cycle[];
  labels?: Label[];
};

function issueSiblingsInGroup(rows: IssueListRow[], identifier: string): Issue[] {
  const groups = new Map<string, Issue[]>();
  let groupKey = '';
  for (const row of rows) {
    if (row.kind === 'group') {
      groupKey = row.key;
      continue;
    }
    const siblings = groups.get(groupKey) ?? [];
    siblings.push(row.issue);
    groups.set(groupKey, siblings);
  }
  return (
    [...groups.values()].find((siblings) =>
      siblings.some((issue) => issue.identifier === identifier),
    ) ?? []
  );
}

function issueGroupKey(rows: IssueListRow[], identifier: string): string | null {
  let groupKey: string | null = null;
  for (const row of rows) {
    if (row.kind === 'group') {
      groupKey = row.key;
    } else if (row.issue.identifier === identifier) {
      return groupKey;
    }
  }
  return null;
}

export function useIssueListPresenter({
  issues: initialIssues,
  selectedId,
  onSelect,
  openOnSelect = true,
  find = '',
  restoreScrollTop = 0,
  groupBy = 'priority',
  orderBy = 'manual',
  subGroupBy = 'none',
  showEmptyGroups = false,
  showSubIssues = true,
  direction,
  completedByRecency = false,
  groupOrder = [],
  hiddenGroups = [],
  displayProperties,
  projects = [],
  cycles = [],
  labels = [],
}: Props) {
  const sendIntent = useIntent();
  const [, setIssueFilterMenuOpen] = useRootMachineFlag('issues.filterMenu');
  const { statuses: workflowStatuses } = useIssueWorkflow();
  const projectedIssues = useIssueProjection(initialIssues);
  const visibleIssues = showSubIssues
    ? projectedIssues
    : projectedIssues.filter((issue) => issue.parentId == null);
  const issues = sortIssues(visibleIssues, orderBy, direction, { completedByRecency });
  const navigate = useNavigate();
  const router = useRouter();
  const issueReturnTo = useRouterState({ select: (state) => state.location.href });
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<string[]>([]);
  const selectionAnchorId = useRef<string | null>(null);
  const selectionRange = useRef<{ anchorId: string; baseIds: string[] } | null>(null);
  const expandedRows = useMemo(
    () =>
      buildIssueListRows(issues, new Set(), groupBy, {
        subGroupBy,
        showEmptyGroups,
        issueStatuses: workflowStatuses,
        activeCycleId: cycles.find((cycle) => cycle.status === 'active')?.id,
        groupOrder,
        hiddenGroups: new Set(hiddenGroups),
      }),
    [
      issues,
      groupBy,
      subGroupBy,
      showEmptyGroups,
      workflowStatuses,
      cycles,
      groupOrder,
      hiddenGroups,
    ],
  );
  const rows = buildIssueListRows(issues, new Set(collapsedGroups), groupBy, {
    subGroupBy,
    showEmptyGroups,
    issueStatuses: workflowStatuses,
    activeCycleId: cycles.find((cycle) => cycle.status === 'active')?.id,
    groupOrder,
    hiddenGroups: new Set(hiddenGroups),
  });
  const issueRows = rows.filter(
    (row): row is Extract<(typeof rows)[number], { kind: 'issue' }> => row.kind === 'issue',
  );
  const ids = useMemo(() => issueRows.map((row) => row.issue.identifier), [issueRows]);
  const bulkSelectedIdSet = useMemo(() => new Set(bulkSelectedIds), [bulkSelectedIds]);
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

  function clearBulkSelection() {
    selectionAnchorId.current = null;
    selectionRange.current = null;
    setBulkSelectedIds([]);
  }

  const bulkActions = useIssueBulkActions({
    selectedIds: bulkSelectedIds,
    visibleIssues: issueRows.map((row) => row.issue),
    onClear: clearBulkSelection,
  });
  const { bulkSelectedArchived, removableLabels } = bulkActions;

  function selectIssueRange(targetId: string) {
    const targetIndex = ids.indexOf(targetId);
    if (targetIndex < 0) return;

    const currentAnchor = selectionAnchorId.current;
    const anchorId = currentAnchor && ids.includes(currentAnchor) ? currentAnchor : targetId;
    const anchorIndex = ids.indexOf(anchorId);
    const previousRange = selectionRange.current;
    const baseIds =
      previousRange?.anchorId === anchorId
        ? previousRange.baseIds
        : bulkSelectedIds.filter((id) => ids.includes(id));
    const start = Math.min(anchorIndex, targetIndex);
    const end = Math.max(anchorIndex, targetIndex);

    selectionAnchorId.current = anchorId;
    selectionRange.current = { anchorId, baseIds };
    setBulkSelectedIds([...new Set([...baseIds, ...ids.slice(start, end + 1)])]);
  }

  function toggleBulkSelection(id: string, checked: boolean, shiftKey = false) {
    if (shiftKey) {
      selectIssueRange(id);
      return;
    }

    selectionRange.current = null;
    if (checked) {
      selectionAnchorId.current = id;
      setBulkSelectedIds((current) => (current.includes(id) ? current : [...current, id]));
      return;
    }

    if (selectionAnchorId.current === id)
      selectionAnchorId.current = bulkSelectedIds.find((selected) => selected !== id) ?? null;
    setBulkSelectedIds((current) => current.filter((selected) => selected !== id));
  }

  useLayoutEffect(() => {
    const viewport = windowed.ref.current;
    if (viewport && restoreScrollTop > 0) viewport.scrollTop = restoreScrollTop;
  }, []);

  const stateForIssue = (activeId: string) => ({
    issueIds: ids,
    issueReturnTo,
    issueListFind: find,
    issueListSelectedId: activeId,
    issueListScrollTop: windowed.ref.current?.scrollTop ?? restoreScrollTop,
    issueListLayout: 'list' as const,
  });

  useKeyboard((e) => {
    if (
      orderBy === 'manual' &&
      e.altKey &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.isComposing &&
      !e.defaultPrevented &&
      !isTypingTarget(e.target) &&
      (e.key === 'ArrowUp' || e.key === 'ArrowDown')
    ) {
      const issue = issueRows.find((row) => row.issue.identifier === selectedId)?.issue;
      if (!issue || !selectedId) return false;
      const siblings = issueSiblingsInGroup(rows, selectedId);
      const currentIndex = siblings.findIndex((item) => item.identifier === selectedId);
      const direction = e.key === 'ArrowUp' ? -1 : 1;
      const nextIndex = e.shiftKey
        ? direction < 0
          ? 0
          : siblings.length - 1
        : currentIndex + direction;
      e.preventDefault();
      if (nextIndex < 0 || nextIndex >= siblings.length || nextIndex === currentIndex) return true;
      const rest = siblings.filter((item) => item.identifier !== selectedId);
      const beforeId = rest[nextIndex]?.identifier ?? null;
      void (async () => {
        await patchIssueOptimistically(selectedId, {
          sortOrder: sortOrderForDrop(siblings, selectedId, beforeId),
        });
        await router.invalidate();
      })();
      return true;
    }
    if (
      (e.ctrlKey || e.metaKey) &&
      !e.altKey &&
      !e.shiftKey &&
      !e.repeat &&
      !e.isComposing &&
      !isTypingTarget(e.target) &&
      e.key.toLowerCase() === 'a'
    ) {
      if (ids.length === 0) return false;
      e.preventDefault();
      selectionAnchorId.current = ids[0] ?? null;
      selectionRange.current = null;
      setBulkSelectedIds(ids);
      return true;
    }
    const action = actionFromKeyboard(e);
    if (action === 'add-filter') {
      e.preventDefault();
      setIssueFilterMenuOpen(true);
      return true;
    }
    if (action === 'clear-last-filter') {
      e.preventDefault();
      sendIntent('issues.filters.clearLast');
      return true;
    }
    if (action === 'clear-filters') {
      e.preventDefault();
      sendIntent('issues.filters.clear');
      return true;
    }
    if (action === 'toggle-group' || action === 'toggle-groups') {
      const groupKeys = expandedRows
        .filter((row): row is Extract<IssueListRow, { kind: 'group' }> => row.kind === 'group')
        .map((row) => row.key);
      if (groupKeys.length === 0) return false;
      e.preventDefault();
      if (action === 'toggle-groups') {
        setCollapsedGroups((current) =>
          groupKeys.every((key) => current.includes(key)) ? [] : groupKeys,
        );
      } else {
        const focusedGroupKey =
          e.target instanceof Element
            ? e.target.closest<HTMLElement>('[data-issue-group-key]')?.dataset.issueGroupKey
            : undefined;
        const key = focusedGroupKey ?? issueGroupKey(expandedRows, selectedId ?? '');
        if (!key) return true;
        setCollapsedGroups((current) =>
          current.includes(key) ? current.filter((value) => value !== key) : [...current, key],
        );
      }
      return true;
    }
    if (action === 'select-group') {
      const selectedGroupIssues = issueSiblingsInGroup(rows, selectedId ?? '');
      if (selectedGroupIssues.length === 0) return false;
      e.preventDefault();
      setBulkSelectedIds(selectedGroupIssues.map((issue) => issue.identifier));
      selectionAnchorId.current = selectedGroupIssues[0]?.identifier ?? null;
      selectionRange.current = null;
      return true;
    }
    if (
      e.shiftKey &&
      !e.defaultPrevented &&
      !e.isComposing &&
      !e.altKey &&
      !e.ctrlKey &&
      !e.metaKey &&
      !isTypingTarget(e.target) &&
      (e.key === 'ArrowDown' || e.key === 'ArrowUp')
    ) {
      if (ids.length === 0) return false;
      e.preventDefault();
      const currentIndex = selectedId ? ids.indexOf(selectedId) : -1;
      const anchorId =
        selectionAnchorId.current && ids.includes(selectionAnchorId.current)
          ? selectionAnchorId.current
          : currentIndex >= 0
            ? ids[currentIndex]!
            : ids[0]!;
      const anchorIndex = ids.indexOf(anchorId);
      const direction = e.key === 'ArrowDown' ? 1 : -1;
      const nextIndex =
        currentIndex < 0
          ? Math.max(0, Math.min(ids.length - 1, anchorIndex + direction))
          : Math.max(0, Math.min(ids.length - 1, currentIndex + direction));
      const nextId = ids[nextIndex];
      if (!nextId) return true;
      selectionAnchorId.current = anchorId;
      onSelect(nextId);
      selectIssueRange(nextId);
      return true;
    }
    if (action === 'escape' && bulkSelectedIds.length > 0) {
      e.preventDefault();
      clearBulkSelection();
      return true;
    }
    if (action !== 'move-down' && action !== 'move-up' && action !== 'select' && action !== 'open')
      return false;
    if (ids.length === 0) {
      return false;
    }
    e.preventDefault();
    if (action === 'select') {
      const id = selectedId ?? ids[0];
      if (id) {
        if (e.shiftKey) selectIssueRange(id);
        else toggleBulkSelection(id, !bulkSelectedIdSet.has(id));
      }
      return true;
    }
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
            state: stateForIssue(id),
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
    bulkSelectedIds,
    bulkSelectedIdSet,
    bulkSelectedArchived,
    issues,
    displayProperties: displayProperties ?? [...DEFAULT_DISPLAY_PROPERTIES],
    rows,
    issuePositions,
    issueCount: issueRows.length,
    childCounts,
    windowed,
    today,
    projects,
    cycles,
    labels,
    removableLabels,
    handlers: {
      onClick0: (issue: Issue) => {
        onSelect(issue.identifier);
        if (openOnSelect) {
          return navigate({
            to: '/issues/$identifier',
            params: { identifier: issue.identifier },
            state: stateForIssue(issue.identifier),
          });
        }
      },
      onToggleBulkSelection: toggleBulkSelection,
      ...bulkActions.handlers,
      onToggleGroup1: (key: string) => {
        setCollapsedGroups((current) =>
          current.includes(key) ? current.filter((value) => value !== key) : [...current, key],
        );
      },
      onCreateInGroup2: (row: Extract<IssueListRow, { kind: 'group' }>) => {
        const context: IssueCreateContext = {};
        switch (row.groupBy) {
          case 'status':
            if (row.status) context.status = row.status;
            break;
          case 'priority':
            context.priority = row.priority ?? 0;
            break;
          case 'assignee':
            context.assignee =
              row.key === 'assignee:self' ? 'self' : row.key === 'assignee:agent' ? 'agent' : '';
            break;
          case 'agent':
            context.assignee = row.key === 'agent:agent' ? 'agent' : '';
            break;
          case 'project': {
            const slug = row.key.slice('project:'.length);
            const project = projects.find((candidate) => candidate.slug === slug);
            const issue = issues.find((candidate) => candidate.projectSlug === slug);
            if (slug !== 'none') context.projectId = project?.id ?? issue?.projectId ?? undefined;
            break;
          }
          case 'cycle': {
            const number = Number(row.key.slice('cycle:'.length));
            if (Number.isFinite(number) && number > 0)
              context.cycleId =
                cycles.find((candidate) => candidate.number === number)?.id ??
                issues.find((issue) => issue.cycleNumber === number)?.cycleId ??
                undefined;
            break;
          }
          case 'label':
            context.labelNames = row.key === 'label:none' ? [] : [row.label];
            break;
          case 'type':
            context.type = row.key === 'type:none' ? '' : (row.label as Issue['type']);
            break;
          case 'estimate':
            context.estimate = row.key === 'estimate:none' ? null : Number(row.label);
            break;
          case 'parent': {
            if (row.key === 'parent:none') break;
            const child = issues.find((issue) => issue.parentIdentifier === row.label);
            if (child?.parentId != null)
              context.parent = { id: child.parentId, identifier: row.label };
            else return;
            break;
          }
          case 'none':
            return;
        }
        sendIntent('issue.create', context);
      },
    },
  };
}
