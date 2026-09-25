import {
  ActionIcon,
  Button,
  Checkbox,
  NativeSelect,
  Popover,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
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

const DISPLAY_PROPERTIES: IssueDisplayProperty[] = [
  'id',
  'status',
  'assignee',
  'priority',
  'project',
  'dueDate',
  'milestone',
  'cycle',
  'estimate',
  'labels',
  'links',
  'pullRequests',
  'timeInStatus',
  'created',
  'updated',
];
const COMPLETED_OPTIONS: CompletedIssuesFilter[] = [
  'all',
  'pastDay',
  'pastWeek',
  'pastMonth',
  'currentCycle',
  'none',
];

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
  const groupOptions = [
    { value: 'none', label: t('displayOptions.noGrouping') },
    ...(
      [
        'status',
        'assignee',
        'agent',
        'project',
        'priority',
        'cycle',
        'label',
        'parent',
        'type',
        'estimate',
      ] as const
    ).map((group) => ({ value: group, label: t(`displayOptions.group.${group}`) })),
  ];
  const orderOptions = [
    { value: 'manual', label: t('displayOptions.order.manual') },
    { value: 'title', label: t('displayOptions.order.title') },
    { value: 'status', label: t('field.status') },
    { value: 'priority', label: t('field.priority') },
    { value: 'assignee', label: t('displayOptions.order.assignee') },
    { value: 'estimate', label: t('field.estimate') },
    { value: 'updated', label: t('displayOptions.order.updated') },
    { value: 'created', label: t('displayOptions.order.created') },
    { value: 'dueDate', label: t('issueProperties.dueDate') },
    { value: 'linkCount', label: t('displayOptions.order.linkCount') },
    { value: 'timeInStatus', label: t('displayOptions.property.timeInStatus') },
  ];
  return (
    <Popover opened={opened} onChange={onOpenChange} position="bottom-end" shadow="md" width={280}>
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
            data={COMPLETED_OPTIONS.map((value) => ({
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
            <SimpleGrid cols={2} spacing={4}>
              {DISPLAY_PROPERTIES.map((property) => (
                <Checkbox
                  key={property}
                  size="xs"
                  label={t(`displayOptions.property.${property}`)}
                  checked={displayProperties.includes(property)}
                  onChange={() => onDisplayPropertyToggle(property)}
                />
              ))}
            </SimpleGrid>
          </Stack>
          <Text size="xs" c="dimmed">
            {t('displayOptions.shortcut')}
          </Text>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
