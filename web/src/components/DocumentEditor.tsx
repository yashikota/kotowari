import {
  ActionIcon,
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
import { IconPencil } from '@tabler/icons-react';
import { MarkdownContent } from '../mantine-ui.tsx';
import { useTranslation } from 'react-i18next';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useFocusWhen } from '../focus.ts';
import { useDocumentEditorPresenter, useEditorPresenter } from '../presenters/DocumentEditor.tsx';
import styles from './DocumentEditor.module.css';

export function DocumentEditorView({
  model,
}: {
  model: ReturnType<typeof useDocumentEditorPresenter>;
}) {
  switch (model._view) {
    case 0: {
      const { documentKey, assetBase, inline, historyRequest, focusRequest, showHistoryButton } =
        model;
      return (
        <Editor
          key={documentKey}
          documentKey={documentKey}
          assetBase={assetBase}
          inline={inline}
          historyRequest={historyRequest}
          focusRequest={focusRequest}
          showHistoryButton={showHistoryButton}
        />
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

export function EditorView({
  model,
  editRef,
}: {
  model: ReturnType<typeof useEditorPresenter>;
  editRef: ReturnType<typeof useFocusWhen<HTMLTextAreaElement>>;
}) {
  const { t } = useTranslation();
  switch (model._view) {
    case 0: {
      const {
        inline,
        showHistoryButton,
        server,
        draft,
        mode,
        status,
        error,
        busy,
        history,
        historyRequested,
        historyOpened,
        dirty,
        contentRef,
        headings,
        html,
        conflict,
        handlers,
      } = model;
      return (
        <Stack
          component="section"
          aria-label={t('ui.documentEditor')}
          gap={inline ? 'xs' : 'md'}
          aria-busy={busy}
        >
          {inline && mode === 'preview' && server?.body.trim() ? null : (
            <Group justify="space-between" wrap="wrap" mih={inline ? 24 : undefined}>
              {inline ? (
                mode === 'preview' && !server?.body.trim() ? null : (
                  <Button
                    type="button"
                    size="xs"
                    variant="subtle"
                    onClick={handlers.onToggleMode}
                    styles={{
                      root: {
                        height: 24,
                        paddingInline: 6,
                        color: 'var(--mantine-color-dimmed)',
                        fontSize: 'var(--mantine-font-size-xs)',
                      },
                    }}
                  >
                    {t('ui.preview')}
                  </Button>
                )
              ) : (
                <SegmentedControl
                  aria-label={t('ui.documentView')}
                  value={mode}
                  transitionDuration={0}
                  onChange={handlers.onModeChange}
                  data={[
                    { label: t('ui.preview'), value: 'preview' },
                    { label: t('ui.edit'), value: 'edit' },
                    { label: t('ui.compare'), value: 'compare' },
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
                      {t('common.save')}
                    </Button>
                    <Text component="span" role="status" size="sm" c="dimmed">
                      {status}
                    </Text>
                  </>
                )}
                {showHistoryButton ? (
                  <Button type="button" variant="default" onClick={handlers.onClick4}>
                    {t('documentHistory.button')}
                  </Button>
                ) : null}
              </Group>
            </Group>
          )}

          {error ? (
            <Alert color="red" role="alert">
              {error}
            </Alert>
          ) : null}

          {conflict ? (
            <Alert color="yellow" role="alert" title={t('ui.documentChangedOnDisk')}>
              {t('ui.documentChangedDraftPreserved')}
              <Group mt="sm" gap="xs">
                <Button type="button" size="xs" onClick={handlers.onClick5}>
                  {t('ui.compareVersions')}
                </Button>
                <Button type="button" size="xs" variant="default" onClick={handlers.onClick6}>
                  {t('ui.useCurrentVersionAsBase')}
                </Button>
              </Group>
            </Alert>
          ) : null}

          {history.length > 0 || historyRequested ? (
            <Accordion
              value={historyOpened ? 'history' : null}
              onChange={handlers.onHistoryOpenChange}
            >
              <Accordion.Item value="history">
                <Accordion.Control>{t('documentHistory.heading')}</Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>
                      {t('documentHistory.currentVersion')}
                    </Text>
                    <Code block>{server?.body ?? ''}</Code>
                    {history.length === 0 ? (
                      <Text size="sm" c="dimmed">
                        {t('documentHistory.empty')}
                      </Text>
                    ) : null}
                    {history.map((h) => (
                      <Button
                        type="button"
                        key={h.revision}
                        variant="subtle"
                        onClick={() => handlers.onClick7(h)}
                      >
                        {t('documentHistory.restoreAsDraft', { date: h.savedAt })}
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
              aria-label={t('ui.markdownBody')}
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
                <Title order={4}>{t('ui.currentDocument')}</Title>
                <Code block>{server?.body}</Code>
              </Stack>
              <Stack gap="xs">
                <Title order={4}>{t('ui.yourDraft')}</Title>
                <Code block>{draft}</Code>
              </Stack>
            </SimpleGrid>
          ) : null}

          {mode !== 'edit' ? (
            <>
              {!inline ? (
                <nav aria-label={t('ui.documentContents')}>
                  <List size="sm">
                    {headings.map((h) => (
                      <List.Item key={h.id}>
                        <Anchor href={`#${h.id}`}>{h.text}</Anchor>
                      </List.Item>
                    ))}
                  </List>
                </nav>
              ) : null}
              <Box
                ref={contentRef}
                className={
                  inline && mode === 'preview' && server?.body.trim()
                    ? styles.inlinePreview
                    : undefined
                }
                onClick={(event) => {
                  if (!inline || mode !== 'preview' || !server?.body.trim()) return;
                  if ((event.target as Element).closest('a,button')) return;
                  handlers.onClick1();
                }}
              >
                {inline && !server?.body.trim() ? (
                  <Button
                    type="button"
                    variant="subtle"
                    size="compact-sm"
                    onClick={handlers.onClick1}
                    styles={{
                      root: {
                        height: 28,
                        padding: 0,
                        color: 'var(--mantine-color-dimmed)',
                        fontWeight: 400,
                      },
                    }}
                  >
                    {t('ui.addDescription')}
                  </Button>
                ) : (
                  <MarkdownContent html={html} />
                )}
                {inline && mode === 'preview' && server?.body.trim() ? (
                  <ActionIcon
                    type="button"
                    variant="default"
                    size="xs"
                    className={styles.inlineEditTrigger}
                    aria-label={t('ui.editDescription')}
                    title={t('ui.editDescription')}
                    onClick={(event) => {
                      event.stopPropagation();
                      handlers.onClick1();
                    }}
                  >
                    <IconPencil size={13} aria-hidden="true" />
                  </ActionIcon>
                ) : null}
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
  const editRef = useFocusWhen<HTMLTextAreaElement>(model.mode === 'edit', [
    model.mode,
    model.focusRequest,
  ]);
  return <EditorView model={{ ...model, handlers } as typeof model} editRef={editRef} />;
}
