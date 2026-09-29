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
        workspace,
        cycleSettings,
        cycleSettingsError,
        cycleSettingsSaved,
        issueAutomationSettings,
        issueAutomationSettingsError,
        issueAutomationSettingsSaved,
        timeZones,
        languages,
        preferences,
        codingToolDraft,
        codingToolError,
        codingToolSaved,
        sidebarGroups,
        sidebarCustomizationOpen,
        colorScheme,
        diagnostics,
        error,
        saved,
        handlers,
      } = model;
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

              <Stack gap="md" component="section" aria-label={t('config.cycleSettings')}>
                <Title order={4}>{t('config.cycleSettings')}</Title>
                <Text size="sm" c="dimmed">
                  {t('config.cycleSettingsDescription')}
                </Text>
                {cycleSettingsError ? (
                  <Alert color="red" variant="light">
                    {cycleSettingsError}
                  </Alert>
                ) : null}
                {cycleSettingsSaved ? (
                  <Alert color="green" variant="light">
                    {t('config.cycleSettingsSaved')}
                  </Alert>
                ) : null}
                <Box component="form" onSubmit={handlers.onSaveCycleSettings}>
                  <Stack gap="md" maw={480}>
                    <Select
                      label={t('config.cycleDuration')}
                      aria-label={t('config.cycleDuration')}
                      value={String(cycleSettings.durationDays)}
                      onChange={handlers.onCycleDurationChange}
                      data={[1, 2, 3, 4, 6, 8].map((weeks) => ({
                        value: String(weeks * 7),
                        label: t('config.cycleWeeks', { count: weeks }),
                      }))}
                    />
                    <Select
                      label={t('config.cycleCooldown')}
                      aria-label={t('config.cycleCooldown')}
                      value={String(cycleSettings.cooldownDays)}
                      onChange={handlers.onCycleCooldownChange}
                      data={[0, 7, 14].map((days) => ({
                        value: String(days),
                        label:
                          days === 0
                            ? t('config.noCooldown')
                            : t('config.cycleWeeks', { count: days / 7 }),
                      }))}
                    />
                    <Select
                      label={t('config.cycleStartDay')}
                      aria-label={t('config.cycleStartDay')}
                      value={cycleSettings.startDay}
                      onChange={handlers.onCycleStartDayChange}
                      data={FIRST_DAYS_OF_WEEK.map((day) => ({
                        value: day,
                        label: t(`config.weekday.${day}`),
                      }))}
                    />
                    <Select
                      label={t('config.autoCreateCycles')}
                      aria-label={t('config.autoCreateCycles')}
                      value={String(cycleSettings.autoCreateAhead)}
                      onChange={handlers.onCycleAutoCreateAheadChange}
                      data={Array.from({ length: 7 }, (_, count) => ({
                        value: String(count),
                        label:
                          count === 0
                            ? t('config.noAutoCreate')
                            : t('config.cyclesAhead', { count }),
                      }))}
                    />
                    <Checkbox
                      label={t('config.autoAddActiveIssues')}
                      description={t('config.autoAddActiveIssuesDescription')}
                      checked={cycleSettings.autoAddActiveIssues}
                      onChange={handlers.onCycleAutoAddActiveIssuesChange}
                    />
                    <Checkbox
                      label={t('config.autoAddCompletedIssues')}
                      description={t('config.autoAddCompletedIssuesDescription')}
                      checked={cycleSettings.autoAddCompletedIssues}
                      onChange={handlers.onCycleAutoAddCompletedIssuesChange}
                    />
                    <Group>
                      <Button type="submit">{t('config.saveCycleSettings')}</Button>
                    </Group>
                  </Stack>
                </Box>
              </Stack>

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

              <Stack gap="md" component="section" aria-label={t('config.personalPreferences')}>
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

              <Stack gap="md" component="section" aria-label={t('codingTools.heading')}>
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

              <ConfigWorkflowSettingsSection model={model} t={t} />

              <Stack gap="md" component="section" aria-label={t('config.diagnostics')}>
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
