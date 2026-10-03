import { GroupOrdering } from '../design-system/GroupOrdering.tsx';
import {
  ActionIcon,
  Box,
  Button,
  Divider,
  Group,
  Popover,
  Select,
  Stack,
  Switch,
  Text,
} from '@mantine/core';
import {
  IconAdjustments,
  IconArrowsSort,
  IconList,
  IconLayoutBoard,
  IconTimeline,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useState, type ReactNode } from 'react';
import type { ProjectListControlsModel } from '../project-list-controls.ts';
import { ProjectFilterPicker } from './ProjectFilterPicker.tsx';
import { ProjectDisplayPropertyOptions } from './ProjectDisplayPropertyOptions.tsx';
import { TIMELINE_PROJECT_DISPLAY_PROPERTIES } from '../project-display.ts';
import type { ProjectBoardGroup } from '../project-board.ts';
import { useProjectWorkflow } from '../project-workflow.tsx';
import type { ProjectGroupBy } from '../project-view-search.ts';
import { PROJECT_BOARD_GROUPINGS } from '../project-board.ts';
import styles from './ProjectListControls.module.css';

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
        <Popover.Dropdown
          w={330}
          className={styles.dropdown}
          data-testid="project-display-options-dropdown"
          style={{ maxHeight: 'calc(100vh - 32px)', overflowY: 'auto' }}
        >
          {model.view === 'board' && groupOrderingOpen ? (
            <ProjectBoardGroupOrdering
              groups={model.boardGroups}
              onBack={() => setGroupOrderingOpen(false)}
              onMove={handlers.onMoveBoardGroup}
              onVisibilityChange={handlers.onBoardGroupVisibilityChange}
            />
          ) : (
            <Stack gap="sm">
              <Group
                gap={4}
                role="tablist"
                aria-label={t('projectList.view')}
                className={styles.viewTabs}
              >
                {(['list', 'board', 'timeline'] as const).map((view) => (
                  <Button
                    key={view}
                    type="button"
                    role="tab"
                    size="xs"
                    variant="subtle"
                    color="gray"
                    leftSection={
                      view === 'list' ? (
                        <IconList size={15} aria-hidden="true" />
                      ) : view === 'board' ? (
                        <IconLayoutBoard size={15} aria-hidden="true" />
                      ) : (
                        <IconTimeline size={15} aria-hidden="true" />
                      )
                    }
                    aria-selected={model.view === view}
                    className={styles.viewTab}
                    onClick={() => handlers.onViewChange(view)}
                  >
                    {t(`projectList.view${view[0].toUpperCase()}${view.slice(1)}`)}
                  </Button>
                ))}
              </Group>
              {model.view === 'list' || model.view === 'timeline' ? (
                <ProjectListSelectRow
                  label={t('projectList.groupBy')}
                  value={model.groupBy}
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
                  onChange={(value) => handlers.onGroupByChange(value as ProjectGroupBy | null)}
                />
              ) : (
                <>
                  <ProjectListSelectRow
                    label={t('projectList.columnsBy')}
                    value={model.columnsBy}
                    onChange={handlers.onColumnsByChange}
                    data={PROJECT_BOARD_GROUPINGS.map((groupBy) => ({
                      value: groupBy,
                      label: t(`projectList.group${groupBy[0]?.toUpperCase()}${groupBy.slice(1)}`),
                    }))}
                    selectWidth={112}
                    dataTestId="project-board-column-controls"
                  >
                    <ActionIcon
                      type="button"
                      variant="default"
                      size={28}
                      aria-label={t('projectList.groupOrdering')}
                      title={t('projectList.groupOrdering')}
                      onClick={() => setGroupOrderingOpen(true)}
                    >
                      <IconArrowsSort size={15} stroke={1.7} aria-hidden="true" />
                    </ActionIcon>
                  </ProjectListSelectRow>
                  <ProjectListSelectRow
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
                  />
                </>
              )}
              {model.view !== 'board' ? <ProjectListOrderControls model={model} /> : null}
              <Divider />
              {model.view !== 'board' ? <ShowClosedProjects model={model} /> : null}
              {model.view === 'board' ? <ProjectListOrderControls model={model} /> : null}
              {model.view === 'board' ? <Divider /> : null}
              {model.view === 'board' ? <ShowClosedProjects model={model} /> : null}
              <Divider />
              {model.view === 'list' ? (
                <ProjectViewOptionsSection label={t('projectList.listOptions')}>
                  <ProjectDisplayPropertyOptions
                    selectedProperties={model.displayProperties}
                    onToggle={handlers.onDisplayPropertyToggle}
                  />
                </ProjectViewOptionsSection>
              ) : null}
              {model.view === 'board' ? (
                <ProjectViewOptionsSection label={t('projectList.boardOptions')}>
                  <ProjectViewSwitchRow
                    label={t('projectList.showEmptyColumns')}
                    checked={model.showEmptyColumns}
                    onChange={handlers.onShowEmptyColumnsChange}
                  />
                  <ProjectDisplayPropertyOptions
                    selectedProperties={model.displayProperties}
                    onToggle={handlers.onDisplayPropertyToggle}
                  />
                </ProjectViewOptionsSection>
              ) : null}
              {model.view === 'timeline' ? (
                <ProjectViewOptionsSection label={t('projectList.timelineOptions')}>
                  <ProjectViewSwitchRow
                    label={t('projectList.showProjectList')}
                    checked={model.showProjectList}
                    onChange={handlers.onShowProjectListChange}
                  />
                  <ProjectViewSwitchRow
                    label={t('projectList.showWeekNumbers')}
                    checked={model.showWeekNumbers}
                    onChange={handlers.onShowWeekNumbersChange}
                  />
                  <ProjectDisplayPropertyOptions
                    selectedProperties={model.displayProperties}
                    onToggle={handlers.onDisplayPropertyToggle}
                    properties={TIMELINE_PROJECT_DISPLAY_PROPERTIES}
                  />
                </ProjectViewOptionsSection>
              ) : null}
              <Divider />
              <Group justify="space-between">
                <Button
                  type="button"
                  variant="subtle"
                  size="xs"
                  aria-label={t('projectList.resetToViewDefault')}
                  onClick={handlers.onReset}
                >
                  {t('projectList.reset')}
                </Button>
              </Group>
            </Stack>
          )}
        </Popover.Dropdown>
      </Popover>
    </Group>
  );
}

function ProjectListOrderControls({ model }: { model: ProjectListControlsModel }) {
  const { t } = useTranslation();
  const { handlers } = model;
  return (
    <ProjectListSelectRow
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
    />
  );
}

function ProjectListSelectRow({
  label,
  value,
  onChange,
  data,
  selectWidth = 112,
  dataTestId,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string | null) => void;
  data: { value: string; label: string }[];
  selectWidth?: number;
  dataTestId?: string;
  children?: ReactNode;
}) {
  return (
    <Group gap="sm" align="center" justify="space-between" wrap="nowrap" data-testid={dataTestId}>
      <Text size="xs" style={{ flex: '1 1 auto', minWidth: 0 }}>
        {label}
      </Text>
      <Group gap={6} align="center" justify="flex-end" wrap="nowrap" style={{ flexShrink: 0 }}>
        {children}
        <Select
          aria-label={label}
          size="xs"
          value={value}
          onChange={onChange}
          data={data}
          w={selectWidth}
          allowDeselect={false}
          comboboxProps={{ withinPortal: false }}
        />
      </Group>
    </Group>
  );
}

function ProjectViewSwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Group justify="space-between" wrap="nowrap">
      <Switch
        label={label}
        labelPosition="left"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
    </Group>
  );
}

function ProjectViewOptionsSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack gap="xs">
      <Text size="xs" fw={600} c="dimmed">
        {label}
      </Text>
      {children}
    </Stack>
  );
}

function ShowClosedProjects({ model }: { model: ProjectListControlsModel }) {
  const { t } = useTranslation();
  return (
    <ProjectListSelectRow
      label={t('projectList.showClosed')}
      value={model.closed}
      onChange={model.handlers.onClosedChange}
      data={[
        { value: 'all', label: t('projectList.closedAll') },
        { value: 'open', label: t('projectList.closedOpen') },
        { value: 'closed', label: t('projectList.closedOnly') },
      ]}
    />
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
  onMove: (key: string, destination: number) => void;
  onVisibilityChange: (key: string, visible: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <GroupOrdering
      groups={groups}
      onBack={onBack}
      onMove={onMove}
      onVisibilityChange={onVisibilityChange}
      dataAttribute="data-project-board-group"
      labels={{
        title: t('projectList.groupOrdering'),
        back: t('projectList.back'),
        moveUp: (group) => t('projectList.moveGroupUp', { group }),
        moveDown: (group) => t('projectList.moveGroupDown', { group }),
        hide: (group) => t('projectList.hideGroup', { group }),
        show: (group) => t('projectList.showGroup', { group }),
      }}
    />
  );
}
