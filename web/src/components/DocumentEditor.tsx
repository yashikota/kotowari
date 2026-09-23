import {
  Accordion,
  Alert,
  Anchor,
  Box,
  Button,
  Code,
  Group,
  List,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { MarkdownContent } from '../mantine-ui.tsx';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useFocusWhen } from '../focus.ts';
import { useDocumentEditorPresenter, useEditorPresenter } from '../presenters/DocumentEditor.tsx';

export function DocumentEditorView({
  model,
}: {
  model: ReturnType<typeof useDocumentEditorPresenter>;
}) {
  switch (model._view) {
    case 0: {
      const { documentKey, assetBase, inline } = model;
      return (
        <Editor key={documentKey} documentKey={documentKey} assetBase={assetBase} inline={inline} />
      );
    }
  }
}

export function DocumentEditor(props: Parameters<typeof useDocumentEditorPresenter>[0]) {
  return (
    <PresenterScope name="DocumentEditor">
      <DocumentEditorBinding {...props} />
    </PresenterScope>
  );
}

function DocumentEditorBinding(props: Parameters<typeof useDocumentEditorPresenter>[0]) {
  const model = useDocumentEditorPresenter(props);
  const handlers = useActions(model.handlers);
  return <DocumentEditorView model={{ ...model, handlers } as typeof model} />;
}

export function EditorView({ model }: { model: ReturnType<typeof useEditorPresenter> }) {
  switch (model._view) {
    case 0: {
      const {
        inline,
        server,
        draft,
        mode,
        status,
        error,
        busy,
        history,
        dirty,
        contentRef,
        headings,
        html,
        conflict,
        handlers,
      } = model;
      const editRef = useFocusWhen<HTMLTextAreaElement>(mode === 'edit', [mode]);
      return (
        <Stack
          component="section"
          aria-label="Document editor"
          className={`document-editor${inline ? ' document-editor-inline' : ''}`}
          gap="md"
          aria-busy={busy}
        >
          <Group justify="space-between" wrap="wrap" className="document-editor-toolbar">
            {inline ? (
              mode === 'preview' && !server?.body.trim() ? null : (
                <Button
                  type="button"
                  size="xs"
                  variant="subtle"
                  onClick={mode === 'edit' ? handlers.onClick0 : handlers.onClick1}
                >
                  {mode === 'edit' ? 'Preview' : 'Edit description'}
                </Button>
              )
            ) : (
              <SegmentedControl
                aria-label="Document view"
                value={mode}
                onChange={(value) => {
                  if (value === 'preview') handlers.onClick0();
                  else if (value === 'edit') handlers.onClick1();
                  else handlers.onClick2();
                }}
                data={[
                  { label: 'Preview', value: 'preview' },
                  { label: 'Edit', value: 'edit' },
                  { label: 'Compare', value: 'compare' },
                ]}
              />
            )}
            <Group gap="xs">
              {(!inline || mode !== 'preview') && (
                <>
                  <Button
                    type="button"
                    disabled={!server || busy || conflict || !dirty.current}
                    onClick={handlers.onClick3}
                  >
                    Save
                  </Button>
                  <Button type="button" variant="default" onClick={handlers.onClick4}>
                    History
                  </Button>
                  <Text component="span" role="status" size="sm" c="dimmed">
                    {status}
                  </Text>
                </>
              )}
            </Group>
          </Group>

          {error ? (
            <Alert color="red" role="alert">
              {error}
            </Alert>
          ) : null}

          {conflict ? (
            <Alert color="yellow" role="alert" title="Document changed on disk">
              The document changed on disk. Your draft is preserved. Compare both versions, then
              merge your changes.
              <Group mt="sm" gap="xs">
                <Button type="button" size="xs" onClick={handlers.onClick5}>
                  Compare versions
                </Button>
                <Button type="button" size="xs" variant="default" onClick={handlers.onClick6}>
                  Use current version as base
                </Button>
              </Group>
            </Alert>
          ) : null}

          {history.length > 0 ? (
            <Accordion defaultValue="history">
              <Accordion.Item value="history">
                <Accordion.Control>Previous versions</Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="xs">
                    {history.map((h) => (
                      <Button
                        type="button"
                        key={h.revision}
                        variant="subtle"
                        onClick={() => handlers.onClick7(h)}
                      >
                        {h.savedAt} — Restore as draft
                      </Button>
                    ))}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          ) : null}

          {mode !== 'preview' ? (
            <Textarea
              ref={editRef}
              aria-label="Markdown body"
              disabled={!server || busy}
              value={draft}
              onChange={handlers.Markdown_body_onChange8}
              onKeyDown={handlers.Markdown_body_onKeyDown9}
              minRows={16}
              autosize
            />
          ) : null}

          {mode === 'compare' ? (
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Stack gap="xs">
                <Title order={4}>Current document</Title>
                <Code block>{server?.body}</Code>
              </Stack>
              <Stack gap="xs">
                <Title order={4}>Your draft</Title>
                <Code block>{draft}</Code>
              </Stack>
            </SimpleGrid>
          ) : null}

          {mode !== 'edit' ? (
            <>
              <nav aria-label="Document contents">
                <List size="sm">
                  {headings.map((h) => (
                    <List.Item key={h.id}>
                      <Anchor href={`#${h.id}`}>{h.text}</Anchor>
                    </List.Item>
                  ))}
                </List>
              </nav>
              <Box ref={contentRef} className="document-editor-content">
                {inline && !server?.body.trim() ? (
                  <Button
                    type="button"
                    variant="subtle"
                    className="linear-document-placeholder"
                    onClick={handlers.onClick1}
                  >
                    Add description…
                  </Button>
                ) : (
                  <MarkdownContent html={html} />
                )}
              </Box>
            </>
          ) : null}
        </Stack>
      );
    }
  }
}

export function Editor(props: Parameters<typeof useEditorPresenter>[0]) {
  return (
    <PresenterScope name="Editor">
      <EditorBinding {...props} />
    </PresenterScope>
  );
}

function EditorBinding(props: Parameters<typeof useEditorPresenter>[0]) {
  const model = useEditorPresenter(props);
  const handlers = useActions(model.handlers);
  return <EditorView model={{ ...model, handlers } as typeof model} />;
}
