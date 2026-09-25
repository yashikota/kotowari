import { useState } from 'react';
import {
  ActionIcon,
  Button,
  Divider,
  Group,
  MultiSelect,
  Popover,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import {
  IconCalendar,
  IconChartBar,
  IconChevronLeft,
  IconChevronRight,
  IconCircleDot,
  IconFileText,
  IconFilter,
  IconFlag,
  IconLink,
  IconSearch,
  IconStack2,
  IconTag,
} from '@tabler/icons-react';
import type { TablerIcon } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { ProjectListControlsModel } from './ProjectListControls.tsx';
import { projectWorkflowStatusLabel } from '../project-workflow.tsx';
import type { ProjectWorkflowStatus } from '../types.ts';

const FILTERS = [
  'status',
  'priority',
  'labels',
  'health',
  'dates',
  'milestones',
  'relations',
  'template',
  'title',
  'specificProject',
] as const;

type FilterKey = (typeof FILTERS)[number];

const FILTER_GROUPS: FilterKey[][] = [
  ['status', 'priority', 'labels', 'health', 'dates', 'milestones', 'relations'],
  ['template', 'title'],
  ['specificProject'],
];

const FILTER_ICONS: Record<FilterKey, TablerIcon> = {
  status: IconCircleDot,
  priority: IconFlag,
  labels: IconTag,
  health: IconChartBar,
  dates: IconCalendar,
  milestones: IconFlag,
  relations: IconLink,
  template: IconFileText,
  title: IconFileText,
  specificProject: IconStack2,
};

export function ProjectFilterPicker({
  model,
  projectStatuses,
  compact = false,
  position = 'bottom-start',
}: {
  model: ProjectListControlsModel;
  projectStatuses: ProjectWorkflowStatus[];
  compact?: boolean;
  position?: 'bottom-start' | 'bottom-end';
}) {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null);
  const [query, setQuery] = useState('');
  const labels: Record<FilterKey, string> = {
    status: t('projectList.filterStatus'),
    priority: t('projectList.filterPriority'),
    labels: t('projectList.filterLabels'),
    health: t('projectList.filterCategoryHealth'),
    dates: t('projectList.filterDates'),
    milestones: t('projectList.filterCategoryMilestones'),
    relations: t('projectList.filterCategoryRelations'),
    template: t('projectList.filterTemplate'),
    title: t('projectList.filterTitleSummary'),
    specificProject: t('projectList.filterSpecificProject'),
  };
  const active = FILTERS.flatMap((key) => {
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
                      : key === 'title'
                        ? Number(Boolean(model.search.trim()))
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
  const visibleFilters = FILTERS.filter((key) =>
    labels[key].toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  const visibleFilterGroups = FILTER_GROUPS.map((group) =>
    group.filter((key) => visibleFilters.includes(key)),
  ).filter((group) => group.length > 0);

  function openFilter(key: FilterKey) {
    setActiveFilter(key);
    setQuery('');
    setOpened(true);
  }

  function clearActiveFilter() {
    switch (activeFilter) {
      case 'status':
        model.handlers.onStatusesChange([]);
        break;
      case 'priority':
        model.handlers.onPrioritiesChange([]);
        break;
      case 'labels':
        model.handlers.onLabelsChange([]);
        break;
      case 'health':
        model.handlers.onHealthsChange([]);
        break;
      case 'dates':
        model.handlers.onDateFieldChange(null);
        break;
      case 'milestones':
        model.handlers.onMilestonesChange([]);
        break;
      case 'relations':
        model.handlers.onRelationsChange([]);
        break;
      case 'template':
        model.handlers.onTemplatesChange([]);
        break;
      case 'title':
        model.handlers.onSearchChange('');
        break;
      case 'specificProject':
        model.handlers.onSpecificProjectChange(null);
        break;
    }
  }

  function renderEditor() {
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

  return (
    <Group gap={4} wrap="nowrap">
      <Popover
        opened={opened}
        onChange={(next) => {
          setOpened(next);
          if (!next) {
            setActiveFilter(null);
            setQuery('');
          }
        }}
        position={position}
        shadow="md"
        withinPortal
      >
        <Popover.Target>
          {compact ? (
            <ActionIcon
              type="button"
              variant="default"
              size={28}
              aria-label={t('projectList.addFilter')}
              title={t('projectList.addFilter')}
              onClick={() => setOpened((current) => !current)}
            >
              <IconFilter size={16} stroke={1.7} aria-hidden="true" />
            </ActionIcon>
          ) : (
            <Button
              type="button"
              variant="default"
              size="sm"
              aria-label={t('projectList.addFilter')}
              title={t('projectList.addFilter')}
              leftSection={<IconFilter size={15} stroke={1.7} aria-hidden="true" />}
              onClick={() => setOpened((current) => !current)}
            >
              {t('projectList.addFilter')}
            </Button>
          )}
        </Popover.Target>
        <Popover.Dropdown w={248} p={0}>
          {activeFilter ? (
            <Stack gap="sm" p="sm">
              <Group gap="xs" wrap="nowrap">
                <ActionIcon
                  type="button"
                  variant="subtle"
                  size="sm"
                  aria-label={t('projectList.allFilters')}
                  onClick={() => setActiveFilter(null)}
                >
                  <IconChevronLeft size={16} aria-hidden="true" />
                </ActionIcon>
                <Text size="sm" fw={600} style={{ flex: 1 }}>
                  {labels[activeFilter]}
                </Text>
                <Button
                  type="button"
                  variant="subtle"
                  size="compact-xs"
                  onClick={clearActiveFilter}
                >
                  {t('projectList.clearThisFilter')}
                </Button>
              </Group>
              {renderEditor()}
            </Stack>
          ) : (
            <Stack gap={0} p="xs">
              <TextInput
                aria-label={t('projectList.filterSearch')}
                placeholder={t('projectList.filterSearch')}
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                size="sm"
                leftSection={<IconSearch size={15} stroke={1.7} aria-hidden="true" />}
                styles={{ input: { border: 0, borderRadius: 0 } }}
              />
              <Divider />
              <Stack gap={0} mah="min(62vh, 440px)" p="xs" style={{ overflowY: 'auto' }}>
                {visibleFilterGroups.map((group, index) => (
                  <Stack key={group[0]} gap={2}>
                    {index > 0 ? <Divider my={4} /> : null}
                    {group.map((key) => {
                      const Icon = FILTER_ICONS[key];
                      return (
                        <Button
                          key={key}
                          type="button"
                          variant="subtle"
                          color="gray"
                          size="compact-sm"
                          fullWidth
                          justify="space-between"
                          leftSection={<Icon size={14} stroke={1.7} aria-hidden="true" />}
                          rightSection={<IconChevronRight size={14} aria-hidden="true" />}
                          onClick={() => setActiveFilter(key)}
                        >
                          {labels[key]}
                        </Button>
                      );
                    })}
                  </Stack>
                ))}
                {visibleFilterGroups.length === 0 ? (
                  <Text c="dimmed" size="sm" ta="center" py="md">
                    {t('projectList.noMatchingFilters')}
                  </Text>
                ) : null}
              </Stack>
              {model.filterCount > 0 ? (
                <Button
                  type="button"
                  variant="subtle"
                  size="xs"
                  mt="xs"
                  onClick={model.handlers.onReset}
                >
                  {t('projectList.clearFilters')}
                </Button>
              ) : null}
            </Stack>
          )}
        </Popover.Dropdown>
      </Popover>
      {active.map(({ key, label, value }) => (
        <Button
          key={key}
          type="button"
          variant="default"
          color="gray"
          radius="xl"
          size="compact-xs"
          aria-label={`${label}: ${value}`}
          title={`${label}: ${value}`}
          style={{ maxWidth: 240, minWidth: 0 }}
          styles={{
            label: {
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            },
          }}
          onClick={() => openFilter(key)}
        >
          {label}: {value}
        </Button>
      ))}
    </Group>
  );
}
