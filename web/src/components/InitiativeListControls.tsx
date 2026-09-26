import { ActionIcon, Checkbox, Group, NativeSelect, Popover, Stack } from '@mantine/core';
import { IconAdjustments } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type {
  InitiativeDateFilters,
  InitiativeDisplayProperty,
  InitiativeGrouping,
  InitiativeOrderBy,
  InitiativeProjectFilter,
} from '../initiative-list.ts';
import type { InitiativeFilterHandlers } from './InitiativeFilterPicker.tsx';
import { InitiativeFilterPicker } from './InitiativeFilterPicker.tsx';
import type { InitiativeStatus, ProjectHealth } from '../types.ts';

const DISPLAY_PROPERTIES: InitiativeDisplayProperty[] = [
  'id',
  'description',
  'health',
  'priority',
  'labels',
  'status',
  'projects',
  'activeProjects',
  'targetDate',
  'created',
  'updated',
  'completed',
];

export type InitiativeListControlHandlers = InitiativeFilterHandlers & {
  onOptionsOpenedChange: (opened: boolean) => void;
  onGroupByChange: (value: string) => void;
  onOrderByChange: (value: string) => void;
  onDirectionChange: (value: string) => void;
  onDisplayPropertiesChange: (values: InitiativeDisplayProperty[]) => void;
};

export function InitiativeListControls({
  filterOpened,
  optionsOpened,
  statusFilter,
  priorityFilter,
  healthFilter,
  labelFilter,
  dateFilters,
  labels,
  projectsFilter,
  groupBy,
  orderBy,
  direction,
  displayProperties,
  hasFilters,
  handlers,
}: {
  filterOpened: boolean;
  optionsOpened: boolean;
  statusFilter: InitiativeStatus[];
  priorityFilter: number[];
  healthFilter: ProjectHealth[];
  labelFilter: string[];
  dateFilters: InitiativeDateFilters;
  labels: string[];
  projectsFilter: InitiativeProjectFilter;
  groupBy: InitiativeGrouping;
  orderBy: InitiativeOrderBy;
  direction: 'asc' | 'desc';
  displayProperties: InitiativeDisplayProperty[];
  hasFilters: boolean;
  handlers: InitiativeListControlHandlers;
}) {
  const { t } = useTranslation();

  return (
    <Group gap="xs" wrap="nowrap" align="flex-start">
      <InitiativeFilterPicker
        filterOpened={filterOpened}
        statusFilter={statusFilter}
        priorityFilter={priorityFilter}
        healthFilter={healthFilter}
        labelFilter={labelFilter}
        dateFilters={dateFilters}
        labels={labels}
        projectsFilter={projectsFilter}
        hasFilters={hasFilters}
        handlers={handlers}
      />
      <Popover
        opened={optionsOpened}
        onChange={handlers.onOptionsOpenedChange}
        position="bottom-end"
        shadow="md"
        width={280}
      >
        <Popover.Target>
          <ActionIcon
            type="button"
            variant={optionsOpened ? 'light' : 'default'}
            color="gray"
            aria-label={t('initiativeList.displayOptions')}
            title={t('initiativeList.displayOptions')}
            aria-expanded={optionsOpened}
            onClick={() => handlers.onOptionsOpenedChange(!optionsOpened)}
          >
            <IconAdjustments size={16} aria-hidden />
          </ActionIcon>
        </Popover.Target>
        <Popover.Dropdown>
          <Stack gap="sm">
            <NativeSelect
              label={t('initiativeList.grouping')}
              value={groupBy}
              onChange={(event) => handlers.onGroupByChange(event.currentTarget.value)}
              data={[
                { value: 'none', label: t('initiativeList.noGrouping') },
                { value: 'status', label: t('initiativeList.status') },
              ]}
            />
            <NativeSelect
              label={t('initiativeList.ordering')}
              value={orderBy}
              onChange={(event) => handlers.onOrderByChange(event.currentTarget.value)}
              data={[
                { value: 'manual', label: t('initiativeList.manual') },
                { value: 'name', label: t('initiativeList.name') },
                { value: 'status', label: t('initiativeList.status') },
                { value: 'priority', label: t('initiativeList.priority') },
                { value: 'health', label: t('initiativeList.health') },
                { value: 'targetDate', label: t('initiativeList.targetDate') },
                { value: 'created', label: t('initiativeList.created') },
                { value: 'updated', label: t('initiativeList.updated') },
                { value: 'completed', label: t('initiativeList.completed') },
              ]}
            />
            <NativeSelect
              label={t('initiativeList.direction')}
              value={direction}
              onChange={(event) => handlers.onDirectionChange(event.currentTarget.value)}
              data={[
                { value: 'asc', label: t('initiativeList.ascending') },
                { value: 'desc', label: t('initiativeList.descending') },
              ]}
            />
            <Checkbox.Group
              label={t('initiativeList.displayProperties')}
              value={displayProperties}
              onChange={(values) =>
                handlers.onDisplayPropertiesChange(values as InitiativeDisplayProperty[])
              }
            >
              <Stack gap={6} mt="xs">
                {DISPLAY_PROPERTIES.map((property) => (
                  <Checkbox
                    key={property}
                    value={property}
                    label={t(`initiativeList.property.${property}`)}
                  />
                ))}
              </Stack>
            </Checkbox.Group>
          </Stack>
        </Popover.Dropdown>
      </Popover>
    </Group>
  );
}
