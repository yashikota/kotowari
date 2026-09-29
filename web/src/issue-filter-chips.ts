import type { useTranslation } from 'react-i18next';
import type { IssueSearch } from './issue-search.ts';
import { issueTypeLabel, priorityLabel } from './i18n/labels.ts';
import type {
  IssueLinkSource,
  IssueTemplateFilterOption,
  IssueType,
  IssueWorkflowStatus,
  Project,
  ProjectWorkflowStatus,
} from './types.ts';
import { projectWorkflowStatusLabel } from './project-workflow.tsx';
import { workflowStatusLabel } from './workflow.tsx';

export type FilterChip = { key: string; label: string };

type Props = {
  search: IssueSearch;
  projects: Project[];
  linkSources: IssueLinkSource[];
  templateOptions: IssueTemplateFilterOption[];
  workflowStatuses: IssueWorkflowStatus[];
  projectWorkflowStatuses: ProjectWorkflowStatus[];
  t: ReturnType<typeof useTranslation>['t'];
};

export function buildIssueFilterChips({
  search,
  projects,
  linkSources,
  templateOptions,
  workflowStatuses,
  projectWorkflowStatuses,
  t,
}: Props): FilterChip[] {
  const selectedLabels = (search.labels ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
  const selectedProjectLabels = search.projectLabels ?? [];
  const selectedStatuses = search.statuses ?? (search.status ? [search.status] : []);
  const selectedPriorities =
    search.priorities ?? (search.priority === undefined ? [] : [search.priority]);
  const selectedEstimates =
    search.estimates ?? (search.estimate === undefined ? [] : [search.estimate]);
  const selectedLinkSources = search.linkSources ?? [];
  const selectedTemplateSlugs = search.templateSlugs ?? [];
  const selectedAddedToCycle = search.addedToCycle ?? [];

  return [
    ...(selectedStatuses.length > 0
      ? [
          {
            key: 'statuses',
            label:
              selectedStatuses.length === 1
                ? `${t('field.status')} · ${workflowStatusLabel(selectedStatuses[0]!, workflowStatuses)}`
                : `${t('field.status')} · ${t('filters.statusesSelected', { count: selectedStatuses.length })}`,
          },
        ]
      : []),
    ...(search.assignee
      ? [
          {
            key: 'assignee',
            label: `${t('field.assignee')} · ${t(`issueAssignment.${search.assignee === 'self' ? 'you' : search.assignee === 'agent' ? 'agent' : 'unassigned'}`)}`,
          },
        ]
      : []),
    ...(search.subscribers
      ? [
          {
            key: 'subscribers',
            label: `${t('filters.categories.subscribers')} · ${t(`filters.subscriberValue.${search.subscribers}`)}`,
          },
        ]
      : []),
    ...(search.project
      ? [
          {
            key: 'project',
            label: `${t('field.project')} · ${projects.find((project) => project.slug === search.project)?.name ?? search.project}`,
          },
        ]
      : []),
    ...(search.cycle ? [{ key: 'cycle', label: `${t('field.cycle')} · ${search.cycle}` }] : []),
    ...(selectedPriorities.length > 0
      ? [
          {
            key: 'priorities',
            label:
              selectedPriorities.length === 1
                ? `${t('field.priority')} · ${priorityLabel(selectedPriorities[0]!)}`
                : `${t('field.priority')} · ${t('filters.prioritiesSelected', { count: selectedPriorities.length })}`,
          },
        ]
      : []),
    ...(search.type
      ? [
          {
            key: 'type',
            label: `${t('field.type')} · ${issueTypeLabel(search.type as IssueType)}`,
          },
        ]
      : []),
    ...(selectedEstimates.length > 0 || search.noEstimate
      ? [
          {
            key: 'estimates',
            label:
              selectedEstimates.length + Number(Boolean(search.noEstimate)) === 1
                ? `${t('field.estimate')} · ${search.noEstimate ? t('issueProperties.noEstimate') : selectedEstimates[0]}`
                : `${t('field.estimate')} · ${t('filters.estimatesSelected', { count: selectedEstimates.length + Number(Boolean(search.noEstimate)) })}`,
          },
        ]
      : []),
    ...(search.dueDate
      ? [
          {
            key: 'dueDate',
            label: `${t('filters.dueDate')} · ${search.dueDate.startsWith('on:') ? `${t('filters.dueDateValue.custom')} · ${search.dueDate.slice(3)}` : t(`filters.dueDateValue.${search.dueDate}`)}`,
          },
        ]
      : []),
    ...(search.relation
      ? [
          {
            key: 'relation',
            label: `${t('filters.relation')} · ${t(`filters.relationValue.${search.relation}`)}`,
          },
        ]
      : []),
    ...selectedLinkSources.map((source) => ({
      key: `linkSource:${source}`,
      label: `${t('filters.categories.links')} · ${source === 'no-source' ? t('filters.noLinkSource') : (linkSources.find((item) => item.id === source)?.name ?? source)}`,
    })),
    ...selectedTemplateSlugs.map((slug) => ({
      key: `template:${slug}`,
      label: `${t('filters.categories.template')} · ${slug === 'no-template' ? t('filters.noIssueTemplate') : (templateOptions.find((item) => item.id === slug)?.name ?? slug)}`,
    })),
    ...(search.content
      ? [{ key: 'content', label: `${t('filters.content')} · ${search.content.trim()}` }]
      : []),
    ...(search.milestoneName
      ? [
          {
            key: 'milestoneName',
            label: `${t('filters.milestoneName')} · ${search.milestoneName.trim()}`,
          },
        ]
      : []),
    ...(search.projectStatus
      ? [
          {
            key: 'projectStatus',
            label: `${t('filters.projectStatus')} · ${projectWorkflowStatusLabel(search.projectStatus, projectWorkflowStatuses, t)}`,
          },
        ]
      : []),
    ...(search.projectPriority !== undefined
      ? [
          {
            key: 'projectPriority',
            label: `${t('filters.projectPriority')} · ${priorityLabel(search.projectPriority)}`,
          },
        ]
      : []),
    ...(search.dateField && search.dateRange && search.dateRange !== 'custom'
      ? [
          {
            key: 'date',
            label: `${t(`filters.dateField.${search.dateField}`)} · ${search.dateRange.startsWith('on:') ? search.dateRange.slice(3) : t(`${search.dateField === 'timeInCurrentStatus' ? 'filters.statusAgeRange' : 'filters.dateRange'}.${search.dateRange}`)}`,
          },
        ]
      : []),
    ...(search.advancedFilter && search.advancedFilterGroup?.children.length
      ? [{ key: 'advancedFilter', label: t('issueFilters.advancedFilter') }]
      : []),
    ...selectedLabels.map((name) => ({
      key: `label:${name}`,
      label: `${t('issueProperties.labels')} · ${name}`,
    })),
    ...selectedProjectLabels.map((name) => ({
      key: `projectLabel:${name}`,
      label: `${t('filters.projectLabels')} · ${name === '__none__' ? t('filters.noProjectLabels') : name}`,
    })),
    ...selectedAddedToCycle.map((phase) => ({
      key: `addedToCycle:${phase}`,
      label: `${t('filters.addedToCycle')} · ${t(`filters.addedToCycle${phase[0]!.toUpperCase()}${phase.slice(1)}`)}`,
    })),
  ];
}
