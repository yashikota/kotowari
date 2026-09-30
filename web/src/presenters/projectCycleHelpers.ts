import i18n from '../i18n/index.ts';

import { type IssueGroupBy, type IssueGroupOption } from '../issue-list.ts';

import { issueTypeLabel, priorityLabel } from '../i18n/labels.ts';
import type { IssueType, IssueWorkflowStatus } from '../types.ts';

import { workflowStatusLabel } from '../workflow.tsx';

const CYCLE_PROGRESS_OPEN_KEY = 'kotowari.cycle-progress-open.v1';

export function readCycleProgressOpen(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(CYCLE_PROGRESS_OPEN_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function writeCycleProgressOpen(open: boolean) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CYCLE_PROGRESS_OPEN_KEY, String(open));
  } catch {
    // Keep the view usable when browser storage is unavailable.
  }
}

export function cycleIssueGroupLabel(
  groupBy: IssueGroupBy,
  group: IssueGroupOption,
  statuses: IssueWorkflowStatus[],
): string {
  if (groupBy === 'status' && group.status) return workflowStatusLabel(group.status, statuses);
  if (groupBy === 'priority') return priorityLabel(group.priority ?? 0);
  if (groupBy === 'assignee')
    return i18n.t(
      group.key === 'assignee:self'
        ? 'issueAssignment.you'
        : group.key === 'assignee:agent'
          ? 'issueAssignment.agent'
          : 'issueAssignment.unassigned',
    );
  if (groupBy === 'agent')
    return i18n.t(
      group.key === 'agent:agent' ? 'issueAssignment.agent' : 'issueAssignment.noAgent',
    );
  if (groupBy === 'focus')
    return i18n.t(
      group.key === 'focus:current'
        ? 'displayOptions.focusGroup.currentCycle'
        : group.key === 'focus:backlog'
          ? 'displayOptions.focusGroup.backlog'
          : 'displayOptions.focusGroup.otherCycles',
    );
  if (groupBy === 'type')
    return group.label
      ? issueTypeLabel(group.label as IssueType)
      : i18n.t('issueProperties.noType');
  if (groupBy === 'estimate') return group.label || i18n.t('issueProperties.noEstimate');
  if (groupBy === 'project' && group.label === 'No project')
    return i18n.t('issueProperties.noProject');
  if (groupBy === 'cycle') {
    if (group.label === 'No cycle') return i18n.t('field.noCycle');
    if (group.label.startsWith('Cycle '))
      return i18n.t('field.cycleN', { number: group.label.slice(6) });
  }
  if (groupBy === 'label' && group.label === 'No label') return i18n.t('issueProperties.noLabels');
  if (groupBy === 'parent' && group.label === 'No parent')
    return i18n.t('issueProperties.noParent');
  return group.label;
}

export function cycleURL(number: number) {
  return new URL(`${import.meta.env.BASE_URL}cycles/${number}`, window.location.origin).toString();
}

export function cycleCalendarFeedURL(number: number) {
  return new URL(
    `${import.meta.env.BASE_URL}api/cycles/${number}/calendar.ics`,
    window.location.origin,
  ).toString();
}
