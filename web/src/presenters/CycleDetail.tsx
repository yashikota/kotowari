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
import i18n from '../i18n/index.ts';

import { cycleCalendarICS, cycleGoogleCalendarURL, cycleIssuesCSV } from '../cycle-export.ts';
import {
  cycleProgressBreakdown,
  type CycleProgressBreakdownBy,
  matchesCycleProgressBreakdown,
  cycleProgressPointIndexAtRatio,
  cycleProgressTimeline,
} from '../cycle-progress.ts';
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

import {
  cycleCalendarFeedURL,
  cycleIssueGroupLabel,
  cycleURL,
  readCycleProgressOpen,
  writeCycleProgressOpen,
} from './projectCycleHelpers.ts';

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
  const [cycleProgressOpen, setCycleProgressOpen] = useState(readCycleProgressOpen);
  const [breakdownBy, setBreakdownBy] = useState<CycleProgressBreakdownBy>('assignee');
  const [activeBreakdownFilterKey, setActiveBreakdownFilterKey] = useState<string | null>(null);
  const [activeProgressIndex, setActiveProgressIndex] = useState<number | null>(null);
  const googleCalendarURL = cycleGoogleCalendarURL(cycle, cycleURL(cycle.number));
  const progressTimeline = cycleProgressTimeline(cycle, data.cycleIssues, data.activities);
  const breakdownItems = cycleProgressBreakdown(data.cycleIssues, breakdownBy, data.projects);
  const asOf = Math.min(Date.parse(cycle.endsAt), Math.max(Date.parse(cycle.startsAt), Date.now()));
  const currentProgressIndex = progressTimeline.reduce(
    (index, point, pointIndex) => (Date.parse(point.at) <= asOf ? pointIndex : index),
    0,
  );
  const activeProgressPoint =
    activeProgressIndex == null ? null : (progressTimeline[activeProgressIndex] ?? null);
  const progress = progressTimeline.reduce(
    (current, point) => (Date.parse(point.at) <= asOf ? point : current),
    progressTimeline[0] ?? { at: cycle.startsAt, scope: 0, started: 0, completed: 0 },
  );
  const scope = progress.scope;
  const started = progress.started;
  const done = progress.completed;
  const startedPercent = scope ? Math.round((started / scope) * 100) : 0;
  const completionPercent = scope ? Math.round((done / scope) * 100) : 0;
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
  const [resourceLinkOpen, setResourceLinkOpen] = useState(false);
  const [resourceURL, setResourceURL] = useState('');
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceError, setResourceError] = useState('');
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
  ).filter(
    (issue) =>
      activeBreakdownFilterKey == null ||
      matchesCycleProgressBreakdown(issue, breakdownBy, activeBreakdownFilterKey),
  );
  const groupOptions = useMemo(
    () =>
      issueGroupOptions(issues, groupBy, issueWorkflowStatuses, showEmptyGroups).map((group) => ({
        ...group,
        label: cycleIssueGroupLabel(groupBy, group, issueWorkflowStatuses),
      })),
    [groupBy, issueWorkflowStatuses, issues, showEmptyGroups],
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

  function pageSlugForResource(url: string): string | null {
    try {
      const parsed = new URL(url);
      const marker = '/pages/';
      const markerIndex = parsed.pathname.lastIndexOf(marker);
      if (parsed.origin !== window.location.origin || markerIndex < 0) return null;
      const candidate = parsed.pathname.slice(markerIndex + marker.length);
      return candidate && !candidate.includes('/') ? decodeURIComponent(candidate) : null;
    } catch {
      return null;
    }
  }

  const resources = (cycle.resources ?? []).map((resource) => {
    const pageSlug = pageSlugForResource(resource.url);
    const page = pageSlug ? data.pages.find((item) => item.slug === pageSlug) : undefined;
    return {
      ...resource,
      pageSlug,
      displayTitle: page?.title || resource.title || resource.url,
    };
  });

  async function createCycleDocument() {
    const title = i18n.t('issueActions.newDocumentTitle');
    const page = await api.createPage({ title, slug: `document-${Date.now()}` });
    const href = new URL(
      `${import.meta.env.BASE_URL}pages/${encodeURIComponent(page.slug)}`,
      window.location.origin,
    ).toString();
    await api.addCycleResource(cycle.number, { url: href, title, kind: 'document' });
    await refreshCycle();
    await navigate({ to: '/pages/$slug', params: { slug: page.slug } });
  }

  function openResourceLink() {
    setResourceURL('');
    setResourceTitle('');
    setResourceError('');
    setResourceLinkOpen(true);
  }

  async function addResourceLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await api.addCycleResource(cycle.number, {
        url: resourceURL.trim(),
        title: resourceTitle.trim() || undefined,
      });
      setResourceLinkOpen(false);
      await refreshCycle();
    } catch {
      setResourceError(i18n.t('cycle.resourceAddFailed'));
    }
  }

  async function removeResource(resourceId: number) {
    await api.removeCycleResource(cycle.number, resourceId);
    await refreshCycle();
  }

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
    cycleProgressOpen,
    googleCalendarURL,
    resources,
    progressTimeline,
    activeProgressPoint,
    breakdownBy,
    breakdownItems,
    activeBreakdownFilterKey,
    scope,
    started,
    startedPercent,
    done,
    completionPercent,
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
    resourceLinkOpen,
    resourceURL,
    resourceTitle,
    resourceError,
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
      onClick1: () => sendIntent('issue.create', { cycleId: cycle.id }),
      onToggleCycleDetails: () => setCycleDetailsOpen((open) => !open),
      onToggleCycleProgress: () =>
        setCycleProgressOpen((open) => {
          const next = !open;
          writeCycleProgressOpen(next);
          return next;
        }),
      onCycleBreakdownChange: (by: CycleProgressBreakdownBy) => {
        setBreakdownBy(by);
        setActiveBreakdownFilterKey(null);
      },
      onCycleBreakdownFilterToggle: (key: string) =>
        setActiveBreakdownFilterKey((current) => (current === key ? null : key)),
      onProgressPointerMove: (ratio: number) =>
        setActiveProgressIndex(cycleProgressPointIndexAtRatio(progressTimeline, ratio)),
      onProgressPointerLeave: () => setActiveProgressIndex(null),
      onProgressFocus: () => setActiveProgressIndex((current) => current ?? currentProgressIndex),
      onProgressBlur: () => setActiveProgressIndex(null),
      onProgressKeyDown: (event: React.KeyboardEvent<SVGSVGElement>) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          setActiveProgressIndex(null);
          return;
        }
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        setActiveProgressIndex((current) => {
          const lastIndex = progressTimeline.length - 1;
          const index = current ?? currentProgressIndex;
          if (event.key === 'Home') return 0;
          if (event.key === 'End') return Math.max(0, lastIndex);
          return Math.min(lastIndex, Math.max(0, index + (event.key === 'ArrowRight' ? 1 : -1)));
        });
      },
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
      onCreateDocument: createCycleDocument,
      onOpenResourceLink: openResourceLink,
      onCloseResourceLink: () => setResourceLinkOpen(false),
      onResourceURLChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setResourceURL(e.target.value),
      onResourceTitleChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setResourceTitle(e.target.value),
      onAddResourceLink: addResourceLink,
      onRemoveResource: (resourceId: number) => removeResource(resourceId),
      onSelect2: (
        ...args: Parameters<NonNullable<React.ComponentProps<typeof IssueList>['onSelect']>>
      ) => {
        const handle: NonNullable<React.ComponentProps<typeof IssueList>['onSelect']> = setSelected;
        return handle(...args);
      },
    },
  };
}
