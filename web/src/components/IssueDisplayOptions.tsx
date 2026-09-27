import {
  ActionIcon,
  Button,
  Checkbox,
  NativeSelect,
  Popover,
  SegmentedControl,
  Stack,
  Text,
  Group,
} from '@mantine/core';
import {
  IconAdjustments,
  IconChevronDown,
  IconChevronLeft,
  IconChevronUp,
  IconGripVertical,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import type {
  CompletedIssuesFilter,
  IssueDisplayProperty,
  IssueGroupBy,
  IssueGroupOption,
  IssueLayout,
  IssueOrderBy,
} from '../issue-list.ts';
import {
  COMPLETED_ISSUES_FILTERS,
  ISSUE_DISPLAY_PROPERTIES,
  ISSUE_GROUP_BY_VALUES,
  ISSUE_ORDER_BY_VALUES,
} from '../issue-list.ts';

export function IssueDisplayOptions({
  layout,
  groupBy,
  orderBy,
  opened,
  onToggle,
  onOpenChange,
  onLayoutChange,
  onGroupByChange,
  groupOptions: issueGroups,
  groupOrder = [],
  hiddenGroups = [],
  onGroupOrderChange,
  onGroupVisibilityChange,
  onOrderByChange,
  subGroupBy,
  direction,
  completedIssues,
  completedByRecency,
  showSubIssues,
  nestedSubIssues,
  showEmptyGroups,
  displayProperties,
  onSubGroupByChange,
  onDirectionChange,
  onCompletedIssuesChange,
  onCompletedByRecencyChange,
  onShowSubIssuesChange,
  onNestedSubIssuesChange,
  onShowEmptyGroupsChange,
  onDisplayPropertyToggle,
}: {
  layout: IssueLayout;
  groupBy: IssueGroupBy;
  orderBy: IssueOrderBy;
  opened: boolean;
  onToggle: () => void;
  onOpenChange: (next: boolean) => void;
  onLayoutChange: (layout: string) => void;
  onGroupByChange: (groupBy: string) => void;
  groupOptions?: IssueGroupOption[];
  groupOrder?: string[];
  hiddenGroups?: string[];
  onGroupOrderChange?: (groupOrder: string[]) => void;
  onGroupVisibilityChange?: (key: string, visible: boolean) => void;
  onOrderByChange: (orderBy: string) => void;
  subGroupBy: IssueGroupBy;
  direction: 'asc' | 'desc';
  completedIssues: CompletedIssuesFilter;
  completedByRecency?: boolean;
  showSubIssues: boolean;
  nestedSubIssues: 'showMatching' | 'showAll';
  showEmptyGroups: boolean;
  displayProperties: string[];
  onSubGroupByChange: (groupBy: string) => void;
  onDirectionChange: (direction: 'asc' | 'desc') => void;
  onCompletedIssuesChange: (filter: CompletedIssuesFilter) => void;
  onCompletedByRecencyChange?: (show: boolean) => void;
  onShowSubIssuesChange: (show: boolean) => void;
  onNestedSubIssuesChange: (mode: 'showMatching' | 'showAll') => void;
  onShowEmptyGroupsChange: (show: boolean) => void;
  onDisplayPropertyToggle: (property: IssueDisplayProperty) => void;
}) {
  const { t } = useTranslation();
  const [groupOrderingOpen, setGroupOrderingOpen] = useState(false);
  const groupOptions = ISSUE_GROUP_BY_VALUES.map((group) => ({
    value: group,
    label: group === 'none' ? t('displayOptions.noGrouping') : t(`displayOptions.group.${group}`),
  }));
  const orderLabels: Record<IssueOrderBy, string> = {
    manual: t('displayOptions.order.manual'),
    title: t('displayOptions.order.title'),
    status: t('field.status'),
    priority: t('field.priority'),
    assignee: t('displayOptions.order.assignee'),
    estimate: t('field.estimate'),
    updated: t('displayOptions.order.updated'),
    created: t('displayOptions.order.created'),
    dueDate: t('issueProperties.dueDate'),
    linkCount: t('displayOptions.order.linkCount'),
    timeInStatus: t('displayOptions.property.timeInStatus'),
  };
  const orderOptions = ISSUE_ORDER_BY_VALUES.map((order) => ({
    value: order,
    label: orderLabels[order],
  }));
  const canManageGroups =
    layout === 'list' &&
    groupBy !== 'none' &&
    issueGroups?.length &&
    onGroupOrderChange &&
    onGroupVisibilityChange;
  return (
    <Popover opened={opened} onChange={onOpenChange} position="bottom-end" shadow="md" width={320}>
      <Popover.Target>
        <ActionIcon
          type="button"
          variant={opened ? 'light' : 'default'}
          color="gray"
          aria-label={t('displayOptions.button')}
          title={t('displayOptions.button')}
          aria-expanded={opened}
          onClick={onToggle}
        >
          <IconAdjustments size={16} stroke={1.7} aria-hidden="true" />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        {groupOrderingOpen && canManageGroups ? (
          <IssueGroupOrdering
            groups={issueGroups}
            groupOrder={groupOrder}
            hiddenGroups={new Set(hiddenGroups)}
            onBack={() => setGroupOrderingOpen(false)}
            onGroupOrderChange={onGroupOrderChange}
            onGroupVisibilityChange={onGroupVisibilityChange}
          />
        ) : (
          <Stack gap="sm">
            <Text id="issue-layout-label" size="xs" fw={600} c="dimmed">
              {t('displayOptions.layout')}
            </Text>
            <SegmentedControl
              aria-labelledby="issue-layout-label"
              value={layout}
              onChange={onLayoutChange}
              data={[
                { value: 'list', label: t('displayOptions.list') },
                { value: 'board', label: t('displayOptions.board') },
              ]}
              fullWidth
            />
            <NativeSelect
              aria-label={t('displayOptions.grouping')}
              label={t('displayOptions.grouping')}
              value={groupBy}
              disabled={layout === 'board'}
              onChange={(event) => {
                setGroupOrderingOpen(false);
                onGroupByChange(event.currentTarget.value);
              }}
              data={groupOptions}
            />
            {canManageGroups ? (
              <Button
                type="button"
                variant="default"
                size="xs"
                rightSection={<IconChevronDown size={14} aria-hidden="true" />}
                onClick={() => setGroupOrderingOpen(true)}
              >
                {t('displayOptions.groupOrdering')}
              </Button>
            ) : null}
            <NativeSelect
              aria-label={t('displayOptions.subGrouping')}
              label={t('displayOptions.subGrouping')}
              value={subGroupBy}
              disabled={layout === 'board' || groupBy === 'none'}
              onChange={(event) => onSubGroupByChange(event.currentTarget.value)}
              data={groupOptions.filter(
                (option) => option.value === 'none' || option.value !== groupBy,
              )}
            />
            {layout === 'board' ? (
              <Text size="xs" c="dimmed">
                {t('displayOptions.boardGroupingHint')}
              </Text>
            ) : null}
            <NativeSelect
              aria-label={t('displayOptions.ordering')}
              label={t('displayOptions.ordering')}
              value={orderBy}
              onChange={(event) => onOrderByChange(event.currentTarget.value)}
              data={orderOptions}
            />
            <Button
              type="button"
              variant="subtle"
              size="xs"
              aria-label={t('displayOptions.direction', {
                direction: t(`displayOptions.${direction}`),
              })}
              onClick={() => onDirectionChange(direction === 'asc' ? 'desc' : 'asc')}
            >
              {t('displayOptions.directionLabel', { direction: t(`displayOptions.${direction}`) })}
            </Button>
            {onCompletedByRecencyChange ? (
              <Checkbox
                size="xs"
                label={t('displayOptions.completedByRecency')}
                checked={completedByRecency ?? false}
                onChange={(event) => onCompletedByRecencyChange(event.currentTarget.checked)}
              />
            ) : null}
            <NativeSelect
              aria-label={t('displayOptions.completedIssues')}
              label={t('displayOptions.completedIssues')}
              value={completedIssues}
              onChange={(event) =>
                onCompletedIssuesChange(event.currentTarget.value as CompletedIssuesFilter)
              }
              data={COMPLETED_ISSUES_FILTERS.map((value) => ({
                value,
                label: t(`displayOptions.completed.${value}`),
              }))}
            />
            <Checkbox
              size="xs"
              label={t('displayOptions.showSubIssues')}
              checked={showSubIssues}
              onChange={(event) => onShowSubIssuesChange(event.currentTarget.checked)}
            />
            <NativeSelect
              aria-label={t('displayOptions.nestedSubIssues')}
              label={t('displayOptions.nestedSubIssues')}
              value={nestedSubIssues}
              disabled={!showSubIssues}
              onChange={(event) =>
                onNestedSubIssuesChange(event.currentTarget.value as 'showMatching' | 'showAll')
              }
              data={[
                { value: 'showMatching', label: t('displayOptions.nested.showMatching') },
                { value: 'showAll', label: t('displayOptions.nested.showAll') },
              ]}
            />
            <Checkbox
              size="xs"
              label={t('displayOptions.showEmptyGroups')}
              checked={showEmptyGroups}
              onChange={(event) => onShowEmptyGroupsChange(event.currentTarget.checked)}
            />
            <Stack gap={4}>
              <Text size="xs" fw={600} c="dimmed">
                {t('displayOptions.properties')}
              </Text>
              <Group gap={4} wrap="wrap" role="group" aria-label={t('displayOptions.properties')}>
                {ISSUE_DISPLAY_PROPERTIES.map((property) => (
                  <Button
                    key={property}
                    type="button"
                    size="compact-xs"
                    radius="xl"
                    color="gray"
                    variant={displayProperties.includes(property) ? 'default' : 'light'}
                    aria-pressed={displayProperties.includes(property)}
                    onClick={() => onDisplayPropertyToggle(property)}
                  >
                    {t(`displayOptions.property.${property}`)}
                  </Button>
                ))}
              </Group>
            </Stack>
            <Text size="xs" c="dimmed">
              {t('displayOptions.shortcut')}
            </Text>
          </Stack>
        )}
      </Popover.Dropdown>
    </Popover>
  );
}

function IssueGroupOrdering({
  groups,
  groupOrder,
  hiddenGroups,
  onBack,
  onGroupOrderChange,
  onGroupVisibilityChange,
}: {
  groups: IssueGroupOption[];
  groupOrder: string[];
  hiddenGroups: ReadonlySet<string>;
  onBack: () => void;
  onGroupOrderChange: (groupOrder: string[]) => void;
  onGroupVisibilityChange: (key: string, visible: boolean) => void;
}) {
  const { t } = useTranslation();
  const orderIndex = new Map(groupOrder.map((key, index) => [key, index]));
  const orderedGroups = [...groups].sort((left, right) => {
    const leftIndex = orderIndex.get(left.key);
    const rightIndex = orderIndex.get(right.key);
    if (leftIndex === undefined) return rightIndex === undefined ? 0 : 1;
    if (rightIndex === undefined) return -1;
    return leftIndex - rightIndex;
  });
  const visibleCount = orderedGroups.filter((group) => !hiddenGroups.has(group.key)).length;

  function moveGroup(key: string, destinationIndex: number) {
    const next = [...orderedGroups];
    const sourceIndex = next.findIndex((group) => group.key === key);
    if (sourceIndex < 0 || destinationIndex < 0 || destinationIndex >= next.length) return;
    const [group] = next.splice(sourceIndex, 1);
    next.splice(destinationIndex, 0, group!);
    onGroupOrderChange(next.map((item) => item.key));
  }

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
          {t('displayOptions.back')}
        </Button>
        <Text size="sm" fw={600}>
          {t('displayOptions.groupOrdering')}
        </Text>
      </Group>
      <Stack gap={4} role="list" aria-label={t('displayOptions.groupOrdering')}>
        {orderedGroups.map((group, index) => {
          const visible = !hiddenGroups.has(group.key);
          return (
            <Group
              key={group.key}
              role="listitem"
              data-issue-group={group.key}
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
                const sourceIndex = orderedGroups.findIndex((item) => item.key === sourceKey);
                moveGroup(sourceKey, sourceIndex < index ? index : index);
              }}
              style={{
                borderRadius: 'var(--mantine-radius-sm)',
                background: visible ? undefined : 'var(--mantine-color-default-hover)',
                cursor: 'grab',
                opacity: visible ? 1 : 0.68,
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
                aria-label={t('displayOptions.moveGroupUp', { group: group.label })}
                disabled={index === 0}
                onClick={() => moveGroup(group.key, index - 1)}
              >
                <IconChevronUp size={14} aria-hidden="true" />
              </ActionIcon>
              <ActionIcon
                type="button"
                variant="subtle"
                size="sm"
                aria-label={t('displayOptions.moveGroupDown', { group: group.label })}
                disabled={index === orderedGroups.length - 1}
                onClick={() => moveGroup(group.key, index + 1)}
              >
                <IconChevronDown size={14} aria-hidden="true" />
              </ActionIcon>
              <Button
                type="button"
                variant="subtle"
                size="compact-xs"
                aria-pressed={visible}
                aria-label={t(visible ? 'displayOptions.hideGroup' : 'displayOptions.showGroup', {
                  group: group.label,
                })}
                disabled={visible && visibleCount <= 1}
                onClick={() => onGroupVisibilityChange(group.key, !visible)}
              >
                {t(visible ? 'displayOptions.hideGroup' : 'displayOptions.showGroup', {
                  group: group.label,
                })}
              </Button>
            </Group>
          );
        })}
      </Stack>
    </Stack>
  );
}
