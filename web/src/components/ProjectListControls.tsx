import {
  ActionIcon,
  Box,
  Button,
  Checkbox,
  Group,
  Popover,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
} from '@mantine/core';
import {
  IconAdjustments,
  IconChevronDown,
  IconChevronLeft,
  IconChevronUp,
  IconGripVertical,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useState, type ReactNode } from 'react';
import type { Label } from '../types.ts';
import { ProjectFilterPicker } from './ProjectFilterPicker.tsx';
import { PROJECT_DISPLAY_PROPERTIES } from '../project-display.ts';
import type { ProjectDisplayProperty } from '../project-display.ts';
import type { ProjectBoardGroup } from '../project-board.ts';
import { useProjectWorkflow } from '../project-workflow.tsx';
import type {
  ProjectBoardGrouping,
  ProjectFilterGroup,
  ProjectGroupBy,
  ProjectViewSearch,
} from '../project-views.ts';
import { PROJECT_BOARD_GROUPINGS } from '../project-board.ts';

export type ProjectListControlsModel = {
  search: string;
  searchOperator: 'contains' | 'doesNotContain';
  advancedFilter: boolean;
  filterOperator: 'and' | 'or';
  advancedFilterGroup?: ProjectFilterGroup;
  statuses: string[];
  priorities: string[];
  healths: string[];
  labels: string[];
  templates: string[];
  initiatives: string[];
  groupBy: ProjectGroupBy;
  orderBy: NonNullable<ProjectViewSearch['orderBy']>;
  direction: NonNullable<ProjectViewSearch['direction']>;
  closed: string;
  view: string;
  columnsBy: ProjectBoardGrouping;
  rowsBy: 'none' | ProjectBoardGrouping;
  showEmptyColumns: boolean;
  boardGroups: ProjectBoardGroup[];
  showProjectList: boolean;
  showWeekNumbers: boolean;
  displayProperties: ProjectDisplayProperty[];
  dateField: string;
  dateFrom: string;
  dateTo: string;
  milestones: string[];
  relations: string[];
  availableMilestones: string[];
  availableTemplates: { value: string; label: string }[];
  availableInitiatives: { value: string; label: string }[];
  availableProjects?: { value: string; label: string }[];
  specificProject?: string;
  availableLabels: Label[];
  filterCount: number;
  handlers: {
    onAdvancedFilterToggle: () => void;
    onAdvancedFilterGroupChange: (value: ProjectFilterGroup) => void;
    onSearchChange: (value: string) => void;
    onSearchOperatorChange: (value: string | null) => void;
    onStatusesChange: (value: string[]) => void;
    onPrioritiesChange: (value: string[]) => void;
    onHealthsChange: (value: string[]) => void;
    onLabelsChange: (value: string[]) => void;
    onTemplatesChange: (value: string[]) => void;
    onInitiativesChange: (value: string[]) => void;
    onDateFieldChange: (value: string | null) => void;
    onDateFromChange: (value: string) => void;
    onDateToChange: (value: string) => void;
    onMilestonesChange: (value: string[]) => void;
    onRelationsChange: (value: string[]) => void;
    onSpecificProjectChange: (value: string | null) => void;
    onGroupByChange: (value: ProjectGroupBy | null) => void;
    onOrderByChange: (value: string | null) => void;
    onSortProperty: (property: ProjectDisplayProperty | 'name') => void;
    onDirectionChange: (value: string | null) => void;
    onClosedChange: (value: string | null) => void;
    onViewChange: (value: 'list' | 'board' | 'timeline') => void;
    onColumnsByChange: (value: string | null) => void;
    onRowsByChange: (value: string | null) => void;
    onShowEmptyColumnsChange: (value: boolean) => void;
    onMoveBoardGroup: (key: string, destinationIndex: number) => void;
    onBoardGroupVisibilityChange: (key: string, visible: boolean) => void;
    onShowProjectListChange: (value: boolean) => void;
    onShowWeekNumbersChange: (value: boolean) => void;
    onDisplayPropertyToggle: (property: ProjectDisplayProperty) => void;
    onReset: () => void;
  };
};

export function ProjectListControls({
  model,
  compact = false,
  filterPosition,
  leading,
}: {
  model: ProjectListControlsModel;
  compact?: boolean;
  filterPosition?: 'bottom-start' | 'bottom-end';
  leading?: ReactNode;
}) {
  const { t } = useTranslation();
  const [groupOrderingOpen, setGroupOrderingOpen] = useState(false);
  const { statuses: projectStatuses } = useProjectWorkflow();
  const { handlers } = model;
  return (
    <Group
      gap={compact ? 6 : 'xs'}
      align={compact ? 'center' : 'flex-end'}
      wrap="wrap"
      mb={compact ? 0 : 'sm'}
    >
      {compact && leading ? <Box style={{ marginRight: 'auto' }}>{leading}</Box> : leading}
      <ProjectFilterPicker
        model={model}
        projectStatuses={projectStatuses}
        compact={compact}
        position={filterPosition}
      />
      <Popover position="bottom-start" shadow="md" withinPortal>
        <Popover.Target>
          {compact ? (
            <ActionIcon
              type="button"
              variant="default"
              size={28}
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
          {model.view === 'board' && groupOrderingOpen ? (
            <ProjectBoardGroupOrdering
              groups={model.boardGroups}
              onBack={() => setGroupOrderingOpen(false)}
              onMove={handlers.onMoveBoardGroup}
              onVisibilityChange={handlers.onBoardGroupVisibilityChange}
            />
          ) : (
            <Stack gap="sm">
              <Group gap={0} role="tablist" aria-label={t('projectList.view')}>
                {(['list', 'board', 'timeline'] as const).map((view) => (
                  <Button
                    key={view}
                    type="button"
                    role="tab"
                    size="xs"
                    variant={model.view === view ? 'filled' : 'subtle'}
                    aria-selected={model.view === view}
                    onClick={() => handlers.onViewChange(view)}
                  >
                    {t(`projectList.view${view[0].toUpperCase()}${view.slice(1)}`)}
                  </Button>
                ))}
              </Group>
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
                    { value: 'labels', label: t('projectList.groupLabels') },
                    { value: 'lead', label: t('projectList.groupLead') },
                    { value: 'health', label: t('projectList.groupHealth') },
                    { value: 'startDate', label: t('projectList.groupStartDate') },
                    { value: 'targetDate', label: t('projectList.groupTargetDate') },
                  ]}
                  allowDeselect={false}
                  comboboxProps={{ withinPortal: false }}
                />
              ) : (
                <>
                  <Group
                    align="flex-end"
                    gap="xs"
                    wrap="nowrap"
                    data-testid="project-board-column-controls"
                  >
                    <Select
                      aria-label={t('projectList.columnsBy')}
                      label={t('projectList.columnsBy')}
                      value={model.columnsBy}
                      onChange={handlers.onColumnsByChange}
                      data={PROJECT_BOARD_GROUPINGS.map((groupBy) => ({
                        value: groupBy,
                        label: t(
                          `projectList.group${groupBy[0]?.toUpperCase()}${groupBy.slice(1)}`,
                        ),
                      }))}
                      allowDeselect={false}
                      comboboxProps={{ withinPortal: false }}
                      style={{ flex: 1 }}
                    />
                    <Button
                      type="button"
                      variant="default"
                      size="xs"
                      onClick={() => setGroupOrderingOpen(true)}
                    >
                      {t('projectList.groupOrdering')}
                    </Button>
                  </Group>
                  <Select
                    aria-label={t('projectList.rowsBy')}
                    label={t('projectList.rowsBy')}
                    value={model.rowsBy}
                    onChange={handlers.onRowsByChange}
                    data={[
                      { value: 'none', label: t('projectList.rowsNone') },
                      ...PROJECT_BOARD_GROUPINGS.filter(
                        (groupBy) => groupBy !== model.columnsBy,
                      ).map((groupBy) => ({
                        value: groupBy,
                        label: t(
                          `projectList.group${groupBy[0]?.toUpperCase()}${groupBy.slice(1)}`,
                        ),
                      })),
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
                  { value: 'healthUpdated', label: t('projectList.orderHealthUpdated') },
                  { value: 'startDate', label: t('projectList.orderStartDate') },
                  { value: 'targetDate', label: t('projectList.orderTargetDate') },
                  { value: 'created', label: t('projectList.orderCreated') },
                  { value: 'updated', label: t('projectList.orderUpdated') },
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
          )}
        </Popover.Dropdown>
      </Popover>
    </Group>
  );
}

function ProjectBoardGroupOrdering({
  groups,
  onBack,
  onMove,
  onVisibilityChange,
}: {
  groups: ProjectBoardGroup[];
  onBack: () => void;
  onMove: (key: string, destinationIndex: number) => void;
  onVisibilityChange: (key: string, visible: boolean) => void;
}) {
  const { t } = useTranslation();
  const visibleCount = groups.filter((group) => group.visible).length;

  return (
    <Stack gap="xs">
      <Group justify="space-between" wrap="nowrap">
        <Button
          type="button"
          variant="subtle"
          size="xs"
          leftSection={<IconChevronLeft size={14} aria-hidden="true" />}
          onClick={onBack}
        >
          {t('projectList.back')}
        </Button>
        <Text size="sm" fw={600}>
          {t('projectList.groupOrdering')}
        </Text>
      </Group>
      <Stack gap={4} role="list" aria-label={t('projectList.groupOrdering')}>
        {groups.map((group, index) => (
          <Group
            key={group.key}
            role="listitem"
            data-project-board-group={group.key}
            gap={4}
            wrap="nowrap"
            p={4}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData('text/plain', group.key);
              event.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(event) => {
              if (!Array.from(event.dataTransfer.types).includes('text/plain')) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(event) => {
              const sourceKey = event.dataTransfer.getData('text/plain');
              if (!sourceKey || sourceKey === group.key) return;
              event.preventDefault();
              onMove(sourceKey, index);
            }}
            style={{
              borderRadius: 'var(--mantine-radius-sm)',
              background: group.visible ? undefined : 'var(--mantine-color-default-hover)',
              cursor: 'grab',
              opacity: group.visible ? 1 : 0.68,
            }}
          >
            <IconGripVertical size={14} aria-hidden="true" />
            <Text size="sm" truncate style={{ flex: 1 }}>
              {group.label}
            </Text>
            <ActionIcon
              type="button"
              variant="subtle"
              size="sm"
              aria-label={t('projectList.moveGroupUp', { group: group.label })}
              disabled={index === 0}
              onClick={() => onMove(group.key, index - 1)}
            >
              <IconChevronUp size={14} aria-hidden="true" />
            </ActionIcon>
            <ActionIcon
              type="button"
              variant="subtle"
              size="sm"
              aria-label={t('projectList.moveGroupDown', { group: group.label })}
              disabled={index === groups.length - 1}
              onClick={() => onMove(group.key, index + 1)}
            >
              <IconChevronDown size={14} aria-hidden="true" />
            </ActionIcon>
            <Button
              type="button"
              variant="subtle"
              size="compact-xs"
              aria-pressed={group.visible}
              aria-label={t(group.visible ? 'projectList.hideGroup' : 'projectList.showGroup', {
                group: group.label,
              })}
              disabled={group.visible && visibleCount <= 1}
              onClick={() => onVisibilityChange(group.key, !group.visible)}
            >
              {t(group.visible ? 'projectList.hideGroup' : 'projectList.showGroup', {
                group: group.label,
              })}
            </Button>
          </Group>
        ))}
      </Stack>
    </Stack>
  );
}
