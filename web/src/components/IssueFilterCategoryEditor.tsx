import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Group, Select, Stack, Text, TextInput } from '@mantine/core';
import { IconCheck, IconSearch } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { IssueSearch } from '../api.ts';
import { issueTypeLabel, priorityLabel } from '../i18n/labels.ts';
import type {
  Cycle,
  IssueLinkSource,
  IssueTemplateFilterOption,
  IssueWorkflowStatus,
  Label,
  Project,
  ProjectWorkflowStatus,
} from '../types.ts';
import { LabelChip } from '../mantine-ui.tsx';
import { workflowStatusLabel } from '../workflow.tsx';
import { projectWorkflowStatusLabel } from '../project-workflow.tsx';
import { IssuePriorityIcon, IssueStatusIcon } from './issue-ui.tsx';

export type IssueFilterCategory =
  | 'status'
  | 'assignee'
  | 'subscribers'
  | 'priority'
  | 'estimate'
  | 'labels'
  | 'relations'
  | 'links'
  | 'template'
  | 'dates'
  | 'project'
  | 'projectProperties'
  | 'cycle'
  | 'addedToCycle'
  | 'content'
  | 'type'
  | 'dueDate'
  | 'milestone';

type FilterEditorData = {
  search: IssueSearch;
  projects: Project[];
  cycles: Cycle[];
  labels: Label[];
  linkSources: IssueLinkSource[];
  templateOptions: IssueTemplateFilterOption[];
  workflowStatuses: IssueWorkflowStatus[];
  projectWorkflowStatuses: ProjectWorkflowStatus[];
  selectedLabels: string[];
  selectedLinkSources: string[];
  selectedTemplateSlugs: string[];
  selectedProjectLabels: string[];
  selectedAddedToCycle: string[];
};

type FilterEditorHandlers = {
  onStatusChange: (value: string) => void;
  onAssigneeChange: (value: string) => void;
  onSubscribersChange: (value: string) => void;
  onProjectChange: (value: string) => void;
  onCycleChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onEstimateChange: (value: string) => void;
  onDueDateChange: (value: string) => void;
  onRelationChange: (value: string) => void;
  onToggleLinkSource: (value: string) => void;
  onToggleTemplateSlug: (value: string) => void;
  onContentChange: (value: string) => void;
  onMilestoneNameChange: (value: string) => void;
  onDateFieldChange: (value: string) => void;
  onDateRangeChange: (value: string) => void;
  onProjectStatusChange: (value: string) => void;
  onProjectPriorityChange: (value: string) => void;
  onToggleLabel: (name: string) => void;
  onToggleProjectLabel: (name: string) => void;
  onToggleAddedToCycle: (phase: 'planned' | 'during' | 'after') => void;
};

type Props = {
  category: IssueFilterCategory;
  data: FilterEditorData;
  handlers: FilterEditorHandlers;
};

type SelectOption = { value: string; label: string; icon?: ReactNode };

function FilterSelect({
  label,
  value,
  data,
  onChange,
  searchable = false,
}: {
  label: string;
  value: string | null;
  data: SelectOption[];
  onChange: (value: string) => void;
  searchable?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Select
      aria-label={label}
      label={label}
      value={value}
      placeholder={t('filters.chooseValue')}
      data={data}
      searchable={searchable}
      allowDeselect={false}
      clearable
      nothingFoundMessage={t('filters.noOptions')}
      comboboxProps={{ withinPortal: false, shadow: 'md' }}
      onChange={(next) => onChange(next ?? '')}
    />
  );
}

function FilterOptionList({
  label,
  options,
  value,
  selectedValues,
  onChange,
  searchable = false,
}: {
  label: string;
  options: SelectOption[];
  value?: string | null;
  selectedValues?: string[];
  onChange: (value: string) => void;
  searchable?: boolean;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const visibleOptions = options.filter((option) =>
    option.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );

  return (
    <Stack gap="xs">
      {searchable ? (
        <TextInput
          aria-label={t('filters.searchOptions')}
          placeholder={t('filters.filterOptions')}
          leftSection={<IconSearch size={15} aria-hidden="true" />}
          value={query}
          autoFocus
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
      ) : null}
      {visibleOptions.length > 0 ? (
        <Stack gap={2} role="group" aria-label={label}>
          {visibleOptions.map((option) => (
            <FilterOptionButton
              key={option.value}
              label={option.label}
              icon={option.icon}
              selected={selectedValues?.includes(option.value) ?? value === option.value}
              onClick={() => onChange(option.value)}
            />
          ))}
        </Stack>
      ) : (
        <Text size="sm" c="dimmed" py="xs">
          {t('filters.noOptions')}
        </Text>
      )}
    </Stack>
  );
}

function FilterOptionButton({
  label,
  icon,
  selected,
  onClick,
}: {
  label: string;
  icon?: ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={selected ? 'light' : 'subtle'}
      color="gray"
      size="compact-sm"
      fullWidth
      justify="flex-start"
      aria-pressed={selected}
      onClick={onClick}
      styles={{
        root: { minHeight: 30, height: 30, paddingInline: 8 },
        label: { display: 'block', width: '100%', textAlign: 'left' },
      }}
    >
      <Group gap="xs" wrap="nowrap" justify="space-between" w="100%">
        <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          {icon}
          <Text size="sm" truncate>
            {label}
          </Text>
        </Group>
        {selected ? <IconCheck size={14} aria-hidden="true" /> : null}
      </Group>
    </Button>
  );
}

function FilterLabelList({
  labels,
  selectedLabels,
  label,
  onToggle,
}: {
  labels: Label[];
  selectedLabels: string[];
  label: string;
  onToggle: (name: string) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const filteredLabels = labels.filter((item) =>
    item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );

  return labels.length > 0 ? (
    <Stack gap="xs" role="group" aria-label={label}>
      <TextInput
        aria-label={t('filters.searchOptions')}
        placeholder={t('filters.filterOptions')}
        leftSection={<IconSearch size={15} aria-hidden="true" />}
        value={query}
        autoFocus
        onChange={(event) => setQuery(event.currentTarget.value)}
      />
      {filteredLabels.length > 0 ? (
        <Group gap={4}>
          {filteredLabels.map((item) => (
            <LabelChip
              key={item.id}
              name={item.name}
              color={item.color}
              selected={selectedLabels.includes(item.name)}
              onClick={() => onToggle(item.name)}
            />
          ))}
        </Group>
      ) : (
        <Text size="sm" c="dimmed">
          {t('filters.noOptions')}
        </Text>
      )}
    </Stack>
  ) : (
    <Text size="sm" c="dimmed">
      {t('filters.noLabels')}
    </Text>
  );
}

export function IssueFilterCategoryEditor({ category, data, handlers }: Props) {
  const {
    search,
    projects,
    cycles,
    labels,
    linkSources,
    templateOptions,
    workflowStatuses,
    projectWorkflowStatuses,
    selectedLabels,
    selectedLinkSources,
    selectedTemplateSlugs,
    selectedProjectLabels,
    selectedAddedToCycle,
  } = data;
  const {
    onStatusChange,
    onAssigneeChange,
    onSubscribersChange,
    onProjectChange,
    onCycleChange,
    onPriorityChange,
    onTypeChange,
    onEstimateChange,
    onDueDateChange,
    onRelationChange,
    onToggleLinkSource,
    onToggleTemplateSlug,
    onContentChange,
    onMilestoneNameChange,
    onDateFieldChange,
    onDateRangeChange,
    onProjectStatusChange,
    onProjectPriorityChange,
    onToggleLabel,
    onToggleProjectLabel,
    onToggleAddedToCycle,
  } = handlers;
  const { t } = useTranslation();
  const exactDueDate = search.dueDate?.startsWith('on:') ? search.dueDate.slice(3) : '';
  const dueDateValue =
    exactDueDate || search.dueDate === 'custom' ? 'custom' : (search.dueDate ?? null);
  const exactDateRange = search.dateRange?.startsWith('on:') ? search.dateRange.slice(3) : '';
  const dateRangeValue = exactDateRange
    ? 'custom'
    : search.dateRange === 'custom'
      ? 'custom'
      : (search.dateRange ?? null);
  const dateRanges =
    search.dateField === 'timeInCurrentStatus'
      ? (['dayAgo', 'weekAgo', 'twoWeeksAgo', 'monthAgo', 'quarterAgo', 'halfYearAgo'] as const)
      : ([
          'dayAgo',
          'threeDaysAgo',
          'weekAgo',
          'twoWeeksAgo',
          'monthAgo',
          'quarterAgo',
          'halfYearAgo',
          'yearAgo',
          'custom',
        ] as const);

  function renderCategoryEditor(filterCategory: IssueFilterCategory) {
    switch (filterCategory) {
      case 'status':
        return (
          <FilterOptionList
            label={t('filters.filterStatus')}
            value={null}
            selectedValues={search.statuses ?? (search.status ? [search.status] : [])}
            searchable
            options={workflowStatuses.map((status) => ({
              value: status.id,
              label: workflowStatusLabel(status.id, workflowStatuses),
              icon: <IssueStatusIcon status={status.category} />,
            }))}
            onChange={onStatusChange}
          />
        );
      case 'assignee':
        return (
          <FilterOptionList
            label={t('filters.filterAssignee')}
            value={search.assignee ?? null}
            options={(['self', 'agent', 'none'] as const).map((value) => ({
              value,
              label: t(
                `issueAssignment.${value === 'self' ? 'you' : value === 'agent' ? 'agent' : 'unassigned'}`,
              ),
            }))}
            onChange={onAssigneeChange}
          />
        );
      case 'subscribers':
        return (
          <FilterOptionList
            label={t('filters.filterSubscribers')}
            value={search.subscribers ?? null}
            options={(['self', 'none'] as const).map((value) => ({
              value,
              label: t(`filters.subscriberValue.${value}`),
            }))}
            onChange={onSubscribersChange}
          />
        );
      case 'priority':
        return (
          <FilterOptionList
            label={t('filters.filterPriority')}
            value={null}
            selectedValues={
              search.priorities?.map(String) ??
              (search.priority === undefined ? [] : [String(search.priority)])
            }
            options={[0, 1, 2, 3, 4].map((priority) => ({
              value: String(priority),
              label: priorityLabel(priority),
              icon: (
                <span
                  style={{
                    display: 'inline-flex',
                    width: 14,
                    height: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IssuePriorityIcon priority={priority} />
                </span>
              ),
            }))}
            onChange={onPriorityChange}
          />
        );
      case 'estimate':
        return (
          <FilterOptionList
            label={t('filters.filterEstimate')}
            value={null}
            selectedValues={[
              ...(search.estimates ?? (search.estimate === undefined ? [] : [search.estimate])).map(
                String,
              ),
              ...(search.noEstimate ? ['none'] : []),
            ]}
            options={[
              { value: 'none', label: t('issueProperties.noEstimate') },
              ...[0, 1, 2, 3, 5, 8, 13, 21, 34].map((estimate) => ({
                value: String(estimate),
                label: String(estimate),
              })),
            ]}
            onChange={onEstimateChange}
          />
        );
      case 'labels':
        return (
          <FilterLabelList
            labels={labels}
            selectedLabels={selectedLabels}
            label={t('filters.filterLabels')}
            onToggle={onToggleLabel}
          />
        );
      case 'relations':
        return (
          <FilterOptionList
            label={t('filters.filterRelation')}
            value={search.relation ?? null}
            options={(
              [
                'parent',
                'subissue',
                'blocked',
                'blocking',
                'recurring',
                'related',
                'duplicate',
              ] as const
            ).map((value) => ({ value, label: t(`filters.relationValue.${value}`) }))}
            onChange={onRelationChange}
          />
        );
      case 'links':
        return (
          <FilterOptionList
            label={t('filters.filterLinks')}
            value={null}
            selectedValues={selectedLinkSources}
            options={linkSources.map((source) => ({
              value: source.id,
              label: t('filters.linkSourceCount', {
                name: source.id === 'no-source' ? t('filters.noLinkSource') : source.name,
                count: source.count,
              }),
            }))}
            onChange={onToggleLinkSource}
          />
        );
      case 'template':
        return (
          <FilterOptionList
            label={t('filters.filterTemplate')}
            value={null}
            selectedValues={selectedTemplateSlugs}
            options={templateOptions.map((option) => ({
              value: option.id,
              label: t('filters.templateOptionCount', {
                name: option.id === 'no-template' ? t('filters.noIssueTemplate') : option.name,
                count: option.count,
              }),
            }))}
            onChange={onToggleTemplateSlug}
          />
        );
      case 'dates':
        return (
          <Stack gap="sm">
            <FilterOptionList
              label={t('filters.filterDateField')}
              value={search.dateField ?? null}
              options={(
                [
                  'createdAt',
                  'updatedAt',
                  'startedAt',
                  'completedAt',
                  'timeInCurrentStatus',
                ] as const
              ).map((field) => ({ value: field, label: t(`filters.dateField.${field}`) }))}
              onChange={onDateFieldChange}
            />
            {search.dateField ? (
              <>
                <FilterOptionList
                  label={t('filters.filterDateRange')}
                  value={dateRangeValue}
                  options={dateRanges.map((range) => ({
                    value: range,
                    label: t(
                      search.dateField === 'timeInCurrentStatus'
                        ? `filters.statusAgeRange.${range}`
                        : `filters.dateRange.${range}`,
                    ),
                  }))}
                  onChange={onDateRangeChange}
                />
                {dateRangeValue === 'custom' ? (
                  <TextInput
                    type="date"
                    aria-label={t('filters.dateRange.customDate')}
                    label={t('filters.dateRange.customDate')}
                    value={exactDateRange}
                    onChange={(event) =>
                      onDateRangeChange(
                        event.currentTarget.value ? `on:${event.currentTarget.value}` : 'custom',
                      )
                    }
                  />
                ) : null}
              </>
            ) : null}
          </Stack>
        );
      case 'project':
        return (
          <FilterSelect
            label={t('filters.filterProject')}
            value={search.project ?? null}
            searchable
            data={projects.map((project) => ({ value: project.slug, label: project.name }))}
            onChange={onProjectChange}
          />
        );
      case 'projectProperties':
        return (
          <Stack gap="sm">
            <FilterOptionList
              label={t('filters.filterProjectStatus')}
              value={search.projectStatus ?? null}
              options={projectWorkflowStatuses.map((status) => ({
                value: status.id,
                label: projectWorkflowStatusLabel(status.id, projectWorkflowStatuses, t),
              }))}
              onChange={onProjectStatusChange}
            />
            <FilterOptionList
              label={t('filters.filterProjectPriority')}
              value={search.projectPriority == null ? null : String(search.projectPriority)}
              options={[0, 1, 2, 3, 4].map((priority) => ({
                value: String(priority),
                label: priorityLabel(priority),
              }))}
              onChange={onProjectPriorityChange}
            />
            <Stack gap={4} role="group" aria-label={t('filters.filterProjectLabels')}>
              <Text size="xs" c="dimmed" fw={500}>
                {t('filters.projectLabels')}
              </Text>
              <Group gap={4}>
                <LabelChip
                  name={t('filters.noProjectLabels')}
                  color="var(--mantine-color-gray-6)"
                  selected={selectedProjectLabels.includes('__none__')}
                  onClick={() => onToggleProjectLabel('__none__')}
                />
                {labels.map((label) => (
                  <LabelChip
                    key={label.id}
                    name={label.name}
                    color={label.color}
                    selected={selectedProjectLabels.includes(label.name)}
                    onClick={() => onToggleProjectLabel(label.name)}
                  />
                ))}
              </Group>
            </Stack>
          </Stack>
        );
      case 'cycle':
        return (
          <FilterOptionList
            label={t('filters.filterCycle')}
            value={search.cycle == null ? null : String(search.cycle)}
            searchable
            options={cycles.map((cycle) => ({
              value: String(cycle.number),
              label: t('field.cycleN', { number: cycle.number }),
            }))}
            onChange={onCycleChange}
          />
        );
      case 'addedToCycle':
        return (
          <Stack gap="xs" role="group" aria-label={t('filters.filterAddedToCycle')}>
            {(['planned', 'during', 'after'] as const).map((phase) => (
              <LabelChip
                key={phase}
                name={t(`filters.addedToCycle${phase[0]!.toUpperCase()}${phase.slice(1)}`)}
                color="var(--mantine-color-gray-6)"
                selected={selectedAddedToCycle.includes(phase)}
                onClick={() => onToggleAddedToCycle(phase)}
              />
            ))}
          </Stack>
        );
      case 'content':
        return (
          <TextInput
            aria-label={t('filters.filterContent')}
            label={t('filters.content')}
            placeholder={t('filters.contentPlaceholder')}
            value={search.content ?? ''}
            maxLength={512}
            onChange={(event) => onContentChange(event.currentTarget.value)}
          />
        );
      case 'type':
        return (
          <FilterOptionList
            label={t('filters.filterType')}
            value={search.type ?? null}
            options={(['bug', 'feature', 'improvement', 'task'] as const).map((type) => ({
              value: type,
              label: issueTypeLabel(type),
            }))}
            onChange={onTypeChange}
          />
        );
      case 'dueDate':
        return (
          <Stack gap="sm">
            <FilterOptionList
              label={t('filters.filterDueDate')}
              value={dueDateValue}
              options={(
                [
                  'overdue',
                  'today',
                  'tomorrow',
                  'threeDays',
                  'week',
                  'month',
                  'quarter',
                  'custom',
                  'none',
                ] as const
              ).map((value) => ({ value, label: t(`filters.dueDateValue.${value}`) }))}
              onChange={onDueDateChange}
            />
            {dueDateValue === 'custom' ? (
              <TextInput
                type="date"
                aria-label={t('filters.customDueDate')}
                label={t('filters.customDueDate')}
                value={exactDueDate}
                onChange={(event) =>
                  onDueDateChange(
                    event.currentTarget.value ? `on:${event.currentTarget.value}` : 'custom',
                  )
                }
              />
            ) : null}
          </Stack>
        );
      case 'milestone':
        return (
          <TextInput
            aria-label={t('filters.filterMilestoneName')}
            label={t('filters.milestoneName')}
            placeholder={t('filters.milestoneNamePlaceholder')}
            value={search.milestoneName ?? ''}
            maxLength={512}
            onChange={(event) => onMilestoneNameChange(event.currentTarget.value)}
          />
        );
      default:
        return null;
    }
  }

  return renderCategoryEditor(category);
}
