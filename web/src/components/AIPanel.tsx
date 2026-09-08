import { useEffect, useState } from 'react';
import { renderMarkdown } from '../markdown.ts';

type Update = {
  update?: {
    sessionUpdate: string;
    content?: { type: string; text?: string };
    title?: string;
    status?: string;
    toolCallId?: string;
  };
};
type State = {
  busy: boolean;
  error?: string;
  sessionId: string;
  events: { kind: string; text?: string; data?: Update }[];
  permissions: {
    id: string | number;
    params: { toolCall?: { title?: string }; options: { optionId: string; name: string }[] };
  }[];
  authMethods?: { id: string; name: string }[];
};

export function AIPanel({ kind, id }: { kind: string; id: string }) {
  return <Panel key={`${kind}/${id}`} kind={kind} id={id} />;
}
function Panel({ kind, id }: { kind: string; id: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State | null>(null);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const path = `/api/ai/${kind}/${encodeURIComponent(id)}`;
  useEffect(() => {
    if (!open) return;
    let active = true;
    const poll = async () => {
      try {
        const r = await fetch(path);
        if (!r.ok) throw new Error('Unable to load conversation');
        const next = (await r.json()) as State;
        if (active) setState(next);
      } catch (e) {
        if (active) setError(String(e));
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [path, open]);
  async function action(body: Record<string, unknown>) {
    setSending(true);
    setError('');
    try {
      const r = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const next = (await r.json()) as State;
      if (!r.ok) throw new Error(next.error ?? r.statusText);
      setState(next);
      if (body.action === 'prompt') setPrompt('');
    } catch (e) {
      setError(String(e));
    } finally {
      setSending(false);
    }
  }
  const messages: { role: string; text: string }[] = [];
  for (const e of state?.events ?? []) {
    const update = e.data?.update;
    const role =
      e.kind === 'user' || update?.sessionUpdate === 'user_message_chunk'
        ? 'You'
        : update?.sessionUpdate === 'agent_message_chunk'
          ? 'Agent'
          : 'Activity';
    const text =
      e.text ?? update?.content?.text ?? [update?.title, update?.status].filter(Boolean).join(' ');
    if (!text) continue;
    const last = messages.at(-1);
    if (last?.role === role && e.kind !== 'user') last.text += text;
    else messages.push({ role, text });
  }
  return (
    <section className="ai-panel" aria-label="AI assistant">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
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
                <div className="md" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }} />
              </article>
            ))}
          </div>
          <p role="status">
            {state?.busy ? 'Working…' : state?.sessionId ? 'Ready' : 'Send a message to connect'}
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
                onClick={() => void action({ action: 'authenticate', auth: a.id })}
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
                  onClick={() =>
                    void action({ action: 'permission', id: p.id, option: o.optionId })
                  }
                >
                  {o.name}
                </button>
              ))}
            </fieldset>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void action({ action: 'prompt', prompt });
            }}
          >
            <label>
              Message
              <textarea
                aria-label="Message to AI"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                required
                disabled={sending}
              />
            </label>
            <button type="submit" disabled={sending || state?.busy || !prompt.trim()}>
              Send
            </button>
            <button
              type="button"
              disabled={!state?.busy || sending}
              onClick={() => void action({ action: 'cancel' })}
            >
              Stop
            </button>
            <button
              type="button"
              disabled={state?.busy || sending}
              onClick={() => {
                if (window.confirm('Start a new conversation for this document?'))
                  void action({ action: 'reset' });
              }}
            >
              New conversation
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
