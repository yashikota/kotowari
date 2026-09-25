import { useNavigate, useRouter, useRouterState } from '@tanstack/react-router';
import type * as React from 'react';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { api } from '../api.ts';
import { useIntent, useKeyboard } from '../application/Root.tsx';
import { useIssueProjection } from '../application/issues.ts';
import { useWindowedRows } from '../application/windowing.ts';
import { sortOrderForDrop } from '../board.ts';
import { issueBranchName, issueMarkdown, renderIssuePrompt } from '../issue-actions.ts';
import type { IssueCopyKind } from '../issue-actions.ts';
import { useCodingToolPreferences } from '../coding-tools.ts';
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
import type { Cycle, Issue, Label, Project } from '../types.ts';
import type { IssueNavigationState } from '../focus.ts';
import { useIssueWorkflow } from '../workflow.tsx';

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
  displayProperties?: IssueDisplayProperty[];
  projects?: Project[];
  cycles?: Cycle[];
  labels?: Label[];
};

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
  displayProperties,
  projects = [],
  cycles = [],
  labels = [],
}: Props) {
  const sendIntent = useIntent();
  const { preferences: codingToolPreferences } = useCodingToolPreferences();
  const { statuses: workflowStatuses } = useIssueWorkflow();
  const projectedIssues = useIssueProjection(initialIssues);
  const visibleIssues = showSubIssues
    ? projectedIssues
    : projectedIssues.filter((issue) => issue.parentId == null);
  const issues = sortIssues(visibleIssues, orderBy, direction);
  const navigate = useNavigate();
  const router = useRouter();
  const issueReturnTo = useRouterState({ select: (state) => state.location.href });
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<string[]>([]);
  const rows = buildIssueListRows(issues, new Set(collapsedGroups), groupBy, {
    subGroupBy,
    showEmptyGroups,
    issueStatuses: workflowStatuses,
  });
  const issueRows = rows.filter(
    (row): row is Extract<(typeof rows)[number], { kind: 'issue' }> => row.kind === 'issue',
  );
  const ids = useMemo(() => issueRows.map((row) => row.issue.identifier), [issueRows]);
  const bulkSelectedIdSet = useMemo(() => new Set(bulkSelectedIds), [bulkSelectedIds]);
  const selectedLabelIds = new Set(
    issueRows
      .filter((row) => bulkSelectedIdSet.has(row.issue.identifier))
      .flatMap((row) => row.issue.labels.map((label) => label.id)),
  );
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

  async function updateSelectedIssues(patch: Record<string, unknown>) {
    await Promise.all(bulkSelectedIds.map((id) => api.patchIssue(id, patch)));
    await router.invalidate();
    setBulkSelectedIds([]);
  }

  async function updateSelectedLabels(labelId: number, add: boolean) {
    await Promise.all(
      bulkSelectedIds.map(async (identifier) => {
        const issue = await api.issue(identifier);
        const labelIds = issue.labels.map((label) => label.id);
        const next = add
          ? labelIds.includes(labelId)
            ? labelIds
            : [...labelIds, labelId]
          : labelIds.filter((id) => id !== labelId);
        if (next.length !== labelIds.length) await api.patchIssue(identifier, { labelIds: next });
      }),
    );
    await router.invalidate();
    setBulkSelectedIds([]);
  }

  async function copySelectedIssues(kind: IssueCopyKind) {
    try {
      const selectedIssues = await Promise.all(
        bulkSelectedIds.map(async (identifier) => {
          const visible = issueRows.find((row) => row.issue.identifier === identifier);
          return visible?.issue ?? api.issue(identifier);
        }),
      );
      if (kind === 'pullRequestUrls') {
        const pullRequestUrls = Array.from(
          new Set(
            selectedIssues.flatMap((issue) =>
              issue.externalLinks
                .filter((link) => link.kind === 'pullRequest')
                .map((link) => link.url),
            ),
          ),
        );
        await navigator.clipboard.writeText(pullRequestUrls.join('\n'));
        return;
      }
      const copies = selectedIssues.map((issue) => {
        const url = new URL(
          `/issues/${encodeURIComponent(issue.identifier)}`,
          window.location.origin,
        ).toString();
        switch (kind) {
          case 'id':
            return issue.identifier;
          case 'url':
            return url;
          case 'title':
            return issue.title;
          case 'titleLink': {
            const title = issue.title
              .replaceAll('\\', '\\\\')
              .replaceAll('[', '\\[')
              .replaceAll(']', '\\]');
            return `[${title}](${url})`;
          }
          case 'issueMarkdown':
            return issueMarkdown(issue, url).trimEnd();
          case 'markdown':
            return issueMarkdown(issue, url, true).trimEnd();
          case 'branch':
            return issueBranchName(issue);
          case 'prompt':
            return renderIssuePrompt(issue, codingToolPreferences.promptTemplate, url);
        }
      });
      const separator =
        kind === 'markdown' || kind === 'issueMarkdown' || kind === 'prompt' ? '\n\n---\n\n' : '\n';
      await navigator.clipboard.writeText(copies.join(separator));
    } catch {
      // Clipboard permissions can be unavailable in an embedded or insecure context.
    }
  }

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
    removableLabels: labels.filter((label) => selectedLabelIds.has(label.id)),
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
      onToggleBulkSelection: (id: string, checked: boolean) =>
        setBulkSelectedIds((current) =>
          checked
            ? current.includes(id)
              ? current
              : [...current, id]
            : current.filter((selected) => selected !== id),
        ),
      onSetBulkStatus: (status: string) => updateSelectedIssues({ workflowStatus: status }),
      onSetBulkPriority: (priority: number) => updateSelectedIssues({ priority }),
      onSetBulkAssignee: (assignee: 'self' | 'agent' | '') => updateSelectedIssues({ assignee }),
      onSetBulkType: (type: Issue['type']) => updateSelectedIssues({ type }),
      onSetBulkEstimate: (estimate: number | null) => updateSelectedIssues({ estimate }),
      onSetBulkDueDate: (dueDate: string | null) => updateSelectedIssues({ dueDate }),
      onSetBulkProject: (projectId: number | null) => updateSelectedIssues({ projectId }),
      onSetBulkCycle: (cycleId: number | null) => updateSelectedIssues({ cycleId }),
      onAddBulkLabel: (labelId: number) => updateSelectedLabels(labelId, true),
      onRemoveBulkLabel: (labelId: number) => updateSelectedLabels(labelId, false),
      onCopyBulkIssues: (kind: IssueCopyKind) => copySelectedIssues(kind),
      onClearBulkSelection: () => setBulkSelectedIds([]),
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
  onOpen: (id: string, state: IssueNavigationState) => void;
  onMove: (id: string, status: string, sortOrder: number) => void;
  find?: string;
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
  find = '',
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
