import { Box, Group, ScrollArea } from '@mantine/core';
import type { IssueGroupBy } from '../issue-list.ts';
import { IssueGroupRow, IssueListRow } from './IssueListRow.tsx';
import { EmptyState, Shortcut } from '../mantine-ui.tsx';
import { IssueBoardColumn } from './IssueBoardColumn.tsx';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useIssueBoardPresenter, useIssueListPresenter } from '../presenters/IssueList.tsx';

export function IssueListView({
  model,
  hideProjectSlug = false,
}: {
  model: ReturnType<typeof useIssueListPresenter>;
  hideProjectSlug?: boolean;
}) {
  switch (model._view) {
    case 0: {
      return (
        <EmptyState>
          No issues. Press <Shortcut>c</Shortcut> to create.
        </EmptyState>
      );
    }
    case 1: {
      const { selectedId, issues, rows, issuePositions, childCounts, windowed, today, handlers } =
        model;
      return (
        <ScrollArea
          viewportRef={windowed.ref}
          scrollbars="y"
          style={{ flex: 1, minHeight: 0 }}
          viewportProps={{
            tabIndex: 0,
            role: 'listbox',
            'aria-label': 'Issues',
          }}
        >
          <Box>
            <Box role="presentation" style={{ height: windowed.before, flexShrink: 0 }} />
            {rows.slice(windowed.start, windowed.end).map((row) => {
              if (row.kind === 'group') {
                return <IssueGroupRow key={row.key} row={row} onToggle={handlers.onToggleGroup1} />;
              }
              const issue = row.issue;
              return (
                <IssueListRow
                  key={issue.identifier}
                  issue={issue}
                  selected={issue.identifier === selectedId}
                  position={issuePositions.get(issue.identifier)}
                  setSize={issues.length}
                  childCount={childCounts.get(issue.id) ?? 0}
                  today={today}
                  hideProjectSlug={hideProjectSlug}
                  onSelect={handlers.onClick0}
                />
              );
            })}
            <Box role="presentation" style={{ height: windowed.after, flexShrink: 0 }} />
          </Box>
        </ScrollArea>
      );
    }
  }
}

export function IssueList(
  props: Parameters<typeof useIssueListPresenter>[0] & {
    groupBy?: IssueGroupBy;
    hideProjectSlug?: boolean;
  },
) {
  return (
    <PresenterScope name="IssueList">
      <IssueListBinding {...props} />
    </PresenterScope>
  );
}

function IssueListBinding({ hideProjectSlug, ...props }: Parameters<typeof IssueList>[0]) {
  const model = useIssueListPresenter(props);
  const handlers = useActions(model.handlers);
  return (
    <IssueListView
      model={{ ...model, handlers } as typeof model}
      hideProjectSlug={hideProjectSlug}
    />
  );
}

export function IssueBoardView({ model }: { model: ReturnType<typeof useIssueBoardPresenter> }) {
  switch (model._view) {
    case 0: {
      const { dragId, columns, handlers } = model;
      return (
        <Group align="stretch" gap="md" wrap="nowrap" style={{ minHeight: 480 }}>
          {columns.map((column) => (
            <IssueBoardColumn
              key={column.status}
              {...column}
              dragId={dragId}
              onDrag={handlers.onDrag0}
              onOpen={handlers.onOpen1}
              onMove={handlers.onMove2}
            />
          ))}
        </Group>
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
