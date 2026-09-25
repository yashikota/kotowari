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
import { IconAdjustments } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import type { Label } from '../types.ts';
import { ProjectFilterPicker } from './ProjectFilterPicker.tsx';
import { PROJECT_DISPLAY_PROPERTIES } from '../project-display.ts';
import type { ProjectDisplayProperty } from '../project-display.ts';
import { useProjectWorkflow } from '../project-workflow.tsx';

export type ProjectListControlsModel = {
  search: string;
  searchOperator: 'contains' | 'doesNotContain';
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
  availableProjects?: { value: string; label: string }[];
  specificProject?: string;
  availableLabels: Label[];
  filterCount: number;
  handlers: {
    onSearchChange: (value: string) => void;
    onSearchOperatorChange: (value: string | null) => void;
    onStatusesChange: (value: string[]) => void;
    onPrioritiesChange: (value: string[]) => void;
    onHealthsChange: (value: string[]) => void;
    onLabelsChange: (value: string[]) => void;
    onDateFieldChange: (value: string | null) => void;
    onDateFromChange: (value: string) => void;
    onDateToChange: (value: string) => void;
    onMilestonesChange: (value: string[]) => void;
    onRelationsChange: (value: string[]) => void;
    onSpecificProjectChange: (value: string | null) => void;
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
      <ProjectFilterPicker model={model} projectStatuses={projectStatuses} />
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
