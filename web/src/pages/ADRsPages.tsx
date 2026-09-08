import { AIPanel } from '../components/AIPanel.tsx';
import { Link, useLoaderData, useParams, useRouter, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { api } from '../api.ts';
import { DocumentEditor } from '../components/DocumentEditor.tsx';
import { ADR_STATUSES, ADR_STATUS_LABEL, entityDir } from '../types.ts';
import type { ADR, Issue, Project } from '../types.ts';

export function ADRsPage() {
  const adrs = useLoaderData({ from: '/adrs' }) as ADR[];
  const [status, setStatus] = useState('');
  const [project, setProject] = useState('');
  const filtered = adrs.filter(
    (a) => (!status || a.status === status) && (!project || a.projectSlug === project),
  );
  return (
    <div className="main single">
      <section className="pane">
        <div className="pane-head">
          <h1>ADRs</h1>
          <span className="muted">Press p</span>
          <select
            aria-label="Filter ADR status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {ADR_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            aria-label="Filter ADR project"
            value={project}
            onChange={(e) => setProject(e.target.value)}
          >
            <option value="">All projects</option>
            {[...new Set(adrs.map((a) => a.projectSlug).filter(Boolean))].map((p) => (
              <option key={p!} value={p!}>
                {p}
              </option>
            ))}
          </select>
        </div>
        {adrs.length === 0 ? (
          <div className="empty">
            No ADRs. Press <span className="kbd">p</span> to create one.
          </div>
        ) : (
          <div className="list" role="list">
            {filtered.map((a) => (
              <Link
                className="row"
                key={a.identifier}
                to="/adrs/$identifier"
                params={{ identifier: a.identifier }}
              >
                <span className="rail" />
                <span className="ident">{a.identifier}</span>
                <span>{a.title}</span>
                <span className="badge">{ADR_STATUS_LABEL[a.status]}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function ADRDetailPage() {
  const { identifier } = useParams({ from: '/adrs/$identifier' });
  const initial = useLoaderData({ from: '/adrs/$identifier' }) as ADR;
  const router = useRouter();
  const navigate = useNavigate();
  const [allADRs, setAllADRs] = useState<ADR[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [adr, setAdr] = useState(initial);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [linkNumber, setLinkNumber] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setAdr(initial);
  }, [initial]);

  useEffect(() => {
    void Promise.all([api.issues(), api.adrs(), api.projects()])
      .then(([i, a, p]) => {
        setIssues(i);
        setAllADRs(a);
        setProjects(p);
      })
      .catch((e) => setError(String(e)));
  }, [identifier]);

  async function save(body: Record<string, unknown>) {
    try {
      setError('');
      const next = await api.patchADR(identifier, body);
      setAdr(next);
      await router.invalidate();
    } catch (e) {
      setError(String(e));
    }
  }

  const linked = issues.filter((i) => adr.issueNumbers.includes(i.number));
  const unlinked = issues.filter((i) => !adr.issueNumbers.includes(i.number));
  const sandbox = `adr/${entityDir(adr.number)}/`;

  return (
    <div className="main single">
      <section className="pane">
        <div className="pane-head">
          <h1>{adr.identifier}</h1>
          <a href={`/api/adrs/${identifier}/export`} className="ghost">
            Export with assets
          </a>
          <button
            type="button"
            onClick={() => {
              const title = window.prompt('New decision title', adr.title);
              if (title?.trim())
                void api
                  .createADR({
                    title,
                    supersedes: adr.number,
                    projectSlug: adr.projectSlug,
                    issueNumbers: adr.issueNumbers,
                  })
                  .then((a) =>
                    navigate({ to: '/adrs/$identifier', params: { identifier: a.identifier } }),
                  )
                  .catch((e) => setError(String(e)));
            }}
          >
            Revisit decision
          </button>
          <select
            className="field"
            aria-label="ADR status"
            value={adr.status}
            onChange={(e) => void save({ status: e.target.value })}
          >
            {ADR_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ADR_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              void api.publishADR(identifier).then(async (next) => {
                setAdr(next);
                await router.invalidate();
              });
            }}
          >
            Publish
          </button>
        </div>
        <div className="detail">
          {error ? <div className="error">{error}</div> : null}
          <input
            className="title-input"
            aria-label="ADR title"
            value={adr.title}
            onChange={(e) => setAdr({ ...adr, title: e.target.value })}
            onBlur={() => void save({ title: adr.title })}
          />
          <div className="muted">
            Sandbox {sandbox} (experiments stay here; kotowari does not run them). ADRs are
            append-only; supersede instead of deleting.
          </div>
          <label>
            Project{' '}
            <select
              aria-label="ADR project"
              value={adr.projectSlug ?? ''}
              onChange={(e) => void save({ projectSlug: e.target.value || null })}
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <section aria-label="Decision history">
            <h2>Decision history</h2>
            <ul>
              {allADRs
                .filter((a) => a.number === adr.supersedes || a.supersedes === adr.number)
                .sort((a, b) => a.number - b.number)
                .map((a) => (
                  <li key={a.number}>
                    <Link to="/adrs/$identifier" params={{ identifier: a.identifier }}>
                      {a.identifier} {a.title}
                    </Link>{' '}
                    — {a.number === adr.supersedes ? 'Previous decision' : 'Successor'} ({a.status})
                  </li>
                ))}
            </ul>
          </section>
          <label>
            <span className="sr-only">Evaluation</span>
            <input
              className="field"
              aria-label="Evaluation"
              placeholder="Evaluation function (one line)"
              value={adr.evaluation}
              onChange={(e) => setAdr({ ...adr, evaluation: e.target.value })}
              onBlur={() => void save({ evaluation: adr.evaluation })}
            />
          </label>
          <label>
            <span className="sr-only">Supersedes ADR number</span>
            <input
              className="field"
              type="number"
              min={1}
              aria-label="Supersedes ADR number"
              placeholder="Supersedes ADR number"
              value={adr.supersedes ?? ''}
              onChange={(e) =>
                setAdr({
                  ...adr,
                  supersedes: e.target.value ? Number(e.target.value) : null,
                })
              }
              onBlur={() => void save({ supersedes: adr.supersedes })}
            />
          </label>
          <AIPanel kind="adrs" id={identifier} />
          <DocumentEditor
            documentKey={`adrs/${identifier}/body`}
            assetBase={`/api/adrs/${identifier}/`}
          />
          <div>
            <div className="muted">PUBLISH.md (English)</div>
            <DocumentEditor
              documentKey={`adrs/${identifier}/publishBody`}
              assetBase={`/api/adrs/${identifier}/`}
            />
          </div>
          <div>
            <div className="muted">Linked issues</div>
            {linked.length === 0 ? (
              <div className="empty-inline">No issues. Work can stay on the ADR alone.</div>
            ) : (
              <div className="list" role="list">
                {linked.map((iss) => (
                  <div className="row" key={iss.identifier}>
                    <Link
                      to="/issues/$identifier"
                      params={{ identifier: iss.identifier }}
                      className="ident"
                    >
                      {iss.identifier}
                    </Link>
                    <span>{iss.title}</span>
                    <button
                      type="button"
                      className="ghost"
                      aria-label={`Unlink ${iss.identifier}`}
                      onClick={() => {
                        void api.unlinkADRIssue(identifier, iss.number).then(async () => {
                          setAdr(await api.adr(identifier));
                          await router.invalidate();
                        });
                      }}
                    >
                      Unlink
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="props">
              <label>
                <span className="sr-only">Link issue</span>
                <select
                  aria-label="Link issue"
                  value={linkNumber}
                  onChange={(e) => setLinkNumber(e.target.value)}
                >
                  <option value="">Link an issue</option>
                  {unlinked.map((iss) => (
                    <option key={iss.id} value={String(iss.number)}>
                      {iss.identifier} {iss.title}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="ghost"
                disabled={!linkNumber}
                onClick={() => {
                  const n = Number(linkNumber);
                  if (!n) {
                    return;
                  }
                  setError('');
                  void api
                    .linkADRIssue(identifier, n)
                    .then(async (next) => {
                      setAdr(next);
                      setLinkNumber('');
                      await router.invalidate();
                    })
                    .catch((e: unknown) =>
                      setError(e instanceof Error ? e.message : 'link failed'),
                    );
                }}
              >
                Link
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
