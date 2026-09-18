import { ISSUE_STATUSES, PRIORITY_LABEL, STATUS_LABEL } from '../types.ts';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useIssueFiltersPresenter } from '../presenters/IssueFilters.tsx';
export function IssueFiltersView({
  model,
}: {
  model: ReturnType<typeof useIssueFiltersPresenter>;
}) {
  switch (model._view) {
    case 0: {
      const {
        search,
        projects,
        cycles,
        labels,
        onSaveView,
        find,
        onFind,
        viewName,
        findRef,
        selectedLabels,
        handlers,
      } = model;
      return (
        <div className="toolbar" role="search" aria-label="Issue filters">
          <select
            aria-label="Filter status"
            value={search.status ?? ''}
            onChange={handlers.Filter_status_onChange0}
          >
            <option value="">Any status</option>
            {ISSUE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter project"
            value={search.project ?? ''}
            onChange={handlers.Filter_project_onChange1}
          >
            <option value="">Any project</option>
            {projects.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter cycle"
            value={search.cycle ?? ''}
            onChange={handlers.Filter_cycle_onChange2}
          >
            <option value="">Any cycle</option>
            {cycles.map((c) => (
              <option key={c.id} value={c.number}>
                Cycle {c.number}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter priority"
            value={search.priority ?? ''}
            onChange={handlers.Filter_priority_onChange3}
          >
            <option value="">Any priority</option>
            {PRIORITY_LABEL.map((label, i) => (
              <option key={label} value={i}>
                {label}
              </option>
            ))}
          </select>
          {onFind ? (
            <input
              ref={findRef}
              aria-label="Find issues"
              placeholder="Find"
              value={find ?? ''}
              onChange={handlers.Find_issues_onChange4}
            />
          ) : null}
          <div className="chips toolbar-chips" role="group" aria-label="Filter labels">
            {labels.map((l) => {
              const on = selectedLabels.includes(l.name);
              return (
                <button
                  type="button"
                  key={l.id}
                  className={`chip ${on ? 'on' : ''}`}
                  aria-pressed={on}
                  style={{ '--chip': l.color } as React.CSSProperties}
                  onClick={() => handlers.onClick5(on, l)}
                >
                  {l.name}
                </button>
              );
            })}
          </div>
          {onSaveView ? (
            <form className="toolbar-save" onSubmit={handlers.onSubmit6}>
              <textarea
                rows={2}
                aria-label="New view name"
                placeholder="Save as view"
                value={viewName}
                onChange={handlers.New_view_name_onChange7}
              />
            </form>
          ) : null}
        </div>
      );
    }
  }
}
export function IssueFilters(props: Parameters<typeof useIssueFiltersPresenter>[0]) {
  return (
    <PresenterScope name="IssueFilters">
      <IssueFiltersBinding {...props} />
    </PresenterScope>
  );
}
function IssueFiltersBinding(props: Parameters<typeof useIssueFiltersPresenter>[0]) {
  const model = useIssueFiltersPresenter(props);
  const handlers = useActions(model.handlers);
  return <IssueFiltersView model={{ ...model, handlers } as typeof model} />;
}
