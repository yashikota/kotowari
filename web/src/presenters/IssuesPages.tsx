import {
  useLoaderData,
  useNavigate,
  useParams,
  useRouter,
  useRouterState,
  useSearch,
} from '@tanstack/react-router';
import type * as React from 'react';
import { useRef, useState, useSyncExternalStore } from 'react';
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
import { useIssueWorkflow } from '../workflow.tsx';
import { usePersonalPreferences } from '../preferences.ts';
import { autoAssignOnStartedTransition } from '../application/issue-assignment.ts';
import { issueSubscriptions } from '../issue-subscriptions.ts';
import { matchesIssueFilterGroup } from '../issue-advanced-filter.ts';
import type { Activity } from '../types.ts';

type IssueListData = {
  issues: Issue[];
  projects: Project[];
  cycles: Cycle[];
  labels: Label[];
  linkSources: import('../types.ts').IssueLinkSource[];
  templateOptions: import('../types.ts').IssueTemplateFilterOption[];
  activityItems?: { identifier: string; title: string; activity: Activity }[];
};

function compactSearch(next: IssueSearch): IssueSearch {
  return parseIssueSearch({
    archived: next.archived,
    advancedFilter: next.advancedFilter ?? false,
    advancedFilterGroup: next.advancedFilterGroup,
    view: next.view ?? '',
    myIssuesTab: next.myIssuesTab ?? '',
    assignee: next.assignee ?? '',
    status: next.status ?? '',
    statuses: next.statuses?.join(',') ?? '',
    project: next.project ?? '',
    cycle: next.cycle ?? '',
    priority: next.priority ?? '',
    priorities: next.priorities?.join(',') ?? '',
    type: next.type ?? '',
    estimate: next.estimate ?? '',
    dueDate: next.dueDate ?? '',
    relation: next.relation ?? '',
    linkSources: next.linkSources?.join(',') ?? '',
    templateSlugs: next.templateSlugs?.join(',') ?? '',
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

function searchKey(search: IssueSearch): string {
  return JSON.stringify(
    Object.entries(search).sort(([left], [right]) => left.localeCompare(right)),
  );
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
  const pendingSearch = useRef<IssueSearch | null>(null);
  const normalizedSearch = compactSearch(search);
  if (pendingSearch.current) {
    if (searchKey(normalizedSearch) === searchKey(pendingSearch.current)) {
      latestSearch.current = normalizedSearch;
      pendingSearch.current = null;
    }
  } else {
    latestSearch.current = normalizedSearch;
  }
  const locationState = useRouterState({ select: (state) => state.location.state });
  const navigate = useNavigate();
  const router = useRouter();
  const { statuses: issueWorkflowStatuses } = useIssueWorkflow();
  const { preferences } = usePersonalPreferences();
  const subscriptionSnapshot = useSyncExternalStore(
    issueSubscriptions.subscribe,
    () => issueSubscriptions.list().sort().join('\0'),
    () => '',
  );
  const myIssuesTab = search.myIssuesTab ?? (search.assignee === 'self' ? 'assigned' : undefined);
  const [find, setFind] = useState(locationState.issueListFind ?? '');
  const [groupByOverride, setGroupByOverride] = useState<IssueGroupBy | null>(null);
  const groupBy = groupByOverride ?? (myIssuesTab ? 'cycle' : 'priority');
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
  const activeView: 'active' | 'backlog' | 'all' | 'archived' = search.archived
    ? 'archived'
    : (search.view ?? 'all');

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
  const subscribedIds = new Set(subscriptionSnapshot.split('\0').filter(Boolean));
  const matchingIssues = (data.issues ?? [])
    .filter((issue) =>
      myIssuesTab === 'assigned'
        ? issue.assignee === 'self'
        : myIssuesTab === 'subscribed'
          ? subscribedIds.has(issue.identifier)
          : true,
    )
    .filter((i) => matchesFind(i, find))
    .filter(
      (issue) =>
        !search.advancedFilter ||
        !search.advancedFilterGroup ||
        matchesIssueFilterGroup(issue, search.advancedFilterGroup, data.issues ?? []),
    )
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
        ? (search.priorities ?? (search.priority === undefined ? [] : [search.priority])).map(
            String,
          )
        : search.project
          ? [search.project]
          : [];
  const selectedId = selected && issues.some((i) => i.identifier === selected) ? selected : null;

  return {
    _view: 0 as const,
    data,
    search,
    myIssuesTab,
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
        pendingSearch.current = normalized;
        return navigate({ to: '/issues', search: normalized, replace: true });
      },
      onAdvancedFilterToggle: (enabled: boolean) => {
        const next = compactSearch({
          ...latestSearch.current,
          advancedFilter: enabled || undefined,
          advancedFilterGroup: enabled
            ? (latestSearch.current.advancedFilterGroup ?? {
                kind: 'group',
                operator: 'and',
                children: [],
              })
            : latestSearch.current.advancedFilterGroup,
        });
        latestSearch.current = next;
        pendingSearch.current = next;
        return navigate({ to: '/issues', search: next, replace: true });
      },
      onAdvancedFilterChange: (group: NonNullable<IssueSearch['advancedFilterGroup']>) => {
        const next = compactSearch({
          ...latestSearch.current,
          advancedFilter: true,
          advancedFilterGroup: group,
        });
        latestSearch.current = next;
        pendingSearch.current = next;
        return navigate({ to: '/issues', search: next, replace: true });
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
          return navigate({
            to: '/issues',
            search: compactSearch({ ...search, archived: false, view: next }),
          });
        }
      },
      onMyIssuesTabChange: (next: string | null) => {
        if (
          next !== 'assigned' &&
          next !== 'created' &&
          next !== 'subscribed' &&
          next !== 'activity'
        )
          return;
        const nextSearch = compactSearch({
          ...latestSearch.current,
          assignee: next === 'assigned' ? 'self' : undefined,
          myIssuesTab: next,
          view: undefined,
          archived: false,
        });
        latestSearch.current = nextSearch;
        return navigate({ to: '/issues', search: nextSearch });
      },
      onGroupBy5: (next: IssueGroupBy) => setGroupByOverride(next),
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
          const current =
            search.priorities ?? (search.priority === undefined ? [] : [search.priority]);
          const next = current.includes(priority)
            ? current.filter((selectedPriority) => selectedPriority !== priority)
            : [...current, priority];
          return navigate({
            to: '/issues',
            search: compactSearch({
              ...search,
              priority: next.length === 1 ? next[0] : undefined,
              priorities: next.length > 1 ? next : undefined,
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
      onBoardMove9: async (id: string, status: string, sortOrder: number) => {
        const issue = await api.issue(id);
        const patch = autoAssignOnStartedTransition(
          issue,
          { workflowStatus: status, sortOrder },
          issueWorkflowStatuses,
          preferences.autoAssignOnStart,
        );
        await api.patchIssue(id, patch);
        await router.invalidate();
      },
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
  const { statuses: issueWorkflowStatuses } = useIssueWorkflow();
  const { preferences } = usePersonalPreferences();
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
        return api.issue(id).then((issue) => {
          const patch = autoAssignOnStartedTransition(
            issue,
            { workflowStatus: status, sortOrder },
            issueWorkflowStatuses,
            preferences.autoAssignOnStart,
          );
          return api.patchIssue(id, patch).then(() => router.invalidate());
        });
      },
    },
  };
}
