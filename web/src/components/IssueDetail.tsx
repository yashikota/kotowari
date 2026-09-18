import { Link } from '@tanstack/react-router';
import { formatActivity } from '../activity.ts';
import { formatStamp } from '../time.ts';
import { ISSUE_STATUSES, PRIORITY_LABEL, STATUS_LABEL } from '../types.ts';
import { AIPanel } from './AIPanel.tsx';
import { DocumentEditor } from './DocumentEditor.tsx';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useIssueDetailPresenter } from '../presenters/IssueDetail.tsx';
export function IssueDetailView({ model }: { model: ReturnType<typeof useIssueDetailPresenter> }) {
  switch (model._view) {
    case 0: {
      const { error } = model;
      return <div className="error">{error}</div>;
    }
    case 1: {
      return <div className="empty">Loading…</div>;
    }
    case 2: {
      const {
        identifier,
        issue,
        comments,
        activities,
        projects,
        cycles,
        labels,
        draft,
        subTitle,
        labelName,
        adrPick,
        timeZone,
        copied,
        due,
        selectedLabelIds,
        children,
        parentOptions,
        linkedAdrs,
        unlinkedAdrs,
        handlers,
      } = model;
      return (
        <div className="detail">
          <div className="ident-row">
            <button
              type="button"
              className="ident ident-copy"
              aria-label="Copy identifier"
              onClick={handlers.Copy_identifier_onClick0}
            >
              {copied ? 'Copied' : issue.identifier}
            </button>
            {issue.parentIdentifier ? (
              <button type="button" className="crumb" onClick={handlers.onClick1}>
                {issue.parentIdentifier}
              </button>
            ) : null}
            <span className="muted">{formatStamp(issue.updatedAt, timeZone)}</span>
            <button type="button" className="ghost danger" onClick={handlers.onClick2}>
              Delete
            </button>
          </div>
          <input
            className="title-input"
            aria-label="Issue title"
            value={issue.title}
            onChange={handlers.Issue_title_onChange3}
            onBlur={handlers.Issue_title_onBlur4}
          />
          <div className="prop-grid">
            <label>
              <span>Status</span>
              <select aria-label="Status" value={issue.status} onChange={handlers.Status_onChange5}>
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
                aria-label="Priority"
                value={issue.priority}
                onChange={handlers.Priority_onChange6}
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
                aria-label="Project"
                value={issue.projectId ?? ''}
                onChange={handlers.Project_onChange7}
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
                aria-label="Cycle"
                value={issue.cycleId ?? ''}
                onChange={handlers.Cycle_onChange8}
              >
                <option value="">No cycle</option>
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    Cycle {c.number}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Parent</span>
              <select
                aria-label="Parent"
                value={issue.parentId ?? ''}
                onChange={handlers.Parent_onChange9}
              >
                <option value="">No parent</option>
                {parentOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.identifier} {p.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Due</span>
              <input
                type="date"
                aria-label="Due date"
                value={due}
                onChange={handlers.Due_date_onChange10}
              />
            </label>
          </div>
          <div>
            <div className="muted">Labels</div>
            <div className="chips" role="group" aria-label="Labels">
              {labels.map((l) => {
                const on = selectedLabelIds.has(l.id);
                return (
                  <button
                    type="button"
                    key={l.id}
                    className={`chip ${on ? 'on' : ''}`}
                    aria-pressed={on}
                    style={{ '--chip': l.color } as React.CSSProperties}
                    onClick={() => handlers.onClick11(on, l)}
                  >
                    {l.name}
                  </button>
                );
              })}
            </div>
            <textarea
              rows={2}
              className="field"
              aria-label="New label"
              placeholder="New label"
              value={labelName}
              onChange={handlers.New_label_onChange12}
              onKeyDown={handlers.New_label_onKeyDown13}
            />
          </div>
          <div>
            <div className="muted">ADRs</div>
            {linkedAdrs.length === 0 ? (
              <div className="empty-inline">No linked decisions.</div>
            ) : (
              <div className="list" role="list">
                {linkedAdrs.map((a) => (
                  <div className="row" key={a.identifier}>
                    <Link
                      to="/adrs/$identifier"
                      params={{ identifier: a.identifier }}
                      className="ident"
                    >
                      {a.identifier}
                    </Link>
                    <span>{a.title}</span>
                    <span className="badge">{a.status}</span>
                    <button
                      type="button"
                      className="ghost"
                      aria-label={`Unlink ${a.identifier}`}
                      onClick={() => handlers.onClick14(a)}
                    >
                      Unlink
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="props">
              <label>
                <span className="sr-only">Link ADR</span>
                <select
                  aria-label="Link ADR"
                  value={adrPick}
                  onChange={handlers.Link_ADR_onChange15}
                >
                  <option value="">Link an ADR</option>
                  {unlinkedAdrs.map((a) => (
                    <option key={a.identifier} value={String(a.number)}>
                      {a.identifier} {a.title}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="ghost"
                disabled={!adrPick}
                onClick={handlers.onClick16}
              >
                Link
              </button>
              <button type="button" className="ghost" onClick={handlers.onClick17}>
                New ADR
              </button>
            </div>
          </div>
          <AIPanel kind="issues" id={identifier} />
          <DocumentEditor documentKey={`issues/${identifier}/body`} />
          <div>
            <div className="muted">Sub-issues</div>
            {children.length === 0 ? (
              <div className="empty-inline">Break this into smaller work.</div>
            ) : (
              <div className="list">
                {children.map((c) => (
                  <button
                    type="button"
                    className="row"
                    key={c.identifier}
                    onClick={() => handlers.onClick18(c)}
                  >
                    <span className="rail" />
                    <span className="ident">{c.identifier}</span>
                    <span>{c.title}</span>
                    <span className="badge">{STATUS_LABEL[c.status]}</span>
                  </button>
                ))}
              </div>
            )}
            <textarea
              rows={2}
              className="field"
              aria-label="New sub-issue"
              placeholder="Add sub-issue"
              value={subTitle}
              onChange={handlers.New_sub_issue_onChange19}
              onKeyDown={handlers.New_sub_issue_onKeyDown20}
            />
          </div>
          <div>
            <div className="muted">Notes</div>
            <div className="comments">
              {comments.map((c) => (
                <div className="comment" key={c.id}>
                  <div className="muted">{formatStamp(c.createdAt, timeZone)}</div>
                  <div>{c.body}</div>
                </div>
              ))}
              <textarea
                className="field"
                rows={3}
                aria-label="New note"
                placeholder="Note"
                value={draft}
                onChange={handlers.New_note_onChange21}
                onKeyDown={handlers.New_note_onKeyDown22}
              />
              <span className="muted">Mod+Enter to save</span>
            </div>
          </div>
          <div>
            <div className="muted">Activity</div>
            <div className="comments">
              {activities.map((a) => (
                <div className="comment" key={a.id}>
                  <span>{formatActivity(a.action, a.payload)}</span>{' '}
                  <span className="muted">{formatStamp(a.createdAt, timeZone)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
  }
}
export function IssueDetail(props: Parameters<typeof useIssueDetailPresenter>[0]) {
  return (
    <PresenterScope name="IssueDetail">
      <IssueDetailBinding {...props} />
    </PresenterScope>
  );
}
function IssueDetailBinding(props: Parameters<typeof useIssueDetailPresenter>[0]) {
  const model = useIssueDetailPresenter(props);
  const handlers = useActions(model.handlers);
  return <IssueDetailView model={{ ...model, handlers } as typeof model} />;
}
