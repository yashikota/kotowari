import type { useTranslation } from 'react-i18next';
import type { IssueStatus, ProjectStatus } from '../types.ts';
import { IssueStatusIcon } from './issue-ui.tsx';
import type { useConfigPagePresenter } from '../presenters/ConfigPages.tsx';
import { WorkflowSettingsEditor } from './WorkflowSettingsEditor.tsx';

type Props = {
  model: ReturnType<typeof useConfigPagePresenter>;
  t: ReturnType<typeof useTranslation>['t'];
};

export function ConfigWorkflowSettingsSection({ model, t }: Props) {
  const labels = {
    name: (status: string) => t('config.workflowStatusName', { status }),
    description: (status: string) => t('config.workflowStatusDescription', { status }),
    remove: (status: string) => t('config.removeWorkflowStatus', { status }),
    newName: t('config.newWorkflowStatus'),
    newDescription: t('config.newWorkflowStatusDescription'),
    category: t('config.workflowCategory'),
    add: t('config.addWorkflowStatus'),
    save: t('config.saveWorkflow'),
    create: t('config.createProjectStatus'),
    cancel: t('config.cancelProjectStatus'),
    retry: t('config.retryWorkflowSave'),
  };
  return (
    <>
      <WorkflowSettingsEditor<IssueStatus>
        id="settings-issue-statuses"
        title={t('config.issueStatuses')}
        description={t('config.issueStatusesDescription')}
        data={model.issueWorkflowEditor}
        handlers={{
          editStatus: model.handlers.onWorkflowStatusChange,
          changeName: model.handlers.onWorkflowNameChange,
          changeDescription: model.handlers.onWorkflowDescriptionChange,
          changeCategory: model.handlers.onWorkflowCategoryChange,
          open: model.handlers.onOpenWorkflowStatus,
          close: model.handlers.onCloseWorkflowStatus,
          save: model.handlers.onSaveWorkflow,
          add: model.handlers.onAddWorkflowStatus,
          remove: model.handlers.onDeleteWorkflowStatus,
          retry: model.handlers.onRetryWorkflow,
        }}
        protectedIds={['backlog', 'todo', 'in_progress', 'done', 'canceled', 'duplicate']}
        creationPlacement="footer"
        groups={[
          ...(['backlog', 'todo', 'in_progress', 'done', 'canceled'] as IssueStatus[]).map(
            (category) => ({
              id: category,
              category,
              label: t(`issueStatus.${category}`),
              icon: <IssueStatusIcon status={category} />,
              excludedStatusId: 'duplicate',
            }),
          ),
          {
            id: 'duplicate',
            category: 'canceled',
            statusId: 'duplicate',
            label: t('issueStatus.duplicate'),
            icon: <IssueStatusIcon status="canceled" />,
          },
        ]}
        labels={{
          ...labels,
          saving: t('config.workflowSaving'),
          saved: t('config.workflowSaved'),
          failed: t('config.workflowSaveFailed'),
        }}
      />
      <WorkflowSettingsEditor<ProjectStatus>
        id="settings-project-statuses"
        title={t('config.projectStatuses')}
        description={t('config.projectStatusesDescription')}
        data={model.projectWorkflowEditor}
        handlers={{
          editStatus: model.handlers.onProjectWorkflowStatusChange,
          changeName: model.handlers.onProjectWorkflowNameChange,
          changeDescription: model.handlers.onProjectWorkflowDescriptionChange,
          changeCategory: model.handlers.onProjectWorkflowCategoryChange,
          open: model.handlers.onOpenProjectWorkflowStatus,
          close: model.handlers.onCloseProjectWorkflowStatus,
          save: model.handlers.onSaveProjectWorkflow,
          add: model.handlers.onAddProjectWorkflowStatus,
          remove: model.handlers.onDeleteProjectWorkflowStatus,
          retry: model.handlers.onRetryProjectWorkflow,
        }}
        protectedIds={['backlog', 'planned', 'started', 'completed', 'canceled']}
        creationPlacement="category"
        groups={(['backlog', 'planned', 'started', 'completed', 'canceled'] as ProjectStatus[]).map(
          (category) => ({
            id: category,
            category,
            label: t(`projectStatus.${category}`),
          }),
        )}
        labels={{
          ...labels,
          saving: t('config.projectWorkflowSaving'),
          saved: t('config.projectWorkflowSaved'),
          failed: t('config.projectWorkflowSaveFailed'),
        }}
      />
    </>
  );
}
