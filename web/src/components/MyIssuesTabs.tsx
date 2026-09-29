import { Group, Tabs } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { IssueSearch } from '../issue-search.ts';
import styles from './IssueViewTabs.module.css';

export type MyIssuesTab = NonNullable<IssueSearch['myIssuesTab']>;

export function MyIssuesTabs({
  value,
  onChange,
}: {
  value: MyIssuesTab;
  onChange: (value: string | null) => void;
}) {
  const { t } = useTranslation();
  const tabs: { value: MyIssuesTab; label: string }[] = [
    { value: 'assigned', label: t('myIssues.assigned') },
    { value: 'created', label: t('myIssues.created') },
    { value: 'subscribed', label: t('myIssues.subscribed') },
    { value: 'activity', label: t('myIssues.activity') },
  ];
  return (
    <Group
      component="nav"
      aria-label={t('nav.myIssues')}
      gap="sm"
      wrap="nowrap"
      px="sm"
      mih={42}
      style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
    >
      <Tabs
        value={value}
        onChange={onChange}
        variant="pills"
        color="gray"
        styles={{ root: { minWidth: 0 }, list: { gap: 4, borderBottom: 0 } }}
      >
        <Tabs.List aria-label={t('nav.myIssues')}>
          {tabs.map((tab) => (
            <Tabs.Tab key={tab.value} value={tab.value} className={styles.tab}>
              {tab.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>
    </Group>
  );
}
