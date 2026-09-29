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
import type {
  InitiativeDateField,
  InitiativeDateFilters,
  InitiativeProjectFilter,
} from '../initiative-list.ts';
import type { ProjectFilterField, ProjectFilterGroup } from '../project-view-search.ts';
import { SEARCH_DATE_WINDOWS, type SearchDateFilter } from '../search.ts';
import type { InitiativeStatus, ProjectHealth } from '../types.ts';
import {
  buildInitiativeFilterChips,
  INITIATIVE_DATE_FIELDS,
  INITIATIVE_FILTERS,
  type InitiativeFilterKey,
} from '../initiative-filter-chips.ts';
import { AdvancedProjectFilterBuilder } from './AdvancedProjectFilterBuilder.tsx';
import { InitiativeDateFilterEditor } from './InitiativeDateFilterEditor.tsx';

const STATUSES: InitiativeStatus[] = ['proposed', 'planned', 'active', 'completed', 'canceled'];
const HEALTH_STATUSES: ProjectHealth[] = ['on_track', 'at_risk', 'off_track'];
const PRIORITIES = [0, 1, 2, 3, 4];
function advancedDateWindow(
  value: (typeof SEARCH_DATE_WINDOWS)[number],
  operator: 'last' | 'within',
) {
  return `${operator}:${value.slice(1).toLocaleLowerCase()}`;
}

const FILTER_ICONS: Record<InitiativeFilterKey, TablerIcon> = {
  status: IconCircleDot,
  priority: IconFlag,
  labels: IconTag,
  health: IconChartBar,
  dates: IconCalendar,
  projects: IconStack2,
  advanced: IconFilter,
};

export type InitiativeFilterHandlers = {
  onFilterOpenedChange: (opened: boolean) => void;
  onStatusFilterChange: (value: string[]) => void;
  onPriorityFilterChange: (value: string[]) => void;
  onHealthFilterChange: (value: string[]) => void;
  onLabelFilterChange: (value: string[]) => void;
  onDateFilterChange: (field: InitiativeDateField, filter: SearchDateFilter | undefined) => void;
  onProjectsFilterChange: (value: string) => void;
  onAdvancedFilterChange: (enabled: boolean) => void;
  onAdvancedFilterGroupChange: (group: ProjectFilterGroup) => void;
  onClearFilters: () => void;
};

export function InitiativeFilterPicker({
  filterOpened,
  statusFilter,
  priorityFilter,
  healthFilter,
  labelFilter,
  dateFilters,
  labels,
  projectsFilter,
  advancedFilter,
  advancedFilterGroup,
  hasFilters,
  handlers,
}: {
  filterOpened: boolean;
  statusFilter: InitiativeStatus[];
  priorityFilter: number[];
  healthFilter: ProjectHealth[];
  labelFilter: string[];
  dateFilters: InitiativeDateFilters;
  labels: string[];
  projectsFilter: InitiativeProjectFilter;
  advancedFilter: boolean;
  advancedFilterGroup?: ProjectFilterGroup;
  hasFilters: boolean;
  handlers: InitiativeFilterHandlers;
}) {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState<InitiativeFilterKey | null>(null);
  const [activeDateField, setActiveDateField] = useState<InitiativeDateField | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const dateFieldLabels: Record<InitiativeDateField, string> = {
    created: t('initiativeList.dateField.created'),
    updated: t('initiativeList.dateField.updated'),
    completed: t('initiativeList.dateField.completed'),
    latestUpdate: t('initiativeList.dateField.latestUpdate'),
  };
  const filterLabels: Record<InitiativeFilterKey, string> = {
    status: t('initiativeList.status'),
    priority: t('initiativeList.priority'),
    labels: t('initiativeList.labels'),
    health: t('initiativeList.health'),
    dates: t('initiativeList.dates'),
    projects: t('initiativeList.projects'),
    advanced: t('initiativeList.advancedFilter'),
  };
  const { filterCounts, activeFilterChips } = buildInitiativeFilterChips({
    statusFilter,
    priorityFilter,
    healthFilter,
    labelFilter,
    dateFilters,
    projectsFilter,
    advancedFilter,
    filterLabels,
    dateFieldLabels,
    t,
  });
  const visibleFilters = INITIATIVE_FILTERS.filter((filter) =>
    filterLabels[filter].toLocaleLowerCase().includes(filterQuery.trim().toLocaleLowerCase()),
  );

  function closeFilterPicker() {
    handlers.onFilterOpenedChange(false);
    setActiveFilter(null);
    setActiveDateField(null);
    setFilterQuery('');
  }

  function clearDateFilter(field: InitiativeDateField) {
    handlers.onDateFilterChange(field, undefined);
  }

  function clearFilter(filter: InitiativeFilterKey) {
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
        INITIATIVE_DATE_FIELDS.forEach(clearDateFilter);
        break;
      case 'projects':
        handlers.onProjectsFilterChange('all');
        break;
      case 'advanced':
        handlers.onAdvancedFilterChange(false);
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
            style={{
              width: activeFilter === 'advanced' ? 448 : 252,
              maxWidth: 'calc(100vw - 16px)',
            }}
          >
            {activeFilter ? (
              <Stack gap="sm" p="sm">
                <Group gap="xs" wrap="nowrap">
                  <ActionIcon
                    type="button"
                    variant="subtle"
                    size="sm"
                    aria-label={t('initiativeList.allFilters')}
                    onClick={() => {
                      if (activeFilter === 'dates' && activeDateField) {
                        setActiveDateField(null);
                      } else {
                        setActiveFilter(null);
                      }
                    }}
                  >
                    <IconChevronLeft size={16} aria-hidden="true" />
                  </ActionIcon>
                  <Text size="sm" fw={600} style={{ flex: 1 }}>
                    {activeFilter === 'dates' && activeDateField
                      ? dateFieldLabels[activeDateField]
                      : filterLabels[activeFilter]}
                  </Text>
                  {filterCounts[activeFilter] > 0 ? (
                    <Button
                      type="button"
                      variant="subtle"
                      size="compact-xs"
                      onClick={() => {
                        if (activeFilter === 'dates' && activeDateField) {
                          clearDateFilter(activeDateField);
                        } else {
                          clearFilter(activeFilter);
                        }
                      }}
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
                  {activeFilter === 'advanced' ? (
                    <AdvancedProjectFilterBuilder
                      group={
                        advancedFilterGroup ?? { kind: 'group', operator: 'and', children: [] }
                      }
                      onChange={handlers.onAdvancedFilterGroupChange}
                      fields={[
                        { value: 'status', label: filterLabels.status },
                        { value: 'priority', label: filterLabels.priority },
                        { value: 'health', label: filterLabels.health },
                        { value: 'label', label: filterLabels.labels },
                        { value: 'project', label: filterLabels.projects },
                        { value: 'title', label: t('initiativeList.name') },
                        { value: 'createdDate', label: dateFieldLabels.created },
                        { value: 'updatedDate', label: dateFieldLabels.updated },
                        { value: 'targetDate', label: t('initiativeList.targetDate') },
                        { value: 'completedDate', label: dateFieldLabels.completed },
                        { value: 'latestUpdateDate', label: dateFieldLabels.latestUpdate },
                      ]}
                      choices={
                        {
                          status: STATUSES.map((value) => ({
                            value,
                            label: t(`initiatives.${value}`),
                          })),
                          priority: PRIORITIES.map((value) => ({
                            value: String(value),
                            label: t(`initiativeList.priorityValue.${value}`),
                          })),
                          health: [
                            { value: 'none', label: t('initiativeList.noHealth') },
                            ...HEALTH_STATUSES.map((value) => ({
                              value,
                              label: t(`initiativeList.healthValue.${value}`),
                            })),
                          ],
                          label: labels.map((value) => ({ value, label: value })),
                          project: [
                            { value: 'withProjects', label: t('initiativeList.withProjects') },
                            {
                              value: 'withoutProjects',
                              label: t('initiativeList.withoutProjects'),
                            },
                          ],
                          createdDate: [
                            { value: 'no-date', label: t('initiativeList.noDate') },
                            ...SEARCH_DATE_WINDOWS.map((window) => ({
                              value: advancedDateWindow(window, 'last'),
                              label: t(`searchPage.filters.dateWindows.${window}`),
                            })),
                            { value: 'custom', label: t('searchPage.filters.customTimeframe') },
                          ],
                          updatedDate: [
                            { value: 'no-date', label: t('initiativeList.noDate') },
                            ...SEARCH_DATE_WINDOWS.map((window) => ({
                              value: advancedDateWindow(window, 'last'),
                              label: t(`searchPage.filters.dateWindows.${window}`),
                            })),
                            { value: 'custom', label: t('searchPage.filters.customTimeframe') },
                          ],
                          targetDate: [
                            { value: 'no-date', label: t('initiativeList.noDate') },
                            { value: 'overdue', label: t('initiativeList.overdue') },
                            ...SEARCH_DATE_WINDOWS.map((window) => ({
                              value: advancedDateWindow(window, 'within'),
                              label: t(`searchPage.filters.dateWindows.${window}`),
                            })),
                            { value: 'custom', label: t('searchPage.filters.customTimeframe') },
                          ],
                          completedDate: [
                            { value: 'no-date', label: t('initiativeList.noDate') },
                            ...SEARCH_DATE_WINDOWS.map((window) => ({
                              value: advancedDateWindow(window, 'last'),
                              label: t(`searchPage.filters.dateWindows.${window}`),
                            })),
                            { value: 'custom', label: t('searchPage.filters.customTimeframe') },
                          ],
                          latestUpdateDate: [
                            { value: 'never', label: t('initiativeList.noHealth') },
                            ...SEARCH_DATE_WINDOWS.map((window) => ({
                              value: advancedDateWindow(window, 'last'),
                              label: t(`searchPage.filters.dateWindows.${window}`),
                            })),
                            { value: 'custom', label: t('searchPage.filters.customTimeframe') },
                          ],
                        } satisfies Partial<
                          Record<ProjectFilterField, { value: string; label: string }[]>
                        >
                      }
                    />
                  ) : null}
                  <InitiativeDateFilterEditor
                    open={activeFilter === 'dates'}
                    activeDateField={activeDateField}
                    dateFilters={dateFilters}
                    dateFieldLabels={dateFieldLabels}
                    onActiveDateFieldChange={setActiveDateField}
                    onDateFilterChange={handlers.onDateFilterChange}
                    applyFilterChange={applyFilterChange}
                    clearDateFilter={clearDateFilter}
                  />
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
                          onClick={() => {
                            setActiveFilter(filter);
                            setActiveDateField(null);
                            if (filter === 'advanced') handlers.onAdvancedFilterChange(true);
                          }}
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
          {activeFilterChips.map(({ filter, key, label, value, dateField }) => (
            <Group key={key} gap={0} wrap="nowrap">
              <Button
                type="button"
                variant="default"
                color="gray"
                size="compact-xs"
                radius="xl"
                aria-label={value ? `${label}: ${value}` : label}
                styles={{ root: { borderTopRightRadius: 0, borderBottomRightRadius: 0 } }}
                onClick={() => {
                  setActiveFilter(filter);
                  setActiveDateField(dateField ?? null);
                  handlers.onFilterOpenedChange(true);
                }}
              >
                {value ? `${label}: ${value}` : label}
              </Button>
              <ActionIcon
                type="button"
                variant="default"
                color="gray"
                size="xs"
                radius="xl"
                aria-label={
                  filter === 'advanced'
                    ? t('projectList.removeAdvancedFilter')
                    : t('initiativeList.removeFilter', { filter: label })
                }
                styles={{ root: { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 } }}
                onClick={() => (dateField ? clearDateFilter(dateField) : clearFilter(filter))}
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
