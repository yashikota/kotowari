import { Box, Checkbox, Group, ScrollArea, Text, UnstyledButton } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { isOverdue, localToday } from '../due.ts';
import { useIssueWorkflow, workflowStatusLabel } from '../workflow.tsx';
import { PresenterScope, useActions } from '../application/Root.tsx';
import { useBoardColumnPresenter } from '../presenters/IssueBoard.ts';
import type { IssueBoardColumnProps } from '../issue-board.ts';
export type { IssueBoardColumnProps } from '../issue-board.ts';
import { IssueLabelPill, IssuePriorityIcon, IssueStatusIcon } from './issue-ui.tsx';
import styles from './IssueBoardColumn.module.css';

export function IssueBoardColumn(props: IssueBoardColumnProps) {
  return (
    <PresenterScope name="BoardColumn">
      <IssueBoardColumnBinding {...props} />
    </PresenterScope>
  );
}

function IssueBoardColumnBinding(props: IssueBoardColumnProps) {
  const model = useBoardColumnPresenter(props);
  const handlers = useActions(model.handlers);
  return <IssueBoardColumnView model={{ ...model, handlers } as typeof model} />;
}

function IssueBoardColumnView({ model }: { model: ReturnType<typeof useBoardColumnPresenter> }) {
  const { t } = useTranslation();
  const { statuses: workflowStatuses } = useIssueWorkflow();
  switch (model._view) {
    case 0: {
      const { issues, status, category, dragId, bulkSelectedIdSet, windowed, handlers } = model;
      const today = localToday();
      const statusLabel = workflowStatusLabel(status, workflowStatuses);
      return (
        <Box
          component="section"
          aria-label={t('ui.issueColumnLabel', { status: statusLabel })}
          data-issue-board-column
          data-board-count={issues.length}
          className={styles.column}
          p="xs"
          onDragOver={handlers.onDragOver0}
          onDrop={handlers.onDrop1}
        >
          <Group gap={6} mb="xs" px={4}>
            <IssueStatusIcon status={category} />
            <Text size="xs" tt="uppercase" c="dimmed" fw={600} lts={0.4}>
              {statusLabel}
            </Text>
            <Text size="xs" c="dimmed">
              {issues.length}
            </Text>
          </Group>
          <ScrollArea
            viewportRef={windowed.ref}
            viewportProps={{
              role: 'region',
              'aria-label': t('ui.issueCards', { status: statusLabel }),
            }}
            style={{ flex: '1 1 0', minHeight: 0 }}
            type="auto"
          >
            <Box>
              <Box style={{ height: windowed.before }} aria-hidden />
              {issues.slice(windowed.start, windowed.end).map((issue, index) => {
                const overdue = isOverdue(issue.dueDate, today);
                const selected = bulkSelectedIdSet.has(issue.identifier);
                const className = [
                  styles.issueCard,
                  dragId ? styles.dragging : '',
                  overdue ? styles.overdue : '',
                  selected ? styles.selected : '',
                ]
                  .filter(Boolean)
                  .join(' ');
                return (
                  <div
                    key={issue.identifier}
                    className={styles.cardRow}
                    data-bulk-selected={selected}
                  >
                    <Checkbox
                      className={styles.cardCheckbox}
                      size="xs"
                      aria-label={t('ui.selectIssueRow', { identifier: issue.identifier })}
                      checked={selected}
                      onChange={(event) =>
                        handlers.onSelectionChange7(
                          issue,
                          event.currentTarget.checked,
                          Boolean((event.nativeEvent as Event & { shiftKey?: boolean }).shiftKey),
                        )
                      }
                    />
                    <UnstyledButton
                      className={className}
                      data-issue-board-card
                      data-board-issue-id={issue.identifier}
                      data-board-index={windowed.start + index}
                      aria-pressed={selected}
                      draggable
                      onDragStart={() => handlers.onDragStart2(issue)}
                      onDragEnd={handlers.onDragEnd3}
                      onDragOver={handlers.onDragOver4}
                      onDrop={(...args) => handlers.onDrop5(issue, ...args)}
                      onClick={(event) => handlers.onClick6(issue, event)}
                      onKeyDown={(event) => handlers.onKeyDown8(issue, event)}
                    >
                      <Group justify="space-between" mb={4} wrap="nowrap" gap={6}>
                        <Text ff="monospace" size="xs" c="dimmed">
                          {issue.identifier}
                        </Text>
                        <IssuePriorityIcon priority={issue.priority} />
                      </Group>
                      <Text size="sm" mb={6} lineClamp={3} lh={1.35}>
                        {issue.title}
                      </Text>
                      <Group gap={4} wrap="wrap">
                        {issue.labels.slice(0, 3).map((label) => (
                          <IssueLabelPill key={label.id} name={label.name} color={label.color} />
                        ))}
                      </Group>
                    </UnstyledButton>
                  </div>
                );
              })}
              <Box style={{ height: windowed.after }} aria-hidden />
            </Box>
          </ScrollArea>
        </Box>
      );
    }
  }
}
