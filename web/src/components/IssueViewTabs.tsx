import { Group, Tabs, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

export type IssueView = 'active' | 'backlog' | 'all' | 'archived';

export function IssueViewTabs({
  value,
  count,
  onChange,
}: {
  value: IssueView;
  count: number;
  onChange: (value: string | null) => void;
}) {
  const { t } = useTranslation();
  const tabs: { value: IssueView; label: string }[] = [
    { value: 'active', label: t('issueViews.active') },
    { value: 'backlog', label: t('issueViews.backlog') },
    { value: 'all', label: t('issueViews.all') },
    { value: 'archived', label: t('issueViews.archived') },
  ];
  return (
    <Group
      component="nav"
      aria-label={t('ui.issueViews')}
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
        <Tabs.List aria-label={t('ui.issueViews')}>
          {tabs.map((tab) => (
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
