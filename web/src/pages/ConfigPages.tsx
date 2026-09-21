import {
  Alert,
  Box,
  Button,
  Group,
  Kbd,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { EmptyState, PageHeader, Pane, SplitLayout } from '../mantine-ui.tsx';
import { useConfigPagePresenter } from '../presenters/ConfigPages.tsx';

export function ConfigPageView({ model }: { model: ReturnType<typeof useConfigPagePresenter> }) {
  const { t } = useTranslation();

  switch (model._view) {
    case 0: {
      const { workspace, timeZones, languages, diagnostics, error, saved, handlers } = model;
      return (
        <SplitLayout single>
          <Pane single>
            <PageHeader title={t('config.title')} />

            {error ? (
              <Alert color="red" variant="light" mb="md">
                {error}
              </Alert>
            ) : null}
            {saved ? (
              <Alert color="green" variant="light" mb="md">
                {t('config.saved')}
              </Alert>
            ) : null}

            <Stack gap="xl">
              <Stack gap="md" component="section" aria-label={t('config.workspace')}>
                <Title order={4}>{t('config.workspace')}</Title>
                <Box component="form" onSubmit={handlers.onSubmit0}>
                  <Stack gap="md" maw={480}>
                    <TextInput
                      id="config-ws-name"
                      label={t('config.name')}
                      value={workspace.name}
                      onChange={handlers.Workspace_name_onChange1}
                    />
                    <Select
                      id="config-ws-tz"
                      label={t('config.timezone')}
                      aria-label={t('config.timezone')}
                      searchable
                      nothingFoundMessage={t('config.noTimezone')}
                      value={workspace.timezone}
                      onChange={handlers.Timezone_onChange2}
                      data={timeZones}
                    />
                    <Select
                      id="config-ws-locale"
                      label={t('config.language')}
                      aria-label={t('config.language')}
                      value={workspace.locale}
                      onChange={handlers.Locale_onChange3}
                      data={languages}
                    />
                    <Group>
                      <Button type="submit">{t('config.saveWorkspace')}</Button>
                    </Group>
                  </Stack>
                </Box>
              </Stack>

              <Stack gap="md" component="section" aria-label={t('config.application')}>
                <Title order={4}>{t('config.application')}</Title>
                <Stack gap="xs" maw={480}>
                  <Button variant="light" onClick={handlers.onClick3}>
                    <Group justify="space-between" w="100%" wrap="nowrap">
                      <span>{t('config.commandPalette')}</span>
                      <Kbd>Mod+K</Kbd>
                    </Group>
                  </Button>
                  <Button variant="light" onClick={handlers.onClick4}>
                    <Group justify="space-between" w="100%" wrap="nowrap">
                      <span>{t('config.keyboardShortcuts')}</span>
                      <Kbd>?</Kbd>
                    </Group>
                  </Button>
                </Stack>
              </Stack>

              <Stack gap="md" component="section" aria-label={t('config.diagnostics')}>
                <Title order={4}>{t('config.diagnostics')}</Title>
                {diagnostics.length === 0 ? (
                  <EmptyState>{t('config.noDiagnostics')}</EmptyState>
                ) : (
                  <Stack gap="sm">
                    {diagnostics.map((d) => (
                      <Alert key={`${d.path}:${d.code}`} color="yellow" title={d.path} variant="light">
                        <Text size="sm">{d.message}</Text>
                        <Text size="xs" c="dimmed" mt={4}>
                          {d.code}
                        </Text>
                      </Alert>
                    ))}
                  </Stack>
                )}
              </Stack>
            </Stack>
          </Pane>
        </SplitLayout>
      );
    }
  }
}

export function ConfigPage() {
  return (
    <PresenterScope name="ConfigPage">
      <ConfigPageBinding />
    </PresenterScope>
  );
}

function ConfigPageBinding() {
  const model = useConfigPagePresenter();
  const handlers = useActions(model.handlers);
  return <ConfigPageView model={{ ...model, handlers } as typeof model} />;
}
