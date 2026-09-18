import { IssueDetail } from '../components/IssueDetail.tsx';
import { IssueBoard, IssueList } from '../components/IssueList.tsx';
import { ISSUE_STATUSES, PRIORITY_LABEL, STATUS_LABEL } from '../types.ts';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useViewPagePresenter } from '../presenters/ViewsPages.tsx';
export function ViewPageView({ model }: { model: ReturnType<typeof useViewPagePresenter> }) {
  switch (model._view) {
    case 0: {
      const { data, issues, view, selected, handlers } = model;
      return (
        <div className={view.display === 'board' ? 'main single' : 'main'}>
          <section className="pane">
            <div className="pane-head">
              <h1>{view.name}</h1>
              <span className="muted">{issues.length}</span>
              <button type="button" className="ghost danger" onClick={handlers.onClick0}>
                Delete
              </button>
            </div>
            <div className="props view-filters">
              <label>
                <span className="sr-only">View name</span>
                <input
                  aria-label="View name"
                  value={view.name}
                  onChange={handlers.View_name_onChange1}
                  onBlur={handlers.View_name_onBlur2}
                />
              </label>
              <label>
                <span className="sr-only">View display</span>
                <select
                  aria-label="View display"
                  value={view.display}
                  onChange={handlers.View_display_onChange3}
                >
                  <option value="list">List</option>
                  <option value="board">Board</option>
                </select>
              </label>
              <label>
                <span className="sr-only">View status</span>
                <select
                  aria-label="View status"
                  value={view.status ?? ''}
                  onChange={handlers.View_status_onChange4}
                >
                  <option value="">Any status</option>
                  {ISSUE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="sr-only">View project</span>
                <select
                  aria-label="View project"
                  value={view.project ?? ''}
                  onChange={handlers.View_project_onChange5}
                >
                  <option value="">Any project</option>
                  {data.projects.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="sr-only">View cycle</span>
                <select
                  aria-label="View cycle"
                  value={view.cycle ?? ''}
                  onChange={handlers.View_cycle_onChange6}
                >
                  <option value="">Any cycle</option>
                  {data.cycles.map((c) => (
                    <option key={c.id} value={c.number}>
                      Cycle {c.number}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="sr-only">View priority</span>
                <select
                  aria-label="View priority"
                  value={view.priority ?? ''}
                  onChange={handlers.View_priority_onChange7}
                >
                  <option value="">Any priority</option>
                  {PRIORITY_LABEL.map((label, i) => (
                    <option key={label} value={i}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="chips" role="group" aria-label="View labels">
              {data.labels.map((l) => {
                const on = view.labels.includes(l.name);
                return (
                  <button
                    type="button"
                    key={l.id}
                    className={`chip ${on ? 'on' : ''}`}
                    aria-pressed={on}
                    style={{ '--chip': l.color } as React.CSSProperties}
                    onClick={() => handlers.onClick8(on, l)}
                  >
                    {l.name}
                  </button>
                );
              })}
            </div>
            {view.display === 'board' ? (
              <IssueBoard issues={issues} onOpen={handlers.onOpen9} onMove={handlers.onMove10} />
            ) : (
              <IssueList issues={issues} selectedId={selected} onSelect={handlers.onSelect11} />
            )}
          </section>
          {view.display === 'list' ? (
            <section className="pane">
              {selected ? (
                <IssueDetail identifier={selected} />
              ) : (
                <div className="empty">Select an issue</div>
              )}
            </section>
          ) : null}
        </div>
      );
    }
  }
}
export function ViewPage() {
  return (
    <PresenterScope name="ViewPage">
      <ViewPageBinding />
    </PresenterScope>
  );
}
function ViewPageBinding() {
  const model = useViewPagePresenter();
  const handlers = useActions(model.handlers);
  return <ViewPageView model={{ ...model, handlers } as typeof model} />;
}
