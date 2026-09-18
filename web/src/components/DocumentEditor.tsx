import { PresenterScope, useActions } from '../application/Root.tsx';
import { useDocumentEditorPresenter, useEditorPresenter } from '../presenters/DocumentEditor.tsx';
export function DocumentEditorView({
  model,
}: {
  model: ReturnType<typeof useDocumentEditorPresenter>;
}) {
  switch (model._view) {
    case 0: {
      const { documentKey, assetBase } = model;
      return <Editor key={documentKey} documentKey={documentKey} assetBase={assetBase} />;
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
      return (
        <div className="md-field document-editor" aria-busy={busy}>
          <div className="seg" aria-label="Document view">
            <button type="button" aria-pressed={mode === 'preview'} onClick={handlers.onClick0}>
              Preview
            </button>
            <button type="button" aria-pressed={mode === 'edit'} onClick={handlers.onClick1}>
              Edit
            </button>
            <button type="button" aria-pressed={mode === 'compare'} onClick={handlers.onClick2}>
              Compare
            </button>
            <button
              type="button"
              disabled={!server || busy || conflict || !dirty.current}
              onClick={handlers.onClick3}
            >
              Save
            </button>
            <button type="button" onClick={handlers.onClick4}>
              History
            </button>
            <span role="status">{status}</span>
          </div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {conflict && (
            <div role="alert" className="diag">
              The document changed on disk. Your draft is preserved. Compare both versions, then
              merge your changes.
              <button type="button" onClick={handlers.onClick5}>
                Compare versions
              </button>
              <button type="button" onClick={handlers.onClick6}>
                Use current version as base
              </button>
            </div>
          )}
          {history.length > 0 && (
            <details open>
              <summary>Previous versions</summary>
              <ul>
                {history.map((h) => (
                  <li key={h.revision}>
                    <button type="button" onClick={() => handlers.onClick7(h)}>
                      {h.savedAt} — Restore as draft
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
          {mode !== 'preview' && (
            <textarea
              className="body-input"
              aria-label="Markdown body"
              disabled={!server || busy}
              value={draft}
              onChange={handlers.Markdown_body_onChange8}
              onKeyDown={handlers.Markdown_body_onKeyDown9}
            />
          )}
          {mode === 'compare' && (
            <div className="document-comparison">
              <div>
                <h3>Current document</h3>
                <pre>{server?.body}</pre>
              </div>
              <div>
                <h3>Your draft</h3>
                <pre>{draft}</pre>
              </div>
            </div>
          )}
          {mode !== 'edit' && (
            <>
              <nav aria-label="Document contents">
                <ul>
                  {headings.map((h) => (
                    <li key={h.id}>
                      <a href={`#${h.id}`}>{h.text}</a>
                    </li>
                  ))}
                </ul>
              </nav>
              <div ref={contentRef} className="md" dangerouslySetInnerHTML={{ __html: html }} />
            </>
          )}
        </div>
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
