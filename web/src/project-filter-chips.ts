import type { useTranslation } from 'react-i18next';
import { projectWorkflowStatusLabel } from './project-workflow.tsx';
import type { ProjectWorkflowStatus } from './types.ts';
import type { ProjectListControlsModel } from './project-list-controls.ts';

export const PROJECT_FILTERS = [
  'status',
  'priority',
  'labels',
  'health',
  'dates',
  'milestones',
  'relations',
  'initiatives',
  'template',
  'title',
  'specificProject',
  'lead',
] as const;

export type ProjectFilterKey = (typeof PROJECT_FILTERS)[number];

export type ProjectFilterChip = { key: ProjectFilterKey; label: string; value: string };

export function buildProjectFilterChips({
  model,
  projectStatuses,
  labels,
  t,
}: {
  model: ProjectListControlsModel;
  projectStatuses: ProjectWorkflowStatus[];
  labels: Record<ProjectFilterKey, string>;
  t: ReturnType<typeof useTranslation>['t'];
}): ProjectFilterChip[] {
  return PROJECT_FILTERS.flatMap((key) => {
    const count =
      key === 'status'
        ? model.statuses.length
        : key === 'priority'
          ? model.priorities.length
          : key === 'labels'
            ? model.labels.length
            : key === 'health'
              ? model.healths.length
              : key === 'dates'
                ? Number(Boolean(model.dateField && (model.dateFrom || model.dateTo)))
                : key === 'milestones'
                  ? model.milestones.length
                  : key === 'relations'
                    ? model.relations.length
                    : key === 'template'
                      ? model.templates.length
                      : key === 'initiatives'
                        ? model.initiatives.length
                        : key === 'title'
                          ? Number(Boolean(model.search.trim()))
                          : key === 'lead'
                            ? model.leads.length
                            : Number(Boolean(model.specificProject));
    if (!count) return [];
    const dateFieldLabels: Record<string, string> = {
      startDate: t('projectList.orderStartDate'),
      targetDate: t('projectList.orderTargetDate'),
      created: t('projectList.orderCreated'),
      updated: t('projectList.orderUpdated'),
      completed: t('projectList.orderCompleted'),
    };
    const value =
      key === 'status'
        ? model.statuses
            .map((status) => projectWorkflowStatusLabel(status, projectStatuses, t))
            .join(', ')
        : key === 'priority'
          ? model.priorities.map((priority) => t(`priority.${priority}`)).join(', ')
          : key === 'labels'
            ? model.labels.join(', ')
            : key === 'health'
              ? model.healths.map((health) => t(`projectHealth.status.${health}`)).join(', ')
              : key === 'dates'
                ? `${dateFieldLabels[model.dateField] ?? model.dateField}: ${model.dateFrom || '…'} – ${model.dateTo || '…'}`
                : key === 'milestones'
                  ? model.milestones.join(', ')
                  : key === 'relations'
                    ? model.relations
                        .map((relation) => t(`projectDependencies.kindOptions.${relation}`))
                        .join(', ')
                    : key === 'title'
                      ? `“${model.search.trim()}”`
                      : key === 'template'
                        ? model.templates
                            .map((template) =>
                              template === 'template:'
                                ? t('projectList.filterNoTemplate')
                                : (model.availableTemplates.find(
                                    (option) => option.value === template,
                                  )?.label ?? template.slice('template:'.length)),
                            )
                            .join(', ')
                        : key === 'initiatives'
                          ? model.initiatives
                              .map((value) =>
                                value === 'initiative:none'
                                  ? t('projectList.filterNoInitiatives')
                                  : (model.availableInitiatives.find(
                                      (option) => option.value === value,
                                    )?.label ?? value.slice('initiative:'.length)),
                              )
                              .join(', ')
                          : key === 'lead'
                            ? model.leads
                                .map((lead) =>
                                  t(lead === 'self' ? 'projectList.leadYou' : 'projectList.noLead'),
                                )
                                .join(', ')
                            : (model.availableProjects?.find(
                                (project) => project.value === model.specificProject,
                              )?.label ??
                              model.specificProject ??
                              '');
    const label =
      key === 'title'
        ? `${labels.title} ${t(
            model.searchOperator === 'doesNotContain'
              ? 'projectList.searchDoesNotContain'
              : 'projectList.searchContains',
          )}`
        : labels[key];
    return [{ key, label, value }];
  });
}
