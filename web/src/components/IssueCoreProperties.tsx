import { Box, Group, Text } from '@mantine/core';
import { IconChartBar, IconRefresh, IconUser } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { priorityLabel } from '../i18n/labels.ts';
import type { IssuePropertyMenu } from '../issue-property-model.ts';
import type { Cycle, Issue } from '../types.ts';
import { useIssueWorkflow, workflowStatusLabel } from '../workflow.tsx';
import { IssuePriorityIcon, IssueStatusIcon } from './issue-ui.tsx';
import styles from './IssuePropertiesPanel.module.css';
import { IssuePropertyRow, IssuePropertySelect } from './IssuePropertyControls.tsx';

export function IssueCoreProperties({
  issue,
  issuePropertyMenu,
  cycles,
  onOpenProperty,
  onCloseProperty,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onEstimateChange,
  onCycleChange,
}: {
  issue: Issue;
  issuePropertyMenu: IssuePropertyMenu;
  cycles: Cycle[];
  onOpenProperty: (property: IssuePropertyMenu) => void;
  onCloseProperty: () => void;
  onStatusChange: (value: string | null) => void;
  onPriorityChange: (value: string | null) => void;
  onAssigneeChange: (value: string | null) => void;
  onEstimateChange: (value: string | null) => void;
  onCycleChange: (value: string | null) => void;
}) {
  const { t } = useTranslation();
  const { statuses: workflowStatuses } = useIssueWorkflow();
  const statusLabel = workflowStatusLabel(issue.workflowStatus ?? issue.status, workflowStatuses);
  const priorityValueLabel = priorityLabel(issue.priority);
  const assigneeValueLabel =
    issue.assignee === 'self'
      ? t('issueAssignment.you')
      : issue.assignee === 'agent'
        ? t('issueAssignment.agent')
        : t('issueAssignment.unassigned');
  const estimateValueLabel =
    issue.estimate == null ? t('issueProperties.noEstimate') : String(issue.estimate);
  const currentCycle = cycles.find((cycle) => cycle.id === issue.cycleId);
  const cycleValueLabel = currentCycle
    ? t('field.cycleN', { number: currentCycle.number })
    : t('field.noCycle');

  return (
    <>
      <Box
        role="group"
        aria-label={t('issueProperties.coreProperties')}
        className={styles.coreProperties}
      >
        <Text component="h3" className={styles.heading}>
          {t('issueProperties.heading')}
        </Text>

        <IssuePropertyRow
          label={t('field.status')}
          icon={
            <IssueStatusIcon
              status={
                workflowStatuses.find((status) => status.id === issue.workflowStatus)?.category ??
                issue.status
              }
            />
          }
        >
          <IssuePropertySelect
            compactChars={12}
            compactLabel={statusLabel}
            aria-label={t('field.status')}
            dropdownOpened={issuePropertyMenu === 'status'}
            onDropdownOpen={() => onOpenProperty('status')}
            onDropdownClose={onCloseProperty}
            value={issue.workflowStatus ?? issue.status}
            onChange={onStatusChange}
            data={workflowStatuses.map((status) => ({
              value: status.id,
              label: workflowStatusLabel(status.id, workflowStatuses),
            }))}
            renderOption={({ option }) => {
              const status = workflowStatuses.find((item) => item.id === option.value);
              return (
                <Group gap="xs" wrap="nowrap">
                  {status ? <IssueStatusIcon status={status.category} /> : null}
                  <span>{option.label}</span>
                </Group>
              );
            }}
          />
        </IssuePropertyRow>

        <IssuePropertyRow
          label={t('field.priority')}
          icon={<IssuePriorityIcon priority={issue.priority} />}
        >
          <IssuePropertySelect
            compactChars={12}
            compactLabel={priorityValueLabel}
            aria-label={t('field.priority')}
            dropdownOpened={issuePropertyMenu === 'priority'}
            onDropdownOpen={() => onOpenProperty('priority')}
            onDropdownClose={onCloseProperty}
            value={String(issue.priority)}
            onChange={onPriorityChange}
            data={[0, 1, 2, 3, 4].map((priority) => ({
              value: String(priority),
              label: priorityLabel(priority),
            }))}
            renderOption={({ option }) => (
              <Group gap="xs" wrap="nowrap">
                <IssuePriorityIcon priority={Number(option.value)} />
                <span>{option.value === '0' ? priorityLabel(0) : option.label}</span>
              </Group>
            )}
          />
        </IssuePropertyRow>

        <IssuePropertyRow label={t('field.assignee')} icon={<IconUser size={14} stroke={1.7} />}>
          <IssuePropertySelect
            compactChars={14}
            compactLabel={assigneeValueLabel}
            aria-label={t('field.assignee')}
            value={issue.assignee ?? 'none'}
            onChange={onAssigneeChange}
            data={[
              { value: 'none', label: t('issueAssignment.unassigned') },
              { value: 'self', label: t('issueAssignment.you') },
              { value: 'agent', label: t('issueAssignment.agent') },
            ]}
          />
        </IssuePropertyRow>

        <IssuePropertyRow
          label={t('field.estimate')}
          icon={<IconChartBar size={14} stroke={1.7} />}
        >
          <IssuePropertySelect
            compactChars={12}
            compactLabel={estimateValueLabel}
            aria-label={t('field.estimate')}
            dropdownOpened={issuePropertyMenu === 'estimate'}
            onDropdownOpen={() => onOpenProperty('estimate')}
            onDropdownClose={onCloseProperty}
            value={issue.estimate == null ? 'none' : String(issue.estimate)}
            onChange={onEstimateChange}
            data={[
              { value: 'none', label: t('issueProperties.noEstimate') },
              ...Array.from(new Set([0, 1, 2, 3, 5, 8, 13, 21, 34, issue.estimate]))
                .filter((estimate): estimate is number => estimate != null)
                .map((estimate) => ({ value: String(estimate), label: String(estimate) })),
            ]}
            renderOption={({ option }) => (
              <span>
                {option.value === 'none' ? t('issueProperties.noEstimate') : option.label}
              </span>
            )}
          />
        </IssuePropertyRow>

        <IssuePropertyRow label={t('field.cycle')} icon={<IconRefresh size={14} stroke={1.7} />}>
          <IssuePropertySelect
            compactChars={12}
            compactLabel={cycleValueLabel}
            aria-label={t('field.cycle')}
            value={issue.cycleId != null ? String(issue.cycleId) : 'none'}
            onChange={onCycleChange}
            data={[
              { value: 'none', label: t('field.noCycle') },
              ...cycles.map((cycle) => ({
                value: String(cycle.id),
                label: t('field.cycleN', { number: cycle.number }),
              })),
            ]}
            renderOption={({ option }) => (
              <span>{option.value === 'none' ? t('field.noCycle') : option.label}</span>
            )}
            searchable
            nothingFoundMessage={t('issueProperties.noCyclesFound')}
          />
        </IssuePropertyRow>
      </Box>
    </>
  );
}
