import { ActionIcon, Button, Checkbox, Group, Text } from '@mantine/core';
import {
  IconChartBar,
  IconChevronDown,
  IconChevronRight,
  IconFolder,
  IconGitPullRequest,
  IconLink,
  IconPlus,
  IconStar,
} from '@tabler/icons-react';
import { isOverdue } from '../due.ts';
import { issueTypeLabel, priorityLabel } from '../i18n/labels.ts';
import i18n from '../i18n/index.ts';
import type { IssueListRow as IssueListRowModel } from '../issue-list.ts';
import type { IssueDisplayProperty } from '../issue-list.ts';
import type { Issue, IssueType } from '../types.ts';
import { useIssueWorkflow, workflowStatusLabel } from '../workflow.tsx';
import { IssueLabelPill, IssueMetaText, IssuePriorityIcon, IssueStatusIcon } from './issue-ui.tsx';
import styles from './IssueListRow.module.css';

export function IssueGroupRow({
  row,
  onToggle,
  onCreate,
}: {
  row: Extract<IssueListRowModel, { kind: 'group' }>;
  onToggle: (key: string) => void;
  onCreate?: (row: Extract<IssueListRowModel, { kind: 'group' }>) => void;
}) {
  const { statuses: workflowStatuses } = useIssueWorkflow();
  const label =
    row.groupBy === 'type'
      ? row.label
        ? issueTypeLabel(row.label as IssueType)
        : i18n.t('issueProperties.noType')
      : row.groupBy === 'estimate'
        ? row.label || i18n.t('issueProperties.noEstimate')
        : row.groupBy === 'priority'
          ? priorityLabel(row.priority ?? 0)
          : row.groupBy === 'status' && row.status
            ? workflowStatusLabel(row.status, workflowStatuses)
            : row.groupBy === 'project' && row.label === 'No project'
              ? i18n.t('issueProperties.noProject')
              : row.groupBy === 'cycle' && row.label === 'No cycle'
                ? i18n.t('field.noCycle')
                : row.groupBy === 'cycle' && row.label.startsWith('Cycle ')
                  ? i18n.t('field.cycleN', { number: row.label.slice(6) })
                  : row.groupBy === 'label' && row.label === 'No label'
                    ? i18n.t('issueProperties.noLabels')
                    : row.groupBy === 'parent' && row.label === 'No parent'
                      ? i18n.t('issueProperties.noParent')
                      : row.label;
  const icon =
    row.groupBy === 'type' ? (
      <IconFolder size={14} stroke={1.8} aria-hidden />
    ) : row.groupBy === 'estimate' ? (
      <IconChartBar size={14} stroke={1.8} aria-hidden />
    ) : row.groupBy === 'priority' ? (
      <IssuePriorityIcon priority={row.priority ?? 0} />
    ) : row.groupBy === 'status' && row.status ? (
      <IssueStatusIcon
        status={workflowStatuses.find((status) => status.id === row.status)?.category ?? 'todo'}
      />
    ) : (
      <IconFolder size={14} stroke={1.8} aria-hidden />
    );

  return (
    <div className={styles.groupRow}>
      <Button
        type="button"
        variant="subtle"
        color="gray"
        aria-label={i18n.t('ui.issueGroupCount', { label, count: row.count })}
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
      {row.groupBy === 'priority' && onCreate ? (
        <ActionIcon
          type="button"
          variant="subtle"
          color="gray"
          size="sm"
          aria-label={i18n.t('ui.createIssueInPriorityGroup', { label })}
          title={i18n.t('ui.createIssueInPriorityGroup', { label })}
          onClick={() => onCreate(row)}
        >
          <IconPlus size={14} stroke={1.8} aria-hidden />
        </ActionIcon>
      ) : null}
    </div>
  );
}

function statusDuration(statusChangedAt: string | undefined, updatedAt: string): string {
  const elapsed = Math.max(0, Date.now() - Date.parse(statusChangedAt || updatedAt));
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

export function IssueListRow({
  issue,
  selected,
  bulkSelected,
  position,
  setSize,
  childCount,
  today,
  displayProperties,
  hideProjectSlug = false,
  onSelect,
  onToggleBulkSelection,
}: {
  issue: Issue;
  selected: boolean;
  bulkSelected: boolean;
  position: number | undefined;
  setSize: number;
  childCount: number;
  today: string;
  displayProperties: IssueDisplayProperty[];
  hideProjectSlug?: boolean;
  onSelect: (issue: Issue) => void;
  onToggleBulkSelection: (id: string, checked: boolean) => void;
}) {
  const { statuses: workflowStatuses } = useIssueWorkflow();
  const overdue = isOverdue(issue.dueDate, today);
  const pullRequestCount =
    issue.externalLinks?.filter((link) => link.kind === 'pullRequest').length ?? 0;
  const canceled = issue.status === 'canceled';
  const shows = (property: IssueDisplayProperty) => displayProperties.includes(property);

  return (
    <div className={styles.issueRow} role="presentation" data-bulk-selected={bulkSelected}>
      <Checkbox
        className={styles.issueSelection}
        size="xs"
        aria-label={i18n.t('ui.selectIssueRow', { identifier: issue.identifier })}
        checked={bulkSelected}
        onChange={(event) => onToggleBulkSelection(issue.identifier, event.currentTarget.checked)}
      />
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
            {issue.isFavorite ? (
              <IconStar
                size={13}
                stroke={1.8}
                color="var(--mantine-color-yellow-6)"
                aria-hidden="true"
              />
            ) : null}
            {shows('priority') ? <IssuePriorityIcon priority={issue.priority} /> : null}
            {shows('id') ? (
              <Text size="xs" c="dimmed" ff="var(--mantine-font-family-monospace)" w={58} truncate>
                {issue.identifier}
              </Text>
            ) : null}
            {shows('status') ? (
              <>
                <IssueStatusIcon
                  status={
                    workflowStatuses.find((status) => status.id === issue.workflowStatus)
                      ?.category ?? issue.status
                  }
                />
                <Text size="xs" c="dimmed" w={86} truncate visibleFrom="sm">
                  {workflowStatusLabel(issue.workflowStatus ?? issue.status, workflowStatuses)}
                </Text>
              </>
            ) : null}
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
            {shows('labels')
              ? issue.labels
                  .slice(0, 2)
                  .map((label) => (
                    <IssueLabelPill key={label.id} name={label.name} color={label.color} />
                  ))
              : null}
            {issue.type ? <IssueMetaText>{issueTypeLabel(issue.type)}</IssueMetaText> : null}
            {shows('estimate') && issue.estimate != null ? (
              <IssueMetaText>{issue.estimate}</IssueMetaText>
            ) : null}
            {childCount > 0 ? <IssueMetaText>{childCount}</IssueMetaText> : null}
            {shows('links') && (issue.externalLinks?.length ?? 0) > 0 ? (
              <IssueMetaText
                aria-label={i18n.t('issueLinks.count', { count: issue.externalLinks.length })}
              >
                <IconLink size={12} stroke={1.7} aria-hidden="true" />{' '}
                {i18n.t('issueLinks.count', { count: issue.externalLinks.length })}
              </IssueMetaText>
            ) : null}
            {shows('pullRequests') && pullRequestCount > 0 ? (
              <IssueMetaText
                aria-label={i18n.t('issueLinks.pullRequestCount', {
                  count: pullRequestCount,
                })}
              >
                <IconGitPullRequest size={12} stroke={1.7} aria-hidden="true" /> {pullRequestCount}
              </IssueMetaText>
            ) : null}
            {(issue.adrNumbers?.length ?? 0) > 0 ? (
              <IssueMetaText
                aria-label={i18n.t('issueADRs.count', { count: issue.adrNumbers.length })}
              >
                {i18n.t('issueADRs.count', { count: issue.adrNumbers.length })}
              </IssueMetaText>
            ) : null}
            {shows('cycle') && issue.cycleNumber != null ? (
              <IssueMetaText>{i18n.t('field.cycleN', { number: issue.cycleNumber })}</IssueMetaText>
            ) : null}
            {shows('milestone') && issue.milestoneName ? (
              <IssueMetaText>{issue.milestoneName}</IssueMetaText>
            ) : null}
            {shows('project') && !hideProjectSlug && issue.projectSlug ? (
              <IssueMetaText>{issue.projectSlug}</IssueMetaText>
            ) : null}
            {shows('dueDate') && issue.dueDate ? (
              <Text component="span" size="xs" c={overdue ? 'red.4' : 'dimmed'}>
                {issue.dueDate.slice(5, 10)}
              </Text>
            ) : null}
            {shows('created') ? (
              <IssueMetaText>{issue.createdAt.slice(0, 10)}</IssueMetaText>
            ) : null}
            {shows('updated') ? (
              <IssueMetaText>{issue.updatedAt.slice(0, 10)}</IssueMetaText>
            ) : null}
            {shows('timeInStatus') ? (
              <IssueMetaText>
                {statusDuration(issue.statusChangedAt, issue.updatedAt)}
              </IssueMetaText>
            ) : null}
          </Group>
        </Group>
      </Button>
    </div>
  );
}
