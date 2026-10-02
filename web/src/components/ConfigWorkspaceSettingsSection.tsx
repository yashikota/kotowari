import { Select, Stack, TextInput, Title } from '@mantine/core';
import { SettingsForm } from '../design-system/SettingsForm.tsx';
import type { useTranslation } from 'react-i18next';
import type { useConfigPagePresenter } from '../presenters/ConfigPages.tsx';

type Presenter = ReturnType<typeof useConfigPagePresenter>;

export function ConfigWorkspaceSettingsSection({
  model,
  handlers,
  t,
}: {
  model: Pick<
    Presenter,
    | 'workspace'
    | 'timeZones'
    | 'languages'
    | 'workspaceSaving'
    | 'workspaceSaveError'
    | 'workspaceSaved'
  >;
  handlers: Pick<
    Presenter['handlers'],
    | 'onSaveWorkspace'
    | 'onRetryWorkspaceSave'
    | 'onWorkspaceNameChange'
    | 'onWorkspaceTimezoneChange'
    | 'onWorkspaceLocaleChange'
  >;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const { workspace, timeZones, languages, workspaceSaving, workspaceSaveError, workspaceSaved } =
    model;

  return (
    <Stack gap="md" component="section" aria-label={t('config.workspace')}>
      <Title order={4}>{t('config.workspace')}</Title>
      <SettingsForm
        saving={workspaceSaving}
        saved={workspaceSaved}
        error={workspaceSaveError}
        saveLabel={t('config.saveWorkspace')}
        labels={{
          saving: t('workspaceSave.saving'),
          saved: t('config.saved'),
          failed: t('workspaceSave.failed'),
          retry: t('workspaceSave.retry'),
        }}
        onSave={handlers.onSaveWorkspace}
        onRetry={handlers.onRetryWorkspaceSave}
      >
        <TextInput
          id="config-ws-name"
          label={t('config.name')}
          value={workspace.name}
          onChange={handlers.onWorkspaceNameChange}
        />
        <Select
          id="config-ws-tz"
          label={t('config.timezone')}
          aria-label={t('config.timezone')}
          searchable
          nothingFoundMessage={t('config.noTimezone')}
          value={workspace.timezone}
          onChange={handlers.onWorkspaceTimezoneChange}
          data={timeZones}
        />
        <Select
          id="config-ws-locale"
          label={t('config.language')}
          aria-label={t('config.language')}
          value={workspace.locale}
          onChange={handlers.onWorkspaceLocaleChange}
          data={languages}
        />
      </SettingsForm>
    </Stack>
  );
}
