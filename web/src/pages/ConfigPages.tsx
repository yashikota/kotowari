import {
  Alert,
  Box,
  Button,
  Checkbox,
  Group,
  Kbd,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { FIRST_DAYS_OF_WEEK } from '../preferences.ts';
import { InboxNotificationSettings } from '../components/InboxNotificationSettings.tsx';
import { SidebarCustomizationModal } from '../components/SidebarCustomizationModal.tsx';
import { ConfigWorkflowSettingsSection } from '../components/ConfigWorkflowSettingsSection.tsx';
import { ConfigWorkspaceSettingsSection } from '../components/ConfigWorkspaceSettingsSection.tsx';
import { ConfigCycleSettingsSection } from '../components/ConfigCycleSettingsSection.tsx';
import { ConfigIssueAutomationSettingsSection } from '../components/ConfigIssueAutomationSettingsSection.tsx';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { EmptyState, PageHeader, Pane, SplitLayout } from '../mantine-ui.tsx';
import { useConfigPagePresenter } from '../presenters/ConfigPages.tsx';

export function ConfigPageView({
  model,
  t,
}: {
  model: ReturnType<typeof useConfigPagePresenter>;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  switch (model._view) {
    case 0: {
      const {
        preferences,
        codingToolDraft,
        codingToolError,
        codingToolSaved,
        sidebarGroups,
        sidebarCustomizationOpen,
        colorScheme,
        diagnostics,
        handlers,
      } = model;
      return (
        <SplitLayout single>
          <Pane single>
            <PageHeader title={t('config.title')} />

            <Group component="nav" aria-label={t('config.sections')} gap="xs" py="md" wrap="wrap">
              {(
                [
                  ['workspace', 'config.workspace'],
                  ['preferences', 'config.personalPreferences'],
                  ['coding-tools', 'codingTools.heading'],
                  ['application', 'config.application'],
                  ['issue-statuses', 'config.issueStatuses'],
                  ['project-statuses', 'config.projectStatuses'],
                  ['diagnostics', 'config.diagnostics'],
                ] as const
              ).map(([id, label]) => (
                <Button key={id} component="a" href={`#settings-${id}`} variant="default" size="xs">
                  {t(label)}
                </Button>
              ))}
            </Group>
            <Stack gap="xl" maw={960} mx="auto" w="100%" pb="xl">
              <Stack id="settings-workspace" tabIndex={-1} gap="xl">
                <ConfigWorkspaceSettingsSection model={model} handlers={handlers} t={t} />
                <ConfigCycleSettingsSection model={model} handlers={handlers} t={t} />
                <ConfigIssueAutomationSettingsSection model={model} handlers={handlers} t={t} />
              </Stack>

              <Stack
                id="settings-preferences"
                tabIndex={-1}
                gap="md"
                component="section"
                aria-label={t('config.personalPreferences')}
              >
                <Title order={4}>{t('config.personalPreferences')}</Title>
                <Stack gap="md" maw={480}>
                  <Select
                    label={t('config.defaultHome')}
                    aria-label={t('config.defaultHome')}
                    value={preferences.defaultHome}
                    onChange={handlers.onDefaultHomeChange}
                    data={[
                      { value: 'home', label: t('config.home.home') },
                      { value: 'inbox', label: t('config.home.inbox') },
                      { value: 'reviews', label: t('config.home.reviews') },
                      { value: 'myIssues', label: t('config.home.myIssues') },
                      { value: 'activeIssues', label: t('config.home.activeIssues') },
                      { value: 'issues', label: t('config.home.issues') },
                      { value: 'currentCycle', label: t('config.home.currentCycle') },
                      { value: 'projects', label: t('config.home.projects') },
                      { value: 'cycles', label: t('config.home.cycles') },
                      { value: 'agent', label: t('config.home.agent') },
                    ]}
                  />
                  <Select
                    label={t('config.firstDayOfWeek')}
                    aria-label={t('config.firstDayOfWeek')}
                    value={preferences.firstDayOfWeek}
                    onChange={handlers.onFirstDayOfWeekChange}
                    data={FIRST_DAYS_OF_WEEK.map((day) => ({
                      value: day,
                      label: t(`config.weekday.${day}`),
                    }))}
                  />
                  <Checkbox
                    label={t('config.autoAssignToSelf')}
                    description={t('config.autoAssignToSelfDescription')}
                    checked={preferences.autoAssignToSelf}
                    onChange={handlers.onAutoAssignToSelfChange}
                  />
                  <Checkbox
                    label={t('config.autoAssignOnStart')}
                    description={t('config.autoAssignOnStartDescription')}
                    checked={preferences.autoAssignOnStart}
                    onChange={handlers.onAutoAssignOnStartChange}
                  />
                  <Select
                    label={t('config.colorScheme')}
                    aria-label={t('config.colorScheme')}
                    value={colorScheme}
                    onChange={handlers.onColorSchemeChange}
                    data={[
                      { value: 'auto', label: t('config.theme.auto') },
                      { value: 'light', label: t('config.theme.light') },
                      { value: 'dark', label: t('config.theme.dark') },
                    ]}
                  />
                  <Select
                    label={t('config.fontSize')}
                    aria-label={t('config.fontSize')}
                    value={preferences.fontSize}
                    onChange={handlers.onFontSizeChange}
                    data={[
                      { value: 'small', label: t('config.fontSizeOption.small') },
                      { value: 'default', label: t('config.fontSizeOption.default') },
                      { value: 'large', label: t('config.fontSizeOption.large') },
                    ]}
                  />
                  <Select
                    label={t('config.commentSubmit')}
                    aria-label={t('config.commentSubmit')}
                    value={preferences.commentSubmitShortcut}
                    onChange={handlers.onCommentShortcutChange}
                    data={[
                      { value: 'modEnter', label: t('config.commentShortcut.modEnter') },
                      { value: 'enter', label: t('config.commentShortcut.enter') },
                    ]}
                  />
                  <Checkbox
                    label={t('config.convertEmoticons')}
                    checked={preferences.convertEmoticons}
                    onChange={handlers.onConvertEmoticonsChange}
                  />
                  <Checkbox
                    label={t('config.pointerCursors')}
                    checked={preferences.pointerCursors}
                    onChange={handlers.onPointerCursorsChange}
                  />
                  <Checkbox
                    label={t('config.underlineLinks')}
                    checked={preferences.underlineLinks}
                    onChange={handlers.onUnderlineLinksChange}
                  />
                  <Button variant="light" onClick={handlers.onOpenSidebarCustomization}>
                    {t('config.customizeSidebar')}
                  </Button>
                  <Text size="xs" c="dimmed">
                    {t('config.preferencesSavedLocally')}
                  </Text>
                </Stack>
              </Stack>

              <InboxNotificationSettings />

              <Stack
                id="settings-coding-tools"
                tabIndex={-1}
                gap="md"
                component="section"
                aria-label={t('codingTools.heading')}
              >
                <Title order={4}>{t('codingTools.heading')}</Title>
                {codingToolError ? (
                  <Alert color="red" variant="light">
                    {codingToolError}
                  </Alert>
                ) : null}
                {codingToolSaved ? (
                  <Alert color="green" variant="light">
                    {t('codingTools.saved')}
                  </Alert>
                ) : null}
                <Box component="form" onSubmit={handlers.onSaveCodingTools}>
                  <Stack gap="md" maw={480}>
                    <Checkbox
                      label={t('codingTools.enableCustomLink')}
                      checked={codingToolDraft.customLinkEnabled}
                      onChange={handlers.onCodingToolEnabledChange}
                    />
                    <TextInput
                      label={t('codingTools.name')}
                      value={codingToolDraft.customLinkName}
                      onChange={handlers.onCodingToolNameChange}
                    />
                    <TextInput
                      label={t('codingTools.url')}
                      placeholder={t('codingTools.urlPlaceholder')}
                      value={codingToolDraft.customLinkURL}
                      onChange={handlers.onCodingToolURLChange}
                    />
                    <Text size="xs" c="dimmed">
                      {t('codingTools.urlHint')}
                    </Text>
                    <Textarea
                      required
                      maxLength={10000}
                      minRows={6}
                      autosize
                      label={t('codingTools.promptTemplate')}
                      value={codingToolDraft.promptTemplate}
                      onChange={handlers.onCodingToolPromptChange}
                    />
                    <Text size="xs" c="dimmed">
                      {t('codingTools.promptHint')}
                    </Text>
                    <Group>
                      <Button type="submit">{t('codingTools.save')}</Button>
                    </Group>
                  </Stack>
                </Box>
                <Text size="xs" c="dimmed">
                  {t('config.preferencesSavedLocally')}
                </Text>
              </Stack>

              <Stack
                id="settings-application"
                tabIndex={-1}
                gap="md"
                component="section"
                aria-label={t('config.application')}
              >
                <Title order={4}>{t('config.application')}</Title>
                <Stack gap="xs" maw={480}>
                  <Button variant="light" onClick={handlers.onOpenCommandPalette}>
                    <Group justify="space-between" w="100%" wrap="nowrap">
                      <span>{t('config.commandPalette')}</span>
                      <Kbd>Mod+K</Kbd>
                    </Group>
                  </Button>
                  <Button variant="light" onClick={handlers.onOpenKeyboardShortcuts}>
                    <Group justify="space-between" w="100%" wrap="nowrap">
                      <span>{t('config.keyboardShortcuts')}</span>
                      <Kbd>?</Kbd>
                    </Group>
                  </Button>
                </Stack>
              </Stack>

              <ConfigWorkflowSettingsSection model={model} t={t} />

              <Stack
                id="settings-diagnostics"
                tabIndex={-1}
                gap="md"
                component="section"
                aria-label={t('config.diagnostics')}
              >
                <Title order={4}>{t('config.diagnostics')}</Title>
                {diagnostics.length === 0 ? (
                  <EmptyState>{t('config.noDiagnostics')}</EmptyState>
                ) : (
                  <Stack gap="sm">
                    {diagnostics.map((d) => (
                      <Alert
                        key={`${d.path}:${d.code}`}
                        color="yellow"
                        title={d.path}
                        variant="light"
                      >
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
            <SidebarCustomizationModal
              opened={sidebarCustomizationOpen}
              onClose={handlers.onCloseSidebarCustomization}
              groups={sidebarGroups}
              badgeStyle={preferences.sidebarBadgeStyle}
              onBadgeStyleChange={handlers.onSidebarBadgeStyleChange}
              onLocationChange={handlers.onSidebarLocationChange}
              onMove={handlers.onMoveSidebarItem}
            />
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
  const { t } = useTranslation();
  return <ConfigPageView model={{ ...model, handlers } as typeof model} t={t} />;
}
