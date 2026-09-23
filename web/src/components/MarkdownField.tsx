import { SegmentedControl, Stack, Text, Textarea } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { renderMarkdown } from '../markdown.ts';
import { MarkdownContent } from '../mantine-ui.tsx';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useMarkdownFieldPresenter } from '../presenters/MarkdownField.tsx';

export function MarkdownFieldView({
  model,
}: {
  model: ReturnType<typeof useMarkdownFieldPresenter>;
}) {
  const { t } = useTranslation();
  switch (model._view) {
    case 0: {
      const { value, placeholder, mode, handlers } = model;
      return (
        <Stack gap="sm">
          <SegmentedControl
            aria-label={t('ui.body')}
            role="tablist"
            value={mode}
            onChange={handlers.onModeChange}
            data={[
              { label: t('ui.edit'), value: 'edit' },
              { label: t('ui.preview'), value: 'preview' },
            ]}
          />
          {mode === 'edit' ? (
            <Textarea
              aria-label={t('ui.markdownBody')}
              value={value}
              placeholder={placeholder ?? t('documentEditor.writeMarkdown')}
              onChange={handlers.Markdown_body_onChange2}
              onBlur={handlers.Markdown_body_onBlur3}
              minRows={12}
              autosize
            />
          ) : value.trim() ? (
            <MarkdownContent html={renderMarkdown(value)} />
          ) : (
            <Text c="dimmed">{t('ui.empty')}</Text>
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
