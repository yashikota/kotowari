import { renderMarkdown } from '../markdown.ts';

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
        <section className="ai-panel" aria-label="AI assistant">
          <button type="button" aria-expanded={open} onClick={handlers.onClick0}>
            Ask AI about {id}
          </button>
          {open && (
            <div className="ai-content">
              <p className="muted">
                Conversation for {id}. The saved document is included with each message.
              </p>
              <div className="ai-messages">
                {messages.map((m, i) => (
                  <article key={i}>
                    <strong>{m.role}</strong>
                    <div
                      className="md"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }}
                    />
                  </article>
                ))}
              </div>
              <p role="status">
                {state?.busy
                  ? 'Working…'
                  : state?.sessionId
                    ? 'Ready'
                    : 'Send a message to connect'}
              </p>
              {(error || state?.error) && (
                <p className="error" role="alert">
                  {error || state?.error}
                </p>
              )}
              {state?.error &&
                state.authMethods?.map((a) => (
                  <button
                    type="button"
                    key={a.id}
                    disabled={state.busy || sending}
                    onClick={() => handlers.onClick1(a)}
                  >
                    {a.name}
                  </button>
                ))}
              {state?.permissions.map((p) => (
                <fieldset key={p.id}>
                  <legend>{p.params.toolCall?.title ?? 'Agent requests permission'}</legend>
                  <details>
                    <summary>Request details</summary>
                    <pre>{JSON.stringify(p.params, null, 2)}</pre>
                  </details>
                  {p.params.options.map((o) => (
                    <button
                      type="button"
                      key={o.optionId}
                      disabled={sending}
                      onClick={() => handlers.onClick2(p, o)}
                    >
                      {o.name}
                    </button>
                  ))}
                </fieldset>
              ))}
              <form onSubmit={handlers.onSubmit3}>
                <label>
                  Message
                  <textarea
                    aria-label="Message to AI"
                    value={prompt}
                    onChange={handlers.Message_to_AI_onChange4}
                    required
                    disabled={sending}
                  />
                </label>
                <span className="muted">Enter to insert a line · Ctrl/⌘+Enter to send</span>
                <button type="submit" disabled={sending || state?.busy || !prompt.trim()}>
                  Send
                </button>
                <button
                  type="button"
                  disabled={!state?.busy || sending}
                  onClick={handlers.onClick5}
                >
                  Stop
                </button>
                <button type="button" disabled={state?.busy || sending} onClick={handlers.onClick6}>
                  New conversation
                </button>
              </form>
            </div>
          )}
        </section>
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
