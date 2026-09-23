import { Button, Group, Text } from '@mantine/core';
import { IconChartBar, IconChevronDown, IconChevronRight, IconFolder } from '@tabler/icons-react';
import { isOverdue } from '../due.ts';
import { issueStatusLabel, priorityLabel } from '../i18n/labels.ts';
import type { IssueListRow as IssueListRowModel } from '../issue-list.ts';
import type { Issue } from '../types.ts';
import { IssueLabelPill, IssueMetaText, IssuePriorityIcon, IssueStatusIcon } from './issue-ui.tsx';
import styles from './IssueListRow.module.css';

export function IssueGroupRow({
  row,
  onToggle,
}: {
  row: Extract<IssueListRowModel, { kind: 'group' }>;
  onToggle: (key: string) => void;
}) {
  const label =
    row.groupBy === 'priority'
      ? row.priority === 0
        ? 'No priority'
        : priorityLabel(row.priority ?? 0)
      : row.groupBy === 'status' && row.status
        ? issueStatusLabel(row.status)
        : row.label;
  const icon =
    row.groupBy === 'priority' ? (
      <IconChartBar size={14} stroke={1.8} aria-hidden />
    ) : row.groupBy === 'status' && row.status ? (
      <IssueStatusIcon status={row.status} />
    ) : (
      <IconFolder size={14} stroke={1.8} aria-hidden />
    );

  return (
    <Button
      type="button"
      variant="subtle"
      color="gray"
      fullWidth
      justify="flex-start"
      aria-label={`${label} · ${row.count} issues`}
      aria-expanded={!row.collapsed}
      onClick={() => onToggle(row.key)}
      classNames={{ root: styles.groupButton, inner: styles.groupButtonInner }}
    >
      <Group gap={8} wrap="nowrap">
        {row.collapsed ? (
          <IconChevronRight size={13} stroke={1.8} aria-hidden />
        ) : (
          <IconChevronDown size={13} stroke={1.8} aria-hidden />
        )}
        {icon}
        <Text size="xs" fw={550} c="dimmed">
          {label}
        </Text>
        <Text size="xs" c="dimmed">
          {row.count}
        </Text>
      </Group>
    </Button>
  );
}

export function IssueListRow({
  issue,
  selected,
  position,
  setSize,
  childCount,
  today,
  hideProjectSlug = false,
  onSelect,
}: {
  issue: Issue;
  selected: boolean;
  position: number | undefined;
  setSize: number;
  childCount: number;
  today: string;
  hideProjectSlug?: boolean;
  onSelect: (issue: Issue) => void;
}) {
  const overdue = isOverdue(issue.dueDate, today);
  const canceled = issue.status === 'canceled';

  return (
    <Button
      type="button"
      variant="subtle"
      color="gray"
      fullWidth
      role="option"
      aria-posinset={position}
      aria-setsize={setSize}
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      onClick={() => onSelect(issue)}
      classNames={{
        root: [styles.issueButton, selected ? styles.issueButtonSelected : '']
          .filter(Boolean)
          .join(' '),
        inner: styles.issueButtonInner,
      }}
    >
      <Group gap={8} wrap="nowrap" justify="space-between" h="100%">
        <Group
          gap={8}
          wrap="nowrap"
          style={{ minWidth: 0, flex: 1, paddingLeft: 8 + issue.depth * 14 }}
        >
          <IssuePriorityIcon priority={issue.priority} />
          <Text size="xs" c="dimmed" ff="var(--mantine-font-family-monospace)" w={58} truncate>
            {issue.identifier}
          </Text>
          <IssueStatusIcon status={issue.status} />
          <Text size="xs" c="dimmed" w={86} truncate visibleFrom="sm">
            {issueStatusLabel(issue.status)}
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
          {issue.labels.slice(0, 2).map((label) => (
            <IssueLabelPill key={label.id} name={label.name} color={label.color} />
          ))}
          {childCount > 0 ? <IssueMetaText>{childCount}</IssueMetaText> : null}
          {issue.adrNumbers.length > 0 ? (
            <IssueMetaText>{issue.adrNumbers.length} ADR</IssueMetaText>
          ) : null}
          {!hideProjectSlug && issue.projectSlug ? (
            <IssueMetaText>{issue.projectSlug}</IssueMetaText>
          ) : null}
          {issue.dueDate ? (
            <Text component="span" size="xs" c={overdue ? 'red.4' : 'dimmed'}>
              {issue.dueDate.slice(5, 10)}
            </Text>
          ) : null}
        </Group>
      </Group>
    </Button>
  );
}
