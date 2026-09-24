import { Button, Group, MultiSelect, Popover, Select, Stack, TextInput } from '@mantine/core';
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
