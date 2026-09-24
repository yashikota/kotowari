import { Button, Group, NativeSelect, Popover, Stack, Text, TextInput } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { IssueSearch } from '../api.ts';
import { issueTypeLabel, priorityLabel } from '../i18n/labels.ts';
import { PROJECT_STATUSES } from '../types.ts';
import type { Cycle, Label, Project } from '../types.ts';
import { LabelChip } from '../mantine-ui.tsx';
import type { FilterChip } from '../presenters/IssueFilters.tsx';
import { useIssueWorkflow, workflowStatusLabel } from '../workflow.tsx';

export function IssueFilterMenu({
  search,
  projects,
  cycles,
  labels,
  selectedLabels,
  selectedProjectLabels,
  selectedAddedToCycle,
  opened,
  chips,
  onToggle,
  onOpenChange,
  onStatusChange,
  onProjectChange,
  onCycleChange,
  onPriorityChange,
  onTypeChange,
  onEstimateChange,
  onDueDateChange,
  onRelationChange,
  onContentChange,
  onMilestoneNameChange,
  onDateFieldChange,
  onDateRangeChange,
  onProjectStatusChange,
  onProjectPriorityChange,
  onToggleLabel,
  onToggleProjectLabel,
  onToggleAddedToCycle,
  onRemoveFilter,
  onClear,
}: {
  search: IssueSearch;
  projects: Project[];
  cycles: Cycle[];
  labels: Label[];
  selectedLabels: string[];
  selectedProjectLabels: string[];
  selectedAddedToCycle: string[];
  opened: boolean;
  chips: FilterChip[];
  onToggle: () => void;
  onOpenChange: (next: boolean) => void;
  onStatusChange: (value: string) => void;
  onProjectChange: (value: string) => void;
  onCycleChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onEstimateChange: (value: string) => void;
  onDueDateChange: (value: string) => void;
  onRelationChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onMilestoneNameChange: (value: string) => void;
  onDateFieldChange: (value: string) => void;
  onDateRangeChange: (value: string) => void;
  onProjectStatusChange: (value: string) => void;
  onProjectPriorityChange: (value: string) => void;
  onToggleLabel: (name: string) => void;
  onToggleProjectLabel: (name: string) => void;
  onToggleAddedToCycle: (phase: 'planned' | 'during' | 'after') => void;
  onRemoveFilter: (key: string) => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  const { statuses: workflowStatuses } = useIssueWorkflow();
  const exactDueDate = search.dueDate?.startsWith('on:') ? search.dueDate.slice(3) : '';
  const dueDateValue =
    exactDueDate || search.dueDate === 'custom' ? 'custom' : (search.dueDate ?? '');
  const exactDateRange = search.dateRange?.startsWith('on:') ? search.dateRange.slice(3) : '';
  const dateRangeValue = exactDateRange ? 'custom' : (search.dateRange ?? '');
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
  return (
    <>
      <Popover
        opened={opened}
        onChange={onOpenChange}
        position="bottom-start"
        shadow="md"
        width={300}
      >
        <Popover.Target>
          <Button
            type="button"
            size="xs"
            variant={chips.length > 0 ? 'light' : 'default'}
            aria-label={t('filters.button')}
            aria-expanded={opened}
            onClick={onToggle}
          >
            {t('filters.button')}
            {chips.length > 0 ? ` · ${chips.length}` : ''}
          </Button>
        </Popover.Target>
        <Popover.Dropdown mah="70vh" style={{ overflowY: 'auto' }}>
          <Stack gap="xs">
            <NativeSelect
              aria-label={t('filters.filterStatus')}
              label={t('field.status')}
              value={search.status ?? ''}
              onChange={(event) => onStatusChange(event.currentTarget.value)}
              data={[
                { value: '', label: t('filters.anyStatus') },
                ...workflowStatuses.map((status) => ({
                  value: status.id,
                  label: workflowStatusLabel(status.id, workflowStatuses),
                })),
              ]}
            />
            <TextInput
              aria-label={t('filters.filterContent')}
              label={t('filters.content')}
              placeholder={t('filters.contentPlaceholder')}
              value={search.content ?? ''}
              maxLength={512}
              onChange={(event) => onContentChange(event.currentTarget.value)}
            />
            <NativeSelect
              aria-label={t('filters.filterType')}
              label={t('field.type')}
              value={search.type ?? ''}
              onChange={(event) => onTypeChange(event.currentTarget.value)}
              data={[
                { value: '', label: t('filters.anyType') },
                ...(['bug', 'feature', 'improvement', 'task'] as const).map((type) => ({
                  value: type,
                  label: issueTypeLabel(type),
                })),
              ]}
            />
            <NativeSelect
              aria-label={t('filters.filterEstimate')}
              label={t('field.estimate')}
              value={search.estimate == null ? '' : String(search.estimate)}
              onChange={(event) => onEstimateChange(event.currentTarget.value)}
              data={[
                { value: '', label: t('filters.anyEstimate') },
                ...[0, 1, 2, 3, 5, 8, 13, 21, 34].map((estimate) => ({
                  value: String(estimate),
                  label: String(estimate),
                })),
              ]}
            />
            <NativeSelect
              aria-label={t('filters.filterDueDate')}
              label={t('filters.dueDate')}
              value={dueDateValue}
              onChange={(event) =>
                onDueDateChange(
                  event.currentTarget.value === 'custom' ? 'custom' : event.currentTarget.value,
                )
              }
              data={[
                { value: '', label: t('filters.anyDueDate') },
                ...(
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
                ).map((value) => ({
                  value,
                  label: t(`filters.dueDateValue.${value}`),
                })),
              ]}
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
            <NativeSelect
              aria-label={t('filters.filterRelation')}
              label={t('filters.relation')}
              value={search.relation ?? ''}
              onChange={(event) => onRelationChange(event.currentTarget.value)}
              data={[
                { value: '', label: t('filters.anyRelation') },
                ...(
                  [
                    'parent',
                    'subissue',
                    'blocked',
                    'blocking',
                    'recurring',
                    'related',
                    'duplicate',
                  ] as const
                ).map((value) => ({
                  value,
                  label: t(`filters.relationValue.${value}`),
                })),
              ]}
            />
            <NativeSelect
              aria-label={t('filters.filterDateField')}
              label={t('filters.dateField.label')}
              value={search.dateField ?? ''}
              onChange={(event) => onDateFieldChange(event.currentTarget.value)}
              data={[
                { value: '', label: t('filters.dateField.any') },
                ...(
                  [
                    'createdAt',
                    'updatedAt',
                    'startedAt',
                    'completedAt',
                    'timeInCurrentStatus',
                  ] as const
                ).map((field) => ({
                  value: field,
                  label: t(`filters.dateField.${field}`),
                })),
              ]}
            />
            {search.dateField ? (
              <>
                <NativeSelect
                  aria-label={t('filters.filterDateRange')}
                  label={t('filters.dateRange.label')}
                  value={dateRangeValue}
                  onChange={(event) => onDateRangeChange(event.currentTarget.value)}
                  data={[
                    { value: '', label: t('filters.dateRange.any') },
                    ...dateRanges.map((range) => ({
                      value: range,
                      label: t(
                        search.dateField === 'timeInCurrentStatus'
                          ? `filters.statusAgeRange.${range}`
                          : `filters.dateRange.${range}`,
                      ),
                    })),
                  ]}
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
            <NativeSelect
              aria-label={t('filters.filterProject')}
              label={t('field.project')}
              value={search.project ?? ''}
              onChange={(event) => onProjectChange(event.currentTarget.value)}
              data={[
                { value: '', label: t('filters.anyProject') },
                ...projects.map((project) => ({ value: project.slug, label: project.name })),
              ]}
            />
            <NativeSelect
              aria-label={t('filters.filterProjectStatus')}
              label={t('filters.projectStatus')}
              value={search.projectStatus ?? ''}
              onChange={(event) => onProjectStatusChange(event.currentTarget.value)}
              data={[
                { value: '', label: t('filters.anyProjectStatus') },
                ...PROJECT_STATUSES.map((status) => ({
                  value: status,
                  label: t(`projectStatus.${status}`),
                })),
              ]}
            />
            <TextInput
              aria-label={t('filters.filterMilestoneName')}
              label={t('filters.milestoneName')}
              placeholder={t('filters.milestoneNamePlaceholder')}
              value={search.milestoneName ?? ''}
              maxLength={512}
              onChange={(event) => onMilestoneNameChange(event.currentTarget.value)}
            />
            <NativeSelect
              aria-label={t('filters.filterProjectPriority')}
              label={t('filters.projectPriority')}
              value={search.projectPriority == null ? '' : String(search.projectPriority)}
              onChange={(event) => onProjectPriorityChange(event.currentTarget.value)}
              data={[
                { value: '', label: t('filters.anyProjectPriority') },
                ...[0, 1, 2, 3, 4].map((priority) => ({
                  value: String(priority),
                  label: priorityLabel(priority),
                })),
              ]}
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
            <NativeSelect
              aria-label={t('filters.filterCycle')}
              label={t('field.cycle')}
              value={search.cycle ? String(search.cycle) : ''}
              onChange={(event) => onCycleChange(event.currentTarget.value)}
              data={[
                { value: '', label: t('filters.anyCycle') },
                ...cycles.map((cycle) => ({
                  value: String(cycle.number),
                  label: t('field.cycleN', { number: cycle.number }),
                })),
              ]}
            />
            <Stack gap={4} role="group" aria-label={t('filters.filterAddedToCycle')}>
              <Text size="xs" c="dimmed" fw={500}>
                {t('filters.addedToCycle')}
              </Text>
              <Group gap={4}>
                {(['planned', 'during', 'after'] as const).map((phase) => (
                  <LabelChip
                    key={phase}
                    name={t(`filters.addedToCycle${phase[0]!.toUpperCase()}${phase.slice(1)}`)}
                    color="var(--mantine-color-gray-6)"
                    selected={selectedAddedToCycle.includes(phase)}
                    onClick={() => onToggleAddedToCycle(phase)}
                  />
                ))}
              </Group>
            </Stack>
            <NativeSelect
              aria-label={t('filters.filterPriority')}
              label={t('field.priority')}
              value={search.priority !== undefined ? String(search.priority) : ''}
              onChange={(event) => onPriorityChange(event.currentTarget.value)}
              data={[
                { value: '', label: t('filters.anyPriority') },
                ...[0, 1, 2, 3, 4].map((priority) => ({
                  value: String(priority),
                  label: priorityLabel(priority),
                })),
              ]}
            />
            {labels.length > 0 ? (
              <Stack gap={4} role="group" aria-label={t('filters.filterLabels')}>
                <Text size="xs" c="dimmed" fw={500}>
                  {t('issueProperties.labels')}
                </Text>
                <Group gap={4}>
                  {labels.map((label) => {
                    return (
                      <LabelChip
                        key={label.id}
                        name={label.name}
                        color={label.color}
                        selected={selectedLabels.includes(label.name)}
                        onClick={() => onToggleLabel(label.name)}
                      />
                    );
                  })}
                </Group>
              </Stack>
            ) : null}
            <Button
              type="button"
              variant="subtle"
              size="xs"
              disabled={chips.length === 0}
              onClick={onClear}
            >
              {t('filters.clear')}
            </Button>
          </Stack>
        </Popover.Dropdown>
      </Popover>
      {chips.length > 0 ? (
        <Group role="group" aria-label={t('filters.active')} gap={4} mt={6}>
          {chips.map((chip) => (
            <Button
              key={chip.key}
              type="button"
              size="compact-xs"
              variant="light"
              aria-label={t('filters.remove', { label: chip.label })}
              onClick={() => onRemoveFilter(chip.key)}
            >
              {chip.label} ×
            </Button>
          ))}
        </Group>
      ) : null}
    </>
  );
}
