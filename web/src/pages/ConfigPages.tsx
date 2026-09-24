import {
  Alert,
  ActionIcon,
  Box,
  Button,
  Checkbox,
  Group,
  Kbd,
  Modal,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { IconChevronDown, IconChevronUp, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { IssueStatus } from '../types.ts';
import { IssueStatusIcon } from '../components/issue-ui.tsx';

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
        timeZones,
        languages,
        preferences,
        codingToolDraft,
        codingToolError,
        codingToolSaved,
        issueWorkflowStatuses,
        workflowError,
        workflowSaved,
        workflowDirty,
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
                      { value: 'issues', label: t('config.home.issues') },
                      { value: 'projects', label: t('config.home.projects') },
                      { value: 'cycles', label: t('config.home.cycles') },
                      { value: 'agent', label: t('config.home.agent') },
                    ]}
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

              <Stack gap="md" component="section" aria-label={t('config.issueStatuses')}>
                <Title order={4}>{t('config.issueStatuses')}</Title>
                <Text size="sm" c="dimmed">
                  {t('config.issueStatusesDescription')}
                </Text>
                {workflowError ? (
                  <Alert color="red" variant="light" role="alert">
                    {workflowError}
                  </Alert>
                ) : null}
                {workflowSaved ? (
                  <Alert color="green" variant="light" role="status">
                    {t('config.workflowSaved')}
                  </Alert>
                ) : null}
                {(
                  [
                    { id: 'backlog', category: 'backlog' },
                    { id: 'todo', category: 'todo' },
                    { id: 'in_progress', category: 'in_progress' },
                    { id: 'done', category: 'done' },
                    { id: 'canceled', category: 'canceled' },
                    { id: 'duplicate', category: 'canceled', statusId: 'duplicate' },
                  ] as { id: string; category: IssueStatus; statusId?: string }[]
                ).map(({ id, category, statusId }) => (
                  <Stack key={id} component="section" aria-label={t(`issueStatus.${id}`)} gap="xs">
                    <Group gap="xs">
                      <IssueStatusIcon status={category} />
                      <Text size="sm" fw={600}>
                        {t(`issueStatus.${id}`)}
                      </Text>
                    </Group>
                    {issueWorkflowStatuses
                      .filter(
                        (status) =>
                          status.category === category &&
                          (statusId ? status.id === statusId : status.id !== 'duplicate'),
                      )
                      .map((status) => (
                        <Group key={status.id} align="flex-end" wrap="wrap" w="100%">
                          <TextInput
                            label={t('config.workflowStatusName', { status: status.name })}
                            value={status.name}
                            maxLength={48}
                            onChange={(event) =>
                              handlers.onWorkflowStatusNameChange(status.id, event.target.value)
                            }
                            style={{ flex: 1, minWidth: 150 }}
                          />
                          <TextInput
                            label={t('config.workflowStatusDescription', { status: status.name })}
                            value={status.description ?? ''}
                            maxLength={200}
                            onChange={(event) =>
                              handlers.onWorkflowStatusDescriptionChange(
                                status.id,
                                event.target.value,
                              )
                            }
                            style={{ flex: 1, minWidth: 150 }}
                          />
                          {[
                            'backlog',
                            'todo',
                            'in_progress',
                            'done',
                            'canceled',
                            'duplicate',
                          ].includes(status.id) ? null : (
                            <ActionIcon
                              type="button"
                              variant="subtle"
                              color="red"
                              aria-label={t('config.removeWorkflowStatus', {
                                status: status.name,
                              })}
                              onClick={() => handlers.onDeleteWorkflowStatus(status.id)}
                            >
                              <IconTrash size={16} aria-hidden />
                            </ActionIcon>
                          )}
                        </Group>
                      ))}
                  </Stack>
                ))}
                <Box component="form" onSubmit={handlers.onAddWorkflowStatus}>
                  <Group align="flex-end">
                    <TextInput
                      label={t('config.newWorkflowStatus')}
                      value={model.workflowName}
                      maxLength={48}
                      onChange={handlers.onWorkflowNameChange}
                    />
                    <TextInput
                      label={t('config.newWorkflowStatusDescription')}
                      value={model.workflowDescription}
                      maxLength={200}
                      onChange={handlers.onWorkflowDescriptionChange}
                    />
                    <Select
                      label={t('config.workflowCategory')}
                      value={model.workflowCategory}
                      onChange={handlers.onWorkflowCategoryChange}
                      data={(
                        ['backlog', 'todo', 'in_progress', 'done', 'canceled'] as IssueStatus[]
                      ).map((category) => ({
                        value: category,
                        label: t(`issueStatus.${category}`),
                      }))}
                      allowDeselect={false}
                    />
                    <Button type="submit">{t('config.addWorkflowStatus')}</Button>
                  </Group>
                </Box>
                <Box component="form" onSubmit={handlers.onSaveWorkflow}>
                  <Button type="submit" disabled={!workflowDirty}>
                    {t('config.saveWorkflow')}
                  </Button>
                </Box>
              </Stack>

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
            <Modal
              opened={sidebarCustomizationOpen}
              onClose={handlers.onCloseSidebarCustomization}
              title={t('config.customizeSidebar')}
              centered
              size="lg"
            >
              <Stack gap="lg">
                <Text size="sm" c="dimmed">
                  {t('config.sidebarDescription')}
                </Text>
                {sidebarGroups.map((section) => (
                  <Stack
                    key={section.group}
                    component="section"
                    aria-label={section.label}
                    gap="xs"
                  >
                    <Text size="sm" fw={600}>
                      {section.label}
                    </Text>
                    {section.items.length === 0 ? (
                      <Text size="sm" c="dimmed">
                        {t('config.sidebarEmpty')}
                      </Text>
                    ) : (
                      section.items.map((item, index) => (
                        <Group key={item.id} gap="xs" wrap="nowrap">
                          <Text size="sm" style={{ flex: 1 }} truncate>
                            {item.label}
                          </Text>
                          <ActionIcon
                            type="button"
                            variant="subtle"
                            aria-label={t('config.moveSidebarUp', { item: item.label })}
                            disabled={index === 0}
                            onClick={() => handlers.onMoveSidebarItem(item.id, -1)}
                          >
                            <IconChevronUp size={16} aria-hidden />
                          </ActionIcon>
                          <ActionIcon
                            type="button"
                            variant="subtle"
                            aria-label={t('config.moveSidebarDown', { item: item.label })}
                            disabled={index === section.items.length - 1}
                            onClick={() => handlers.onMoveSidebarItem(item.id, 1)}
                          >
                            <IconChevronDown size={16} aria-hidden />
                          </ActionIcon>
                          <Select
                            aria-label={t('config.sidebarLocationFor', { item: item.label })}
                            value={item.location}
                            onChange={(value) => handlers.onSidebarLocationChange(item.id, value)}
                            data={[
                              { value: 'primary', label: t('config.sidebarLocation.primary') },
                              { value: 'more', label: t('config.sidebarLocation.more') },
                              { value: 'hidden', label: t('config.sidebarLocation.hidden') },
                            ]}
                            w={160}
                            allowDeselect={false}
                          />
                        </Group>
                      ))
                    )}
                  </Stack>
                ))}
              </Stack>
            </Modal>
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
