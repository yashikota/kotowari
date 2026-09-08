import { useEffect, useId, useRef, useState } from 'react';
import { renderMarkdown } from '../markdown.ts';

type Document = { body: string; revision: string; savedAt?: string };
async function request(path: string, init?: RequestInit): Promise<Document> {
  const r = await fetch(path, init);
  const data = (await r.json()) as Document & { error?: string };
  if (!r.ok) throw new Error(data.error ?? r.statusText);
  return data;
}

export function DocumentEditor({
  documentKey,
  assetBase = '',
}: {
  documentKey: string;
  assetBase?: string;
}) {
  return <Editor key={documentKey} documentKey={documentKey} assetBase={assetBase} />;
}

function Editor({ documentKey, assetBase }: { documentKey: string; assetBase: string }) {
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
    async function refresh() {
      try {
        if (saving.current) return;
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
      window.dispatchEvent(new Event('kotowari:refresh'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
      setStatus('Not saved');
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  const conflict = !!server && dirty.current && server.revision !== base;
  return (
    <div className="md-field document-editor" aria-busy={busy}>
      <div className="seg" aria-label="Document view">
        <button type="button" aria-pressed={mode === 'preview'} onClick={() => setMode('preview')}>
          Preview
        </button>
        <button type="button" aria-pressed={mode === 'edit'} onClick={() => setMode('edit')}>
          Edit
        </button>
        <button type="button" aria-pressed={mode === 'compare'} onClick={() => setMode('compare')}>
          Compare
        </button>
        <button
          type="button"
          disabled={!server || busy || conflict || !dirty.current}
          onClick={() => void save()}
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => {
            void fetch(`${path}/history`)
              .then(async (r) => {
                if (!r.ok) throw new Error('Unable to load history');
                setHistory((await r.json()) as Document[]);
              })
              .catch((e) => setError(String(e)));
          }}
        >
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
          The document changed on disk. Your draft is preserved. Compare both versions, then merge
          your changes.
          <button
            type="button"
            onClick={() => {
              setMode('compare');
            }}
          >
            Compare versions
          </button>
          <button
            type="button"
            onClick={() => {
              change(draft, server.revision);
              setMode('edit');
            }}
          >
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
                <button
                  type="button"
                  onClick={() => {
                    change(h.body, server?.revision ?? base);
                    setMode('compare');
                  }}
                >
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
          onChange={(e) => change(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
              e.preventDefault();
              if (!conflict) void save();
            }
          }}
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
