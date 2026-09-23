import { Group, Tabs, Text } from '@mantine/core';

export type IssueView = 'active' | 'backlog' | 'all';

const TABS: { value: IssueView; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'backlog', label: 'Backlog' },
  { value: 'all', label: 'All issues' },
];

export function IssueViewTabs({
  value,
  count,
  onChange,
}: {
  value: IssueView;
  count: number;
  onChange: (value: string | null) => void;
}) {
  return (
    <Group
      component="nav"
      aria-label="Issue views"
      gap="sm"
      wrap="nowrap"
      px="md"
      mih={42}
      style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
    >
      <Tabs
        value={value}
        onChange={onChange}
        variant="default"
        styles={{
          root: { minWidth: 0 },
          list: { gap: 4, borderBottom: 0 },
          tab: { height: 28, paddingInline: 10, fontSize: 'var(--mantine-font-size-xs)' },
        }}
      >
        <Tabs.List aria-label="Issue views">
          {TABS.map((tab) => (
            <Tabs.Tab key={tab.value} value={tab.value}>
              {tab.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>
      <Text size="xs" c="dimmed" ml="auto" aria-live="polite">
        {count}
      </Text>
    </Group>
  );
}
