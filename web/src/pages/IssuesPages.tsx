import { Box, Group, Text, UnstyledButton } from '@mantine/core';

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

const ISSUE_VIEW_TABS = [
  ['active', 'Active'],
  ['backlog', 'Backlog'],
  ['all', 'All issues'],
] as const;

export function IssuesPageView({ model }: { model: ReturnType<typeof useIssuesPagePresenter> }) {
  switch (model._view) {
    case 0: {
      const { data, search, find, issues, selected, view, groupBy, handlers } = model;
      return (
        <Box className="linear-full-page linear-issues-page" h="100%">
          <Box component="h2" className="linear-visually-hidden">
            Issues
          </Box>
          <Group role="tablist" aria-label="Issue views" className="linear-issue-view-tabs">
            {ISSUE_VIEW_TABS.map(([value, label], index) => (
              <UnstyledButton
                key={value}
                role="tab"
                aria-selected={view === value}
                tabIndex={view === value ? 0 : -1}
                className="linear-issue-view-tab"
                onClick={() => handlers.onView4(value)}
                onKeyDown={(event) => {
                  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                  event.preventDefault();
                  const nextIndex =
                    (index + (event.key === 'ArrowRight' ? 1 : ISSUE_VIEW_TABS.length - 1)) %
                    ISSUE_VIEW_TABS.length;
                  const nextTab = ISSUE_VIEW_TABS[nextIndex];
                  if (nextTab) handlers.onView4(nextTab[0]);
                  event.currentTarget.parentElement
                    ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
                    [nextIndex]?.focus();
                }}
              >
                {label}
              </UnstyledButton>
            ))}
            <Text className="linear-issue-view-count" aria-live="polite">
              {issues.length}
            </Text>
          </Group>
          <Box className="linear-issue-list-area">
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
            />
            <IssueList
              issues={issues}
              selectedId={selected}
              onSelect={handlers.onSelect3}
              groupBy={groupBy}
            />
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
        <Box className="linear-full-page linear-issue-route" h="100%">
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
