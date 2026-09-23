import { SegmentedControl, Stack, Text, Textarea } from '@mantine/core';
import { renderMarkdown } from '../markdown.ts';
import { MarkdownContent } from '../mantine-ui.tsx';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useMarkdownFieldPresenter } from '../presenters/MarkdownField.tsx';

export function MarkdownFieldView({
  model,
}: {
  model: ReturnType<typeof useMarkdownFieldPresenter>;
}) {
  switch (model._view) {
    case 0: {
      const { value, placeholder, mode, handlers } = model;
      return (
        <Stack gap="sm">
          <SegmentedControl
            aria-label="Body"
            role="tablist"
            value={mode}
            onChange={handlers.onModeChange}
            data={[
              { label: 'Edit', value: 'edit' },
              { label: 'Preview', value: 'preview' },
            ]}
          />
          {mode === 'edit' ? (
            <Textarea
              aria-label="Markdown body"
              value={value}
              placeholder={placeholder ?? 'Write markdown…'}
              onChange={handlers.Markdown_body_onChange2}
              onBlur={handlers.Markdown_body_onBlur3}
              minRows={12}
              autosize
            />
          ) : value.trim() ? (
            <MarkdownContent html={renderMarkdown(value)} />
          ) : (
            <Text c="dimmed">Empty</Text>
          )}
        </Stack>
      );
    }
  }
}

export function MarkdownField(props: Parameters<typeof useMarkdownFieldPresenter>[0]) {
  return (
    <PresenterScope name="MarkdownField">
      <MarkdownFieldBinding {...props} />
    </PresenterScope>
  );
}

function MarkdownFieldBinding(props: Parameters<typeof useMarkdownFieldPresenter>[0]) {
  const model = useMarkdownFieldPresenter(props);
  const handlers = useActions(model.handlers);
  return <MarkdownFieldView model={{ ...model, handlers } as typeof model} />;
}
