import type { TFunction } from 'i18next';
import { issueTypeLabel, priorityLabel } from './i18n/labels.ts';
import type { IssueFilterChoices } from './issue-advanced-filter.ts';
import type { Cycle, IssueWorkflowStatus, Label, Project } from './types.ts';
import { workflowStatusLabel } from './workflow.tsx';

export function buildIssueFilterChoices({
  workflowStatuses,
  projects,
  cycles,
  labels,
  t,
}: {
  workflowStatuses: IssueWorkflowStatus[];
  projects: Project[];
  cycles: Cycle[];
  labels: Label[];
  t: TFunction;
}): IssueFilterChoices {
  return {
    status: workflowStatuses.map((status) => ({
      value: status.id,
      label: workflowStatusLabel(status.id, workflowStatuses),
    })),
    creator: [
      { value: 'self', label: t('issueAssignment.you') },
      { value: 'agent', label: t('issueAssignment.agent') },
    ],
    assignee: [
      { value: 'self', label: t('issueAssignment.you') },
      { value: 'agent', label: t('issueAssignment.agent') },
      { value: 'none', label: t('issueAssignment.unassigned') },
    ],
    priority: [0, 1, 2, 3, 4].map((priority) => ({
      value: String(priority),
      label: priorityLabel(priority),
    })),
    type: (['bug', 'feature', 'improvement', 'task'] as const).map((type) => ({
      value: type,
      label: issueTypeLabel(type),
    })),
    estimate: [
      { value: 'none', label: t('issueProperties.noEstimate') },
      ...[0, 1, 2, 3, 5, 8].map((estimate) => ({
        value: String(estimate),
        label: String(estimate),
      })),
    ],
    project: [
      { value: 'none', label: t('field.noProject') },
      ...projects.map((project) => ({
        value: project.slug || String(project.id),
        label: project.name,
      })),
    ],
    cycle: [
      { value: 'none', label: t('field.noCycle') },
      ...cycles.map((cycle) => ({
        value: String(cycle.id),
        label: cycle.name || t('field.cycleN', { number: cycle.number }),
      })),
    ],
    label: [
      { value: 'none', label: t('issueProperties.noLabels') },
      ...labels.map((label) => ({ value: label.name, label: label.name })),
    ],
    relation: [
      'parent',
      'subissue',
      'blocked',
      'blocking',
      'recurring',
      'related',
      'duplicate',
    ].map((relation) => ({
      value: relation,
      label: t(`filters.relationValue.${relation}`),
    })),
    links: [
      { value: 'yes', label: t('issueFilters.hasAny') },
      { value: 'no', label: t('issueFilters.hasNone') },
    ],
    recurring: [
      { value: 'yes', label: t('issueFilters.hasAny') },
      { value: 'no', label: t('issueFilters.hasNone') },
    ],
  };
}
