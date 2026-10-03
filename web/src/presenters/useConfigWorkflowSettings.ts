import { useTranslation } from 'react-i18next';
import { useIssueWorkflow } from '../workflow.tsx';
import { useProjectWorkflow } from '../project-workflow.tsx';
import { useWorkflowEditor } from './useWorkflowEditor.ts';

export function useConfigWorkflowSettings() {
  const { t } = useTranslation();
  const issue = useIssueWorkflow();
  const project = useProjectWorkflow();
  const issueEditor = useWorkflowEditor(
    issue.statuses,
    issue.updateStatuses,
    'in_progress',
    'custom-status',
    {
      nameRequired: t('config.workflowNameRequired'),
      saveFailed: t('config.workflowSaveFailed'),
    },
  );
  const projectEditor = useWorkflowEditor(
    project.statuses,
    project.updateStatuses,
    'started',
    'project-status',
    {
      nameRequired: t('config.workflowNameRequired'),
      saveFailed: t('config.projectWorkflowSaveFailed'),
    },
  );
  return {
    data: { issueWorkflowEditor: issueEditor.data, projectWorkflowEditor: projectEditor.data },
    handlers: {
      onWorkflowStatusChange: issueEditor.handlers.editStatus,
      onWorkflowNameChange: issueEditor.handlers.changeName,
      onWorkflowDescriptionChange: issueEditor.handlers.changeDescription,
      onWorkflowCategoryChange: issueEditor.handlers.changeCategory,
      onOpenWorkflowStatus: issueEditor.handlers.open,
      onCloseWorkflowStatus: issueEditor.handlers.close,
      onSaveWorkflow: issueEditor.handlers.save,
      onAddWorkflowStatus: issueEditor.handlers.add,
      onDeleteWorkflowStatus: issueEditor.handlers.remove,
      onRetryWorkflow: issueEditor.handlers.retry,
      onProjectWorkflowStatusChange: projectEditor.handlers.editStatus,
      onProjectWorkflowNameChange: projectEditor.handlers.changeName,
      onProjectWorkflowDescriptionChange: projectEditor.handlers.changeDescription,
      onProjectWorkflowCategoryChange: projectEditor.handlers.changeCategory,
      onOpenProjectWorkflowStatus: projectEditor.handlers.open,
      onCloseProjectWorkflowStatus: projectEditor.handlers.close,
      onSaveProjectWorkflow: projectEditor.handlers.save,
      onAddProjectWorkflowStatus: projectEditor.handlers.add,
      onDeleteProjectWorkflowStatus: projectEditor.handlers.remove,
      onRetryProjectWorkflow: projectEditor.handlers.retry,
    },
  };
}
