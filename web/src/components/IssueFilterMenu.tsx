import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Button,
  Divider,
  Group,
  Popover,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconCalendar,
  IconCalendarPlus,
  IconCalendarTime,
  IconChartBar,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconCircleDot,
  IconFileText,
  IconFlag,
  IconFilter,
  IconFolder,
  IconFolderCog,
  IconLink,
  IconListCheck,
  IconRepeat,
  IconSearch,
  IconTag,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { IssueSearch } from '../api.ts';
import { issueTypeLabel, priorityLabel } from '../i18n/labels.ts';
import type { Cycle, Label, Project } from '../types.ts';
import { LabelChip } from '../mantine-ui.tsx';
import type { FilterChip } from '../presenters/IssueFilters.tsx';
import { useIssueWorkflow, workflowStatusLabel } from '../workflow.tsx';
import { useProjectWorkflow, projectWorkflowStatusLabel } from '../project-workflow.tsx';

const FILTER_CATEGORIES = [
  { id: 'status', group: 'issue', chips: ['status'] },
  { id: 'priority', group: 'issue', chips: ['priority'] },
  { id: 'estimate', group: 'issue', chips: ['estimate'] },
  { id: 'labels', group: 'issue', chips: ['label:'] },
  { id: 'relations', group: 'issue', chips: ['relation'] },
  { id: 'dates', group: 'issue', chips: ['date'] },
  { id: 'project', group: 'planning', chips: ['project'] },
  {
    id: 'projectProperties',
    group: 'planning',
    chips: ['projectStatus', 'projectPriority', 'projectLabel:'],
  },
  { id: 'cycle', group: 'planning', chips: ['cycle'] },
  { id: 'addedToCycle', group: 'planning', chips: ['addedToCycle:'] },
  { id: 'content', group: 'other', chips: ['content'] },
  { id: 'type', group: 'other', chips: ['type'] },
  { id: 'dueDate', group: 'other', chips: ['dueDate'] },
  { id: 'milestone', group: 'other', chips: ['milestoneName'] },
] as const;

const FILTER_CATEGORY_ICONS = {
  status: IconCircleDot,
  priority: IconFlag,
  estimate: IconChartBar,
  labels: IconTag,
  relations: IconLink,
  dates: IconCalendar,
  project: IconFolder,
  projectProperties: IconFolderCog,
  cycle: IconRepeat,
  addedToCycle: IconCalendarPlus,
  content: IconFileText,
  type: IconListCheck,
  dueDate: IconCalendarTime,
  milestone: IconFlag,
} satisfies Record<FilterCategory, typeof IconCircleDot>;

type FilterCategory = (typeof FILTER_CATEGORIES)[number]['id'];
type SelectOption = { value: string; label: string };

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
  selected,
  onClick,
}: {
  label: string;
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
      justify="space-between"
      aria-pressed={selected}
      onClick={onClick}
      rightSection={selected ? <IconCheck size={14} aria-hidden="true" /> : null}
    >
      {label}
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
  const { statuses: projectWorkflowStatuses } = useProjectWorkflow();
  const [category, setCategory] = useState<FilterCategory | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const compact = useMediaQuery('(max-width: 640px)');
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

  const categoryLabels = useMemo(
    () =>
      Object.fromEntries(
        FILTER_CATEGORIES.map(({ id }) => [id, t(`filters.categories.${id}`)]),
      ) as Record<FilterCategory, string>,
    [t],
  );
  const filteredCategories = FILTER_CATEGORIES.filter(({ id }) =>
    categoryLabels[id].toLocaleLowerCase().includes(filterQuery.trim().toLocaleLowerCase()),
  );
  const visibleGroups = (['issue', 'planning', 'other'] as const)
    .map((group) => ({
      group,
      categories: filteredCategories.filter((item) => item.group === group),
    }))
    .filter(({ categories }) => categories.length > 0);
  const activeFilterKeys = new Set(chips.map((chip) => chip.key));

  function isCategoryActive(filterCategory: FilterCategory): boolean {
    const definition = FILTER_CATEGORIES.find(({ id }) => id === filterCategory);
    return (
      definition?.chips.some((key) =>
        key.endsWith(':')
          ? [...activeFilterKeys].some((activeKey) => activeKey.startsWith(key))
          : activeFilterKeys.has(key),
      ) ?? false
    );
  }

  function clearCategory() {
    const definition = FILTER_CATEGORIES.find(({ id }) => id === category);
    if (!definition) return;
    for (const chip of chips) {
      if (
        definition.chips.some((key) =>
          key.endsWith(':') ? chip.key.startsWith(key) : chip.key === key,
        )
      ) {
        onRemoveFilter(chip.key);
      }
    }
  }

  function selectCategory(next: FilterCategory) {
    setCategory(next);
    setFilterQuery('');
  }

  function renderCategoryEditor() {
    switch (category) {
      case 'status':
        return (
          <FilterOptionList
            label={t('filters.filterStatus')}
            value={search.status ?? null}
            searchable
            options={workflowStatuses.map((status) => ({
              value: status.id,
              label: workflowStatusLabel(status.id, workflowStatuses),
            }))}
            onChange={onStatusChange}
          />
        );
      case 'priority':
        return (
          <FilterOptionList
            label={t('filters.filterPriority')}
            value={search.priority === undefined ? null : String(search.priority)}
            options={[0, 1, 2, 3, 4].map((priority) => ({
              value: String(priority),
              label: priorityLabel(priority),
            }))}
            onChange={onPriorityChange}
          />
        );
      case 'estimate':
        return (
          <FilterOptionList
            label={t('filters.filterEstimate')}
            value={search.estimate === undefined ? null : String(search.estimate)}
            options={[0, 1, 2, 3, 5, 8, 13, 21, 34].map((estimate) => ({
              value: String(estimate),
              label: String(estimate),
            }))}
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

  return (
    <>
      <Popover
        opened={opened}
        onChange={(next) => {
          onOpenChange(next);
          if (!next) {
            setCategory(null);
            setFilterQuery('');
          }
        }}
        position="bottom-start"
        shadow="md"
        width={compact ? 320 : category ? 520 : 240}
        withinPortal
      >
        <Popover.Target>
          <ActionIcon
            type="button"
            variant={chips.length > 0 ? 'light' : 'subtle'}
            color="gray"
            aria-label={t('filters.button')}
            title={t('filters.button')}
            aria-expanded={opened}
            onClick={onToggle}
          >
            <IconFilter size={16} stroke={1.7} aria-hidden="true" />
          </ActionIcon>
        </Popover.Target>
        <Popover.Dropdown
          p={0}
          mah="70vh"
          style={{ maxWidth: 'calc(100vw - 16px)', overflow: 'hidden' }}
        >
          <Group gap={0} align="stretch" wrap="nowrap">
            <Stack
              w={compact ? 320 : 240}
              gap={0}
              style={{ display: compact && category ? 'none' : undefined }}
            >
              <TextInput
                aria-label={t('filters.searchFilters')}
                placeholder={t('filters.searchPlaceholder')}
                leftSection={<IconSearch size={15} aria-hidden="true" />}
                value={filterQuery}
                autoFocus
                onChange={(event) => setFilterQuery(event.currentTarget.value)}
                styles={{ input: { border: 0, borderRadius: 0 } }}
              />
              <Divider />
              <Stack gap="xs" p="xs" mah="calc(70vh - 42px)" style={{ overflowY: 'auto' }}>
                {visibleGroups.map(({ categories: groupCategories, group }, groupIndex) => {
                  return (
                    <Stack key={group} gap={2}>
                      {groupIndex > 0 ? <Divider my={4} /> : null}
                      {groupCategories.map(({ id }) => {
                        const CategoryIcon = FILTER_CATEGORY_ICONS[id];
                        return (
                          <Button
                            key={id}
                            type="button"
                            variant="subtle"
                            color="gray"
                            size="compact-sm"
                            fullWidth
                            justify="flex-start"
                            aria-pressed={isCategoryActive(id)}
                            data-active={category === id || undefined}
                            onClick={() => selectCategory(id)}
                            styles={{
                              root: { minHeight: 30, height: 30, paddingInline: 8 },
                              label: {
                                display: 'block',
                                width: '100%',
                                textAlign: 'left',
                              },
                            }}
                          >
                            <Group gap="xs" wrap="nowrap" justify="space-between" w="100%">
                              <CategoryIcon size={15} stroke={1.7} aria-hidden="true" />
                              <Text size="sm" truncate style={{ flex: 1, textAlign: 'left' }}>
                                {categoryLabels[id]}
                              </Text>
                              <IconChevronRight
                                size={14}
                                color="var(--mantine-color-dimmed)"
                                aria-hidden="true"
                              />
                            </Group>
                          </Button>
                        );
                      })}
                    </Stack>
                  );
                })}
                {filteredCategories.length === 0 ? (
                  <Text size="sm" c="dimmed" px="xs" py="sm">
                    {t('filters.noMatchingFilters')}
                  </Text>
                ) : null}
                {chips.length > 0 ? (
                  <>
                    <Divider my={4} />
                    <Button
                      type="button"
                      variant="subtle"
                      color="gray"
                      size="compact-sm"
                      disabled={chips.length === 0}
                      onClick={onClear}
                    >
                      {t('filters.clear')}
                    </Button>
                  </>
                ) : null}
              </Stack>
            </Stack>
            {category ? (
              <>
                {!compact ? <Divider orientation="vertical" /> : null}
                <Stack w={compact ? 320 : 279} gap={0}>
                  <Group gap="xs" px="sm" py="xs" wrap="nowrap">
                    <ActionIcon
                      type="button"
                      size="sm"
                      variant="subtle"
                      color="gray"
                      aria-label={t('filters.backToFilters')}
                      onClick={() => setCategory(null)}
                    >
                      <IconChevronLeft size={16} aria-hidden="true" />
                    </ActionIcon>
                    <Text size="sm" fw={600} style={{ flex: 1 }}>
                      {categoryLabels[category]}
                    </Text>
                    {isCategoryActive(category) ? (
                      <Button
                        type="button"
                        size="compact-xs"
                        variant="subtle"
                        onClick={clearCategory}
                      >
                        {t('filters.clearFilter')}
                      </Button>
                    ) : null}
                  </Group>
                  <Divider />
                  <Stack gap="sm" p="sm" mah="calc(70vh - 42px)" style={{ overflowY: 'auto' }}>
                    {renderCategoryEditor()}
                  </Stack>
                </Stack>
              </>
            ) : null}
          </Group>
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
