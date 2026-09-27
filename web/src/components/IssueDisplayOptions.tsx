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
import { IconAdjustments } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type {
  CompletedIssuesFilter,
  IssueDisplayProperty,
  IssueGroupBy,
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
  onOrderByChange,
  subGroupBy,
  direction,
  completedIssues,
  showSubIssues,
  nestedSubIssues,
  showEmptyGroups,
  displayProperties,
  onSubGroupByChange,
  onDirectionChange,
  onCompletedIssuesChange,
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
  onOrderByChange: (orderBy: string) => void;
  subGroupBy: IssueGroupBy;
  direction: 'asc' | 'desc';
  completedIssues: CompletedIssuesFilter;
  showSubIssues: boolean;
  nestedSubIssues: 'showMatching' | 'showAll';
  showEmptyGroups: boolean;
  displayProperties: string[];
  onSubGroupByChange: (groupBy: string) => void;
  onDirectionChange: (direction: 'asc' | 'desc') => void;
  onCompletedIssuesChange: (filter: CompletedIssuesFilter) => void;
  onShowSubIssuesChange: (show: boolean) => void;
  onNestedSubIssuesChange: (mode: 'showMatching' | 'showAll') => void;
  onShowEmptyGroupsChange: (show: boolean) => void;
  onDisplayPropertyToggle: (property: IssueDisplayProperty) => void;
}) {
  const { t } = useTranslation();
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
            onChange={(event) => onGroupByChange(event.currentTarget.value)}
            data={groupOptions}
          />
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
      </Popover.Dropdown>
    </Popover>
  );
}
