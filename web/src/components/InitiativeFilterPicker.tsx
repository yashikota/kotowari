import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  Divider,
  Group,
  NativeSelect,
  Popover,
  ScrollArea,
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
  IconFilter,
  IconFlag,
  IconSearch,
  IconStack2,
  IconTag,
  IconX,
} from '@tabler/icons-react';
import type { TablerIcon } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { InitiativeProjectFilter } from '../initiative-list.ts';
import type { InitiativeStatus, ProjectHealth } from '../types.ts';

const STATUSES: InitiativeStatus[] = ['planned', 'active', 'completed', 'canceled'];
const HEALTH_STATUSES: ProjectHealth[] = ['on_track', 'at_risk', 'off_track'];
const PRIORITIES = [0, 1, 2, 3, 4];
const FILTERS = ['status', 'priority', 'labels', 'health', 'dates', 'projects'] as const;

type FilterKey = (typeof FILTERS)[number];

const FILTER_ICONS: Record<FilterKey, TablerIcon> = {
  status: IconCircleDot,
  priority: IconFlag,
  labels: IconTag,
  health: IconChartBar,
  dates: IconCalendar,
  projects: IconStack2,
};

export type InitiativeFilterHandlers = {
  onFilterOpenedChange: (opened: boolean) => void;
  onStatusFilterChange: (value: string[]) => void;
  onPriorityFilterChange: (value: string[]) => void;
  onHealthFilterChange: (value: string[]) => void;
  onLabelFilterChange: (value: string[]) => void;
  onProjectsFilterChange: (value: string) => void;
  onTargetDateFromChange: (value: string) => void;
  onTargetDateToChange: (value: string) => void;
  onClearFilters: () => void;
};

export function InitiativeFilterPicker({
  filterOpened,
  statusFilter,
  priorityFilter,
  healthFilter,
  labelFilter,
  labels,
  projectsFilter,
  targetDateFrom,
  targetDateTo,
  hasFilters,
  handlers,
}: {
  filterOpened: boolean;
  statusFilter: InitiativeStatus[];
  priorityFilter: number[];
  healthFilter: ProjectHealth[];
  labelFilter: string[];
  labels: string[];
  projectsFilter: InitiativeProjectFilter;
  targetDateFrom: string;
  targetDateTo: string;
  hasFilters: boolean;
  handlers: InitiativeFilterHandlers;
}) {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const filterLabels: Record<FilterKey, string> = {
    status: t('initiativeList.status'),
    priority: t('initiativeList.priority'),
    labels: t('initiativeList.labels'),
    health: t('initiativeList.health'),
    dates: t('initiativeList.targetDate'),
    projects: t('initiativeList.projects'),
  };
  const filterCounts: Record<FilterKey, number> = {
    status: statusFilter.length,
    priority: priorityFilter.length,
    labels: labelFilter.length,
    health: healthFilter.length,
    dates: Number(Boolean(targetDateFrom || targetDateTo)),
    projects: Number(projectsFilter !== 'all'),
  };
  const visibleFilters = FILTERS.filter((filter) =>
    filterLabels[filter].toLocaleLowerCase().includes(filterQuery.trim().toLocaleLowerCase()),
  );

  const activeFilterChips = FILTERS.flatMap((filter) => {
    if (!filterCounts[filter]) return [];
    const value =
      filter === 'status'
        ? statusFilter.map((status) => t(`initiatives.${status}`)).join(', ')
        : filter === 'priority'
          ? priorityFilter
              .map((priority) => t(`initiativeList.priorityValue.${priority}`))
              .join(', ')
          : filter === 'labels'
            ? labelFilter.join(', ')
            : filter === 'health'
              ? healthFilter.map((health) => t(`initiativeList.healthValue.${health}`)).join(', ')
              : filter === 'projects'
                ? t(
                    projectsFilter === 'withProjects'
                      ? 'initiativeList.withProjects'
                      : 'initiativeList.withoutProjects',
                  )
                : `${targetDateFrom || '…'} – ${targetDateTo || '…'}`;
    return [{ filter, label: filterLabels[filter], value }];
  });

  function closeFilterPicker() {
    handlers.onFilterOpenedChange(false);
    setActiveFilter(null);
    setFilterQuery('');
  }

  function clearFilter(filter: FilterKey) {
    switch (filter) {
      case 'status':
        handlers.onStatusFilterChange([]);
        break;
      case 'priority':
        handlers.onPriorityFilterChange([]);
        break;
      case 'labels':
        handlers.onLabelFilterChange([]);
        break;
      case 'health':
        handlers.onHealthFilterChange([]);
        break;
      case 'dates':
        handlers.onTargetDateFromChange('');
        handlers.onTargetDateToChange('');
        break;
      case 'projects':
        handlers.onProjectsFilterChange('all');
        break;
      default:
        break;
    }
  }

  function applyFilterChange(update: () => void) {
    update();
    closeFilterPicker();
  }

  return (
    <Stack gap={4}>
      <Group gap="xs" wrap="nowrap">
        <Popover
          opened={filterOpened}
          onChange={(opened) => {
            handlers.onFilterOpenedChange(opened);
            if (!opened) {
              setActiveFilter(null);
              setFilterQuery('');
            }
          }}
          position="bottom-end"
          shadow="md"
          withinPortal
        >
          <Popover.Target>
            <Button
              type="button"
              variant={filterOpened || hasFilters ? 'light' : 'default'}
              leftSection={<IconFilter size={15} aria-hidden />}
              aria-expanded={filterOpened}
              onClick={() => {
                if (filterOpened) {
                  closeFilterPicker();
                } else {
                  handlers.onFilterOpenedChange(true);
                }
              }}
            >
              {t(
                activeFilterChips.length > 0
                  ? 'initiativeList.addAnotherFilter'
                  : 'initiativeList.addFilter',
              )}
            </Button>
          </Popover.Target>
          <Popover.Dropdown
            role="dialog"
            aria-label={t('initiativeList.addFilter')}
            p={0}
            style={{ width: 252, maxWidth: 'calc(100vw - 16px)' }}
          >
            {activeFilter ? (
              <Stack gap="sm" p="sm">
                <Group gap="xs" wrap="nowrap">
                  <ActionIcon
                    type="button"
                    variant="subtle"
                    size="sm"
                    aria-label={t('initiativeList.allFilters')}
                    onClick={() => setActiveFilter(null)}
                  >
                    <IconChevronLeft size={16} aria-hidden="true" />
                  </ActionIcon>
                  <Text size="sm" fw={600} style={{ flex: 1 }}>
                    {filterLabels[activeFilter]}
                  </Text>
                  {filterCounts[activeFilter] > 0 ? (
                    <Button
                      type="button"
                      variant="subtle"
                      size="compact-xs"
                      onClick={() => clearFilter(activeFilter)}
                    >
                      {t('initiativeList.clearThisFilter')}
                    </Button>
                  ) : null}
                </Group>
                <ScrollArea.Autosize mah={360} type="auto">
                  {activeFilter === 'status' ? (
                    <Checkbox.Group
                      value={statusFilter}
                      onChange={(value) =>
                        applyFilterChange(() => handlers.onStatusFilterChange(value))
                      }
                    >
                      <Stack gap={6}>
                        {STATUSES.map((status) => (
                          <Checkbox
                            key={status}
                            value={status}
                            label={t(`initiatives.${status}`)}
                          />
                        ))}
                      </Stack>
                    </Checkbox.Group>
                  ) : null}
                  {activeFilter === 'priority' ? (
                    <Checkbox.Group
                      value={priorityFilter.map(String)}
                      onChange={(value) =>
                        applyFilterChange(() => handlers.onPriorityFilterChange(value))
                      }
                    >
                      <Stack gap={6}>
                        {PRIORITIES.map((priority) => (
                          <Checkbox
                            key={priority}
                            value={String(priority)}
                            label={t(`initiativeList.priorityValue.${priority}`)}
                          />
                        ))}
                      </Stack>
                    </Checkbox.Group>
                  ) : null}
                  {activeFilter === 'labels' ? (
                    labels.length > 0 ? (
                      <Checkbox.Group
                        value={labelFilter}
                        onChange={(value) =>
                          applyFilterChange(() => handlers.onLabelFilterChange(value))
                        }
                      >
                        <Stack gap={6}>
                          {labels.map((label) => (
                            <Checkbox key={label} value={label} label={label} />
                          ))}
                        </Stack>
                      </Checkbox.Group>
                    ) : (
                      <Text size="sm" c="dimmed">
                        {t('initiativeList.noLabels')}
                      </Text>
                    )
                  ) : null}
                  {activeFilter === 'health' ? (
                    <Checkbox.Group
                      value={healthFilter}
                      onChange={(value) =>
                        applyFilterChange(() => handlers.onHealthFilterChange(value))
                      }
                    >
                      <Stack gap={6}>
                        {HEALTH_STATUSES.map((health) => (
                          <Checkbox
                            key={health}
                            value={health}
                            label={t(`initiativeList.healthValue.${health}`)}
                          />
                        ))}
                      </Stack>
                    </Checkbox.Group>
                  ) : null}
                  {activeFilter === 'projects' ? (
                    <NativeSelect
                      aria-label={filterLabels.projects}
                      value={projectsFilter}
                      onChange={(event) =>
                        applyFilterChange(() =>
                          handlers.onProjectsFilterChange(event.currentTarget.value),
                        )
                      }
                      data={[
                        { value: 'all', label: t('initiativeList.allProjects') },
                        { value: 'withProjects', label: t('initiativeList.withProjects') },
                        { value: 'withoutProjects', label: t('initiativeList.withoutProjects') },
                      ]}
                    />
                  ) : null}
                  {activeFilter === 'dates' ? (
                    <Stack gap="xs">
                      <TextInput
                        type="date"
                        aria-label={t('initiativeList.targetDateFrom')}
                        value={targetDateFrom}
                        onChange={(event) =>
                          handlers.onTargetDateFromChange(event.currentTarget.value)
                        }
                      />
                      <TextInput
                        type="date"
                        aria-label={t('initiativeList.targetDateTo')}
                        value={targetDateTo}
                        onChange={(event) =>
                          handlers.onTargetDateToChange(event.currentTarget.value)
                        }
                      />
                    </Stack>
                  ) : null}
                </ScrollArea.Autosize>
              </Stack>
            ) : (
              <Stack gap={0}>
                <TextInput
                  aria-label={t('initiativeList.searchFilters')}
                  placeholder={t('initiativeList.searchFilters')}
                  leftSection={<IconSearch size={15} aria-hidden="true" />}
                  value={filterQuery}
                  onChange={(event) => setFilterQuery(event.currentTarget.value)}
                  styles={{ input: { border: 0, borderRadius: 0 } }}
                />
                <Divider />
                <ScrollArea.Autosize mah={360} type="auto" p="xs">
                  <Stack gap={2}>
                    {visibleFilters.map((filter) => {
                      const FilterIcon = FILTER_ICONS[filter];
                      return (
                        <Button
                          key={filter}
                          type="button"
                          variant="subtle"
                          color="gray"
                          size="compact-sm"
                          fullWidth
                          justify="space-between"
                          aria-pressed={filterCounts[filter] > 0}
                          onClick={() => setActiveFilter(filter)}
                          leftSection={<FilterIcon size={15} stroke={1.7} aria-hidden="true" />}
                          rightSection={
                            <Group gap={6} wrap="nowrap">
                              {filterCounts[filter] > 0 ? (
                                <Badge size="xs" variant="light">
                                  {filterCounts[filter]}
                                </Badge>
                              ) : null}
                              <IconChevronRight size={14} aria-hidden="true" />
                            </Group>
                          }
                        >
                          {filterLabels[filter]}
                        </Button>
                      );
                    })}
                    {visibleFilters.length === 0 ? (
                      <Text size="sm" c="dimmed" ta="center" py="md">
                        {t('initiativeList.noMatchingFilters')}
                      </Text>
                    ) : null}
                  </Stack>
                </ScrollArea.Autosize>
                {hasFilters ? (
                  <>
                    <Divider />
                    <Button
                      type="button"
                      variant="subtle"
                      size="compact-sm"
                      onClick={() => applyFilterChange(handlers.onClearFilters)}
                    >
                      {t('initiativeList.clearFilters')}
                    </Button>
                  </>
                ) : null}
              </Stack>
            )}
          </Popover.Dropdown>
        </Popover>
      </Group>
      {activeFilterChips.length > 0 ? (
        <Group role="group" aria-label={t('initiativeList.activeFilters')} gap={4} wrap="wrap">
          {activeFilterChips.map(({ filter, label, value }) => (
            <Group key={filter} gap={0} wrap="nowrap">
              <Button
                type="button"
                variant="default"
                color="gray"
                size="compact-xs"
                radius="xl"
                aria-label={`${label}: ${value}`}
                styles={{ root: { borderTopRightRadius: 0, borderBottomRightRadius: 0 } }}
                onClick={() => {
                  setActiveFilter(filter);
                  handlers.onFilterOpenedChange(true);
                }}
              >
                {label}: {value}
              </Button>
              <ActionIcon
                type="button"
                variant="default"
                color="gray"
                size="xs"
                radius="xl"
                aria-label={t('initiativeList.removeFilter', { filter: label })}
                styles={{ root: { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 } }}
                onClick={() => clearFilter(filter)}
              >
                <IconX size={12} aria-hidden="true" />
              </ActionIcon>
            </Group>
          ))}
        </Group>
      ) : null}
    </Stack>
  );
}
