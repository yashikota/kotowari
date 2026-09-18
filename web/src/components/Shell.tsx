import { Link, Outlet } from '@tanstack/react-router';
import { BookText, CircleDot, Filter, Kanban, Layers, ListTodo, Scale } from 'lucide-react';
import { ISSUE_STATUSES, PRIORITY_LABEL, STATUS_LABEL } from '../types.ts';
import { Palette } from './Palette.tsx';
import { ShortcutHelp } from './ShortcutHelp.tsx';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useShellPresenter } from '../presenters/Shell.tsx';
export function ShellView({ model }: { model: ReturnType<typeof useShellPresenter> }) {
  switch (model._view) {
    case 0: {
      const {
        workspace,
        diagnostics,
        cycles,
        views,
        paletteOpen,
        query,
        createIssue,
        createADR,
        createPage,
        createView,
        issueTitle,
        issueStatus,
        issuePriority,
        issueProjectId,
        issueCycleId,
        helpOpen,
        projects,
        pageTitle,
        adrTitle,
        adrLinkIssue,
        viewName,
        error,
        commands,
        handlers,
      } = model;
      return (
        <div className="app">
          <aside className="sidebar">
            <div className="brand">
              <div className="brand-mark">kotowari</div>
              <div className="brand-sub">{workspace?.name ?? 'workspace'}</div>
            </div>
            <nav aria-label="Primary">
              <Link
                to="/issues"
                search={{}}
                className="nav-link"
                activeProps={{ className: 'nav-link active' }}
              >
                <ListTodo size={14} aria-hidden /> Issues
              </Link>
              <Link
                to="/board"
                search={{}}
                className="nav-link"
                activeProps={{ className: 'nav-link active' }}
              >
                <Kanban size={14} aria-hidden /> Board
              </Link>
              <Link to="/adrs" className="nav-link" activeProps={{ className: 'nav-link active' }}>
                <Scale size={14} aria-hidden /> ADRs
              </Link>
              <Link
                to="/projects"
                className="nav-link"
                activeProps={{ className: 'nav-link active' }}
              >
                <Layers size={14} aria-hidden /> Projects
              </Link>
              <Link
                to="/cycles"
                className="nav-link"
                activeProps={{ className: 'nav-link active' }}
              >
                <CircleDot size={14} aria-hidden /> Cycles
              </Link>
              {cycles
                .filter((c) => c.status === 'active')
                .map((c) => (
                  <Link
                    key={c.number}
                    to="/cycles/$number"
                    params={{ number: String(c.number) }}
                    className="nav-link nav-sub"
                    activeProps={{ className: 'nav-link nav-sub active' }}
                  >
                    Cycle {c.number} active
                  </Link>
                ))}
              <Link to="/pages" className="nav-link" activeProps={{ className: 'nav-link active' }}>
                <BookText size={14} aria-hidden /> Pages
              </Link>
            </nav>
            <div className="nav-section">
              <div className="muted">Views</div>
              {views.map((v) => (
                <Link
                  key={v.slug}
                  to="/views/$slug"
                  params={{ slug: v.slug }}
                  className="nav-link"
                  activeProps={{ className: 'nav-link active' }}
                >
                  <Filter size={14} aria-hidden /> {v.name}
                </Link>
              ))}
              <button type="button" className="ghost nav-add" onClick={handlers.onClick0}>
                New view
              </button>
            </div>
            <button type="button" className="ghost palette-btn" onClick={handlers.onClick1}>
              Command palette <span className="kbd">Mod+K</span>
            </button>
            <button type="button" className="ghost palette-btn" onClick={handlers.onClick2}>
              Shortcuts <span className="kbd">?</span>
            </button>
            {diagnostics.length > 0 ? (
              <div className="diag" role="status" aria-label="Workspace diagnostics">
                <div className="muted">Diagnostics</div>
                {diagnostics.map((d) => (
                  <div key={`${d.path}:${d.code}`} title={d.message}>
                    <span className="ident">{d.path}</span> {d.message}
                  </div>
                ))}
              </div>
            ) : null}
            {workspace ? (
              <form className="workspace-card" onSubmit={handlers.onSubmit3}>
                <label className="muted" htmlFor="ws-name">
                  Workspace
                </label>
                <input id="ws-name" value={workspace.name} onChange={handlers.onChange4} />
                <label className="sr-only" htmlFor="ws-tz">
                  Timezone
                </label>
                <input
                  id="ws-tz"
                  aria-label="Timezone"
                  value={workspace.timezone}
                  placeholder="UTC"
                  onChange={handlers.Timezone_onChange5}
                />
                <button className="ghost" type="submit">
                  Save
                </button>
              </form>
            ) : null}
          </aside>
          <div>
            {error ? <div className="error">{error}</div> : null}
            <Outlet />
          </div>
          {paletteOpen ? (
            <Palette
              query={query}
              onQuery={handlers.onQuery6}
              commands={commands}
              onPick={handlers.onPick7}
              onClose={handlers.onClose8}
            />
          ) : null}
          {helpOpen ? <ShortcutHelp onClose={handlers.onClose9} /> : null}
          {createIssue ? (
            <div className="overlay" onClick={handlers.onClick10}>
              <div
                className="dialog"
                role="dialog"
                aria-modal="true"
                aria-label="Create issue"
                onClick={handlers.Create_issue_onClick11}
              >
                <textarea
                  rows={2}
                  autoFocus
                  aria-label="Issue title"
                  placeholder="Issue title"
                  value={issueTitle}
                  onChange={handlers.Issue_title_onChange12}
                  onKeyDown={handlers.Issue_title_onKeyDown13}
                />
                <div className="composer-actions">
                  <span className="muted">Enter to insert a line · Ctrl/⌘+Enter to create</span>
                  <button type="button" onClick={handlers.submitIssue}>
                    Create
                  </button>
                </div>
                <div className="dialog-fields">
                  <label>
                    <span>Status</span>
                    <select
                      aria-label="Issue status"
                      value={issueStatus}
                      onChange={handlers.Issue_status_onChange14}
                    >
                      {ISSUE_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Priority</span>
                    <select
                      aria-label="Issue priority"
                      value={issuePriority}
                      onChange={handlers.Issue_priority_onChange15}
                    >
                      {PRIORITY_LABEL.map((label, i) => (
                        <option key={label} value={i}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Project</span>
                    <select
                      aria-label="Issue project"
                      value={issueProjectId}
                      onChange={handlers.Issue_project_onChange16}
                    >
                      <option value="">No project</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Cycle</span>
                    <select
                      aria-label="Issue cycle"
                      value={issueCycleId}
                      onChange={handlers.Issue_cycle_onChange17}
                    >
                      <option value="">No cycle</option>
                      {cycles.map((c) => (
                        <option key={c.id} value={c.id}>
                          Cycle {c.number}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </div>
          ) : null}
          {createADR ? (
            <div className="overlay" onClick={handlers.onClick18}>
              <div
                className="dialog"
                role="dialog"
                aria-modal="true"
                aria-label="Create ADR"
                onClick={handlers.Create_ADR_onClick19}
              >
                <textarea
                  rows={2}
                  autoFocus
                  aria-label="ADR title"
                  placeholder="ADR title"
                  value={adrTitle}
                  onChange={handlers.ADR_title_onChange20}
                  onKeyDown={handlers.ADR_title_onKeyDown21}
                />
                <div className="composer-actions">
                  <span className="muted">Enter to insert a line · Ctrl/⌘+Enter to create</span>
                  <button type="button" onClick={handlers.submitADR}>
                    Create
                  </button>
                </div>
                {adrLinkIssue ? <div className="muted">Will link issue {adrLinkIssue}</div> : null}
              </div>
            </div>
          ) : null}
          {createPage ? (
            <div className="overlay" onClick={handlers.onClick22}>
              <div
                className="dialog"
                role="dialog"
                aria-modal="true"
                aria-label="Create page"
                onClick={handlers.Create_page_onClick23}
              >
                <textarea
                  rows={2}
                  autoFocus
                  aria-label="Page title"
                  placeholder="Page title"
                  value={pageTitle}
                  onChange={handlers.Page_title_onChange24}
                  onKeyDown={handlers.Page_title_onKeyDown25}
                />
                <div className="composer-actions">
                  <span className="muted">Enter to insert a line · Ctrl/⌘+Enter to create</span>
                  <button type="button" onClick={handlers.submitPage}>
                    Create
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          {createView ? (
            <div className="overlay" onClick={handlers.onClick26}>
              <div
                className="dialog"
                role="dialog"
                aria-modal="true"
                aria-label="Create view"
                onClick={handlers.Create_view_onClick27}
              >
                <textarea
                  rows={2}
                  autoFocus
                  aria-label="View name"
                  placeholder="View name"
                  value={viewName}
                  onChange={handlers.View_name_onChange28}
                  onKeyDown={handlers.View_name_onKeyDown29}
                />
                <div className="composer-actions">
                  <span className="muted">Enter to insert a line · Ctrl/⌘+Enter to create</span>
                  <button type="button" onClick={handlers.submitView}>
                    Create
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      );
    }
  }
}
export function Shell() {
  return (
    <PresenterScope name="Shell">
      <ShellBinding />
    </PresenterScope>
  );
}
function ShellBinding() {
  const model = useShellPresenter();
  const handlers = useActions(model.handlers);
  return <ShellView model={{ ...model, handlers } as typeof model} />;
}
