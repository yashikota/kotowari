import { ActionIcon, Box, Group, Tabs } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './IssueViewTabs.module.css';

export type IssueView = 'active' | 'backlog' | 'all' | 'archived';

export function IssueViewTabs({
  value,
  onChange,
  onAddNewView,
  actions,
}: {
  value: IssueView;
  onChange: (value: string | null) => void;
  onAddNewView: () => void;
  actions?: ReactNode;
}) {
  const { t } = useTranslation();
  const tabs: { value: IssueView; label: string }[] = [
    { value: 'active', label: t('issueViews.active') },
    { value: 'backlog', label: t('issueViews.backlog') },
    { value: 'all', label: t('issueViews.all') },
  ];
  return (
    <Box className={styles.toolbar}>
      <Group
        component="nav"
        aria-label={t('ui.issueViews')}
        gap="sm"
        wrap="nowrap"
        w="auto"
        className={styles.views}
      >
        <Tabs
          value={value === 'archived' ? null : value}
          onChange={onChange}
          variant="pills"
          color="gray"
          styles={{
            root: { minWidth: 0 },
            list: { gap: 4, borderBottom: 0 },
          }}
        >
          <Tabs.List aria-label={t('ui.issueViews')}>
            {tabs.map((tab) => (
              <Tabs.Tab key={tab.value} value={tab.value} className={styles.tab}>
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
      {actions ? <Box className={styles.actions}>{actions}</Box> : null}
    </Box>
  );
}
