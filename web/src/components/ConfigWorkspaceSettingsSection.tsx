import { Box, Button, Group, Select, Stack, TextInput, Title } from '@mantine/core';
import { SaveFeedback } from '../design-system/SaveFeedback.tsx';
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
      <Box component="form" onSubmit={handlers.onSaveWorkspace}>
        <Stack gap="md" maw={480}>
          <Box
            component="fieldset"
            disabled={workspaceSaving}
            style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
          >
            <Stack gap="md" maw={480} aria-busy={workspaceSaving}>
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
            </Stack>
          </Box>
          <SaveFeedback
            saving={workspaceSaving}
            saved={workspaceSaved}
            error={workspaceSaveError}
            savingLabel={t('workspaceSave.saving')}
            savedLabel={t('config.saved')}
            failureLabel={t('workspaceSave.failed')}
            retryLabel={t('workspaceSave.retry')}
            onRetry={handlers.onRetryWorkspaceSave}
          />
          <Group>
            <Button type="submit" loading={workspaceSaving}>
              {t('config.saveWorkspace')}
            </Button>
          </Group>
        </Stack>
      </Box>
    </Stack>
  );
}
