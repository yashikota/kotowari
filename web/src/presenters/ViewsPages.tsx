import {
  useLoaderData,
  useNavigate,
  useParams,
  useRouter,
  useRouterState,
} from '@tanstack/react-router';
import type * as React from 'react';
import { useState, useSyncExternalStore } from 'react';
import { api } from '../api.ts';
import type { IssueSearch } from '../issue-search.ts';
import { patchIssueOptimistically } from '../application/issues.ts';
import { useKeyboard } from '../application/Root.tsx';
import { signals } from '../application/mediator.ts';
import i18n from '../i18n/index.ts';
import {
  DEFAULT_DISPLAY_PROPERTIES,
  filterCompletedIssues,
  includeNestedIssueMatches,
  type CompletedIssuesFilter,
  type IssueDisplayProperty,
  type IssueGroupBy,
  type IssueLayout,
  type IssueOrderBy,
} from '../issue-list.ts';
import { IssueList } from '../components/IssueList.tsx';
import type { IssueNavigationState } from '../focus.ts';
import type { Cycle, Issue, Label, Project, View } from '../types.ts';
import { useIssueWorkflow } from '../workflow.tsx';
import { usePersonalPreferences } from '../preferences.ts';
import { actionFromKeyboard } from '../keymap.ts';
import { autoAssignOnStartedTransition } from '../application/issue-assignment.ts';
import { issueSubscriptions } from '../issue-subscriptions.ts';
import { matchesIssueFilterGroup, parseIssueFilterGroup } from '../issue-advanced-filter.ts';

export function useViewPagePresenter() {
  const { slug } = useParams({ from: '/views/$slug' });
  const data = useLoaderData({ from: '/views/$slug' }) as {
    view: View;
    issues: Issue[];
    projects: Project[];
    cycles: Cycle[];
    labels: Label[];
    linkSources: import('../types.ts').IssueLinkSource[];
    templateOptions: import('../types.ts').IssueTemplateFilterOption[];
  };
  const locationState = useRouterState({ select: (state) => state.location.state });
  const router = useRouter();
  const navigate = useNavigate();
  const { statuses: issueWorkflowStatuses } = useIssueWorkflow();
  const { preferences } = usePersonalPreferences();
  const subscriptionSnapshot = useSyncExternalStore(
    issueSubscriptions.subscribe,
    () => issueSubscriptions.list().sort().join('\0'),
    () => '',
  );
  const [find, setFind] = useState(locationState.issueListFind ?? '');
  const [groupBy, setGroupBy] = useState<IssueGroupBy>(
    (data.view.groupBy || 'priority') as IssueGroupBy,
  );
  const [orderBy, setOrderBy] = useState<IssueOrderBy>(
    (data.view.orderBy || 'manual') as IssueOrderBy,
  );
  const [view, setView] = useState(data.view);
  const subscribedIds = new Set(subscriptionSnapshot.split('\0').filter(Boolean));
  const advancedFilterGroup = parseIssueFilterGroup(view.advancedFilterGroup);
  const matchingIssues = (data.issues ?? []).filter((issue) => {
    const query = find.trim().toLowerCase();
    return (
      (!query ||
        issue.title.toLowerCase().includes(query) ||
        issue.identifier.toLowerCase().includes(query)) &&
      (view.subscriber === 'self'
        ? subscribedIds.has(issue.identifier)
        : view.subscriber === 'none'
          ? !subscribedIds.has(issue.identifier)
          : true) &&
      (!view.advancedFilter ||
        !advancedFilterGroup ||
        matchesIssueFilterGroup(issue, advancedFilterGroup, data.issues ?? []))
    );
  });
  const issues = filterCompletedIssues(
    includeNestedIssueMatches(
      matchingIssues,
      data.issues ?? [],
      view.nestedSubIssues === 'showAll' ? 'showAll' : 'showMatching',
    ),
    (view.completedIssues || 'all') as CompletedIssuesFilter,
    data.cycles,
  );
  const [selected, setSelected] = useState<string | null>(
    locationState.issueListSelectedId ?? null,
  );
  const [detailsOpen, setDetailsOpen] = useState(locationState.issueListSelectedId != null);
  const restoreScrollTop = locationState.issueListScrollTop ?? 0;

  useKeyboard((event) => {
    if (view.display !== 'list' || actionFromKeyboard(event) !== 'toggle-right-sidebar')
      return false;
    event.preventDefault();
    setDetailsOpen((open) => !open);
    return true;
  }, true);

  if (view.slug !== data.view.slug || view.updatedAt !== data.view.updatedAt) {
    setView(data.view);
    setSelected(null);
    setDetailsOpen(false);
    setGroupBy((data.view.groupBy || 'priority') as IssueGroupBy);
    setOrderBy((data.view.orderBy || 'manual') as IssueOrderBy);
  }

  async function save(body: Record<string, unknown>) {
    const next = await api.patchView(slug, body);
    setView(next);
    await router.invalidate();
  }

  const search: IssueSearch = {
    status: view.status ?? undefined,
    statuses: view.statuses ?? (view.status ? [view.status] : undefined),
    assignee: view.assignee ?? undefined,
    subscribers: view.subscriber ?? undefined,
    project: view.project ?? undefined,
    cycle: view.cycle ?? undefined,
    priority: view.priority ?? undefined,
    priorities: view.priorities ?? (view.priority == null ? undefined : [view.priority]),
    type: view.type ?? undefined,
    estimate: view.estimate ?? undefined,
    estimates: view.estimates ?? (view.estimate == null ? undefined : [view.estimate]),
    noEstimate: view.noEstimate || undefined,
    dueDate: view.dueDate === '' ? undefined : (view.dueDate as IssueSearch['dueDate']),
    relation: view.relation === '' ? undefined : (view.relation as IssueSearch['relation']),
    linkSources: view.linkSources ?? undefined,
    templateSlugs: view.templateSlugs ?? undefined,
    content: view.content ?? undefined,
    milestoneName: view.milestoneName ?? undefined,
    dateField: view.dateField as IssueSearch['dateField'],
    dateRange: view.dateRange as IssueSearch['dateRange'],
    projectStatus: view.projectStatus ?? undefined,
    projectPriority: view.projectPriority ?? undefined,
    projectLabels: view.projectLabels ?? undefined,
    addedToCycle: view.addedToCycle ?? undefined,
    advancedFilter: view.advancedFilter ?? false,
    advancedFilterGroup,
    labels: view.labels.length > 0 ? view.labels.join(',') : undefined,
    labelOperator:
      view.labels.length > 0
        ? (view.labelOperator ?? (view.labels.length > 1 ? 'includeAll' : 'includeAny'))
        : undefined,
  };

  function patchFilters(next: IssueSearch) {
    if (next.dateRange === 'custom') {
      setView({ ...view, dateField: next.dateField ?? '', dateRange: 'custom' });
      return Promise.resolve(view);
    }
    return save({
      status: next.status ?? '',
      statuses: next.statuses ?? [],
      assignee: next.assignee ?? '',
      subscriber: next.subscribers ?? '',
      project: next.project ?? '',
      cycle: next.cycle ?? 0,
      priority: next.priorities?.length ? -1 : (next.priority ?? -1),
      priorities: next.priorities ?? [],
      type: next.type ?? '',
      estimate: next.estimates?.length || next.noEstimate ? -1 : (next.estimate ?? -1),
      estimates: next.estimates ?? [],
      noEstimate: next.noEstimate ?? false,
      dueDate: next.dueDate ?? '',
      relation: next.relation ?? '',
      linkSources: next.linkSources ?? [],
      templateSlugs: next.templateSlugs ?? [],
      content: next.content ?? '',
      milestoneName: next.milestoneName ?? '',
      dateField: next.dateField ?? '',
      dateRange: next.dateRange ?? '',
      projectStatus: next.projectStatus ?? '',
      projectPriority: next.projectPriority ?? -1,
      projectLabels: next.projectLabels ?? [],
      addedToCycle: next.addedToCycle ?? [],
      advancedFilter: next.advancedFilter ?? false,
      advancedFilterGroup: next.advancedFilterGroup ?? {
        kind: 'group',
        operator: 'and',
        children: [],
      },
      labels: next.labels ? next.labels.split(',').filter(Boolean) : [],
      labelOperator: next.labels ? (next.labelOperator ?? 'includeAll') : 'includeAny',
    });
  }

  return {
    _view: 0 as const,
    slug,
    data,
    issues,
    view,
    selected,
    restoreScrollTop,
    detailsOpen,
    search,
    find,
    groupBy,
    orderBy,
    subGroupBy: (view.subGroupBy || 'none') as IssueGroupBy,
    direction: view.direction || 'asc',
    completedIssues: (view.completedIssues || 'all') as CompletedIssuesFilter,
    showSubIssues: view.showSubIssues ?? true,
    nestedSubIssues: (view.nestedSubIssues === 'showAll' ? 'showAll' : 'showMatching') as
      | 'showMatching'
      | 'showAll',
    showEmptyGroups: view.showEmptyGroups ?? false,
    displayProperties: (view.displayProperties as IssueDisplayProperty[] | undefined) ?? [
      ...DEFAULT_DISPLAY_PROPERTIES,
    ],
    handlers: {
      onClick0: () => {
        if (!window.confirm(i18n.t('ui.deleteViewConfirmation', { name: view.name }))) {
          return;
        }
        return api.deleteView(slug).then(async () => {
          await router.invalidate();
          await navigate({ to: '/issues', search: {} });
        });
      },
      View_name_onChange1: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setView({ ...view, name: e.target.value }),
      View_name_onBlur2: () => save({ name: view.name }),
      onToggleFavorite: async () => {
        await save({ isFavorite: !view.isFavorite });
        signals.dispatchEvent(new Event('kotowari:refresh'));
      },
      onSelect11: (
        ...args: Parameters<NonNullable<React.ComponentProps<typeof IssueList>['onSelect']>>
      ) => {
        const handle: NonNullable<React.ComponentProps<typeof IssueList>['onSelect']> = setSelected;
        setDetailsOpen(true);
        return handle(...args);
      },
      onDetailsToggle26: () => setDetailsOpen((current) => !current),
      onFilterChange12: (next: IssueSearch) => patchFilters(next),
      onAdvancedFilterToggle13: (enabled: boolean) =>
        patchFilters({ ...search, advancedFilter: enabled }),
      onAdvancedFilterChange14: (group: NonNullable<IssueSearch['advancedFilterGroup']>) =>
        patchFilters({ ...search, advancedFilter: true, advancedFilterGroup: group }),
      onFind13: (query: string) => setFind(query),
      onGroupBy14: (next: IssueGroupBy) => {
        setGroupBy(next);
        return save({ groupBy: next });
      },
      onLayout15: (next: IssueLayout) => save({ display: next }),
      onOrderBy16: (next: IssueOrderBy) => {
        setOrderBy(next);
        return save({ orderBy: next });
      },
      onSubGroupBy19: (next: IssueGroupBy) => save({ subGroupBy: next }),
      onDirection20: (next: 'asc' | 'desc') => save({ direction: next }),
      onCompletedIssues21: (next: CompletedIssuesFilter) => save({ completedIssues: next }),
      onShowSubIssues22: (next: boolean) => save({ showSubIssues: next }),
      onNestedSubIssues23: (next: 'showMatching' | 'showAll') => save({ nestedSubIssues: next }),
      onShowEmptyGroups24: (next: boolean) => save({ showEmptyGroups: next }),
      onDisplayPropertyToggle25: (property: IssueDisplayProperty) => {
        const displayProperties = (view.displayProperties as
          | IssueDisplayProperty[]
          | undefined) ?? [...DEFAULT_DISPLAY_PROPERTIES];
        return save({
          displayProperties: displayProperties.includes(property)
            ? displayProperties.filter((item) => item !== property)
            : [...displayProperties, property],
        });
      },
      onBoardOpen17: (id: string, state: IssueNavigationState) =>
        navigate({ to: '/issues/$identifier', params: { identifier: id }, state }),
      onBoardMove18: async (id: string, status: string, sortOrder: number) => {
        const issue = await api.issue(id);
        const patch = autoAssignOnStartedTransition(
          issue,
          { status, sortOrder },
          issueWorkflowStatuses,
          preferences.autoAssignOnStart,
        );
        await patchIssueOptimistically(id, patch);
        await router.invalidate();
      },
    },
  };
}
