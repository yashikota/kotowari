import {
  ActionIcon,
  Accordion,
  Alert,
  Box,
  Button,
  Code,
  Collapse,
  Fieldset,
  Group,
  Popover,
  ScrollArea,
  Stack,
  Text,
  Textarea,
} from '@mantine/core';
import { IconArrowUpRight, IconSparkles, IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { renderMarkdown } from '../markdown.ts';
import { MarkdownContent, Shortcut } from '../mantine-ui.tsx';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useAIPanelPresenter, usePanelPresenter } from '../presenters/AIPanel.tsx';

export function AIPanelView({ model }: { model: ReturnType<typeof useAIPanelPresenter> }) {
  switch (model._view) {
    case 0: {
      const {
        kind,
        id,
        floating,
        contextLabel,
        starterPrompts,
        promptPlaceholder,
        onOpenFullPage,
      } = model;
      return (
        <Panel
          key={`${kind}/${id}`}
          kind={kind}
          id={id}
          floating={floating}
          contextLabel={contextLabel}
          starterPrompts={starterPrompts}
          promptPlaceholder={promptPlaceholder}
          onOpenFullPage={onOpenFullPage}
        />
      );
    }
  }
}

export function AIPanel(props: Parameters<typeof useAIPanelPresenter>[0]) {
  return (
    <PresenterScope name="AIPanel">
      <AIPanelBinding {...props} />
    </PresenterScope>
  );
}

function AIPanelBinding(props: Parameters<typeof useAIPanelPresenter>[0]) {
  const model = useAIPanelPresenter(props);
  const handlers = useActions(model.handlers);
  return <AIPanelView model={{ ...model, handlers } as typeof model} />;
}

export function PanelView({ model }: { model: ReturnType<typeof usePanelPresenter> }) {
  const { t } = useTranslation();
  switch (model._view) {
    case 0: {
      if (model.floating) return <FloatingPanel model={model} />;
      const { id, standalone, open, handlers } = model;
      return (
        <Stack
          gap="md"
          component="section"
          aria-label={t('ui.aiAssistant')}
          p={standalone ? 'md' : undefined}
          style={standalone ? { minHeight: '100%' } : undefined}
        >
          {standalone ? null : (
            <Button
              type="button"
              variant="default"
              aria-expanded={open}
              onClick={handlers.onClick0}
            >
              {t('ui.askAiAbout')} {id}
            </Button>
          )}
          <Collapse expanded={standalone || open}>
            <Stack gap="md">
              {standalone ? null : (
                <Text c="dimmed" size="sm">
                  {t('ui.conversationFor')} {id}. {t('ui.savedDocumentIncluded')}
                </Text>
              )}
              <PanelMessages model={model} showQuickPrompts={standalone} />
              <PanelComposer model={model} />
            </Stack>
          </Collapse>
        </Stack>
      );
    }
  }
}

function FloatingPanel({ model }: { model: ReturnType<typeof usePanelPresenter> }) {
  const { t } = useTranslation();
  const { contextLabel, handlers, id, open, onOpenFullPage } = model;
  return (
    <Popover
      opened={open}
      onChange={handlers.onOpenChange}
      position="top-end"
      offset={10}
      width="min(440px, calc(100vw - 24px))"
      shadow="xl"
      withinPortal
      closeOnEscape
    >
      <Popover.Target>
        <Button
          type="button"
          aria-label={t('ui.aiAssistant')}
          aria-expanded={open}
          leftSection={<IconSparkles size={15} aria-hidden />}
          style={{ position: 'fixed', right: 18, bottom: 16, zIndex: 201 }}
          onClick={handlers.onClick0}
        >
          {t('nav.agent')}
        </Button>
      </Popover.Target>
      <Popover.Dropdown
        role="dialog"
        aria-label={t('ui.aiAssistant')}
        p={0}
        style={{ width: 'min(440px, calc(100vw - 24px))', overflow: 'hidden' }}
      >
        <Stack
          component="section"
          aria-label={t('ui.aiAssistant')}
          gap={0}
          h="min(620px, calc(100dvh - 84px))"
          miw={0}
        >
          <Group
            justify="space-between"
            wrap="nowrap"
            px="sm"
            py={8}
            style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
          >
            <Text size="sm" fw={600} truncate>
              {t('ui.newChat')}
            </Text>
            <Group gap={4} wrap="nowrap">
              {onOpenFullPage ? (
                <ActionIcon
                  type="button"
                  variant="subtle"
                  color="gray"
                  aria-label={t('issueAssistant.openFullPage')}
                  title={t('issueAssistant.openFullPage')}
                  onClick={handlers.onOpenFullPage}
                >
                  <IconArrowUpRight size={16} aria-hidden />
                </ActionIcon>
              ) : null}
              <ActionIcon
                type="button"
                variant="subtle"
                color="gray"
                aria-label={t('ui.close')}
                title={t('ui.close')}
                onClick={handlers.onClose}
              >
                <IconX size={16} aria-hidden />
              </ActionIcon>
            </Group>
          </Group>
          <ScrollArea style={{ flex: 1, minHeight: 0 }} offsetScrollbars p="md">
            <Stack gap="md">
              <Group
                gap="xs"
                wrap="nowrap"
                p="xs"
                style={{
                  border: '1px solid var(--mantine-color-default-border)',
                  borderRadius: 'var(--mantine-radius-md)',
                }}
              >
                <IconSparkles size={15} color="var(--mantine-color-indigo-6)" aria-hidden />
                <Stack gap={0} style={{ minWidth: 0 }}>
                  <Text size="xs" fw={600} ff="var(--mantine-font-family-monospace)">
                    {id}
                  </Text>
                  <Text size="sm" truncate title={contextLabel}>
                    {contextLabel}
                  </Text>
                </Stack>
              </Group>
              {model.messages.length === 0 ? (
                <Stack align="center" gap={4} py="xl">
                  <Text size="sm" fw={600}>
                    {t('issueAssistant.welcome')}
                  </Text>
                  <Text size="xs" c="dimmed" ta="center">
                    {t('issueAssistant.description')}
                  </Text>
                </Stack>
              ) : null}
              <PanelMessages model={model} showQuickPrompts />
            </Stack>
          </ScrollArea>
          <Box p="sm" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
            <PanelComposer model={model} compact />
          </Box>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

function PanelMessages({
  model,
  showQuickPrompts,
}: {
  model: ReturnType<typeof usePanelPresenter>;
  showQuickPrompts: boolean;
}) {
  const { t } = useTranslation();
  const { state, error, sending, messages, starterPrompts, handlers } = model;
  return (
    <>
      {showQuickPrompts && messages.length === 0 && starterPrompts.length > 0 ? (
        <Stack component="nav" aria-label={t('ui.quickPrompts')} gap="xs">
          {starterPrompts.map((suggestion) => (
            <Button
              key={suggestion.label}
              type="button"
              variant="default"
              size="sm"
              justify="flex-start"
              onClick={() => handlers.onClick7(suggestion.prompt)}
            >
              {suggestion.label}
            </Button>
          ))}
        </Stack>
      ) : null}
      <Stack gap="md">
        {messages.map((message, index) => (
          <Stack key={`${message.role}-${index}`} gap="xs">
            <Text fw={600}>
              {t(`ui.role${message.role[0]!.toUpperCase()}${message.role.slice(1)}`)}
            </Text>
            <MarkdownContent html={renderMarkdown(message.text)} />
          </Stack>
        ))}
      </Stack>
      <Text component="span" role="status" size="sm" c="dimmed">
        {state?.busy
          ? t('ui.working')
          : state?.sessionId
            ? t('ui.ready')
            : t('ui.sendMessageToConnect')}
      </Text>
      {error || state?.error ? (
        <Alert color="red" role="alert">
          {error || state?.error}
        </Alert>
      ) : null}
      {state?.error
        ? state.authMethods?.map((auth) => (
            <Button
              type="button"
              key={auth.id}
              disabled={state.busy || sending}
              onClick={() => handlers.onClick1(auth)}
            >
              {auth.name}
            </Button>
          ))
        : null}
      {state?.permissions.map((permission) => (
        <Fieldset
          key={permission.id}
          legend={permission.params.toolCall?.title ?? t('ui.agentPermission')}
        >
          <Stack gap="sm">
            <Accordion>
              <Accordion.Item value="details">
                <Accordion.Control>{t('ui.requestDetails')}</Accordion.Control>
                <Accordion.Panel>
                  <Code block>{JSON.stringify(permission.params, null, 2)}</Code>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
            <Group gap="xs">
              {permission.params.options.map((option) => (
                <Button
                  type="button"
                  key={option.optionId}
                  disabled={sending}
                  onClick={() => handlers.onClick2(permission, option)}
                >
                  {option.name}
                </Button>
              ))}
            </Group>
          </Stack>
        </Fieldset>
      ))}
    </>
  );
}

function PanelComposer({
  model,
  compact = false,
}: {
  model: ReturnType<typeof usePanelPresenter>;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const {
    standalone,
    state,
    prompt,
    initialPrompt,
    sending,
    promptPlaceholder,
    hidePromptLabel,
    handlers,
  } = model;
  return (
    <Box component="form" onSubmit={handlers.onSubmit3}>
      <Stack gap={compact ? 'xs' : 'sm'}>
        <Textarea
          label={hidePromptLabel ? undefined : compact ? undefined : t('ui.message')}
          aria-label={t('ui.messageToAi')}
          placeholder={promptPlaceholder}
          autoFocus={Boolean(initialPrompt)}
          value={prompt}
          onChange={handlers.Message_to_AI_onChange4}
          required
          disabled={sending}
          autosize={compact}
          minRows={compact ? 2 : undefined}
          maxRows={compact ? 5 : undefined}
        />
        {compact ? null : (
          <Text c="dimmed" size="sm">
            {t('ui.enterToInsertLine')} <Shortcut>Ctrl/⌘+Enter</Shortcut> {t('ui.toSend')}
          </Text>
        )}
        <Group gap="xs" justify="space-between">
          {compact ? (
            <Text c="dimmed" size="xs">
              <Shortcut>Ctrl/⌘+Enter</Shortcut> {t('ui.toSend')}
            </Text>
          ) : null}
          <Group gap="xs" ml="auto">
            <Button
              type="submit"
              size={compact ? 'compact-sm' : undefined}
              disabled={sending || state?.busy || !prompt.trim()}
            >
              {t('ui.send')}
            </Button>
            {state?.busy ? (
              <Button
                type="button"
                variant="default"
                size={compact ? 'compact-sm' : undefined}
                disabled={sending}
                onClick={handlers.onClick5}
              >
                {t('ui.stop')}
              </Button>
            ) : null}
            {!compact && !standalone ? (
              <Button
                type="button"
                variant="default"
                disabled={sending || state?.busy}
                onClick={handlers.onClick6}
              >
                {t('ui.newConversation')}
              </Button>
            ) : null}
          </Group>
        </Group>
      </Stack>
    </Box>
  );
}

export function Panel(props: Parameters<typeof usePanelPresenter>[0]) {
  return (
    <PresenterScope name="Panel">
      <PanelBinding {...props} />
    </PresenterScope>
  );
}

function PanelBinding(props: Parameters<typeof usePanelPresenter>[0]) {
  const model = usePanelPresenter(props);
  const handlers = useActions(model.handlers);
  return <PanelView model={{ ...model, handlers } as typeof model} />;
}
