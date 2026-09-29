import { Box, Button, Group, Select, Stack, TextInput, Title } from '@mantine/core';
import type { useTranslation } from 'react-i18next';
import type { useConfigPagePresenter } from '../presenters/ConfigPages.tsx';

type Presenter = ReturnType<typeof useConfigPagePresenter>;

export function ConfigWorkspaceSettingsSection({
  model,
  handlers,
  t,
}: {
  model: Pick<Presenter, 'workspace' | 'timeZones' | 'languages'>;
  handlers: Pick<
    Presenter['handlers'],
    | 'onSaveWorkspace'
    | 'onWorkspaceNameChange'
    | 'onWorkspaceTimezoneChange'
    | 'onWorkspaceLocaleChange'
  >;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const { workspace, timeZones, languages } = model;

  return (
    <Stack gap="md" component="section" aria-label={t('config.workspace')}>
      <Title order={4}>{t('config.workspace')}</Title>
      <Box component="form" onSubmit={handlers.onSaveWorkspace}>
        <Stack gap="md" maw={480}>
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
            <Button type="submit">{t('config.saveWorkspace')}</Button>
          </Group>
        </Stack>
      </Box>
    </Stack>
  );
}
