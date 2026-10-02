import { Checkbox, Select, Stack, Text, Title } from '@mantine/core';
import { SettingsForm } from '../design-system/SettingsForm.tsx';
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
    | 'issueAutomationSettings'
    | 'issueAutomationSettingsError'
    | 'issueAutomationSettingsSaved'
    | 'issueAutomationSettingsSaving'
  >;
  handlers: Pick<
    Presenter['handlers'],
    | 'onSaveIssueAutomationSettings'
    | 'onRetryIssueAutomationSettingsSave'
    | 'onAutoCloseParentIssuesChange'
    | 'onAutoCloseSubIssuesChange'
    | 'onStatusProgressionOrderChange'
    | 'onAutoCloseStaleIssuesAfterMonthsChange'
    | 'onAutoArchiveClosedIssuesAfterMonthsChange'
  >;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const {
    issueAutomationSettings,
    issueAutomationSettingsError,
    issueAutomationSettingsSaved,
    issueAutomationSettingsSaving,
  } = model;

  return (
    <Stack gap="md" component="section" aria-label={t('config.issueAutomationSettings')}>
      <Title order={4}>{t('config.issueAutomationSettings')}</Title>
      <Text size="sm" c="dimmed">
        {t('config.issueAutomationSettingsDescription')}
      </Text>
      <SettingsForm
        saving={issueAutomationSettingsSaving}
        saved={issueAutomationSettingsSaved}
        error={issueAutomationSettingsError}
        saveLabel={t('config.saveIssueAutomationSettings')}
        labels={{
          saving: t('config.issueAutomationSettingsSaving'),
          saved: t('config.issueAutomationSettingsSaved'),
          failed: t('config.issueAutomationSettingsSaveFailed'),
          retry: t('workspaceSave.retry'),
        }}
        onSave={handlers.onSaveIssueAutomationSettings}
        onRetry={handlers.onRetryIssueAutomationSettingsSave}
      >
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
      </SettingsForm>
    </Stack>
  );
}
