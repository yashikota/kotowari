import {
  useLoaderData,
  useNavigate,
  useRouter,
  useRouterState,
  useSearch,
} from '@tanstack/react-router';
import type * as React from 'react';
import { useMemo, useState } from 'react';
import { api } from '../api.ts';
import type { IssueSearch } from '../issue-search.ts';
import { patchIssueOptimistically } from '../application/issues.ts';
import { useIntent, useKeyboard } from '../application/Root.tsx';
import { signals } from '../application/mediator.ts';

import { cycleCalendarICS, cycleGoogleCalendarURL, cycleIssuesCSV } from '../cycle-export.ts';
import { IssueList } from '../components/IssueList.tsx';
import type { IssueNavigationState } from '../focus.ts';
import {
  DEFAULT_DISPLAY_PROPERTIES,
  filterCompletedIssues,
  includeNestedIssueMatches,
  issueGroupOptions,
  type CompletedIssuesFilter,
  type IssueDisplayProperty,
  type IssueGroupBy,
  type IssueLayout,
  type IssueOrderBy,
} from '../issue-list.ts';

import { actionFromKeyboard, isTypingTarget } from '../keymap.ts';

import type { Activity, Cycle, Issue, Initiative, Label, Page, Project } from '../types.ts';

import { useIssueWorkflow } from '../workflow.tsx';
import { usePersonalPreferences } from '../preferences.ts';
import { autoAssignOnStartedTransition } from '../application/issue-assignment.ts';

import { cycleCalendarFeedURL, cycleIssueGroupLabel, cycleURL } from './projectCycleHelpers.ts';
import { useCycleProgressPresenter } from './useCycleProgressPresenter.ts';
import { useCycleResourcesPresenter } from './useCycleResourcesPresenter.ts';

export function useCycleDetailPagePresenter() {
  const sendIntent = useIntent();
  const search = useSearch({ from: '/cycles/$number' }) as IssueSearch;
  const locationState = useRouterState({ select: (state) => state.location.state });
  const data = useLoaderData({ from: '/cycles/$number' }) as {
    cycle: Cycle;
    issues: Issue[];
    cycleIssues: Issue[];
    activities: Activity[];
    pages: Page[];
    projects: Project[];
    cycles: Cycle[];
    labels: Label[];
    linkSources: import('../types.ts').IssueLinkSource[];
    templateOptions: import('../types.ts').IssueTemplateFilterOption[];
    initiatives: Initiative[];
  };
  const router = useRouter();
  const { statuses: issueWorkflowStatuses } = useIssueWorkflow();
  const { preferences } = usePersonalPreferences();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(
    locationState.issueListSelectedId ?? null,
  );
  const [cycle, setCycle] = useState(data.cycle);
  const [cycleDetailsOpen, setCycleDetailsOpen] = useState(true);
  const cycleProgress = useCycleProgressPresenter({
    cycle,
    issues: data.cycleIssues,
    activities: data.activities,
    projects: data.projects,
  });
  const googleCalendarURL = cycleGoogleCalendarURL(cycle, cycleURL(cycle.number));
  const [groupBy, setGroupBy] = useState<IssueGroupBy>('status');
  const [layout, setLayout] = useState<IssueLayout>(locationState.issueListLayout ?? 'list');
  const [orderBy, setOrderBy] = useState<IssueOrderBy>('priority');
  const [subGroupBy, setSubGroupBy] = useState<IssueGroupBy>('none');
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc');
  const [completedIssues, setCompletedIssues] = useState<CompletedIssuesFilter>('all');
  const completedByRecency = search.completedByRecency ?? false;
  const groupOrder = search.groupOrder ?? [];
  const hiddenGroups = search.hiddenGroups ?? [];
  const [showSubIssues, setShowSubIssues] = useState(true);
  const [nestedSubIssues, setNestedSubIssues] = useState<'showMatching' | 'showAll'>(
    'showMatching',
  );
  const [showEmptyGroups, setShowEmptyGroups] = useState(false);
  const [displayProperties, setDisplayProperties] = useState<IssueDisplayProperty[]>([
    ...DEFAULT_DISPLAY_PROPERTIES,
  ]);
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [cycleLinkCopied, setCycleLinkCopied] = useState(false);
  const [calendarFeedCopied, setCalendarFeedCopied] = useState(false);
  const [nameDraft, setNameDraft] = useState(cycle.name ?? `Cycle ${cycle.number}`);
  const [descriptionDraft, setDescriptionDraft] = useState(cycle.description ?? '');
  const [startDateDraft, setStartDateDraft] = useState(cycle.startsAt.slice(0, 10));
  const [endDateDraft, setEndDateDraft] = useState(cycle.endsAt.slice(0, 10));

  const cycleNavigationOptions = useMemo(() => {
    const otherCycles = data.cycles.filter((candidate) => candidate.number !== cycle.number);
    const next = otherCycles
      .filter((candidate) => candidate.status === 'upcoming' && candidate.number > cycle.number)
      .sort((a, b) => a.number - b.number);
    const previous = otherCycles
      .filter((candidate) => candidate.status === 'completed' && candidate.number < cycle.number)
      .sort((a, b) => b.number - a.number);
    return {
      next: next.slice(0, 1),
      previous: previous.slice(0, 1),
    };
  }, [cycle.number, data.cycles]);

  function navigateToCycle(number: number) {
    void navigate({ to: '/cycles/$number', params: { number: String(number) } });
  }

  useKeyboard((event) => {
    if (actionFromKeyboard(event) === 'toggle-right-sidebar') {
      event.preventDefault();
      setCycleDetailsOpen((open) => !open);
      return true;
    }
    if (
      !event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.repeat ||
      isTypingTarget(event.target)
    )
      return false;

    const key = event.key.toLowerCase();
    if (key === 'k' && cycleNavigationOptions.next[0]) {
      event.preventDefault();
      navigateToCycle(cycleNavigationOptions.next[0].number);
      return true;
    }
    if (key === 'j' && cycleNavigationOptions.previous[0]) {
      event.preventDefault();
      navigateToCycle(cycleNavigationOptions.previous[0].number);
      return true;
    }
    return false;
  }, true);

  if (cycle.number !== data.cycle.number) {
    setCycle(data.cycle);
    setSelected(null);
  }

  const matchingIssues = search.cycle != null && search.cycle !== cycle.number ? [] : data.issues;
  const issues = filterCompletedIssues(
    includeNestedIssueMatches(matchingIssues, data.issues, nestedSubIssues),
    completedIssues,
    data.cycles,
  ).filter(cycleProgress.includesIssue);
  const groupOptions = useMemo(
    () =>
      issueGroupOptions(
        issues,
        groupBy,
        issueWorkflowStatuses,
        showEmptyGroups,
        data.cycles.find((candidate) => candidate.status === 'active')?.id,
      ).map((group) => ({
        ...group,
        label: cycleIssueGroupLabel(groupBy, group, issueWorkflowStatuses),
      })),
    [data.cycles, groupBy, issueWorkflowStatuses, issues, showEmptyGroups],
  );
  const selectedId =
    selected && issues.some((issue) => issue.identifier === selected) ? selected : null;

  async function save(body: Record<string, unknown>) {
    const next = await api.patchCycle(cycle.number, body);
    setCycle(next);
    await router.invalidate();
    signals.dispatchEvent(new Event('kotowari:refresh'));
  }

  async function refreshCycle() {
    const next = await api.cycle(cycle.number);
    setCycle(next);
    await router.invalidate();
    signals.dispatchEvent(new Event('kotowari:refresh'));
  }

  const cycleResources = useCycleResourcesPresenter({
    cycle,
    pages: data.pages,
    refreshCycle,
    navigateToPage: (slug) => navigate({ to: '/pages/$slug', params: { slug } }),
  });

  function dateAtUTCStart(value: string) {
    return `${value}T00:00:00Z`;
  }

  function localDateToday() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function exportIssues() {
    const content = `\uFEFF${cycleIssuesCSV(data.cycleIssues, {
      cycle,
      cycles: data.cycles,
      projects: data.projects,
      initiatives: data.initiatives,
    })}`;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `cycle-${cycle.number}-issues.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function exportCalendar() {
    const content = cycleCalendarICS(cycle, window.location.href);
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `cycle-${cycle.number}.ics`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function copyCycleLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCycleLinkCopied(true);
      window.setTimeout(() => setCycleLinkCopied(false), 1200);
    } catch {
      // Clipboard permission can be unavailable in an embedded or non-secure context.
    }
  }

  async function copyCycleCalendarFeed() {
    try {
      await navigator.clipboard.writeText(cycleCalendarFeedURL(cycle.number));
      setCalendarFeedCopied(true);
      window.setTimeout(() => setCalendarFeedCopied(false), 1600);
    } catch {
      // Clipboard permission can be unavailable in an embedded or non-secure context.
    }
  }

  return {
    _view: 0 as const,
    data,
    issues,
    search,
    selected: selectedId,
    cycle,
    cycleDetailsOpen,
    cycleProgressOpen: cycleProgress.expanded,
    googleCalendarURL,
    resources: cycleResources.resources,
    progressTimeline: cycleProgress.progressTimeline,
    activeProgressPoint: cycleProgress.activeProgressPoint,
    breakdownBy: cycleProgress.breakdownBy,
    breakdownItems: cycleProgress.breakdownItems,
    activeBreakdownFilterKey: cycleProgress.activeBreakdownFilterKey,
    scope: cycleProgress.scope,
    started: cycleProgress.started,
    startedPercent: cycleProgress.startedPercent,
    done: cycleProgress.done,
    completionPercent: cycleProgress.completionPercent,
    groupBy,
    layout,
    orderBy,
    subGroupBy,
    direction,
    completedIssues,
    completedByRecency,
    groupOptions,
    groupOrder,
    hiddenGroups,
    showSubIssues,
    nestedSubIssues,
    showEmptyGroups,
    displayProperties,
    metadataOpen,
    datesOpen,
    resourceLinkOpen: cycleResources.resourceLinkOpen,
    resourceURL: cycleResources.resourceURL,
    resourceTitle: cycleResources.resourceTitle,
    resourceError: cycleResources.resourceError,
    cycleLinkCopied,
    calendarFeedCopied,
    nameDraft,
    descriptionDraft,
    startDateDraft,
    endDateDraft,
    datesValid: !!startDateDraft && !!endDateDraft && endDateDraft > startDateDraft,
    handlers: {
      onStatusChange: (status: Cycle['status']) => save({ status }),
      onStartDatePickerChange: async (value: string) => {
        if (cycle.status !== 'upcoming' || value >= cycle.endsAt.slice(0, 10)) return;
        await save({ startsAt: dateAtUTCStart(value) });
      },
      onEndDatePickerChange: async (value: string) => {
        if (cycle.status === 'completed' || value <= cycle.startsAt.slice(0, 10)) return;
        await save({ endsAt: dateAtUTCStart(value) });
      },
      onCreateCycleIssue: () => sendIntent('issue.create', { cycleId: cycle.id }),
      onToggleCycleDetails: () => setCycleDetailsOpen((open) => !open),
      onToggleCycleProgress: cycleProgress.onToggleExpanded,
      onCycleBreakdownChange: cycleProgress.onBreakdownChange,
      onCycleBreakdownFilterToggle: cycleProgress.onBreakdownFilterToggle,
      onProgressPointerMove: cycleProgress.onProgressPointerMove,
      onProgressPointerLeave: cycleProgress.onProgressPointerLeave,
      onProgressFocus: cycleProgress.onProgressFocus,
      onProgressBlur: cycleProgress.onProgressBlur,
      onProgressKeyDown: cycleProgress.onProgressKeyDown,
      onFilterChange: (next: IssueSearch) =>
        navigate({
          to: '/cycles/$number',
          params: { number: String(cycle.number) },
          search: next,
        }),
      onGroupBy: (next: IssueGroupBy) => setGroupBy(next),
      onLayout: (next: IssueLayout) => setLayout(next),
      onOrderBy: (next: IssueOrderBy) => setOrderBy(next),
      onSubGroupBy: (next: IssueGroupBy) => setSubGroupBy(next),
      onDirection: (next: 'asc' | 'desc') => setDirection(next),
      onCompletedIssues: (next: CompletedIssuesFilter) => setCompletedIssues(next),
      onCompletedByRecencyChange: (show: boolean) =>
        navigate({
          to: '/cycles/$number',
          params: { number: String(cycle.number) },
          search: { ...search, completedByRecency: show ? true : undefined },
          replace: true,
        }),
      onGroupOrderChange: (next: string[]) =>
        navigate({
          to: '/cycles/$number',
          params: { number: String(cycle.number) },
          search: { ...search, groupOrder: next.length ? next : undefined },
          replace: true,
        }),
      onGroupVisibilityChange: (key: string, visible: boolean) => {
        const next = new Set(hiddenGroups);
        if (visible) next.delete(key);
        else next.add(key);
        return navigate({
          to: '/cycles/$number',
          params: { number: String(cycle.number) },
          search: { ...search, hiddenGroups: next.size ? [...next] : undefined },
          replace: true,
        });
      },
      onShowSubIssues: (next: boolean) => setShowSubIssues(next),
      onNestedSubIssues: (next: 'showMatching' | 'showAll') => setNestedSubIssues(next),
      onShowEmptyGroups: (next: boolean) => setShowEmptyGroups(next),
      onDisplayPropertyToggle: (property: IssueDisplayProperty) =>
        setDisplayProperties((current) =>
          current.includes(property)
            ? current.filter((item) => item !== property)
            : [...current, property],
        ),
      onBoardOpen: (identifier: string, state: IssueNavigationState) =>
        navigate({ to: '/issues/$identifier', params: { identifier }, state }),
      onBoardMove: async (identifier: string, status: string, sortOrder: number) => {
        const issue = await api.issue(identifier);
        const patch = autoAssignOnStartedTransition(
          issue,
          { workflowStatus: status, sortOrder },
          issueWorkflowStatuses,
          preferences.autoAssignOnStart,
        );
        await patchIssueOptimistically(identifier, patch);
        await router.invalidate();
        signals.dispatchEvent(new Event('kotowari:refresh'));
      },
      onOpenMetadata: () => {
        setNameDraft(cycle.name ?? `Cycle ${cycle.number}`);
        setDescriptionDraft(cycle.description ?? '');
        setMetadataOpen(true);
      },
      onCloseMetadata: () => setMetadataOpen(false),
      onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => setNameDraft(e.target.value),
      onDescriptionChange: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
        setDescriptionDraft(e.target.value),
      onSaveMetadata: async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        await save({ name: nameDraft.trim(), description: descriptionDraft });
        setMetadataOpen(false);
      },
      onOpenDates: () => {
        setStartDateDraft(cycle.startsAt.slice(0, 10));
        setEndDateDraft(cycle.endsAt.slice(0, 10));
        setDatesOpen(true);
      },
      onCloseDates: () => setDatesOpen(false),
      onStartDateChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setStartDateDraft(e.target.value),
      onEndDateChange: (e: React.ChangeEvent<HTMLInputElement>) => setEndDateDraft(e.target.value),
      onSaveDates: async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!startDateDraft || !endDateDraft || endDateDraft <= startDateDraft) return;
        await save({
          startsAt: dateAtUTCStart(startDateDraft),
          endsAt: dateAtUTCStart(endDateDraft),
        });
        setDatesOpen(false);
      },
      onToggleFavorite: () => save({ isFavorite: !cycle.isFavorite }),
      onToggleCycleArchived: async () => {
        const archived = !cycle.archivedAt;
        await save({ archived });
        await navigate({ to: '/cycles', search: { scope: archived ? 'archived' : 'all' } });
      },
      onToggleIssueAddedNotifications: () =>
        save({ notifyOnIssueAdded: !cycle.notifyOnIssueAdded }),
      onToggleIssueCompletedNotifications: () =>
        save({ notifyOnIssueCompleted: !cycle.notifyOnIssueCompleted }),
      onStartCycleToday: () =>
        save({ startsAt: dateAtUTCStart(localDateToday()), status: 'active' }),
      onExportIssues: exportIssues,
      onExportCalendar: exportCalendar,
      onCopyCalendarFeed: copyCycleCalendarFeed,
      onCopyLink: copyCycleLink,
      onCreateDocument: cycleResources.onCreateDocument,
      onOpenResourceLink: cycleResources.onOpenResourceLink,
      onCloseResourceLink: cycleResources.onCloseResourceLink,
      onResourceURLChange: cycleResources.onResourceURLChange,
      onResourceTitleChange: cycleResources.onResourceTitleChange,
      onAddResourceLink: cycleResources.onAddResourceLink,
      onRemoveResource: cycleResources.onRemoveResource,
      onSelectCycleIssue: (
        ...args: Parameters<NonNullable<React.ComponentProps<typeof IssueList>['onSelect']>>
      ) => {
        const handle: NonNullable<React.ComponentProps<typeof IssueList>['onSelect']> = setSelected;
        return handle(...args);
      },
    },
  };
}
