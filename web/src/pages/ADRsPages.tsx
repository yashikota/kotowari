import { Link } from '@tanstack/react-router';
import { AIPanel } from '../components/AIPanel.tsx';
import { DocumentEditor } from '../components/DocumentEditor.tsx';
import { ADR_STATUSES, ADR_STATUS_LABEL } from '../types.ts';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useADRDetailPagePresenter, useADRsPagePresenter } from '../presenters/ADRsPages.tsx';
export function ADRsPageView({ model }: { model: ReturnType<typeof useADRsPagePresenter> }) {
  switch (model._view) {
    case 0: {
      const { adrs, status, project, filtered, handlers } = model;
      return (
        <div className="main single">
          <section className="pane">
            <div className="pane-head">
              <h1>ADRs</h1>
              <span className="muted">Press p</span>
              <select
                aria-label="Filter ADR status"
                value={status}
                onChange={handlers.Filter_ADR_status_onChange0}
              >
                <option value="">All statuses</option>
                {ADR_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <select
                aria-label="Filter ADR project"
                value={project}
                onChange={handlers.Filter_ADR_project_onChange1}
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
  }
}
export function ADRsPage() {
  return (
    <PresenterScope name="ADRsPage">
      <ADRsPageBinding />
    </PresenterScope>
  );
}
function ADRsPageBinding() {
  const model = useADRsPagePresenter();
  const handlers = useActions(model.handlers);
  return <ADRsPageView model={{ ...model, handlers } as typeof model} />;
}

export function ADRDetailPageView({
  model,
}: {
  model: ReturnType<typeof useADRDetailPagePresenter>;
}) {
  switch (model._view) {
    case 0: {
      const {
        identifier,
        initial,
        allADRs,
        projects,
        adr,
        linkNumber,
        error,
        linked,
        unlinked,
        sandbox,
        handlers,
      } = model;
      return (
        <div className="main single">
          <section className="pane">
            <div className="pane-head">
              <h1>{adr.identifier}</h1>
              <a href={`/api/adrs/${identifier}/export`} className="ghost">
                Export with assets
              </a>
              <button type="button" onClick={handlers.onClick0}>
                Revisit decision
              </button>
              <select
                className="field"
                aria-label="ADR status"
                value={adr.status}
                onChange={handlers.ADR_status_onChange1}
              >
                {ADR_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {ADR_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
              <button type="button" className="ghost" onClick={handlers.onClick2}>
                Publish
              </button>
            </div>
            <div className="detail">
              {error ? <div className="error">{error}</div> : null}
              <input
                className="title-input"
                aria-label="ADR title"
                value={adr.title}
                onChange={handlers.ADR_title_onChange3}
                onBlur={handlers.ADR_title_onBlur4}
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
                  onChange={handlers.ADR_project_onChange5}
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
                        — {a.number === adr.supersedes ? 'Previous decision' : 'Successor'} (
                        {a.status})
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
                  onChange={handlers.Evaluation_onChange6}
                  onBlur={handlers.Evaluation_onBlur7}
                />
              </label>
              <label>
                <span className="sr-only">Supersedes ADR number</span>
                <input
                  className="field"
                  type="number"
                  min={1}
                  aria-label="Supersedes ADR number"
                  disabled={initial.supersedes != null}
                  placeholder="Supersedes ADR number"
                  value={adr.supersedes ?? ''}
                  onChange={handlers.Supersedes_ADR_number_onChange8}
                  onBlur={handlers.Supersedes_ADR_number_onBlur9}
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
                          onClick={() => handlers.onClick10(iss)}
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
                      onChange={handlers.Link_issue_onChange11}
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
                    onClick={handlers.onClick12}
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
  }
}
export function ADRDetailPage() {
  return (
    <PresenterScope name="ADRDetailPage">
      <ADRDetailPageBinding />
    </PresenterScope>
  );
}
function ADRDetailPageBinding() {
  const model = useADRDetailPagePresenter();
  const handlers = useActions(model.handlers);
  return <ADRDetailPageView model={{ ...model, handlers } as typeof model} />;
}
