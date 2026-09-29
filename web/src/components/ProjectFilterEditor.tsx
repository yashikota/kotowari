import { MultiSelect, Group, Select, Stack, TextInput } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { ProjectListControlsModel } from '../project-list-controls.ts';
import type { ProjectFilterKey } from '../project-filter-chips.ts';
import type { ProjectWorkflowStatus } from '../types.ts';
import { projectWorkflowStatusLabel } from '../project-workflow.tsx';

type Props = {
  activeFilter: ProjectFilterKey | null;
  model: ProjectListControlsModel;
  labels: Record<ProjectFilterKey, string>;
  projectStatuses: ProjectWorkflowStatus[];
};

export function ProjectFilterEditor({ activeFilter, model, labels, projectStatuses }: Props) {
  const { t } = useTranslation();
  switch (activeFilter) {
    case 'status':
      return (
        <MultiSelect
          aria-label={labels.status}
          value={model.statuses}
          onChange={model.handlers.onStatusesChange}
          data={projectStatuses.map((status) => ({
            value: status.id,
            label: projectWorkflowStatusLabel(status.id, projectStatuses, t),
          }))}
          searchable
          comboboxProps={{ withinPortal: false }}
        />
      );
    case 'priority':
      return (
        <MultiSelect
          aria-label={labels.priority}
          value={model.priorities}
          onChange={model.handlers.onPrioritiesChange}
          data={[0, 1, 2, 3, 4].map((priority) => ({
            value: String(priority),
            label: t(`priority.${priority}`),
          }))}
          searchable
          comboboxProps={{ withinPortal: false }}
        />
      );
    case 'labels':
      return (
        <MultiSelect
          aria-label={labels.labels}
          value={model.labels}
          onChange={model.handlers.onLabelsChange}
          data={model.availableLabels.map((label) => ({ value: label.name, label: label.name }))}
          searchable
          comboboxProps={{ withinPortal: false }}
        />
      );
    case 'health':
      return (
        <MultiSelect
          aria-label={t('projectList.filterHealth')}
          value={model.healths}
          onChange={model.handlers.onHealthsChange}
          data={['none', 'on_track', 'at_risk', 'off_track'].map((health) => ({
            value: health,
            label: t(`projectHealth.status.${health}`),
          }))}
          searchable
          comboboxProps={{ withinPortal: false }}
        />
      );
    case 'lead':
      return (
        <MultiSelect
          aria-label={labels.lead}
          value={model.leads}
          onChange={(value) =>
            model.handlers.onLeadsChange(
              value.filter((lead): lead is 'self' | 'none' => lead === 'self' || lead === 'none'),
            )
          }
          data={[
            { value: 'self', label: t('projectList.leadYou') },
            { value: 'none', label: t('projectList.noLead') },
          ]}
          searchable
          comboboxProps={{ withinPortal: false }}
        />
      );
    case 'dates':
      return (
        <Stack gap="sm">
          <Select
            aria-label={t('projectList.filterDateField')}
            placeholder={t('projectList.chooseDateField')}
            value={model.dateField || null}
            onChange={model.handlers.onDateFieldChange}
            data={[
              { value: 'startDate', label: t('projectList.orderStartDate') },
              { value: 'targetDate', label: t('projectList.orderTargetDate') },
              { value: 'created', label: t('projectList.orderCreated') },
              { value: 'updated', label: t('projectList.orderUpdated') },
              { value: 'completed', label: t('projectList.orderCompleted') },
            ]}
            clearable
            comboboxProps={{ withinPortal: false }}
          />
          {model.dateField ? (
            <Group grow>
              <TextInput
                aria-label={t('projectList.dateFrom')}
                type="date"
                value={model.dateFrom}
                onChange={(event) => model.handlers.onDateFromChange(event.currentTarget.value)}
              />
              <TextInput
                aria-label={t('projectList.dateTo')}
                type="date"
                value={model.dateTo}
                onChange={(event) => model.handlers.onDateToChange(event.currentTarget.value)}
              />
            </Group>
          ) : null}
        </Stack>
      );
    case 'milestones':
      return (
        <MultiSelect
          aria-label={t('projectList.filterMilestones')}
          value={model.milestones}
          onChange={model.handlers.onMilestonesChange}
          data={model.availableMilestones}
          searchable
          comboboxProps={{ withinPortal: false }}
        />
      );
    case 'relations':
      return (
        <MultiSelect
          aria-label={t('projectList.filterRelations')}
          value={model.relations}
          onChange={model.handlers.onRelationsChange}
          data={[
            { value: 'blocks', label: t('projectDependencies.kindOptions.blocks') },
            { value: 'blocked_by', label: t('projectDependencies.kindOptions.blocked_by') },
            { value: 'related', label: t('projectDependencies.kindOptions.related') },
          ]}
          searchable
          comboboxProps={{ withinPortal: false }}
        />
      );
    case 'initiatives':
      return (
        <MultiSelect
          aria-label={labels.initiatives}
          value={model.initiatives}
          onChange={model.handlers.onInitiativesChange}
          data={[
            { value: 'initiative:none', label: t('projectList.filterNoInitiatives') },
            ...model.availableInitiatives,
          ]}
          searchable
          comboboxProps={{ withinPortal: false }}
        />
      );
    case 'template':
      return (
        <MultiSelect
          aria-label={labels.template}
          value={model.templates}
          onChange={model.handlers.onTemplatesChange}
          data={[
            { value: 'template:', label: t('projectList.filterNoTemplate') },
            ...model.availableTemplates,
          ]}
          searchable
          comboboxProps={{ withinPortal: false }}
        />
      );
    case 'title':
      return (
        <Stack gap="sm">
          <Select
            aria-label={t('projectList.searchOperator')}
            value={model.searchOperator}
            onChange={model.handlers.onSearchOperatorChange}
            data={[
              { value: 'contains', label: t('projectList.searchContains') },
              { value: 'doesNotContain', label: t('projectList.searchDoesNotContain') },
            ]}
            allowDeselect={false}
            comboboxProps={{ withinPortal: false }}
          />
          <TextInput
            aria-label={t('projectList.filterTitleSummary')}
            placeholder={t('projectList.filterTitleSummary')}
            value={model.search}
            onChange={(event) => model.handlers.onSearchChange(event.currentTarget.value)}
          />
        </Stack>
      );
    case 'specificProject':
      return (
        <Select
          aria-label={labels.specificProject}
          value={model.specificProject || null}
          onChange={model.handlers.onSpecificProjectChange}
          data={model.availableProjects ?? []}
          searchable
          clearable
          comboboxProps={{ withinPortal: false }}
        />
      );
    default:
      return null;
  }
}
