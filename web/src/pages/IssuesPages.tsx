import { Box, VisuallyHidden } from '@mantine/core';

import { IssueDetail } from '../components/IssueDetail.tsx';
import { IssueFilters } from '../components/IssueFilters.tsx';
import { IssueBoard, IssueList } from '../components/IssueList.tsx';
import { IssueViewTabs } from '../components/IssueViewTabs.tsx';
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
      const { data, search, find, issues, selected, view, groupBy, layout, orderBy, handlers } =
        model;
      return (
        <Box h="100%" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <VisuallyHidden>
            <h2>Issues</h2>
          </VisuallyHidden>
          <IssueViewTabs value={view} count={issues.length} onChange={handlers.onView4} />
          <Box style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <IssueFilters
              search={search}
              projects={data.projects}
              cycles={data.cycles}
              labels={data.labels}
              onChange={handlers.onChange0}
              find={find}
              onFind={handlers.onFind2}
              groupBy={groupBy}
              onGroupBy={handlers.onGroupBy5}
              layout={layout}
              onLayout={handlers.onLayout6}
              orderBy={orderBy}
              onOrderBy={handlers.onOrderBy7}
            />
            {layout === 'list' ? (
              <IssueList
                issues={issues}
                selectedId={selected}
                onSelect={handlers.onSelect3}
                groupBy={groupBy}
                orderBy={orderBy}
              />
            ) : (
              <Box p="md" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                {issues.length === 0 ? (
                  <EmptyState>No issues match these filters.</EmptyState>
                ) : (
                  <IssueBoard
                    issues={issues}
                    onOpen={handlers.onBoardOpen8}
                    onMove={handlers.onBoardMove9}
                    orderBy={orderBy}
                  />
                )}
              </Box>
            )}
          </Box>
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
      const { identifier } = model;
      return (
        <Box h="100%" style={{ overflow: 'auto' }}>
          <IssueDetail identifier={identifier} />
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
        <Box h="100%" style={{ overflow: 'hidden' }}>
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
