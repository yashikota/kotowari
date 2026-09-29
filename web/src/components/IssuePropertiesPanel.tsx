import { Box } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { useIssueDetailPresenter } from '../presenters/IssueDetail.tsx';
import { IssueCoreProperties } from './IssueCoreProperties.tsx';
import { IssueLabelsProperty } from './IssueLabelsProperty.tsx';
import { IssueOptionalProperties } from './IssueOptionalProperties.tsx';
import { IssueProjectProperty } from './IssueProjectProperty.tsx';
import styles from './IssuePropertiesPanel.module.css';

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

  return (
    <Box component="section" aria-label={t('issueProperties.ariaLabel')} className={styles.aside}>
      <Box className={styles.properties}>
        <IssueCoreProperties
          issue={issue}
          issuePropertyMenu={issuePropertyMenu}
          cycles={cycles}
          onOpenProperty={handlers.onOpenIssuePropertyMenu}
          onCloseProperty={handlers.onCloseIssuePropertyMenu}
          onStatusChange={handlers.onStatusChange}
          onPriorityChange={handlers.onPriorityChange}
          onAssigneeChange={handlers.onAssigneeChange}
          onEstimateChange={handlers.onEstimateChange}
          onCycleChange={handlers.onCycleChange}
        />
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
        <IssueProjectProperty
          issue={issue}
          projects={projects}
          onChange={handlers.onProjectChange}
        />
        <IssueOptionalProperties
          issue={issue}
          visibility={optionalIssuePropertyVisibility}
          due={due}
          milestones={milestones}
          parentOptions={parentOptions}
          onTypeChange={handlers.onTypeChange}
          onParentChange={handlers.onParentChange}
          onDueDateChange={handlers.onPropertyDueDateChange}
          onMilestoneChange={handlers.onMilestoneChange}
          onToggleProperty={handlers.onToggleIssueOptionalProperty}
        />
      </Box>
    </Box>
  );
}
