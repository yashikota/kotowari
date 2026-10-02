import { useLoaderData, useNavigate, useRouter, useSearch } from '@tanstack/react-router';
import type * as React from 'react';
import { useRef, useState } from 'react';
import { api } from '../api.ts';

import { signals } from '../application/mediator.ts';

import { nextCycleRange } from '../cycle-schedule.ts';
import { cycleCalendarICS, cycleGoogleCalendarURL } from '../cycle-export.ts';
import { cycleProgressTimeline } from '../cycle-progress.ts';

import type { Activity, Cycle, Issue, Workspace } from '../types.ts';

import { cycleCalendarFeedURL, cycleURL } from './projectCycleHelpers.ts';

export function useCyclesPagePresenter() {
  const [cycleCreating, setCycleCreating] = useState(false);
  const creating = useRef(false);
  const data = useLoaderData({ from: '/cycles' }) as {
    cycles: Cycle[];
    issues: Issue[];
    activeCycleActivities: Activity[];
    workspace: Workspace;
  };
  const { scope } = useSearch({ from: '/cycles' });
  const router = useRouter();
  const [copiedCycleNumber, setCopiedCycleNumber] = useState<number | null>(null);
  const [calendarFeedCopiedCycleNumber, setCalendarFeedCopiedCycleNumber] = useState<number | null>(
    null,
  );
  const [metadataCycle, setMetadataCycle] = useState<Cycle | null>(null);
  const [datesCycle, setDatesCycle] = useState<Cycle | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [startDateDraft, setStartDateDraft] = useState('');
  const [endDateDraft, setEndDateDraft] = useState('');
  const scopedCycles =
    scope === 'current'
      ? data.cycles.filter((cycle) => cycle.status === 'active')
      : scope === 'upcoming'
        ? data.cycles.filter((cycle) => cycle.status === 'upcoming')
        : data.cycles;
  const navigate = useNavigate();

  async function updateCycle(number: number, body: Record<string, unknown>) {
    await api.patchCycle(number, body);
    await router.invalidate();
    signals.dispatchEvent(new Event('kotowari:refresh'));
  }

  function openCycleMetadata(cycle: Cycle) {
    setNameDraft(cycle.name || `Cycle ${cycle.number}`);
    setDescriptionDraft(cycle.description ?? '');
    setMetadataCycle(cycle);
  }

  function openCycleDates(cycle: Cycle) {
    setStartDateDraft(cycle.startsAt.slice(0, 10));
    setEndDateDraft(cycle.endsAt.slice(0, 10));
    setDatesCycle(cycle);
  }

  async function saveCycleMetadata(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!metadataCycle || !nameDraft.trim()) return;
    await updateCycle(metadataCycle.number, {
      name: nameDraft.trim(),
      description: descriptionDraft,
    });
    setMetadataCycle(null);
  }

  async function saveCycleDates(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!datesCycle || !startDateDraft || !endDateDraft || endDateDraft <= startDateDraft) return;
    await updateCycle(datesCycle.number, {
      startsAt: `${startDateDraft}T00:00:00Z`,
      endsAt: `${endDateDraft}T00:00:00Z`,
    });
    setDatesCycle(null);
  }

  async function copyCycleLink(number: number) {
    try {
      await navigator.clipboard.writeText(cycleURL(number));
      setCopiedCycleNumber(number);
      window.setTimeout(() => setCopiedCycleNumber(null), 1200);
    } catch {
      // Clipboard permission can be unavailable in an embedded or non-secure context.
    }
  }

  async function copyCycleCalendarFeed(number: number) {
    try {
      await navigator.clipboard.writeText(cycleCalendarFeedURL(number));
      setCalendarFeedCopiedCycleNumber(number);
      window.setTimeout(() => setCalendarFeedCopiedCycleNumber(null), 1600);
    } catch {
      // Clipboard permission can be unavailable in an embedded or non-secure context.
    }
  }

  function exportCalendar(cycle: Cycle) {
    const content = cycleCalendarICS(cycle, cycleURL(cycle.number));
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `cycle-${cycle.number}.ics`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  const cycles = [...scopedCycles]
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
    .map((cycle) => {
      const issues = data.issues.filter((issue) => issue.cycleId === cycle.id);
      const today = new Date();
      const todayValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      return {
        ...cycle,
        googleCalendarURL: cycleGoogleCalendarURL(cycle, cycleURL(cycle.number)),
        issueCount: issues.length,
        startedCount: issues.filter((issue) => issue.status === 'in_progress').length,
        completedCount: issues.filter(
          (issue) => issue.status === 'done' || issue.status === 'canceled',
        ).length,
        linkCopied: copiedCycleNumber === cycle.number,
        calendarFeedCopied: calendarFeedCopiedCycleNumber === cycle.number,
        onEdit: () => openCycleMetadata(cycle),
        onChangeDates: () => openCycleDates(cycle),
        onStartCycleToday: () =>
          updateCycle(cycle.number, { startsAt: `${todayValue}T00:00:00Z`, status: 'active' }),
        onToggleIssueAddedNotifications: () =>
          updateCycle(cycle.number, { notifyOnIssueAdded: !cycle.notifyOnIssueAdded }),
        onToggleIssueCompletedNotifications: () =>
          updateCycle(cycle.number, { notifyOnIssueCompleted: !cycle.notifyOnIssueCompleted }),
        onToggleFavorite: () => updateCycle(cycle.number, { isFavorite: !cycle.isFavorite }),
        onCopyLink: () => copyCycleLink(cycle.number),
        onExportCalendar: () => exportCalendar(cycle),
        onCopyCalendarFeed: () => copyCycleCalendarFeed(cycle.number),
      };
    });
  const activeCycle = scopedCycles.find((cycle) => cycle.status === 'active');
  const activeCycleIssues = activeCycle
    ? data.issues.filter((issue) => issue.cycleId === activeCycle.id)
    : [];
  const currentCyclePoints = activeCycle
    ? cycleProgressTimeline(activeCycle, activeCycleIssues, data.activeCycleActivities)
    : [];
  const currentProgress = currentCyclePoints.reduce(
    (current, point) => (Date.parse(point.at) <= Date.now() ? point : current),
    currentCyclePoints[0] ?? { at: '', scope: 0, started: 0, completed: 0 },
  );
  const currentCycleOverview = activeCycle
    ? {
        cycle: activeCycle,
        points: currentCyclePoints,
        scope: currentProgress.scope,
        started: currentProgress.started,
        startedPercent: currentProgress.scope
          ? Math.round((currentProgress.started / currentProgress.scope) * 100)
          : 0,
        completed: currentProgress.completed,
        completionPercent: currentProgress.scope
          ? Math.round((currentProgress.completed / currentProgress.scope) * 100)
          : 0,
      }
    : null;
  return {
    _view: 0 as const,
    cycles,
    scope,
    currentCycleOverview,
    metadataCycle,
    datesCycle,
    nameDraft,
    descriptionDraft,
    startDateDraft,
    endDateDraft,
    datesValid: !!startDateDraft && !!endDateDraft && endDateDraft > startDateDraft,
    cycleCreating,
    handlers: {
      onCloseMetadata: () => setMetadataCycle(null),
      onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => setNameDraft(e.target.value),
      onDescriptionChange: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
        setDescriptionDraft(e.target.value),
      onSaveMetadata: saveCycleMetadata,
      onCloseDates: () => setDatesCycle(null),
      onStartDateChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setStartDateDraft(e.target.value),
      onEndDateChange: (e: React.ChangeEvent<HTMLInputElement>) => setEndDateDraft(e.target.value),
      onSaveDates: saveCycleDates,
      onClick0: async () => {
        if (creating.current) return;
        creating.current = true;
        setCycleCreating(true);
        try {
          const range = nextCycleRange(data.cycles, new Date(), data.workspace.cycleSettings);
          await api.createCycle(range).then((c) =>
            navigate({
              to: '/cycles/$number',
              params: { number: String(c.number) },
            }),
          );
        } finally {
          creating.current = false;
          setCycleCreating(false);
        }
      },
      onToggleArchivedCycles: () =>
        navigate({ to: '/cycles', search: { scope: scope === 'archived' ? 'all' : 'archived' } }),
    },
  };
}
