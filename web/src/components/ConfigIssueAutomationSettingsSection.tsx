import { Alert, Box, Button, Checkbox, Group, Select, Stack, Text, Title } from '@mantine/core';
import type { useTranslation } from 'react-i18next';
import type { useConfigPagePresenter } from '../presenters/ConfigPages.tsx';

type Presenter = ReturnType<typeof useConfigPagePresenter>;

export function ConfigIssueAutomationSettingsSection({
  model,
  handlers,
  t,
}: {
  model: Pick<
    Presenter,
    'issueAutomationSettings' | 'issueAutomationSettingsError' | 'issueAutomationSettingsSaved'
  >;
  handlers: Pick<
    Presenter['handlers'],
    | 'onSaveIssueAutomationSettings'
    | 'onAutoCloseParentIssuesChange'
    | 'onAutoCloseSubIssuesChange'
    | 'onStatusProgressionOrderChange'
    | 'onAutoCloseStaleIssuesAfterMonthsChange'
    | 'onAutoArchiveClosedIssuesAfterMonthsChange'
  >;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const { issueAutomationSettings, issueAutomationSettingsError, issueAutomationSettingsSaved } =
    model;

  return (
    <Stack gap="md" component="section" aria-label={t('config.issueAutomationSettings')}>
      <Title order={4}>{t('config.issueAutomationSettings')}</Title>
      <Text size="sm" c="dimmed">
        {t('config.issueAutomationSettingsDescription')}
      </Text>
      {issueAutomationSettingsError ? (
        <Alert color="red" variant="light">
          {issueAutomationSettingsError}
        </Alert>
      ) : null}
      {issueAutomationSettingsSaved ? (
        <Alert color="green" variant="light">
          {t('config.issueAutomationSettingsSaved')}
        </Alert>
      ) : null}
      <Box component="form" onSubmit={handlers.onSaveIssueAutomationSettings}>
        <Stack gap="md" maw={480}>
          <Checkbox
            label={t('config.autoCloseParentIssues')}
            description={t('config.autoCloseParentIssuesDescription')}
            checked={issueAutomationSettings.autoCloseParentIssues}
            onChange={handlers.onAutoCloseParentIssuesChange}
          />
          <Checkbox
            label={t('config.autoCloseSubIssues')}
            description={t('config.autoCloseSubIssuesDescription')}
            checked={issueAutomationSettings.autoCloseSubIssues}
            onChange={handlers.onAutoCloseSubIssuesChange}
          />
          <Select
            label={t('config.statusProgressionOrder')}
            description={t('config.statusProgressionOrderDescription')}
            value={issueAutomationSettings.statusProgressionOrder}
            onChange={handlers.onStatusProgressionOrderChange}
            data={[
              { value: 'first', label: t('config.statusProgressionFirst') },
              { value: 'last', label: t('config.statusProgressionLast') },
              { value: 'no_action', label: t('config.statusProgressionNoAction') },
            ]}
          />
          <Select
            label={t('config.autoCloseStaleIssues')}
            description={t('config.autoCloseStaleIssuesDescription')}
            value={String(issueAutomationSettings.autoCloseStaleIssuesAfterMonths)}
            onChange={handlers.onAutoCloseStaleIssuesAfterMonthsChange}
            data={[0, 1, 3, 6, 12].map((months) => ({
              value: String(months),
              label:
                months === 0
                  ? t('config.automationOff')
                  : t('config.automationMonths', { count: months }),
            }))}
          />
          <Select
            label={t('config.autoArchiveCompletedItems')}
            description={t('config.autoArchiveCompletedItemsDescription')}
            value={String(issueAutomationSettings.autoArchiveClosedIssuesAfterMonths)}
            onChange={handlers.onAutoArchiveClosedIssuesAfterMonthsChange}
            data={[0, 1, 3, 6, 12].map((months) => ({
              value: String(months),
              label:
                months === 0
                  ? t('config.automationOff')
                  : t('config.automationMonths', { count: months }),
            }))}
          />
          <Group>
            <Button type="submit">{t('config.saveIssueAutomationSettings')}</Button>
          </Group>
        </Stack>
      </Box>
    </Stack>
  );
}
