import {
  ActionIcon,
  Box,
  Button,
  Checkbox,
  Group,
  MultiSelect,
  Popover,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
} from '@mantine/core';
import { IconAdjustments, IconFilter } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import type { Label } from '../types.ts';
import { PROJECT_DISPLAY_PROPERTIES } from '../project-display.ts';
import type { ProjectDisplayProperty } from '../project-display.ts';
import { useProjectWorkflow, projectWorkflowStatusLabel } from '../project-workflow.tsx';

export type ProjectListControlsModel = {
  search: string;
  statuses: string[];
  priorities: string[];
  healths: string[];
  labels: string[];
  groupBy: string;
  orderBy: string;
  direction: string;
  closed: string;
  view: string;
  columnsBy: string;
  rowsBy: string;
  showEmptyColumns: boolean;
  showProjectList: boolean;
  showWeekNumbers: boolean;
  displayProperties: ProjectDisplayProperty[];
  dateField: string;
  dateFrom: string;
  dateTo: string;
  milestones: string[];
  relations: string[];
  availableMilestones: string[];
  availableLabels: Label[];
  filterCount: number;
  handlers: {
    onSearchChange: (value: string) => void;
    onStatusesChange: (value: string[]) => void;
    onPrioritiesChange: (value: string[]) => void;
    onHealthsChange: (value: string[]) => void;
    onLabelsChange: (value: string[]) => void;
    onDateFieldChange: (value: string | null) => void;
    onDateFromChange: (value: string) => void;
    onDateToChange: (value: string) => void;
    onMilestonesChange: (value: string[]) => void;
    onRelationsChange: (value: string[]) => void;
    onGroupByChange: (value: string | null) => void;
    onOrderByChange: (value: string | null) => void;
    onDirectionChange: (value: string | null) => void;
    onClosedChange: (value: string | null) => void;
    onViewChange: (value: 'list' | 'board' | 'timeline') => void;
    onColumnsByChange: (value: string | null) => void;
    onRowsByChange: (value: string | null) => void;
    onShowEmptyColumnsChange: (value: boolean) => void;
    onShowProjectListChange: (value: boolean) => void;
    onShowWeekNumbersChange: (value: boolean) => void;
    onDisplayPropertyToggle: (property: ProjectDisplayProperty) => void;
    onReset: () => void;
  };
};

export function ProjectListControls({
  model,
  compact = false,
  leading,
}: {
  model: ProjectListControlsModel;
  compact?: boolean;
  leading?: ReactNode;
}) {
  const { t } = useTranslation();
  const { statuses: projectStatuses } = useProjectWorkflow();
  const { handlers } = model;
  return (
    <Group
      gap={compact ? 4 : 'xs'}
      align={compact ? 'center' : 'flex-end'}
      wrap="wrap"
      mb={compact ? 0 : 'sm'}
    >
      {compact && leading ? <Box style={{ marginRight: 'auto' }}>{leading}</Box> : leading}
      {!compact ? (
        <>
          <TextInput
            aria-label={t('projectList.search')}
            placeholder={t('projectList.searchPlaceholder')}
            value={model.search}
            onChange={(event) => handlers.onSearchChange(event.currentTarget.value)}
            w={240}
          />
          <Group gap={4} role="group" aria-label={t('projectList.view')}>
            <Button
              type="button"
              size="sm"
              variant={model.view === 'list' ? 'filled' : 'default'}
              aria-pressed={model.view === 'list'}
              onClick={() => handlers.onViewChange('list')}
            >
              {t('projectList.viewList')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={model.view === 'board' ? 'filled' : 'default'}
              aria-pressed={model.view === 'board'}
              onClick={() => handlers.onViewChange('board')}
            >
              {t('projectList.viewBoard')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={model.view === 'timeline' ? 'filled' : 'default'}
              aria-pressed={model.view === 'timeline'}
              onClick={() => handlers.onViewChange('timeline')}
            >
              {t('projectList.viewTimeline')}
            </Button>
          </Group>
        </>
      ) : null}
      <Popover position="bottom-start" shadow="md" withinPortal>
        <Popover.Target>
          {compact ? (
            <ActionIcon
              type="button"
              variant="default"
              size={30}
              aria-label={t('projectList.addFilter')}
              title={t('projectList.addFilter')}
            >
              <IconFilter size={16} stroke={1.7} aria-hidden="true" />
            </ActionIcon>
          ) : (
            <Button type="button" variant="default" size="sm">
              {t('projectList.addFilter')}
              {model.filterCount > 0 ? ` · ${model.filterCount}` : ''}
            </Button>
          )}
        </Popover.Target>
        <Popover.Dropdown w={300}>
          <Stack gap="sm">
            {compact ? (
              <TextInput
                aria-label={t('projectList.search')}
                label={t('projectList.search')}
                placeholder={t('projectList.searchPlaceholder')}
                value={model.search}
                onChange={(event) => handlers.onSearchChange(event.currentTarget.value)}
              />
            ) : null}
            <MultiSelect
              aria-label={t('filters.projectStatus')}
              label={t('filters.projectStatus')}
              value={model.statuses}
              onChange={handlers.onStatusesChange}
              data={projectStatuses.map((status) => ({
                value: status.id,
                label: projectWorkflowStatusLabel(status.id, projectStatuses, t),
              }))}
              searchable
              comboboxProps={{ withinPortal: false }}
            />
            <Select
              aria-label={t('projectList.filterDateField')}
              label={t('projectList.filterDates')}
              placeholder={t('projectList.chooseDateField')}
              value={model.dateField || null}
              onChange={handlers.onDateFieldChange}
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
                  label={t('projectList.dateFrom')}
                  type="date"
                  value={model.dateFrom}
                  onChange={(event) => handlers.onDateFromChange(event.currentTarget.value)}
                />
                <TextInput
                  aria-label={t('projectList.dateTo')}
                  label={t('projectList.dateTo')}
                  type="date"
                  value={model.dateTo}
                  onChange={(event) => handlers.onDateToChange(event.currentTarget.value)}
                />
              </Group>
            ) : null}
            <MultiSelect
              aria-label={t('projectList.filterMilestones')}
              label={t('projectList.filterMilestones')}
              value={model.milestones}
              onChange={handlers.onMilestonesChange}
              data={model.availableMilestones}
              searchable
              comboboxProps={{ withinPortal: false }}
            />
            <MultiSelect
              aria-label={t('projectList.filterRelations')}
              label={t('projectList.filterRelations')}
              value={model.relations}
              onChange={handlers.onRelationsChange}
              data={[
                { value: 'blocks', label: t('projectDependencies.kindOptions.blocks') },
                { value: 'blocked_by', label: t('projectDependencies.kindOptions.blocked_by') },
                { value: 'related', label: t('projectDependencies.kindOptions.related') },
              ]}
              searchable
              comboboxProps={{ withinPortal: false }}
            />
            <MultiSelect
              aria-label={t('filters.projectPriority')}
              label={t('filters.projectPriority')}
              value={model.priorities}
              onChange={handlers.onPrioritiesChange}
              data={[0, 1, 2, 3, 4].map((priority) => ({
                value: String(priority),
                label: t(`priority.${priority}`),
              }))}
              searchable
              comboboxProps={{ withinPortal: false }}
            />
            <MultiSelect
              aria-label={t('projectList.filterHealth')}
              label={t('projectList.filterHealth')}
              value={model.healths}
              onChange={handlers.onHealthsChange}
              data={['none', 'on_track', 'at_risk', 'off_track'].map((health) => ({
                value: health,
                label: t(`projectHealth.status.${health}`),
              }))}
              searchable
              comboboxProps={{ withinPortal: false }}
            />
            <MultiSelect
              aria-label={t('filters.projectLabels')}
              label={t('filters.projectLabels')}
              value={model.labels}
              onChange={handlers.onLabelsChange}
              data={model.availableLabels.map((label) => ({
                value: label.name,
                label: label.name,
              }))}
              searchable
              comboboxProps={{ withinPortal: false }}
            />
            {model.filterCount > 0 ? (
              <Button type="button" variant="subtle" size="xs" onClick={handlers.onReset}>
                {t('projectList.clearFilters')}
              </Button>
            ) : null}
          </Stack>
        </Popover.Dropdown>
      </Popover>
      <Popover position="bottom-start" shadow="md" withinPortal>
        <Popover.Target>
          {compact ? (
            <ActionIcon
              type="button"
              variant="default"
              size={30}
              aria-label={t('projectList.displayOptions')}
              title={t('projectList.displayOptions')}
            >
              <IconAdjustments size={16} stroke={1.7} aria-hidden="true" />
            </ActionIcon>
          ) : (
            <Button type="button" variant="default" size="sm">
              {t('projectList.displayOptions')}
            </Button>
          )}
        </Popover.Target>
        <Popover.Dropdown w={280}>
          <Stack gap="sm">
            {compact ? (
              <Select
                aria-label={t('projectList.view')}
                label={t('projectList.view')}
                value={model.view}
                onChange={(value) => {
                  if (value === 'list' || value === 'board' || value === 'timeline') {
                    handlers.onViewChange(value);
                  }
                }}
                data={[
                  { value: 'list', label: t('projectList.viewList') },
                  { value: 'board', label: t('projectList.viewBoard') },
                  { value: 'timeline', label: t('projectList.viewTimeline') },
                ]}
                allowDeselect={false}
                comboboxProps={{ withinPortal: false }}
              />
            ) : null}
            {model.view === 'list' || model.view === 'timeline' ? (
              <Select
                aria-label={t('projectList.groupBy')}
                label={t('projectList.groupBy')}
                value={model.groupBy}
                onChange={handlers.onGroupByChange}
                data={[
                  { value: 'none', label: t('projectList.groupNone') },
                  { value: 'status', label: t('projectList.groupStatus') },
                  { value: 'priority', label: t('projectList.groupPriority') },
                ]}
                allowDeselect={false}
                comboboxProps={{ withinPortal: false }}
              />
            ) : (
              <>
                <Select
                  aria-label={t('projectList.columnsBy')}
                  label={t('projectList.columnsBy')}
                  value={model.columnsBy}
                  onChange={handlers.onColumnsByChange}
                  data={[
                    { value: 'status', label: t('projectList.groupStatus') },
                    { value: 'priority', label: t('projectList.groupPriority') },
                  ]}
                  allowDeselect={false}
                  comboboxProps={{ withinPortal: false }}
                />
                <Select
                  aria-label={t('projectList.rowsBy')}
                  label={t('projectList.rowsBy')}
                  value={model.rowsBy}
                  onChange={handlers.onRowsByChange}
                  data={[
                    { value: 'none', label: t('projectList.rowsNone') },
                    { value: 'status', label: t('projectList.groupStatus') },
                    { value: 'priority', label: t('projectList.groupPriority') },
                  ]}
                  allowDeselect={false}
                  comboboxProps={{ withinPortal: false }}
                />
                <Switch
                  label={t('projectList.showEmptyColumns')}
                  checked={model.showEmptyColumns}
                  onChange={(event) =>
                    handlers.onShowEmptyColumnsChange(event.currentTarget.checked)
                  }
                />
              </>
            )}
            {model.view === 'timeline' ? (
              <>
                <Switch
                  label={t('projectList.showProjectList')}
                  checked={model.showProjectList}
                  onChange={(event) =>
                    handlers.onShowProjectListChange(event.currentTarget.checked)
                  }
                />
                <Switch
                  label={t('projectList.showWeekNumbers')}
                  checked={model.showWeekNumbers}
                  onChange={(event) =>
                    handlers.onShowWeekNumbersChange(event.currentTarget.checked)
                  }
                />
              </>
            ) : null}
            <Stack gap={4}>
              <Text size="xs" fw={600} c="dimmed">
                {t('projectList.displayProperties')}
              </Text>
              <SimpleGrid cols={2} spacing={4}>
                {PROJECT_DISPLAY_PROPERTIES.map((property) => (
                  <Checkbox
                    key={property}
                    size="xs"
                    label={t(`projectList.property.${property}`)}
                    checked={model.displayProperties.includes(property)}
                    onChange={() => handlers.onDisplayPropertyToggle(property)}
                  />
                ))}
              </SimpleGrid>
            </Stack>
            <Select
              aria-label={t('projectList.orderBy')}
              label={t('projectList.orderBy')}
              value={model.orderBy}
              onChange={handlers.onOrderByChange}
              data={[
                { value: 'manual', label: t('projectList.orderManual') },
                { value: 'name', label: t('projectList.orderName') },
                { value: 'status', label: t('projectList.orderStatus') },
                { value: 'priority', label: t('projectList.orderPriority') },
                { value: 'startDate', label: t('projectList.orderStartDate') },
                { value: 'targetDate', label: t('projectList.orderTargetDate') },
                { value: 'created', label: t('projectList.orderCreated') },
                { value: 'updated', label: t('projectList.orderUpdated') },
                { value: 'completed', label: t('projectList.orderCompleted') },
              ]}
              allowDeselect={false}
              comboboxProps={{ withinPortal: false }}
            />
            <Select
              aria-label={t('projectList.direction')}
              label={t('projectList.direction')}
              value={model.direction}
              onChange={handlers.onDirectionChange}
              data={[
                { value: 'asc', label: t('projectList.ascending') },
                { value: 'desc', label: t('projectList.descending') },
              ]}
              allowDeselect={false}
              comboboxProps={{ withinPortal: false }}
            />
            <Select
              aria-label={t('projectList.showClosed')}
              label={t('projectList.showClosed')}
              value={model.closed}
              onChange={handlers.onClosedChange}
              data={[
                { value: 'all', label: t('projectList.closedAll') },
                { value: 'open', label: t('projectList.closedOpen') },
                { value: 'closed', label: t('projectList.closedOnly') },
              ]}
              allowDeselect={false}
              comboboxProps={{ withinPortal: false }}
            />
          </Stack>
        </Popover.Dropdown>
      </Popover>
    </Group>
  );
}
