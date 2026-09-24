import { Box, Group, ScrollArea, Text, UnstyledButton } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { isOverdue, localToday } from '../due.ts';
import type { Issue, IssueStatus } from '../types.ts';
import { useIssueWorkflow, workflowStatusLabel } from '../workflow.tsx';
import { PresenterScope, useActions } from '../application/Root.tsx';
import { useBoardColumnPresenter } from '../presenters/IssueList.tsx';
import { IssueLabelPill, IssuePriorityIcon, IssueStatusIcon } from './issue-ui.tsx';
import styles from './IssueBoardColumn.module.css';

export type IssueBoardColumnProps = {
  issues: Issue[];
  status: string;
  category: IssueStatus;
  name: string;
  dragId: string | null;
  onDrag: (id: string | null) => void;
  onOpen: (id: string) => void;
  onMove: (id: string, status: string, sortOrder: number) => void;
};

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
      const { issues, status, category, dragId, windowed, handlers } = model;
      const today = localToday();
      const statusLabel = workflowStatusLabel(status, workflowStatuses);
      return (
        <Box
          component="section"
          aria-label={t('ui.issueColumnLabel', { status: statusLabel })}
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
              {issues.slice(windowed.start, windowed.end).map((issue) => {
                const overdue = isOverdue(issue.dueDate, today);
                const className = [
                  styles.issueCard,
                  dragId ? styles.dragging : '',
                  overdue ? styles.overdue : '',
                ]
                  .filter(Boolean)
                  .join(' ');
                return (
                  <UnstyledButton
                    key={issue.identifier}
                    className={className}
                    draggable
                    onDragStart={() => handlers.onDragStart2(issue)}
                    onDragEnd={handlers.onDragEnd3}
                    onDragOver={handlers.onDragOver4}
                    onDrop={(...args) => handlers.onDrop5(issue, ...args)}
                    onClick={() => handlers.onClick6(issue)}
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
