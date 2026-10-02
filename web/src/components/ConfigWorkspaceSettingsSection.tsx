import { Alert, Box, Button, Group, Select, Stack, Text, TextInput, Title } from '@mantine/core';
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
    'workspace' | 'timeZones' | 'languages' | 'workspaceSaving' | 'error' | 'saved'
  >;
  handlers: Pick<
    Presenter['handlers'],
    | 'onSaveWorkspace'
    | 'onWorkspaceNameChange'
    | 'onWorkspaceTimezoneChange'
    | 'onWorkspaceLocaleChange'
  >;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const { workspace, timeZones, languages, workspaceSaving, error, saved } = model;

  return (
    <Stack gap="md" component="section" aria-label={t('config.workspace')}>
      <Title order={4}>{t('config.workspace')}</Title>
      <Box component="form" onSubmit={handlers.onSaveWorkspace}>
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
            <Group>
              <Button type="submit" loading={workspaceSaving}>
                {t('config.saveWorkspace')}
              </Button>
            </Group>
            {error ? (
              <Alert color="red" role="alert">
                {error}
              </Alert>
            ) : null}
            {saved ? (
              <Text role="status" c="dimmed">
                {t('config.saved')}
              </Text>
            ) : null}
          </Stack>
        </Box>
      </Box>
    </Stack>
  );
}
