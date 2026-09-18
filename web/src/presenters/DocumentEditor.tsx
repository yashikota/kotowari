import type * as React from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { queryCache } from '../application/cache.ts';
import { signals } from '../application/mediator.ts';
import { renderMarkdown } from '../markdown.ts';

type Document = { body: string; revision: string; savedAt?: string };
async function request(path: string, init?: RequestInit): Promise<Document> {
  const r = await fetch(path, init);
  const data = (await r.json()) as Document & { error?: string };
  if (!r.ok) throw new Error(data.error ?? r.statusText);
  return data;
}

export function useDocumentEditorPresenter({
  documentKey,
  assetBase = '',
}: {
  documentKey: string;
  assetBase?: string;
}) {
  return { _view: 0 as const, documentKey, assetBase, handlers: {} };
}

export function useEditorPresenter({
  documentKey,
  assetBase,
}: {
  documentKey: string;
  assetBase: string;
}) {
  const path = `/api/documents/${documentKey}`;
  const draftKey = `kotowari:draft:${location.origin}:${documentKey}`;
  const prefix = useId().replaceAll(':', '') + '-';
  const [server, setServer] = useState<Document | null>(null);
  const [draft, setDraft] = useState('');
  const [base, setBase] = useState('');
  const [mode, setMode] = useState<'preview' | 'edit' | 'compare'>('preview');
  const [status, setStatus] = useState('Loading…');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<Document[]>([]);
  const loaded = useRef(false);
  const generation = useRef(0);
  const saving = useRef(false);
  const dirty = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [headings, setHeadings] = useState<{ id: string; text: string }[]>([]);
  const html = renderMarkdown(
    dirty.current || mode === 'edit' || mode === 'compare' ? draft : (server?.body ?? ''),
    assetBase,
    prefix,
  );

  useEffect(() => {
    setHeadings(
      Array.from(contentRef.current?.querySelectorAll('h1,h2,h3') ?? []).map((h) => ({
        id: h.id,
        text: h.textContent ?? '',
      })),
    );
  }, [html, mode]);

  useEffect(() => {
    let active = true;
    let pending = false;
    async function refresh() {
      try {
        if (saving.current || pending) return;
        pending = true;
        const token = generation.current;
        const doc = await request(path);
        if (!active || saving.current || token !== generation.current) return;
        setServer(doc);
        if (!loaded.current) {
          loaded.current = true;
          let saved: { body: string; revision: string } | null = null;
          try {
            saved = JSON.parse(localStorage.getItem(draftKey) ?? 'null') as {
              body: string;
              revision: string;
            } | null;
          } catch {
            /* unavailable storage */
          }
          setDraft(saved?.body ?? doc.body);
          setBase(saved?.revision ?? doc.revision);
          dirty.current = !!saved && saved.body !== doc.body;
          if (dirty.current) {
            setMode('edit');
            setStatus('Recovered unsaved draft');
          } else setStatus('Saved');
        } else if (!dirty.current) {
          setDraft(doc.body);
          setBase(doc.revision);
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Unable to load document');
      } finally {
        pending = false;
      }
    }
    void refresh();
    const timer = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 2000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [path, draftKey]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty.current) event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  function change(body: string, revision = base) {
    setDraft(body);
    setBase(revision);
    dirty.current = true;
    setStatus('Unsaved draft');
    try {
      localStorage.setItem(draftKey, JSON.stringify({ body, revision }));
    } catch {
      setError('Draft cannot be stored in this browser. Save before leaving.');
    }
  }
  async function save() {
    if (saving.current) return;
    saving.current = true;
    generation.current++;
    setBusy(true);
    setError('');
    try {
      const next = await request(path, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: draft, revision: base }),
      });
      dirty.current = false;
      setServer(next);
      setDraft(next.body);
      setBase(next.revision);
      setStatus('Saved');
      try {
        localStorage.removeItem(draftKey);
      } catch {
        /* saved on server */
      }
      queryCache.invalidate();
      signals.dispatchEvent(new Event('kotowari:refresh'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
      setStatus('Not saved');
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  const conflict = !!server && dirty.current && server.revision !== base;
  return {
    _view: 0 as const,
    server,
    draft,
    base,
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
    handlers: {
      onClick0: () => setMode('preview'),
      onClick1: () => setMode('edit'),
      onClick2: () => setMode('compare'),
      onClick3: () => save(),
      onClick4: () => {
        return fetch(`${path}/history`)
          .then(async (r) => {
            if (!r.ok) throw new Error('Unable to load history');
            setHistory((await r.json()) as Document[]);
          })
          .catch((e) => setError(String(e)));
      },
      onClick5: () => {
        setMode('compare');
      },
      onClick6: () => {
        if (!server) return;
        change(draft, server.revision);
        setMode('edit');
      },
      onClick7: (h: Document) => {
        change(h.body, server?.revision ?? base);
        setMode('compare');
      },
      Markdown_body_onChange8: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => change(e.target.value),
      Markdown_body_onKeyDown9: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onKeyDown']>>[0],
      ) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return;

        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault();
          if (!conflict) return save();
        }
      },
    },
  };
}
