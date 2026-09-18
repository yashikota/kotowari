import { Link } from '@tanstack/react-router';
import { IssueDetail } from '../components/IssueDetail.tsx';
import { IssueList } from '../components/IssueList.tsx';
import { CYCLE_STATUSES, PROJECT_STATUSES } from '../types.ts';

import { PresenterScope, useActions } from '../application/Root.tsx';
import {
  useCycleDetailPagePresenter,
  useCyclesPagePresenter,
  useProjectDetailPagePresenter,
  useProjectsPagePresenter,
} from '../presenters/ProjectsCycles.tsx';
export function ProjectsPageView({
  model,
}: {
  model: ReturnType<typeof useProjectsPagePresenter>;
}) {
  switch (model._view) {
    case 0: {
      const { projects, name, handlers } = model;
      return (
        <div className="main single">
          <section className="pane">
            <div className="pane-head">
              <h1>Projects</h1>
              <form onSubmit={handlers.onSubmit0}>
                <textarea
                  rows={2}
                  className="field"
                  aria-label="New project name"
                  placeholder="New project"
                  value={name}
                  onChange={handlers.New_project_name_onChange1}
                />
              </form>
            </div>
            {projects.length === 0 ? (
              <div className="empty">No projects yet. Name one above.</div>
            ) : (
              <div className="list">
                {projects.map((p) => (
                  <Link className="row" key={p.slug} to="/projects/$slug" params={{ slug: p.slug }}>
                    <span className="rail" />
                    <span className="ident">{p.status}</span>
                    <span>{p.name}</span>
                    <span className="progress" style={{ width: 72 }}>
                      <span style={{ width: `${Math.round(p.progress * 100)}%` }} />
                    </span>
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
export function ProjectsPage() {
  return (
    <PresenterScope name="ProjectsPage">
      <ProjectsPageBinding />
    </PresenterScope>
  );
}
function ProjectsPageBinding() {
  const model = useProjectsPagePresenter();
  const handlers = useActions(model.handlers);
  return <ProjectsPageView model={{ ...model, handlers } as typeof model} />;
}

export function ProjectDetailPageView({
  model,
}: {
  model: ReturnType<typeof useProjectDetailPagePresenter>;
}) {
  switch (model._view) {
    case 0: {
      const { slug, data, selected, project, handlers } = model;
      return (
        <div className="main">
          <section className="pane">
            <div className="pane-head">
              <h1>{project.name}</h1>
              <select
                className="field"
                aria-label="Project status"
                value={project.status}
                onChange={handlers.Project_status_onChange0}
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button type="button" className="ghost" onClick={handlers.onClick1}>
                New issue
              </button>
              <button type="button" className="ghost danger" onClick={handlers.onClick2}>
                Delete
              </button>
            </div>
            <div className="detail">
              <textarea
                className="field"
                aria-label="Project description"
                placeholder="Description"
                value={project.description}
                onChange={handlers.Project_description_onChange3}
                onBlur={handlers.Project_description_onBlur4}
              />
              <div className="props">
                <label>
                  <span className="muted">Start</span>
                  <input
                    type="date"
                    aria-label="Start date"
                    value={project.startDate?.slice(0, 10) ?? ''}
                    onChange={handlers.Start_date_onChange5}
                  />
                </label>
                <label>
                  <span className="muted">Target</span>
                  <input
                    type="date"
                    aria-label="Target date"
                    value={project.targetDate?.slice(0, 10) ?? ''}
                    onChange={handlers.Target_date_onChange6}
                  />
                </label>
              </div>
              <section aria-label="Project documents">
                <h2>ADRs</h2>
                <button type="button" onClick={handlers.onClick7}>
                  New ADR
                </button>
                <ul>
                  {data.adrs
                    .filter(
                      (a) =>
                        a.projectSlug === slug ||
                        data.issues.some((i) => a.issueNumbers.includes(i.number)),
                    )
                    .map((a) => (
                      <li key={a.identifier}>
                        <Link to="/adrs/$identifier" params={{ identifier: a.identifier }}>
                          {a.identifier} {a.title}
                        </Link>{' '}
                        <span className="badge">{a.status}</span>
                      </li>
                    ))}
                </ul>
                <h2>Pages</h2>
                <ul>
                  {data.pages
                    .filter((p) => p.projectSlug === slug)
                    .map((p) => (
                      <li key={p.slug}>
                        <Link to="/pages/$slug" params={{ slug: p.slug }}>
                          {p.title}
                        </Link>
                      </li>
                    ))}
                </ul>
              </section>
              <IssueList
                issues={data.issues}
                selectedId={selected}
                onSelect={handlers.onSelect8}
                openOnSelect={false}
              />
            </div>
          </section>
          <section className="pane">
            {selected ? (
              <IssueDetail identifier={selected} />
            ) : (
              <div className="empty">Select an issue</div>
            )}
          </section>
        </div>
      );
    }
  }
}
export function ProjectDetailPage() {
  return (
    <PresenterScope name="ProjectDetailPage">
      <ProjectDetailPageBinding />
    </PresenterScope>
  );
}
function ProjectDetailPageBinding() {
  const model = useProjectDetailPagePresenter();
  const handlers = useActions(model.handlers);
  return <ProjectDetailPageView model={{ ...model, handlers } as typeof model} />;
}

export function CyclesPageView({ model }: { model: ReturnType<typeof useCyclesPagePresenter> }) {
  switch (model._view) {
    case 0: {
      const { cycles, handlers } = model;
      return (
        <div className="main single">
          <section className="pane">
            <div className="pane-head">
              <h1>Cycles</h1>
              <button className="ghost" type="button" onClick={handlers.onClick0}>
                New cycle
              </button>
            </div>
            {cycles.length === 0 ? (
              <div className="empty">No cycles yet. Start one to timebox work.</div>
            ) : (
              <div className="list">
                {cycles.map((c) => (
                  <Link
                    className="row"
                    key={c.number}
                    to="/cycles/$number"
                    params={{ number: String(c.number) }}
                  >
                    <span className="rail" />
                    <span className="ident">{c.number}</span>
                    <span>
                      {c.status} · {c.startsAt.slice(0, 10)} → {c.endsAt.slice(0, 10)}
                    </span>
                    <span className="badge">{c.status}</span>
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
export function CyclesPage() {
  return (
    <PresenterScope name="CyclesPage">
      <CyclesPageBinding />
    </PresenterScope>
  );
}
function CyclesPageBinding() {
  const model = useCyclesPagePresenter();
  const handlers = useActions(model.handlers);
  return <CyclesPageView model={{ ...model, handlers } as typeof model} />;
}

export function CycleDetailPageView({
  model,
}: {
  model: ReturnType<typeof useCycleDetailPagePresenter>;
}) {
  switch (model._view) {
    case 0: {
      const { data, selected, cycle, done, handlers } = model;
      return (
        <div className="main">
          <section className="pane">
            <div className="pane-head">
              <h1>Cycle {cycle.number}</h1>
              <span className="muted">
                {done}/{data.issues.length}
              </span>
              <select
                className="field"
                aria-label="Cycle status"
                value={cycle.status}
                onChange={handlers.Cycle_status_onChange0}
              >
                {CYCLE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button type="button" className="ghost" onClick={handlers.onClick1}>
                New issue
              </button>
            </div>
            <div className="detail">
              <div className="muted">
                {cycle.startsAt.slice(0, 10)} — {cycle.endsAt.slice(0, 10)}
              </div>
              <IssueList
                issues={data.issues}
                selectedId={selected}
                onSelect={handlers.onSelect2}
                openOnSelect={false}
              />
            </div>
          </section>
          <section className="pane">
            {selected ? (
              <IssueDetail identifier={selected} />
            ) : (
              <div className="empty">Select an issue</div>
            )}
          </section>
        </div>
      );
    }
  }
}
export function CycleDetailPage() {
  return (
    <PresenterScope name="CycleDetailPage">
      <CycleDetailPageBinding />
    </PresenterScope>
  );
}
function CycleDetailPageBinding() {
  const model = useCycleDetailPagePresenter();
  const handlers = useActions(model.handlers);
  return <CycleDetailPageView model={{ ...model, handlers } as typeof model} />;
}
