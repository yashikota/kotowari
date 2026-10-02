import { Box, Group, ScrollArea } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { IssueGroupBy } from '../issue-list.ts';
import { IssueGroupRow, IssueListRow } from './IssueListRow.tsx';
import { EmptyState, Shortcut } from '../mantine-ui.tsx';
import { IssueBoardColumn } from './IssueBoardColumn.tsx';
import styles from './IssueBoardColumn.module.css';
import { IssueSelectionToolbar } from './IssueSelectionToolbar.tsx';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useIssueBoardPresenter } from '../presenters/IssueBoard.ts';
import { useIssueListPresenter } from '../presenters/IssueList.tsx';

export function IssueListView({
  model,
  hideProjectSlug = false,
}: {
  model: ReturnType<typeof useIssueListPresenter>;
  hideProjectSlug?: boolean;
}) {
  const { t } = useTranslation();
  switch (model._view) {
    case 0: {
      return (
        <EmptyState>
          {t('ui.noIssuesStart')} <Shortcut>c</Shortcut> {t('ui.toCreate')}
        </EmptyState>
      );
    }
    case 1: {
      const {
        selectedId,
        rows,
        issuePositions,
        issueCount,
        bulkSelectedIds,
        bulkSelectedIdSet,
        bulkSelectedArchived,
        childCounts,
        windowed,
        today,
        displayProperties,
        projects,
        cycles,
        labels,
        removableLabels,
        handlers,
      } = model;
      return (
        <ScrollArea
          viewportRef={windowed.ref}
          scrollbars="y"
          style={{ flex: 1, minHeight: 0 }}
          viewportProps={{
            tabIndex: 0,
            role: 'listbox',
            'aria-label': t('nav.issues'),
            'aria-multiselectable': true,
          }}
        >
          <Box>
            <Box role="presentation" style={{ height: windowed.before, flexShrink: 0 }} />
            {rows.slice(windowed.start, windowed.end).map((row) => {
              if (row.kind === 'group') {
                return (
                  <Box key={row.key} ml={row.level ? row.level * 20 : 0}>
                    <IssueGroupRow
                      row={row}
                      projects={projects}
                      cycles={cycles}
                      onToggle={handlers.onToggleGroup1}
                      onCreate={handlers.onCreateInGroup2}
                    />
                  </Box>
                );
              }
              const issue = row.issue;
              return (
                <IssueListRow
                  key={issue.identifier}
                  issue={issue}
                  selected={issue.identifier === selectedId}
                  bulkSelected={bulkSelectedIdSet.has(issue.identifier)}
                  position={issuePositions.get(issue.identifier)}
                  setSize={issueCount}
                  childCount={childCounts.get(issue.id) ?? 0}
                  today={today}
                  displayProperties={displayProperties}
                  hideProjectSlug={hideProjectSlug}
                  onSelect={handlers.onClick0}
                  onToggleBulkSelection={handlers.onToggleBulkSelection}
                />
              );
            })}
            <Box role="presentation" style={{ height: windowed.after, flexShrink: 0 }} />
            {bulkSelectedIds.length > 0 ? (
              <IssueSelectionToolbar
                selectedCount={bulkSelectedIds.length}
                archived={bulkSelectedArchived}
                onSetStatus={handlers.onSetBulkStatus}
                onArchive={handlers.onArchiveBulkIssues}
                onSetPriority={handlers.onSetBulkPriority}
                onSetAssignee={handlers.onSetBulkAssignee}
                onSetType={handlers.onSetBulkType}
                onSetEstimate={handlers.onSetBulkEstimate}
                onSetDueDate={handlers.onSetBulkDueDate}
                onSetSubscribed={handlers.onSetBulkSubscribed}
                projects={projects}
                cycles={cycles}
                labels={labels}
                removableLabels={removableLabels}
                onSetProject={handlers.onSetBulkProject}
                onSetCycle={handlers.onSetBulkCycle}
                onAddLabel={handlers.onAddBulkLabel}
                onRemoveLabel={handlers.onRemoveBulkLabel}
                onCopyIssues={handlers.onCopyBulkIssues}
                onAskAgent={handlers.onAskAgentAboutSelectedIssues}
                onClear={handlers.onClearBulkSelection}
              />
            ) : null}
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
    preview?: boolean;
    projects?: import('../types.ts').Project[];
    cycles?: import('../types.ts').Cycle[];
    labels?: import('../types.ts').Label[];
  },
) {
  return (
    <PresenterScope name="IssueList" disabled={props.preview}>
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
      const {
        dragId,
        columns,
        canReorder,
        bulkSelectedIds,
        bulkSelectedIdSet,
        bulkSelectedArchived,
        removableLabels,
        projects,
        cycles,
        labels,
        handlers,
      } = model;
      return (
        <Box style={{ position: 'relative', height: '100%', minHeight: 0 }}>
          <Group align="stretch" gap="md" wrap="nowrap" className={styles.board} data-issue-board>
            {columns.map((column) => (
              <IssueBoardColumn
                key={column.status}
                {...column}
                dragId={dragId}
                bulkSelectedIdSet={bulkSelectedIdSet}
                onDrag={handlers.onDrag0}
                onToggleSelection={handlers.onToggleSelection1}
                onExtendSelection={handlers.onExtendSelection2}
                onSelectAll={handlers.onSelectAll10}
                onSelectColumn={() => handlers.onSelectColumn11(column.status)}
                onClearSelection={handlers.onClearBulkSelection9}
                onOpen={handlers.onOpen3}
                onMove={handlers.onMove4}
                onMoveToAdjacentColumn={handlers.onMoveToAdjacentColumn5}
                canReorder={canReorder}
              />
            ))}
          </Group>
          {bulkSelectedIds.length > 0 ? (
            <div className={styles.selectionToolbar}>
              <IssueSelectionToolbar
                selectedCount={bulkSelectedIds.length}
                archived={bulkSelectedArchived}
                onSetStatus={handlers.onSetBulkStatus}
                onArchive={handlers.onArchiveBulkIssues}
                onSetPriority={handlers.onSetBulkPriority}
                onSetAssignee={handlers.onSetBulkAssignee}
                onSetType={handlers.onSetBulkType}
                onSetEstimate={handlers.onSetBulkEstimate}
                onSetDueDate={handlers.onSetBulkDueDate}
                onSetSubscribed={handlers.onSetBulkSubscribed}
                projects={projects}
                cycles={cycles}
                labels={labels}
                removableLabels={removableLabels}
                onSetProject={handlers.onSetBulkProject}
                onSetCycle={handlers.onSetBulkCycle}
                onAddLabel={handlers.onAddBulkLabel}
                onRemoveLabel={handlers.onRemoveBulkLabel}
                onCopyIssues={handlers.onCopyBulkIssues}
                onAskAgent={handlers.onAskAgentAboutSelectedIssues}
                onClear={handlers.onClearBulkSelection9}
              />
            </div>
          ) : null}
        </Box>
      );
    }
  }
}

export function IssueBoard(
  props: Parameters<typeof useIssueBoardPresenter>[0] & { preview?: boolean },
) {
  return (
    <PresenterScope name="IssueBoard" disabled={props.preview}>
      <IssueBoardBinding {...props} />
    </PresenterScope>
  );
}

function IssueBoardBinding(props: Parameters<typeof useIssueBoardPresenter>[0]) {
  const model = useIssueBoardPresenter(props);
  const handlers = useActions(model.handlers);
  return <IssueBoardView model={{ ...model, handlers } as typeof model} />;
}
