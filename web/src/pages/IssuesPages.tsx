import { IssueDetail } from '../components/IssueDetail.tsx';
import { IssueFilters } from '../components/IssueFilters.tsx';
import { IssueBoard, IssueList } from '../components/IssueList.tsx';

import { PresenterScope, useActions } from '../application/Root.tsx';
import {
  useBoardPagePresenter,
  useIssueRoutePagePresenter,
  useIssuesPagePresenter,
} from '../presenters/IssuesPages.tsx';
export function IssuesPageView({ model }: { model: ReturnType<typeof useIssuesPagePresenter> }) {
  switch (model._view) {
    case 0: {
      const { data, search, find, issues, selected, handlers } = model;
      return (
        <div className="main">
          <section className="pane">
            <div className="pane-head">
              <h1>Issues</h1>
              <span className="muted">{issues.length}</span>
            </div>
            <IssueFilters
              search={search}
              projects={data.projects}
              cycles={data.cycles}
              labels={data.labels}
              onChange={handlers.onChange0}
              onSaveView={handlers.onSaveView1}
              find={find}
              onFind={handlers.onFind2}
            />
            <IssueList issues={issues} selectedId={selected} onSelect={handlers.onSelect3} />
          </section>
          <section className="pane">
            {selected ? (
              <IssueDetail identifier={selected} />
            ) : (
              <div className="empty">
                Select an issue, or press <span className="kbd">c</span> to create.
              </div>
            )}
          </section>
        </div>
      );
    }
  }
}
export function IssuesPage() {
  return (
    <PresenterScope name="IssuesPage">
      <IssuesPageBinding />
    </PresenterScope>
  );
}
function IssuesPageBinding() {
  const model = useIssuesPagePresenter();
  const handlers = useActions(model.handlers);
  return <IssuesPageView model={{ ...model, handlers } as typeof model} />;
}

export function IssueRoutePageView({
  model,
}: {
  model: ReturnType<typeof useIssueRoutePagePresenter>;
}) {
  switch (model._view) {
    case 0: {
      const { identifier, issues, handlers } = model;
      return (
        <div className="main">
          <section className="pane">
            <div className="pane-head">
              <h1>Issues</h1>
              <span className="muted">{issues.length}</span>
            </div>
            <IssueList issues={issues} selectedId={identifier} onSelect={handlers.onSelect0} />
          </section>
          <section className="pane">
            <IssueDetail identifier={identifier} />
          </section>
        </div>
      );
    }
  }
}
export function IssueRoutePage() {
  return (
    <PresenterScope name="IssueRoutePage">
      <IssueRoutePageBinding />
    </PresenterScope>
  );
}
function IssueRoutePageBinding() {
  const model = useIssueRoutePagePresenter();
  const handlers = useActions(model.handlers);
  return <IssueRoutePageView model={{ ...model, handlers } as typeof model} />;
}

export function BoardPageView({ model }: { model: ReturnType<typeof useBoardPagePresenter> }) {
  switch (model._view) {
    case 0: {
      const { data, search, find, issues, handlers } = model;
      return (
        <div className="main single">
          <section className="pane">
            <div className="pane-head">
              <h1>Board</h1>
              <span className="muted">Drag to move and reorder</span>
            </div>
            <IssueFilters
              search={search}
              projects={data.projects}
              cycles={data.cycles}
              labels={data.labels}
              onChange={handlers.onChange0}
              onSaveView={handlers.onSaveView1}
              find={find}
              onFind={handlers.onFind2}
            />
            {issues.length === 0 ? (
              <div className="empty">
                No issues. Press <span className="kbd">c</span> to create.
              </div>
            ) : (
              <IssueBoard issues={issues} onOpen={handlers.onOpen3} onMove={handlers.onMove4} />
            )}
          </section>
        </div>
      );
    }
  }
}
export function BoardPage() {
  return (
    <PresenterScope name="BoardPage">
      <BoardPageBinding />
    </PresenterScope>
  );
}
function BoardPageBinding() {
  const model = useBoardPagePresenter();
  const handlers = useActions(model.handlers);
  return <BoardPageView model={{ ...model, handlers } as typeof model} />;
}
