import { Button, NativeSelect, Popover, SegmentedControl, Stack, Text } from '@mantine/core';
import type { IssueGroupBy, IssueLayout, IssueOrderBy } from '../issue-list.ts';

const GROUPING_OPTIONS = [
  { value: 'none', label: 'No grouping' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'project', label: 'Project' },
  { value: 'cycle', label: 'Cycle' },
  { value: 'parent', label: 'Parent issue' },
];

const ORDER_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'priority', label: 'Priority' },
  { value: 'updated', label: 'Last updated' },
  { value: 'dueDate', label: 'Due date' },
  { value: 'title', label: 'Title' },
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
}) {
  return (
    <Popover opened={opened} onChange={onOpenChange} position="bottom-end" shadow="md" width={280}>
      <Popover.Target>
        <Button
          type="button"
          size="xs"
          variant={opened ? 'light' : 'default'}
          aria-label="Display options"
          aria-expanded={opened}
          onClick={onToggle}
        >
          Display
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          <Text id="issue-layout-label" size="xs" fw={600} c="dimmed">
            Layout
          </Text>
          <SegmentedControl
            aria-labelledby="issue-layout-label"
            value={layout}
            onChange={onLayoutChange}
            data={[
              { value: 'list', label: 'List' },
              { value: 'board', label: 'Board' },
            ]}
            fullWidth
          />
          <NativeSelect
            aria-label="Group by"
            label="Group by"
            value={groupBy}
            disabled={layout === 'board'}
            onChange={(event) => onGroupByChange(event.currentTarget.value)}
            data={GROUPING_OPTIONS}
          />
          {layout === 'board' ? (
            <Text size="xs" c="dimmed">
              Board columns are grouped by status.
            </Text>
          ) : null}
          <NativeSelect
            aria-label="Order by"
            label="Order by"
            value={orderBy}
            onChange={(event) => onOrderByChange(event.currentTarget.value)}
            data={ORDER_OPTIONS}
          />
          <Text size="xs" c="dimmed">
            Shortcut: Ctrl/⌘ B switches layout
          </Text>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
