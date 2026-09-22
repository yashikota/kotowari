import { Box, Group, ScrollArea, Text, UnstyledButton } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { isOverdue, localToday } from '../due.ts';
import { IssueLabelPill, IssueMetaText, IssuePriorityIcon, IssueStatusIcon } from './issue-ui.tsx';
import type { IssueStatus } from '../types.ts';
import { EmptyState, Shortcut } from '../mantine-ui.tsx';

import { PresenterScope, useActions } from '../application/Root.tsx';
import {
  useBoardColumnPresenter,
  useIssueBoardPresenter,
  useIssueListPresenter,
} from '../presenters/IssueList.tsx';

const ROW_HEIGHT = 36;

export function IssueListView({ model }: { model: ReturnType<typeof useIssueListPresenter> }) {
  useTranslation();

  switch (model._view) {
    case 0: {
      return (
        <EmptyState>
          No issues. Press <Shortcut>c</Shortcut> to create.
        </EmptyState>
      );
    }
    case 1: {
      const { selectedId, issues, childCounts, windowed, today, handlers } = model;
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
            {issues.slice(windowed.start, windowed.end).map((issue, offset) => {
              const childCount = childCounts.get(issue.id) ?? 0;
              const overdue = isOverdue(issue.dueDate, today);
              const selected = issue.identifier === selectedId;
              const canceled = issue.status === 'canceled';
              return (
                <UnstyledButton
                  key={issue.identifier}
                  role="option"
                  aria-posinset={windowed.start + offset + 1}
                  aria-setsize={issues.length}
                  tabIndex={selected ? 0 : -1}
                  aria-selected={selected}
                  w="100%"
                  px="sm"
                  styles={{
                    root: {
                      display: 'block',
                      height: ROW_HEIGHT,
                      flexShrink: 0,
                      borderBottom: '1px solid var(--mantine-color-default-border)',
                      backgroundColor: selected ? 'var(--mantine-color-dark-6)' : undefined,
                      '&:hover': {
                        backgroundColor: selected
                          ? 'var(--mantine-color-dark-6)'
                          : 'var(--mantine-color-dark-7)',
                      },
                    },
                  }}
                  onClick={() => handlers.onClick0(issue)}
                >
                  <Group
                    gap={8}
                    wrap="nowrap"
                    justify="space-between"
                    h="100%"
                    style={{ paddingLeft: 8 + (issue.depth ?? 0) * 14 }}
                  >
                    <Group gap={8} wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                      <IssueStatusIcon status={issue.status} />
                      <IssuePriorityIcon priority={issue.priority} />
                      <Text
                        size="xs"
                        c="dimmed"
                        ff="var(--mantine-font-family-monospace)"
                        style={{ width: 58, flexShrink: 0 }}
                      >
                        {issue.identifier}
                      </Text>
                      <Text
                        size="sm"
                        truncate
                        c={canceled ? 'dimmed' : overdue ? 'red.4' : undefined}
                        td={canceled ? 'line-through' : undefined}
                        style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}
                      >
                        {issue.title}
                      </Text>
                    </Group>
                    <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }}>
                      {issue.labels.slice(0, 2).map((l) => (
                        <IssueLabelPill key={l.id} name={l.name} color={l.color} />
                      ))}
                      {childCount > 0 ? <IssueMetaText>{childCount}</IssueMetaText> : null}
                      {(issue.adrNumbers?.length ?? 0) > 0 ? (
                        <IssueMetaText>{issue.adrNumbers.length} ADR</IssueMetaText>
                      ) : null}
                      {issue.projectSlug ? (
                        <IssueMetaText>{issue.projectSlug}</IssueMetaText>
                      ) : null}
                      {issue.dueDate ? (
                        <Text
                          component="span"
                          size="xs"
                          c={overdue ? 'red.4' : 'dimmed'}
                          style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                        >
                          {issue.dueDate.slice(5, 10)}
                        </Text>
                      ) : null}
                    </Group>
                  </Group>
                </UnstyledButton>
              );
            })}
            <Box role="presentation" style={{ height: windowed.after, flexShrink: 0 }} />
          </Box>
        </ScrollArea>
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
  useTranslation();

  switch (model._view) {
    case 0: {
      const { dragId, columns, handlers } = model;
      return (
        <Group align="stretch" gap="md" wrap="nowrap" style={{ minHeight: 480 }}>
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

export function BoardColumnView({ model }: { model: ReturnType<typeof useBoardColumnPresenter> }) {
  useTranslation();

  switch (model._view) {
    case 0: {
      const { issues, status, dragId, windowed, handlers } = model;
      const today = localToday();
      return (
        <Box
          p="xs"
          style={{
            flex: '1 1 0',
            minWidth: 260,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 'var(--mantine-radius-sm)',
            backgroundColor: 'var(--mantine-color-dark-7)',
          }}
          onDragOver={handlers.onDragOver0}
          onDrop={handlers.onDrop1}
        >
          <Group gap={6} mb="xs" px={4}>
            <IssueStatusIcon status={status} />
            <Text size="xs" tt="uppercase" c="dimmed" fw={600} lts={0.4}>
              {status.replace('_', ' ')}
            </Text>
            <Text size="xs" c="dimmed">
              {issues.length}
            </Text>
          </Group>
          <ScrollArea viewportRef={windowed.ref} style={{ flex: 1 }} type="auto">
            <Box>
              <Box style={{ height: windowed.before }} aria-hidden />
              {issues.slice(windowed.start, windowed.end).map((issue) => {
                const overdue = isOverdue(issue.dueDate, today);
                return (
                  <UnstyledButton
                    key={issue.identifier}
                    draggable
                    onDragStart={() => handlers.onDragStart2(issue)}
                    onDragEnd={handlers.onDragEnd3}
                    onDragOver={handlers.onDragOver4}
                    onDrop={(...args) => handlers.onDrop5(issue, ...args)}
                    onClick={() => handlers.onClick6(issue)}
                    w="100%"
                    p="xs"
                    mb={4}
                    style={{
                      display: 'block',
                      textAlign: 'left',
                      cursor: 'grab',
                      borderRadius: 'var(--mantine-radius-sm)',
                      backgroundColor: dragId
                        ? 'var(--mantine-color-dark-6)'
                        : 'var(--mantine-color-dark-8)',
                      border: overdue
                        ? '1px solid var(--mantine-color-red-8)'
                        : '1px solid var(--mantine-color-default-border)',
                    }}
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
                      {issue.labels.slice(0, 3).map((l) => (
                        <IssueLabelPill key={l.id} name={l.name} color={l.color} />
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

export type BoardColumn = {
  status: IssueStatus;
  issues: import('../types.ts').Issue[];
};
