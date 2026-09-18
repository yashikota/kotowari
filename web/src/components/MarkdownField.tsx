import { renderMarkdown } from '../markdown.ts';

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
        <div className="md-field">
          <div className="seg" role="tablist" aria-label="Body">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'edit'}
              className={mode === 'edit' ? 'on' : ''}
              onClick={handlers.onClick0}
            >
              Edit
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'preview'}
              className={mode === 'preview' ? 'on' : ''}
              onClick={handlers.onClick1}
            >
              Preview
            </button>
          </div>
          {mode === 'edit' ? (
            <textarea
              className="body-input"
              aria-label="Markdown body"
              value={value}
              placeholder={placeholder ?? 'Write markdown…'}
              onChange={handlers.Markdown_body_onChange2}
              onBlur={handlers.Markdown_body_onBlur3}
            />
          ) : (
            <div
              className="md"
              // HTML is escaped by renderMarkdown before tags are added.
              dangerouslySetInnerHTML={{
                __html: value.trim() ? renderMarkdown(value) : '<p class="muted">Empty</p>',
              }}
            />
          )}
        </div>
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
