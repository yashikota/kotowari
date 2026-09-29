import { Box, Group, Text } from '@mantine/core';
import { IconChartBar, IconFolder, IconRefresh, IconUser } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { priorityLabel } from '../i18n/labels.ts';
import { useIssueWorkflow, workflowStatusLabel } from '../workflow.tsx';
import { IssuePriorityIcon, IssueStatusIcon } from './issue-ui.tsx';
import styles from './IssuePropertiesPanel.module.css';
import type { useIssueDetailPresenter } from '../presenters/IssueDetail.tsx';
import { IssueLabelsProperty } from './IssueLabelsProperty.tsx';
import { IssueOptionalProperties } from './IssueOptionalProperties.tsx';
import {
  IssuePropertyRow as PropertyRow,
  IssuePropertySelect as PropertySelect,
} from './IssuePropertyControls.tsx';

type IssueDetailModel = Extract<ReturnType<typeof useIssueDetailPresenter>, { _view: 2 }>;

export function IssuePropertiesPanel({
  model,
}: {
  model: Pick<
    IssueDetailModel,
    | 'issue'
    | 'issuePropertyMenu'
    | 'optionalIssuePropertyVisibility'
    | 'projects'
    | 'milestones'
    | 'cycles'
    | 'parentOptions'
    | 'labels'
    | 'selectedLabelIds'
    | 'labelName'
    | 'due'
    | 'handlers'
  >;
}) {
  const { t } = useTranslation();
  const { statuses: workflowStatuses } = useIssueWorkflow();
  const {
    issue,
    issuePropertyMenu,
    optionalIssuePropertyVisibility,
    projects,
    milestones,
    cycles,
    parentOptions,
    labels,
    selectedLabelIds,
    labelName,
    due,
    handlers,
  } = model;
  const statusLabel = workflowStatusLabel(issue.workflowStatus ?? issue.status, workflowStatuses);
  const priorityValueLabel = priorityLabel(issue.priority);
  const assigneeValueLabel =
    issue.assignee === 'self'
      ? t('issueAssignment.you')
      : issue.assignee === 'agent'
        ? t('issueAssignment.agent')
        : t('issueAssignment.unassigned');
  const projectValueLabel =
    projects.find((project) => project.id === issue.projectId)?.name ??
    t('issueProperties.addToProject');
  const estimateValueLabel =
    issue.estimate == null ? t('issueProperties.noEstimate') : String(issue.estimate);
  const currentCycle = cycles.find((cycle) => cycle.id === issue.cycleId);
  const cycleValueLabel = currentCycle
    ? t('field.cycleN', { number: currentCycle.number })
    : t('field.noCycle');
  return (
    <Box component="section" aria-label={t('issueProperties.ariaLabel')} className={styles.aside}>
      <Box className={styles.properties}>
        <Box
          role="group"
          aria-label={t('issueProperties.coreProperties')}
          className={styles.coreProperties}
        >
          <Text component="h3" className={styles.heading}>
            {t('issueProperties.heading')}
          </Text>

          <PropertyRow
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
            <PropertySelect
              compactChars={12}
              compactLabel={statusLabel}
              aria-label={t('field.status')}
              dropdownOpened={issuePropertyMenu === 'status'}
              onDropdownOpen={() => handlers.onOpenIssuePropertyMenu('status')}
              onDropdownClose={handlers.onCloseIssuePropertyMenu}
              value={issue.workflowStatus ?? issue.status}
              onChange={handlers.Status_onChange5}
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
          </PropertyRow>

          <PropertyRow
            label={t('field.priority')}
            icon={<IssuePriorityIcon priority={issue.priority} />}
          >
            <PropertySelect
              compactChars={12}
              compactLabel={priorityValueLabel}
              aria-label={t('field.priority')}
              dropdownOpened={issuePropertyMenu === 'priority'}
              onDropdownOpen={() => handlers.onOpenIssuePropertyMenu('priority')}
              onDropdownClose={handlers.onCloseIssuePropertyMenu}
              value={String(issue.priority)}
              onChange={handlers.Priority_onChange6}
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
          </PropertyRow>

          <PropertyRow label={t('field.assignee')} icon={<IconUser size={14} stroke={1.7} />}>
            <PropertySelect
              compactChars={14}
              compactLabel={assigneeValueLabel}
              aria-label={t('field.assignee')}
              value={issue.assignee ?? 'none'}
              onChange={handlers.Assignee_onChange}
              data={[
                { value: 'none', label: t('issueAssignment.unassigned') },
                { value: 'self', label: t('issueAssignment.you') },
                { value: 'agent', label: t('issueAssignment.agent') },
              ]}
            />
          </PropertyRow>

          <PropertyRow label={t('field.estimate')} icon={<IconChartBar size={14} stroke={1.7} />}>
            <PropertySelect
              compactChars={12}
              compactLabel={estimateValueLabel}
              aria-label={t('field.estimate')}
              dropdownOpened={issuePropertyMenu === 'estimate'}
              onDropdownOpen={() => handlers.onOpenIssuePropertyMenu('estimate')}
              onDropdownClose={handlers.onCloseIssuePropertyMenu}
              value={issue.estimate == null ? 'none' : String(issue.estimate)}
              onChange={handlers.Estimate_onChange15}
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
          </PropertyRow>

          <PropertyRow label={t('field.cycle')} icon={<IconRefresh size={14} stroke={1.7} />}>
            <PropertySelect
              compactChars={12}
              compactLabel={cycleValueLabel}
              aria-label={t('field.cycle')}
              value={issue.cycleId != null ? String(issue.cycleId) : 'none'}
              onChange={handlers.Cycle_onChange8}
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
          </PropertyRow>
        </Box>

        <IssueLabelsProperty
          labels={labels}
          selectedLabelIds={selectedLabelIds}
          labelName={labelName}
          opened={issuePropertyMenu === 'labels'}
          onOpenChange={(opened) => handlers.onOpenIssuePropertyMenu(opened ? 'labels' : null)}
          onToggleOpen={() => handlers.onToggleIssuePropertyMenu('labels')}
          onLabelQueryChange={handlers.onLabelQueryChange}
          onLabelQueryKeyDown={handlers.onLabelQueryKeyDown}
          onToggleLabel={handlers.onToggleIssueLabel}
          onCreateLabel={handlers.onCreateLabel}
        />

        <Box
          role="group"
          aria-label={t('field.project')}
          className={`${styles.section} ${styles.projectSection}`}
        >
          <Text component="h3" className={styles.heading}>
            {t('field.project')}
          </Text>
          <PropertyRow
            label={t('field.project')}
            icon={<IconFolder size={14} stroke={1.7} />}
            className={styles.projectRow}
          >
            <PropertySelect
              compactChars={18}
              compactLabel={projectValueLabel}
              aria-label={t('field.project')}
              value={issue.projectId != null ? String(issue.projectId) : 'none'}
              onChange={handlers.Project_onChange7}
              data={[
                { value: 'none', label: t('issueProperties.addToProject') },
                ...projects.map((project) => ({ value: String(project.id), label: project.name })),
              ]}
              renderOption={({ option }) => (
                <span>
                  {option.value === 'none' ? t('issueProperties.noProject') : option.label}
                </span>
              )}
              searchable
              nothingFoundMessage={t('issueProperties.noProjectsFound')}
            />
          </PropertyRow>
        </Box>

        <IssueOptionalProperties
          issue={issue}
          visibility={optionalIssuePropertyVisibility}
          due={due}
          milestones={milestones}
          parentOptions={parentOptions}
          onTypeChange={handlers.Type_onChange14}
          onParentChange={handlers.Parent_onChange9}
          onDueDateChange={handlers.Due_date_onChange10}
          onMilestoneChange={handlers.Milestone_onChange43}
          onToggleProperty={handlers.onToggleIssueOptionalProperty}
        />
      </Box>
    </Box>
  );
}
