import { ActionIcon, Group, Tabs } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export type IssueView = 'active' | 'backlog' | 'all' | 'archived';

export function IssueViewTabs({
  value,
  onChange,
  onAddNewView,
}: {
  value: IssueView;
  onChange: (value: string | null) => void;
  onAddNewView: () => void;
}) {
  const { t } = useTranslation();
  const tabs: { value: IssueView; label: string }[] = [
    { value: 'active', label: t('issueViews.active') },
    { value: 'backlog', label: t('issueViews.backlog') },
    { value: 'all', label: t('issueViews.all') },
  ];
  return (
    <Group
      component="nav"
      aria-label={t('ui.issueViews')}
      gap="sm"
      wrap="nowrap"
      px="sm"
      mih={42}
      style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
    >
      <Tabs
        value={value === 'archived' ? null : value}
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
      <ActionIcon
        type="button"
        variant="subtle"
        color="gray"
        aria-label={t('issueViews.addNew')}
        title={t('issueViews.addNew')}
        onClick={onAddNewView}
      >
        <IconPlus size={16} stroke={1.7} aria-hidden="true" />
      </ActionIcon>
    </Group>
  );
}
