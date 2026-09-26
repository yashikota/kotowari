import {
  ActionIcon,
  Button,
  Checkbox,
  Group,
  NativeSelect,
  Popover,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconAdjustments, IconFilter } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type {
  InitiativeDisplayProperty,
  InitiativeGrouping,
  InitiativeOrderBy,
  InitiativeProjectFilter,
} from '../initiative-list.ts';
import type { InitiativeStatus } from '../types.ts';

const STATUSES: InitiativeStatus[] = ['planned', 'active', 'completed', 'canceled'];
const DISPLAY_PROPERTIES: InitiativeDisplayProperty[] = [
  'id',
  'description',
  'status',
  'projects',
  'activeProjects',
  'targetDate',
  'created',
  'updated',
];

export type InitiativeListControlHandlers = {
  onFilterOpenedChange: (opened: boolean) => void;
  onOptionsOpenedChange: (opened: boolean) => void;
  onStatusFilterChange: (value: string[]) => void;
  onProjectsFilterChange: (value: string) => void;
  onTargetDateFromChange: (value: string) => void;
  onTargetDateToChange: (value: string) => void;
  onGroupByChange: (value: string) => void;
  onOrderByChange: (value: string) => void;
  onDirectionChange: (value: string) => void;
  onDisplayPropertiesChange: (values: InitiativeDisplayProperty[]) => void;
  onClearFilters: () => void;
};

export function InitiativeListControls({
  filterOpened,
  optionsOpened,
  statusFilter,
  projectsFilter,
  targetDateFrom,
  targetDateTo,
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
  projectsFilter: InitiativeProjectFilter;
  targetDateFrom: string;
  targetDateTo: string;
  groupBy: InitiativeGrouping;
  orderBy: InitiativeOrderBy;
  direction: 'asc' | 'desc';
  displayProperties: InitiativeDisplayProperty[];
  hasFilters: boolean;
  handlers: InitiativeListControlHandlers;
}) {
  const { t } = useTranslation();
  return (
    <Group gap="xs" wrap="nowrap">
      <Popover
        opened={filterOpened}
        onChange={handlers.onFilterOpenedChange}
        position="bottom-end"
        shadow="md"
        width={300}
      >
        <Popover.Target>
          <Button
            type="button"
            variant={filterOpened || hasFilters ? 'light' : 'default'}
            leftSection={<IconFilter size={15} aria-hidden />}
            aria-expanded={filterOpened}
            onClick={() => handlers.onFilterOpenedChange(!filterOpened)}
          >
            {t('initiativeList.addFilter')}
          </Button>
        </Popover.Target>
        <Popover.Dropdown>
          <Stack gap="sm">
            <Checkbox.Group
              label={t('initiativeList.status')}
              value={statusFilter}
              onChange={handlers.onStatusFilterChange}
            >
              <Stack gap={6} mt="xs">
                {STATUSES.map((status) => (
                  <Checkbox key={status} value={status} label={t(`initiatives.${status}`)} />
                ))}
              </Stack>
            </Checkbox.Group>
            <NativeSelect
              label={t('initiativeList.projects')}
              value={projectsFilter}
              onChange={(event) => handlers.onProjectsFilterChange(event.currentTarget.value)}
              data={[
                { value: 'all', label: t('initiativeList.allProjects') },
                { value: 'withProjects', label: t('initiativeList.withProjects') },
                { value: 'withoutProjects', label: t('initiativeList.withoutProjects') },
              ]}
            />
            <Text size="xs" fw={600} c="dimmed">
              {t('initiativeList.targetDate')}
            </Text>
            <Group grow>
              <TextInput
                type="date"
                aria-label={t('initiativeList.targetDateFrom')}
                value={targetDateFrom}
                onChange={(event) => handlers.onTargetDateFromChange(event.currentTarget.value)}
              />
              <TextInput
                type="date"
                aria-label={t('initiativeList.targetDateTo')}
                value={targetDateTo}
                onChange={(event) => handlers.onTargetDateToChange(event.currentTarget.value)}
              />
            </Group>
            {hasFilters ? (
              <Button type="button" variant="subtle" onClick={handlers.onClearFilters}>
                {t('initiativeList.clearFilters')}
              </Button>
            ) : null}
          </Stack>
        </Popover.Dropdown>
      </Popover>
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
                { value: 'targetDate', label: t('initiativeList.targetDate') },
                { value: 'updated', label: t('initiativeList.updated') },
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
