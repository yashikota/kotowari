import {
  Button,
  Group,
  MultiSelect,
  Popover,
  Select,
  Stack,
  Switch,
  TextInput,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { Label } from '../types.ts';

export type ProjectListControlsModel = {
  search: string;
  statuses: string[];
  priorities: string[];
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
  availableLabels: Label[];
  filterCount: number;
  handlers: {
    onSearchChange: (value: string) => void;
    onStatusesChange: (value: string[]) => void;
    onPrioritiesChange: (value: string[]) => void;
    onLabelsChange: (value: string[]) => void;
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
    onReset: () => void;
  };
};

export function ProjectListControls({ model }: { model: ProjectListControlsModel }) {
  const { t } = useTranslation();
  const { handlers } = model;
  return (
    <Group gap="xs" align="flex-end" wrap="wrap" mb="sm">
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
      <Popover position="bottom-start" shadow="md" withinPortal>
        <Popover.Target>
          <Button type="button" variant="default" size="sm">
            {t('projectList.addFilter')}
            {model.filterCount > 0 ? ` · ${model.filterCount}` : ''}
          </Button>
        </Popover.Target>
        <Popover.Dropdown w={300}>
          <Stack gap="sm">
            <MultiSelect
              aria-label={t('filters.projectStatus')}
              label={t('filters.projectStatus')}
              value={model.statuses}
              onChange={handlers.onStatusesChange}
              data={[
                { value: 'backlog', label: t('projectStatus.backlog') },
                { value: 'planned', label: t('projectStatus.planned') },
                { value: 'started', label: t('projectStatus.started') },
                { value: 'completed', label: t('projectStatus.completed') },
                { value: 'canceled', label: t('projectStatus.canceled') },
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
          <Button type="button" variant="default" size="sm">
            {t('projectList.displayOptions')}
          </Button>
        </Popover.Target>
        <Popover.Dropdown w={280}>
          <Stack gap="sm">
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
