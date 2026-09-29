import { useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
  cycleProgressBreakdown,
  cycleProgressPointIndexAtRatio,
  cycleProgressTimeline,
  matchesCycleProgressBreakdown,
  type CycleProgressBreakdownBy,
} from '../cycle-progress.ts';
import type { Activity, Cycle, Issue, Project } from '../types.ts';
import { readCycleProgressOpen, writeCycleProgressOpen } from './projectCycleHelpers.ts';

export function useCycleProgressPresenter({
  cycle,
  issues,
  activities,
  projects,
}: {
  cycle: Cycle;
  issues: Issue[];
  activities: Activity[];
  projects: Project[];
}) {
  const [expanded, setExpanded] = useState(readCycleProgressOpen);
  const [breakdownBy, setBreakdownBy] = useState<CycleProgressBreakdownBy>('assignee');
  const [activeBreakdownFilterKey, setActiveBreakdownFilterKey] = useState<string | null>(null);
  const [activeProgressIndex, setActiveProgressIndex] = useState<number | null>(null);
  const progressTimeline = useMemo(
    () => cycleProgressTimeline(cycle, issues, activities),
    [activities, cycle, issues],
  );
  const breakdownItems = useMemo(
    () => cycleProgressBreakdown(issues, breakdownBy, projects),
    [breakdownBy, issues, projects],
  );
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

  return {
    expanded,
    breakdownBy,
    activeBreakdownFilterKey,
    progressTimeline,
    activeProgressPoint,
    breakdownItems,
    scope,
    started: progress.started,
    startedPercent: scope ? Math.round((progress.started / scope) * 100) : 0,
    done: progress.completed,
    completionPercent: scope ? Math.round((progress.completed / scope) * 100) : 0,
    includesIssue: (issue: Issue) =>
      activeBreakdownFilterKey == null ||
      matchesCycleProgressBreakdown(issue, breakdownBy, activeBreakdownFilterKey),
    onToggleExpanded: () =>
      setExpanded((current) => {
        const next = !current;
        writeCycleProgressOpen(next);
        return next;
      }),
    onBreakdownChange: (by: CycleProgressBreakdownBy) => {
      setBreakdownBy(by);
      setActiveBreakdownFilterKey(null);
    },
    onBreakdownFilterToggle: (key: string) =>
      setActiveBreakdownFilterKey((current) => (current === key ? null : key)),
    onProgressPointerMove: (ratio: number) =>
      setActiveProgressIndex(cycleProgressPointIndexAtRatio(progressTimeline, ratio)),
    onProgressPointerLeave: () => setActiveProgressIndex(null),
    onProgressFocus: () => setActiveProgressIndex((current) => current ?? currentProgressIndex),
    onProgressBlur: () => setActiveProgressIndex(null),
    onProgressKeyDown: (event: KeyboardEvent<SVGSVGElement>) => {
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
  };
}
