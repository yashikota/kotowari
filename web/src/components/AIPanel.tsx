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
  switch (model._view) {
    case 0: {
      const { id, open, state, prompt, error, sending, messages, handlers } = model;
      return (
        <Stack gap="md" component="section" aria-label="AI assistant">
          <Button type="button" variant="default" aria-expanded={open} onClick={handlers.onClick0}>
            Ask AI about {id}
          </Button>
          <Collapse expanded={open}>
            <Stack gap="md">
              <Text c="dimmed" size="sm">
                Conversation for {id}. The saved document is included with each message.
              </Text>

              <Stack gap="md">
                {messages.map((m, i) => (
                  <Stack key={i} gap="xs">
                    <Text fw={600}>{m.role}</Text>
                    <MarkdownContent html={renderMarkdown(m.text)} />
                  </Stack>
                ))}
              </Stack>

              <Text component="span" role="status" size="sm" c="dimmed">
                {state?.busy
                  ? 'Working…'
                  : state?.sessionId
                    ? 'Ready'
                    : 'Send a message to connect'}
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
                <Fieldset
                  key={p.id}
                  legend={p.params.toolCall?.title ?? 'Agent requests permission'}
                >
                  <Stack gap="sm">
                    <Accordion>
                      <Accordion.Item value="details">
                        <Accordion.Control>Request details</Accordion.Control>
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
                    label="Message"
                    aria-label="Message to AI"
                    value={prompt}
                    onChange={handlers.Message_to_AI_onChange4}
                    required
                    disabled={sending}
                  />
                  <Text c="dimmed" size="sm">
                    Enter to insert a line · <Shortcut>Ctrl/⌘+Enter</Shortcut> to send
                  </Text>
                  <Group gap="xs">
                    <Button type="submit" disabled={sending || state?.busy || !prompt.trim()}>
                      Send
                    </Button>
                    <Button
                      type="button"
                      disabled={!state?.busy || sending}
                      onClick={handlers.onClick5}
                    >
                      Stop
                    </Button>
                    <Button
                      type="button"
                      disabled={state?.busy || sending}
                      onClick={handlers.onClick6}
                    >
                      New conversation
                    </Button>
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
