import {
  Accordion,
  Alert,
  Box,
  Button,
  Code,
  Collapse,
  Fieldset,
  Group,
  Stack,
  Text,
  Textarea,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { renderMarkdown } from '../markdown.ts';
import { MarkdownContent, Shortcut } from '../mantine-ui.tsx';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useAIPanelPresenter, usePanelPresenter } from '../presenters/AIPanel.tsx';

export function AIPanelView({ model }: { model: ReturnType<typeof useAIPanelPresenter> }) {
  switch (model._view) {
    case 0: {
      const { kind, id } = model;
      return <Panel key={`${kind}/${id}`} kind={kind} id={id} />;
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
      const { id, standalone, open, state, prompt, error, sending, messages, handlers } = model;
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

              <Stack gap="md">
                {messages.map((m, i) => (
                  <Stack key={i} gap="xs">
                    <Text fw={600}>
                      {t(`ui.role${m.role[0]!.toUpperCase()}${m.role.slice(1)}`)}
                    </Text>
                    <MarkdownContent html={renderMarkdown(m.text)} />
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
                ? state.authMethods?.map((a) => (
                    <Button
                      type="button"
                      key={a.id}
                      disabled={state.busy || sending}
                      onClick={() => handlers.onClick1(a)}
                    >
                      {a.name}
                    </Button>
                  ))
                : null}

              {state?.permissions.map((p) => (
                <Fieldset key={p.id} legend={p.params.toolCall?.title ?? t('ui.agentPermission')}>
                  <Stack gap="sm">
                    <Accordion>
                      <Accordion.Item value="details">
                        <Accordion.Control>{t('ui.requestDetails')}</Accordion.Control>
                        <Accordion.Panel>
                          <Code block>{JSON.stringify(p.params, null, 2)}</Code>
                        </Accordion.Panel>
                      </Accordion.Item>
                    </Accordion>
                    <Group gap="xs">
                      {p.params.options.map((o) => (
                        <Button
                          type="button"
                          key={o.optionId}
                          disabled={sending}
                          onClick={() => handlers.onClick2(p, o)}
                        >
                          {o.name}
                        </Button>
                      ))}
                    </Group>
                  </Stack>
                </Fieldset>
              ))}

              <Box component="form" onSubmit={handlers.onSubmit3}>
                <Stack gap="sm">
                  <Textarea
                    label={t('ui.message')}
                    aria-label={t('ui.messageToAi')}
                    value={prompt}
                    onChange={handlers.Message_to_AI_onChange4}
                    required
                    disabled={sending}
                  />
                  <Text c="dimmed" size="sm">
                    {t('ui.enterToInsertLine')} <Shortcut>Ctrl/⌘+Enter</Shortcut> {t('ui.toSend')}
                  </Text>
                  <Group gap="xs">
                    <Button type="submit" disabled={sending || state?.busy || !prompt.trim()}>
                      {t('ui.send')}
                    </Button>
                    <Button
                      type="button"
                      disabled={!state?.busy || sending}
                      onClick={handlers.onClick5}
                    >
                      {t('ui.stop')}
                    </Button>
                    {standalone ? null : (
                      <Button
                        type="button"
                        disabled={state?.busy || sending}
                        onClick={handlers.onClick6}
                      >
                        {t('ui.newConversation')}
                      </Button>
                    )}
                  </Group>
                </Stack>
              </Box>
            </Stack>
          </Collapse>
        </Stack>
      );
    }
  }
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
