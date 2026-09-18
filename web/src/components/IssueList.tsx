import { isOverdue, localToday } from '../due.ts';
import { PRIORITY_LABEL, STATUS_LABEL } from '../types.ts';

import { PresenterScope, useActions } from '../application/Root.tsx';
import {
  useBoardColumnPresenter,
  useIssueBoardPresenter,
  useIssueListPresenter,
} from '../presenters/IssueList.tsx';
export function IssueListView({ model }: { model: ReturnType<typeof useIssueListPresenter> }) {
  switch (model._view) {
    case 0: {
      return (
        <div className="empty">
          No issues. Press <span className="kbd">c</span> to create.
        </div>
      );
    }
    case 1: {
      const { selectedId, issues, childCounts, windowed, today, handlers } = model;
      return (
        <div
          ref={windowed.ref}
          className="list virtual-list"
          role="listbox"
          aria-label="Issues"
          tabIndex={0}
        >
          <div role="presentation" style={{ height: windowed.before, flexShrink: 0 }} />
          {issues.slice(windowed.start, windowed.end).map((issue, offset) => {
            const childCount = childCounts.get(issue.id) ?? 0;
            const overdue = isOverdue(issue.dueDate, today);
            return (
              <button
                type="button"
                key={issue.identifier}
                role="option"
                aria-posinset={windowed.start + offset + 1}
                aria-setsize={issues.length}
                tabIndex={issue.identifier === selectedId ? 0 : -1}
                aria-selected={issue.identifier === selectedId}
                data-status={issue.status}
                className={`row ${issue.identifier === selectedId ? 'selected' : ''} ${overdue ? 'overdue' : ''}`}
                style={{ paddingLeft: 12 + (issue.depth ?? 0) * 16, height: 38, flexShrink: 0 }}
                onClick={() => handlers.onClick0(issue)}
              >
                <span className="rail" />
                <span className="ident">{issue.identifier}</span>
                <span className="row-title">{issue.title}</span>
                <span className="row-meta">
                  {issue.projectSlug ? <span className="badge">{issue.projectSlug}</span> : null}
                  {issue.cycleNumber ? <span className="badge">C{issue.cycleNumber}</span> : null}
                  {issue.dueDate ? (
                    <span className={`badge ${overdue ? 'urgent' : ''}`}>
                      {issue.dueDate.slice(0, 10)}
                    </span>
                  ) : null}
                  {childCount > 0 ? <span className="badge">{childCount}</span> : null}
                  {(issue.adrNumbers ?? []).length > 0 ? (
                    <span className="badge">{issue.adrNumbers.length} ADR</span>
                  ) : null}
                  {issue.labels.slice(0, 3).map((l) => (
                    <span
                      key={l.id}
                      className="pip"
                      style={{ background: l.color }}
                      title={l.name}
                    />
                  ))}
                  {issue.priority > 0 ? (
                    <span className={`badge ${issue.priority === 1 ? 'urgent' : ''}`}>
                      {PRIORITY_LABEL[issue.priority]}
                    </span>
                  ) : null}
                  <span className="badge">{STATUS_LABEL[issue.status]}</span>
                </span>
              </button>
            );
          })}
          <div role="presentation" style={{ height: windowed.after, flexShrink: 0 }} />
        </div>
      );
    }
  }
}
export function IssueList(props: Parameters<typeof useIssueListPresenter>[0]) {
  return (
    <PresenterScope name="IssueList">
      <IssueListBinding {...props} />
    </PresenterScope>
  );
}
function IssueListBinding(props: Parameters<typeof useIssueListPresenter>[0]) {
  const model = useIssueListPresenter(props);
  const handlers = useActions(model.handlers);
  return <IssueListView model={{ ...model, handlers } as typeof model} />;
}

export function IssueBoardView({ model }: { model: ReturnType<typeof useIssueBoardPresenter> }) {
  switch (model._view) {
    case 0: {
      const { dragId, columns, handlers } = model;
      return (
        <div className="board">
          {columns.map((column) => (
            <BoardColumn
              key={column.status}
              {...column}
              dragId={dragId}
              onDrag={handlers.onDrag0}
              onOpen={handlers.onOpen1}
              onMove={handlers.onMove2}
            />
          ))}
        </div>
      );
    }
  }
}
export function IssueBoard(props: Parameters<typeof useIssueBoardPresenter>[0]) {
  return (
    <PresenterScope name="IssueBoard">
      <IssueBoardBinding {...props} />
    </PresenterScope>
  );
}
function IssueBoardBinding(props: Parameters<typeof useIssueBoardPresenter>[0]) {
  const model = useIssueBoardPresenter(props);
  const handlers = useActions(model.handlers);
  return <IssueBoardView model={{ ...model, handlers } as typeof model} />;
}

export function BoardColumnView({ model }: { model: ReturnType<typeof useBoardColumnPresenter> }) {
  switch (model._view) {
    case 0: {
      const { issues, status, dragId, windowed, handlers } = model;
      return (
        <div
          className={`column ${dragId ? 'droppable' : ''}`}
          onDragOver={handlers.onDragOver0}
          onDrop={handlers.onDrop1}
        >
          <h2>
            {STATUS_LABEL[status]}
            <span className="muted">{issues.length}</span>
          </h2>
          <div ref={windowed.ref} className="virtual-column">
            <div style={{ height: windowed.before }} aria-hidden />
            {issues.slice(windowed.start, windowed.end).map((issue) => (
              <button
                type="button"
                className={`card ${isOverdue(issue.dueDate, localToday()) ? 'overdue' : ''}`}
                key={issue.identifier}
                draggable
                onDragStart={() => handlers.onDragStart2(issue)}
                onDragEnd={handlers.onDragEnd3}
                onDragOver={handlers.onDragOver4}
                onDrop={(...args) => handlers.onDrop5(issue, ...args)}
                onClick={() => handlers.onClick6(issue)}
              >
                <div className="card-top">
                  <span className="ident">{issue.identifier}</span>
                  {issue.priority > 0 ? (
                    <span className={`badge ${issue.priority === 1 ? 'urgent' : ''}`}>
                      {PRIORITY_LABEL[issue.priority]}
                    </span>
                  ) : null}
                </div>
                <div className="card-title">{issue.title}</div>
                <div className="row-meta">
                  {issue.projectSlug ? <span className="badge">{issue.projectSlug}</span> : null}
                  {issue.dueDate ? (
                    <span className="badge">{issue.dueDate.slice(0, 10)}</span>
                  ) : null}
                  {issue.labels.slice(0, 4).map((l) => (
                    <span
                      key={l.id}
                      className="pip"
                      style={{ background: l.color }}
                      title={l.name}
                    />
                  ))}
                </div>
              </button>
            ))}
            <div style={{ height: windowed.after }} aria-hidden />
          </div>
        </div>
      );
    }
  }
}
export function BoardColumn(props: Parameters<typeof useBoardColumnPresenter>[0]) {
  return (
    <PresenterScope name="BoardColumn">
      <BoardColumnBinding {...props} />
    </PresenterScope>
  );
}
function BoardColumnBinding(props: Parameters<typeof useBoardColumnPresenter>[0]) {
  const model = useBoardColumnPresenter(props);
  const handlers = useActions(model.handlers);
  return <BoardColumnView model={{ ...model, handlers } as typeof model} />;
}
