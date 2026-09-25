import {
  useLoaderData,
  useNavigate,
  useParams,
  useRouter,
  useRouterState,
  useSearch,
} from '@tanstack/react-router';
import type * as React from 'react';
import { useRef, useState } from 'react';
import { api, parseIssueSearch, type IssueSearch } from '../api.ts';
import {
  buildIssueFacetOptions,
  DEFAULT_DISPLAY_PROPERTIES,
  filterCompletedIssues,
  includeNestedIssueMatches,
  type CompletedIssuesFilter,
  type IssueDisplayProperty,
  type IssueFacetType,
  type IssueGroupBy,
  type IssueLayout,
  type IssueOrderBy,
} from '../issue-list.ts';
import { IssueFilters } from '../components/IssueFilters.tsx';
import { IssueBoard, IssueList } from '../components/IssueList.tsx';
import { isTypingTarget } from '../keymap.ts';
import type { IssueNavigationState } from '../focus.ts';
import { useKeyboard } from '../application/Root.tsx';
import type { Cycle, Issue, Label, Project } from '../types.ts';

type IssueListData = {
  issues: Issue[];
  projects: Project[];
  cycles: Cycle[];
  labels: Label[];
};

function compactSearch(next: IssueSearch): IssueSearch {
  return parseIssueSearch({
    archived: next.archived,
    status: next.status ?? '',
    project: next.project ?? '',
    cycle: next.cycle ?? '',
    priority: next.priority ?? '',
    type: next.type ?? '',
    estimate: next.estimate ?? '',
    dueDate: next.dueDate ?? '',
    relation: next.relation ?? '',
    content: next.content ?? '',
    milestoneName: next.milestoneName ?? '',
    dateField: next.dateField ?? '',
    dateRange: next.dateRange ?? '',
    projectStatus: next.projectStatus ?? '',
    projectPriority: next.projectPriority ?? '',
    projectLabels: next.projectLabels?.join(',') ?? '',
    addedToCycle: next.addedToCycle?.join(',') ?? '',
    labels: next.labels ?? '',
  });
}

function matchesFind(issue: Issue, q: string): boolean {
  const n = q.trim().toLowerCase();
  if (!n) {
    return true;
  }
  return issue.title.toLowerCase().includes(n) || issue.identifier.toLowerCase().includes(n);
}

export function useIssuesPagePresenter() {
  const data = useLoaderData({ from: '/issues' }) as IssueListData;
  const search = useSearch({ from: '/issues' }) as IssueSearch;
  const latestSearch = useRef(search);
  latestSearch.current = search;
  const locationState = useRouterState({ select: (state) => state.location.state });
  const navigate = useNavigate();
  const router = useRouter();
  const [find, setFind] = useState(locationState.issueListFind ?? '');
  const [view, setView] = useState<'active' | 'backlog' | 'all'>('all');
  const [groupBy, setGroupBy] = useState<IssueGroupBy>('priority');
  const [layout, setLayout] = useState<IssueLayout>(locationState.issueListLayout ?? 'list');
  const [orderBy, setOrderBy] = useState<IssueOrderBy>('manual');
  const [subGroupBy, setSubGroupBy] = useState<IssueGroupBy>('none');
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc');
  const [completedIssues, setCompletedIssues] = useState<CompletedIssuesFilter>('all');
  const [showSubIssues, setShowSubIssues] = useState(true);
  const [nestedSubIssues, setNestedSubIssues] = useState<'showMatching' | 'showAll'>(
    'showMatching',
  );
  const [showEmptyGroups, setShowEmptyGroups] = useState(false);
  const [displayProperties, setDisplayProperties] = useState<IssueDisplayProperty[]>([
    ...DEFAULT_DISPLAY_PROPERTIES,
  ]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [facet, setFacet] = useState<IssueFacetType>('priority');
  const [selected, setSelected] = useState<string | null>(
    locationState.issueListSelectedId ?? null,
  );
  const restoreScrollTop = locationState.issueListScrollTop ?? 0;
  const activeView: 'active' | 'backlog' | 'all' | 'archived' = search.archived ? 'archived' : view;

  useKeyboard((event) => {
    if (
      !(event.ctrlKey || event.metaKey) ||
      event.altKey ||
      event.shiftKey ||
      event.repeat ||
      event.key.toLowerCase() !== 'b' ||
      isTypingTarget(event.target)
    )
      return false;
    event.preventDefault();
    setLayout((current) => (current === 'list' ? 'board' : 'list'));
    return true;
  });
  const matchingIssues = (data.issues ?? [])
    .filter((i) => matchesFind(i, find))
    .filter((i) =>
      activeView === 'active'
        ? i.status === 'todo' || i.status === 'in_progress'
        : activeView === 'backlog'
          ? i.status === 'backlog'
          : true,
    );
  const issues = filterCompletedIssues(
    includeNestedIssueMatches(matchingIssues, data.issues ?? [], nestedSubIssues),
    completedIssues,
    data.cycles,
  );
  const selectedFacetValues =
    facet === 'labels'
      ? (search.labels ?? '')
          .split(',')
          .map((label) => label.trim())
          .filter(Boolean)
      : facet === 'priority'
        ? search.priority === undefined
          ? []
          : [String(search.priority)]
        : search.project
          ? [search.project]
          : [];
  const selectedId = selected && issues.some((i) => i.identifier === selected) ? selected : null;

  return {
    _view: 0 as const,
    data,
    search,
    find,
    issues,
    selected: selectedId,
    restoreScrollTop,
    view: activeView,
    groupBy,
    layout,
    orderBy,
    subGroupBy,
    direction,
    completedIssues,
    showSubIssues,
    nestedSubIssues,
    showEmptyGroups,
    displayProperties,
    detailsOpen,
    facet,
    facetOptions: buildIssueFacetOptions(facet, issues, data.projects),
    selectedFacetValues,
    handlers: {
      onChange0: (
        next: Parameters<NonNullable<React.ComponentProps<typeof IssueFilters>['onChange']>>[0],
      ) => {
        const normalized = compactSearch(next);
        latestSearch.current = normalized;
        return navigate({ to: '/issues', search: normalized, replace: true });
      },
      onNewViewOpen: () =>
        navigate({
          to: '/views/new',
          search: compactSearch(latestSearch.current),
          state: {
            autofocus: 'name',
            viewDraft: {
              display: layout,
              groupBy,
              subGroupBy,
              orderBy,
              direction,
              completedIssues,
              showSubIssues,
              nestedSubIssues,
              showEmptyGroups,
              displayProperties,
            },
          },
        }),
      onFind2: (
        ...args: Parameters<NonNullable<React.ComponentProps<typeof IssueFilters>['onFind']>>
      ) => {
        const handle: NonNullable<React.ComponentProps<typeof IssueFilters>['onFind']> = setFind;
        return handle(...args);
      },
      onSelect3: (
        ...args: Parameters<NonNullable<React.ComponentProps<typeof IssueList>['onSelect']>>
      ) => {
        const handle: NonNullable<React.ComponentProps<typeof IssueList>['onSelect']> = setSelected;
        return handle(...args);
      },
      onView4: (next: string | null) => {
        if (next === 'archived') {
          return navigate({ to: '/issues', search: compactSearch({ ...search, archived: true }) });
        }
        if (next === 'active' || next === 'backlog' || next === 'all') {
          setView(next);
          if (search.archived) {
            return navigate({
              to: '/issues',
              search: compactSearch({ ...search, archived: false }),
            });
          }
        }
      },
      onGroupBy5: (next: IssueGroupBy) => setGroupBy(next),
      onLayout6: (next: IssueLayout) => setLayout(next),
      onOrderBy7: (next: IssueOrderBy) => setOrderBy(next),
      onSubGroupBy17: (next: IssueGroupBy) => setSubGroupBy(next),
      onDirection18: (next: 'asc' | 'desc') => setDirection(next),
      onCompletedIssues19: (next: CompletedIssuesFilter) => setCompletedIssues(next),
      onShowSubIssues20: (next: boolean) => setShowSubIssues(next),
      onNestedSubIssues21: (next: 'showMatching' | 'showAll') => setNestedSubIssues(next),
      onShowEmptyGroups22: (next: boolean) => setShowEmptyGroups(next),
      onDisplayPropertyToggle23: (property: IssueDisplayProperty) =>
        setDisplayProperties((current) =>
          current.includes(property)
            ? current.filter((item) => item !== property)
            : [...current, property],
        ),
      onDetailsToggle: () => setDetailsOpen((current) => !current),
      onFacetChange: (next: IssueFacetType) => setFacet(next),
      onFacetFilterToggle: (value: string) => {
        if (facet === 'priority') {
          const priority = Number(value);
          return navigate({
            to: '/issues',
            search: compactSearch({
              ...search,
              priority: search.priority === priority ? undefined : priority,
            }),
          });
        }
        if (facet === 'projects') {
          return navigate({
            to: '/issues',
            search: compactSearch({
              ...search,
              project: search.project === value ? undefined : value,
            }),
          });
        }
        const current = (search.labels ?? '')
          .split(',')
          .map((label) => label.trim())
          .filter(Boolean);
        const next = current.includes(value)
          ? current.filter((label) => label !== value)
          : [...current, value];
        return navigate({
          to: '/issues',
          search: compactSearch({ ...search, labels: next.join(',') }),
        });
      },
      onBoardOpen8: (id: string, state: IssueNavigationState) =>
        navigate({ to: '/issues/$identifier', params: { identifier: id }, state }),
      onBoardMove9: (id: string, status: string, sortOrder: number) =>
        api.patchIssue(id, { workflowStatus: status, sortOrder }).then(() => router.invalidate()),
    },
  };
}

export function useIssueRoutePagePresenter() {
  const { identifier } = useParams({ from: '/issues/$identifier' });
  const locationState = useRouterState({ select: (state) => state.location.state });
  const issues = (useLoaderData({ from: '/issues/$identifier' }) as Issue[] | null) ?? [];
  const navigate = useNavigate();
  const requestedIds: unknown = locationState.issueIds;
  const requestedIssueIds = Array.isArray(requestedIds)
    ? requestedIds.filter((id): id is string => typeof id === 'string')
    : typeof requestedIds === 'string'
      ? requestedIds.split(',')
      : [];
  const knownIds = new Set(issues.map((issue) => issue.identifier));
  const navigationIds = [...new Set(requestedIssueIds.filter((id) => knownIds.has(id)))];
  if (navigationIds.length === 0) navigationIds.push(...issues.map((issue) => issue.identifier));
  if (!navigationIds.includes(identifier)) navigationIds.push(identifier);
  return {
    _view: 0 as const,
    identifier,
    issues,
    navigationIds,
    issueReturnTo:
      typeof locationState.issueReturnTo === 'string' &&
      locationState.issueReturnTo.startsWith('/') &&
      !locationState.issueReturnTo.startsWith('//')
        ? locationState.issueReturnTo
        : '/issues',
    issueListFind: locationState.issueListFind ?? '',
    issueListSelectedId: locationState.issueListSelectedId ?? null,
    issueListScrollTop: locationState.issueListScrollTop ?? 0,
    issueListLayout: locationState.issueListLayout ?? 'list',
    handlers: {
      onSelect0: (
        id: Parameters<NonNullable<React.ComponentProps<typeof IssueList>['onSelect']>>[0],
      ) =>
        navigate({
          to: '/issues/$identifier',
          params: { identifier: id },
          state: {
            issueIds: navigationIds,
            issueReturnTo: locationState.issueReturnTo ?? '/issues',
            issueListFind: locationState.issueListFind ?? '',
            issueListSelectedId: locationState.issueListSelectedId ?? undefined,
            issueListScrollTop: locationState.issueListScrollTop ?? 0,
            issueListLayout: locationState.issueListLayout ?? 'list',
          },
        }),
    },
  };
}

export function useBoardPagePresenter() {
  const data = useLoaderData({ from: '/board' }) as IssueListData;
  const search = useSearch({ from: '/board' }) as IssueSearch;
  const locationState = useRouterState({ select: (state) => state.location.state });
  const navigate = useNavigate();
  const router = useRouter();
  const [find, setFind] = useState(locationState.issueListFind ?? '');
  const issues = (data.issues ?? []).filter((i) => matchesFind(i, find));

  return {
    _view: 0 as const,
    data,
    search,
    find,
    issues,
    handlers: {
      onChange0: (
        next: Parameters<NonNullable<React.ComponentProps<typeof IssueFilters>['onChange']>>[0],
      ) => navigate({ to: '/board', search: compactSearch(next) }),
      onFind2: (
        ...args: Parameters<NonNullable<React.ComponentProps<typeof IssueFilters>['onFind']>>
      ) => {
        const handle: NonNullable<React.ComponentProps<typeof IssueFilters>['onFind']> = setFind;
        return handle(...args);
      },
      onOpen3: (
        id: Parameters<NonNullable<React.ComponentProps<typeof IssueBoard>['onOpen']>>[0],
        state: Parameters<NonNullable<React.ComponentProps<typeof IssueBoard>['onOpen']>>[1],
      ) => navigate({ to: '/issues/$identifier', params: { identifier: id }, state }),
      onMove4: (
        id: Parameters<NonNullable<React.ComponentProps<typeof IssueBoard>['onMove']>>[0],
        status: Parameters<NonNullable<React.ComponentProps<typeof IssueBoard>['onMove']>>[1],
        sortOrder: Parameters<NonNullable<React.ComponentProps<typeof IssueBoard>['onMove']>>[2],
      ) => {
        return api
          .patchIssue(id, { workflowStatus: status, sortOrder })
          .then(() => router.invalidate());
      },
    },
  };
}
