import { useState } from 'react';
import { ActionIcon, Button, Divider, Group, Popover, Stack, Text, TextInput } from '@mantine/core';
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
  IconTarget,
  IconUser,
  IconX,
} from '@tabler/icons-react';
import type { TablerIcon } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { ProjectListControlsModel } from '../project-list-controls.ts';
import { buildProjectFilterChips, PROJECT_FILTERS } from '../project-filter-chips.ts';
import type { ProjectFilterKey } from '../project-filter-chips.ts';
import { AdvancedProjectFilterBuilder } from './AdvancedProjectFilterBuilder.tsx';
import { projectWorkflowStatusLabel } from '../project-workflow.tsx';
import { ProjectFilterEditor } from './ProjectFilterEditor.tsx';
import type { ProjectWorkflowStatus } from '../types.ts';

const FILTER_GROUPS: ProjectFilterKey[][] = [
  [
    'status',
    'priority',
    'labels',
    'lead',
    'health',
    'dates',
    'milestones',
    'relations',
    'initiatives',
  ],
  ['template', 'title'],
  ['specificProject'],
];

const FILTER_ICONS: Record<ProjectFilterKey, TablerIcon> = {
  status: IconCircleDot,
  priority: IconFlag,
  labels: IconTag,
  lead: IconUser,
  health: IconChartBar,
  dates: IconCalendar,
  milestones: IconFlag,
  relations: IconLink,
  initiatives: IconTarget,
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
  const [activeFilter, setActiveFilter] = useState<ProjectFilterKey | null>(null);
  const [query, setQuery] = useState('');
  const labels: Record<ProjectFilterKey, string> = {
    status: t('projectList.filterStatus'),
    priority: t('projectList.filterPriority'),
    labels: t('projectList.filterLabels'),
    lead: t('projectList.property.lead'),
    health: t('projectList.filterCategoryHealth'),
    dates: t('projectList.filterDates'),
    milestones: t('projectList.filterCategoryMilestones'),
    relations: t('projectList.filterCategoryRelations'),
    initiatives: t('projectList.filterInitiative'),
    template: t('projectList.filterTemplate'),
    title: t('projectList.filterTitleSummary'),
    specificProject: t('projectList.filterSpecificProject'),
  };
  const active = buildProjectFilterChips({
    model,
    projectStatuses,
    labels,
    t,
  });
  const visibleFilters = PROJECT_FILTERS.filter((key) =>
    labels[key].toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  const visibleFilterGroups = FILTER_GROUPS.map((group) =>
    group.filter((key) => visibleFilters.includes(key)),
  ).filter((group) => group.length > 0);
  const advancedFilterGroup = model.advancedFilterGroup ?? {
    kind: 'group' as const,
    operator: model.filterOperator,
    children: [],
  };
  const relativeDateChoices = [
    { value: 'overdue', label: t('projectList.dateOverdue') },
    { value: 'within:1d', label: t('projectList.dateWithin1Day') },
    { value: 'within:3d', label: t('projectList.dateWithin3Days') },
    { value: 'within:1w', label: t('projectList.dateWithin1Week') },
    { value: 'within:1m', label: t('projectList.dateWithin1Month') },
    { value: 'within:3m', label: t('projectList.dateWithin3Months') },
    { value: 'within:6m', label: t('projectList.dateWithin6Months') },
    { value: 'within:1y', label: t('projectList.dateWithin1Year') },
    { value: 'custom', label: t('projectList.customDateTimeframe') },
  ];
  const latestUpdateDateChoices = [
    { value: 'last:1d', label: t('projectList.dateLast1Day') },
    { value: 'last:2d', label: t('projectList.dateLast2Days') },
    { value: 'last:3d', label: t('projectList.dateLast3Days') },
    { value: 'last:5d', label: t('projectList.dateLast5Days') },
    { value: 'last:1w', label: t('projectList.dateLast1Week') },
    { value: 'last:2w', label: t('projectList.dateLast2Weeks') },
    { value: 'last:3w', label: t('projectList.dateLast3Weeks') },
    { value: 'last:1m', label: t('projectList.dateLast1Month') },
    { value: 'last:2m', label: t('projectList.dateLast2Months') },
    { value: 'last:3m', label: t('projectList.dateLast3Months') },
    { value: 'last:6m', label: t('projectList.dateLast6Months') },
    { value: 'last:1y', label: t('projectList.dateLast1Year') },
    { value: 'never', label: t('projectList.dateNever') },
    { value: 'custom', label: t('projectList.customDate') },
  ];
  const advancedFilterChoices = {
    status: projectStatuses.map((status) => ({
      value: status.id,
      label: projectWorkflowStatusLabel(status.id, projectStatuses, t),
    })),
    priority: [0, 1, 2, 3, 4].map((priority) => ({
      value: String(priority),
      label: t(`priority.${priority}`),
    })),
    health: ['none', 'on_track', 'at_risk', 'off_track'].map((health) => ({
      value: health,
      label: t(`projectHealth.status.${health}`),
    })),
    label: model.availableLabels.map((label) => ({ value: label.name, label: label.name })),
    milestone: model.availableMilestones.map((name) => ({ value: name, label: name })),
    relation: [
      { value: 'blocks', label: t('projectDependencies.kindOptions.blocks') },
      { value: 'blocked_by', label: t('projectDependencies.kindOptions.blocked_by') },
      { value: 'related', label: t('projectDependencies.kindOptions.related') },
    ],
    initiative: [
      { value: 'initiative:none', label: t('projectList.filterNoInitiatives') },
      ...model.availableInitiatives,
    ],
    template: [
      { value: 'template:', label: t('projectList.filterNoTemplate') },
      ...model.availableTemplates,
    ],
    project: model.availableProjects ?? [],
    lead: [
      { value: 'self', label: t('projectList.leadYou') },
      { value: 'none', label: t('projectList.noLead') },
    ],
    createdDate: relativeDateChoices,
    updatedDate: relativeDateChoices,
    startDate: [...relativeDateChoices, { value: 'no-date', label: t('projectList.noStartDate') }],
    targetDate: [
      ...relativeDateChoices,
      { value: 'no-date', label: t('projectList.noTargetDate') },
    ],
    completedDate: [
      ...relativeDateChoices,
      { value: 'no-date', label: t('projectList.noCompletedDate') },
    ],
    latestUpdateDate: latestUpdateDateChoices,
  };

  function openFilter(key: ProjectFilterKey) {
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
      case 'lead':
        model.handlers.onLeadsChange([]);
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
      case 'initiatives':
        model.handlers.onInitiativesChange([]);
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
              <ProjectFilterEditor
                activeFilter={activeFilter}
                model={model}
                labels={labels}
                projectStatuses={projectStatuses}
              />
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
              <Button
                type="button"
                variant={model.advancedFilter ? 'light' : 'subtle'}
                color="gray"
                size="compact-sm"
                fullWidth
                justify="flex-start"
                leftSection={<IconFilter size={14} stroke={1.7} aria-hidden="true" />}
                onClick={() => {
                  model.handlers.onAdvancedFilterToggle();
                  setOpened(false);
                }}
              >
                {t(
                  model.advancedFilter
                    ? 'projectList.hideAdvancedFilter'
                    : 'projectList.advancedFilter',
                )}
              </Button>
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
      {model.advancedFilter ? (
        <Group gap={4} wrap="nowrap">
          <Popover position={position} shadow="md" withinPortal>
            <Popover.Target>
              <Button
                type="button"
                variant="light"
                color="gray"
                size="compact-xs"
                aria-label={t('projectList.openAdvancedFilter')}
                title={t('projectList.openAdvancedFilter')}
              >
                {t('projectList.advancedFilter')}
              </Button>
            </Popover.Target>
            <Popover.Dropdown
              aria-label={t('projectList.advancedFilter')}
              w="min(420px, calc(100vw - 32px))"
              p="xs"
            >
              <AdvancedProjectFilterBuilder
                group={advancedFilterGroup}
                choices={advancedFilterChoices}
                onChange={model.handlers.onAdvancedFilterGroupChange}
              />
            </Popover.Dropdown>
          </Popover>
          <ActionIcon
            type="button"
            size="sm"
            variant="subtle"
            color="gray"
            aria-label={t('projectList.removeAdvancedFilter')}
            title={t('projectList.removeAdvancedFilter')}
            onClick={model.handlers.onAdvancedFilterToggle}
          >
            <IconX size={14} aria-hidden="true" />
          </ActionIcon>
        </Group>
      ) : null}
    </Group>
  );
}
