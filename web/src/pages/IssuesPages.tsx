import { Box } from '@mantine/core';

import { IssueDetail } from '../components/IssueDetail.tsx';
import { IssueFilters } from '../components/IssueFilters.tsx';
import { IssueBoard, IssueList } from '../components/IssueList.tsx';
import { EmptyState, PageHeader, Pane, Shortcut, SplitLayout } from '../mantine-ui.tsx';

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
        <Box className="linear-full-page" h="100%">
          <SplitLayout>
            <Pane variant="list">
              <PageHeader title="Issues" />
              <IssueFilters
                search={search}
                projects={data.projects}
                cycles={data.cycles}
                labels={data.labels}
                onChange={handlers.onChange0}
                find={find}
                onFind={handlers.onFind2}
              />
              <IssueList issues={issues} selectedId={selected} onSelect={handlers.onSelect3} />
            </Pane>
            <Pane variant="detail">
              {selected ? (
                <IssueDetail identifier={selected} />
              ) : (
                <EmptyState>
                  Select an issue, or press <Shortcut>c</Shortcut> to create.
                </EmptyState>
              )}
            </Pane>
          </SplitLayout>
        </Box>
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
        <Box className="linear-full-page" h="100%">
          <SplitLayout>
            <Pane variant="list" compact>
              <IssueList issues={issues} selectedId={identifier} onSelect={handlers.onSelect0} />
            </Pane>
            <Pane variant="detail">
              <IssueDetail identifier={identifier} />
            </Pane>
          </SplitLayout>
        </Box>
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
        <Box className="linear-full-page" h="100%">
          <SplitLayout single>
            <Pane single>
              <PageHeader title="Board" />
              <IssueFilters
                search={search}
                projects={data.projects}
                cycles={data.cycles}
                labels={data.labels}
                onChange={handlers.onChange0}
                find={find}
                onFind={handlers.onFind2}
              />
              {issues.length === 0 ? (
                <EmptyState>
                  No issues. Press <Shortcut>c</Shortcut> to create.
                </EmptyState>
              ) : (
                <IssueBoard issues={issues} onOpen={handlers.onOpen3} onMove={handlers.onMove4} />
              )}
            </Pane>
          </SplitLayout>
        </Box>
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
