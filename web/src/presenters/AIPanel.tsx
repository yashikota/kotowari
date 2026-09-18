import type * as React from 'react';
import { useEffect, useState } from 'react';

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

export function useAIPanelPresenter({ kind, id }: { kind: string; id: string }) {
  return { _view: 0 as const, kind, id, handlers: {} };
}
export function usePanelPresenter({ kind, id }: { kind: string; id: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State | null>(null);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const path = `/api/ai/${kind}/${encodeURIComponent(id)}`;
  useEffect(() => {
    if (!open) return;
    let active = true;
    let pending = false;
    const poll = async () => {
      if (pending || document.hidden) return;
      pending = true;
      try {
        const r = await fetch(path);
        if (!r.ok) throw new Error('Unable to load conversation');
        const next = (await r.json()) as State;
        if (active)
          setState((previous) =>
            JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
          );
      } catch (e) {
        if (active) setError(String(e));
      } finally {
        pending = false;
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
  return {
    _view: 0 as const,
    id,
    open,
    state,
    prompt,
    error,
    sending,
    messages,
    handlers: {
      onClick0: () => setOpen(!open),
      onClick1: (a: { id: string; name: string }) => action({ action: 'authenticate', auth: a.id }),
      onClick2: (
        p: {
          id: string | number;
          params: { toolCall?: { title?: string }; options: { optionId: string; name: string }[] };
        },
        o: { optionId: string; name: string },
      ) => action({ action: 'permission', id: p.id, option: o.optionId }),
      onSubmit3: (e: Parameters<NonNullable<React.ComponentProps<'form'>['onSubmit']>>[0]) => {
        e.preventDefault();
        if (sending || state?.busy || !prompt.trim()) return;
        return action({ action: 'prompt', prompt });
      },
      Message_to_AI_onChange4: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => setPrompt(e.target.value),
      onClick5: () => action({ action: 'cancel' }),
      onClick6: () => {
        if (window.confirm('Start a new conversation for this document?'))
          return action({ action: 'reset' });
      },
    },
  };
}
