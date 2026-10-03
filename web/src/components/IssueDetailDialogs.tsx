import { DateEditorDialog } from './DateEditorDialog.tsx';
import { ReminderDialog } from './ReminderDialog.tsx';
import {
  Button,
  Group,
  Modal,
  NativeSelect,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { priorityLabel } from '../i18n/labels.ts';
import { projectWorkflowStatusLabel } from '../project-workflow.tsx';
import type { useIssueDetailPresenter } from '../presenters/IssueDetail.tsx';

type IssueDetailModel = Extract<ReturnType<typeof useIssueDetailPresenter>, { _view: 2 }>;
type IssueDetailDialogHandlers = Pick<
  IssueDetailModel['handlers'],
  | 'External_link_onSubmit27'
  | 'External_link_title_onChange25'
  | 'External_link_URL_onChange24'
  | 'onClearDueDate'
  | 'onCloseConvertToProject'
  | 'onCloseConvertToTemplate'
  | 'onCloseCreateRelated'
  | 'onCloseCustomReminder'
  | 'onCloseDueDate'
  | 'onCloseExternalLink'
  | 'onCloseMarkAs'
  | 'onCreateIssueTemplate'
  | 'onCreateProjectFromIssue'
  | 'onCreateRelatedSubmit'
  | 'onCustomReminderChange'
  | 'onCustomReminderSave'
  | 'onRetryReminder'
  | 'onDueDateChange'
  | 'onRelatedIssueTitleChange'
  | 'onSaveDueDate'
  | 'onRetryDueDate'
  | 'onSelectMarkAs'
  | 'onTemplateNameChange'
  | 'Project_conversion_description_onChange'
  | 'Project_conversion_name_onChange'
  | 'Project_conversion_priority_onChange'
  | 'Project_conversion_start_onChange'
  | 'Project_conversion_status_onChange'
  | 'Project_conversion_target_onChange'
>;
type IssueDetailDialogModel = Pick<
  IssueDetailModel,
  | 'reminderEditor'
  | 'relatedIssueKind'
  | 'relatedIssueTitle'
  | 'markAsKind'
  | 'markAsIssueOptions'
  | 'projectConversionOpen'
  | 'projectConversionName'
  | 'projectConversionDescription'
  | 'projectConversionStatus'
  | 'projectConversionPriority'
  | 'projectConversionStartDate'
  | 'projectConversionTargetDate'
  | 'projectWorkflowStatuses'
  | 'templateOpen'
  | 'templateName'
  | 'externalLinkOpen'
  | 'externalLinkURL'
  | 'externalLinkTitle'
  | 'externalLinkKind'
  | 'dueDateOpen'
  | 'dueDateValue'
  | 'dueDateSaving'
  | 'dueDateError'
  | 'dueDateClearing'
> & {
  issue: Pick<IssueDetailModel['issue'], 'dueDate' | 'identifier' | 'title'>;
  handlers: IssueDetailDialogHandlers;
};

export function IssueDetailDialogs({ model }: { model: IssueDetailDialogModel }) {
  const { t } = useTranslation();
  const {
    reminderEditor,
    relatedIssueKind,
    relatedIssueTitle,
    markAsKind,
    markAsIssueOptions,
    projectConversionOpen,
    projectConversionName,
    projectConversionDescription,
    projectConversionStatus,
    projectConversionPriority,
    projectConversionStartDate,
    projectConversionTargetDate,
    projectWorkflowStatuses,
    templateOpen,
    templateName,
    externalLinkOpen,
    externalLinkURL,
    externalLinkTitle,
    externalLinkKind,
    dueDateOpen,
    dueDateValue,
    issue,
    handlers,
  } = model;

  return (
    <>
      <ReminderDialog
        data={reminderEditor}
        onClose={handlers.onCloseCustomReminder}
        onChange={handlers.onCustomReminderChange}
        onSave={handlers.onCustomReminderSave}
        onRetry={handlers.onRetryReminder}
      />
      <Modal
        opened={relatedIssueKind !== null}
        onClose={handlers.onCloseCreateRelated}
        title={t('issueActions.createRelatedTitle')}
        centered
      >
        <form onSubmit={handlers.onCreateRelatedSubmit}>
          <Stack>
            <TextInput
              autoFocus
              required
              label={t('modal.issueTitle')}
              placeholder={t('issueActions.relatedTitlePlaceholder')}
              value={relatedIssueTitle}
              onChange={handlers.onRelatedIssueTitleChange}
            />
            <Group justify="flex-end">
              <Button type="button" variant="default" onClick={handlers.onCloseCreateRelated}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={!relatedIssueTitle.trim()}>
                {t('modal.createIssue')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
      <Modal
        opened={markAsKind !== null}
        onClose={handlers.onCloseMarkAs}
        title={t('issueActions.markAsTitle', {
          kind: markAsKind ? t(`issueActions.markAs.${markAsKind}`) : '',
        })}
        centered
      >
        <Stack>
          <Select
            label={t('issueRelations.issueLabel')}
            placeholder={t('issueRelations.chooseIssue')}
            searchable
            nothingFoundMessage={t('issueActions.markAsNothingFound')}
            data={markAsIssueOptions.map((candidate) => ({
              value: candidate.identifier,
              label: `${candidate.identifier} ${candidate.title}`,
            }))}
            onChange={handlers.onSelectMarkAs}
          />
          <Group justify="flex-end">
            <Button type="button" variant="default" onClick={handlers.onCloseMarkAs}>
              {t('common.cancel')}
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Modal
        opened={projectConversionOpen}
        onClose={handlers.onCloseConvertToProject}
        title={t('issueActions.project')}
        centered
      >
        <form onSubmit={handlers.onCreateProjectFromIssue}>
          <Stack>
            <TextInput
              autoFocus
              required
              maxLength={120}
              label={t('modal.projectName')}
              value={projectConversionName}
              onChange={handlers.Project_conversion_name_onChange}
            />
            <Textarea
              label={t('modal.projectDescription')}
              value={projectConversionDescription}
              onChange={handlers.Project_conversion_description_onChange}
              minRows={3}
              autosize
            />
            <Group grow>
              <NativeSelect
                label={t('field.status')}
                value={projectConversionStatus}
                onChange={handlers.Project_conversion_status_onChange}
                data={projectWorkflowStatuses.map((status) => ({
                  value: status.id,
                  label: projectWorkflowStatusLabel(status.id, projectWorkflowStatuses, t),
                }))}
              />
              <NativeSelect
                label={t('field.priority')}
                value={String(projectConversionPriority)}
                onChange={handlers.Project_conversion_priority_onChange}
                data={[0, 1, 2, 3, 4].map((priority) => ({
                  value: String(priority),
                  label: priorityLabel(priority),
                }))}
              />
            </Group>
            <Group grow>
              <TextInput
                type="date"
                label={t('modal.projectStartDate')}
                value={projectConversionStartDate}
                onChange={handlers.Project_conversion_start_onChange}
              />
              <TextInput
                type="date"
                label={t('modal.projectTargetDate')}
                value={projectConversionTargetDate}
                onChange={handlers.Project_conversion_target_onChange}
              />
            </Group>
            <Text size="sm" c="dimmed">
              {t('modal.projectIssuePreserved', { issue: issue.identifier })}
            </Text>
            <Group justify="flex-end">
              <Button type="button" variant="default" onClick={handlers.onCloseConvertToProject}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={!projectConversionName.trim()}>
                {t('issueActions.convertToProject')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
      <Modal
        opened={templateOpen}
        onClose={handlers.onCloseConvertToTemplate}
        title={t('issueActions.template')}
        centered
      >
        <form onSubmit={handlers.onCreateIssueTemplate}>
          <Stack>
            <TextInput
              autoFocus
              required
              maxLength={100}
              label={t('modal.templateName')}
              value={templateName}
              onChange={handlers.onTemplateNameChange}
            />
            <Text size="sm" c="dimmed">
              {issue.identifier} · {issue.title}
            </Text>
            <Group justify="flex-end">
              <Button type="button" variant="default" onClick={handlers.onCloseConvertToTemplate}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={!templateName.trim()}>
                {t('modal.create')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
      <Modal
        opened={externalLinkOpen}
        onClose={handlers.onCloseExternalLink}
        title={t('issueActions.addResourceTitle', {
          kind: t(`issueLinks.${externalLinkKind}`),
        })}
        centered
      >
        <form onSubmit={handlers.External_link_onSubmit27}>
          <Stack>
            <TextInput
              type="url"
              required
              autoFocus
              label={t('issueLinks.url')}
              placeholder={t('issueLinks.urlPlaceholder')}
              value={externalLinkURL}
              onChange={handlers.External_link_URL_onChange24}
            />
            <TextInput
              label={t('issueLinks.title')}
              placeholder={t('issueLinks.titlePlaceholder')}
              value={externalLinkTitle}
              onChange={handlers.External_link_title_onChange25}
            />
            <Group justify="flex-end">
              <Button type="button" variant="default" onClick={handlers.onCloseExternalLink}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={!externalLinkURL.trim()}>
                {t('issueActions.addResourceButton', {
                  kind: t(`issueLinks.${externalLinkKind}`),
                })}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
      <DateEditorDialog
        inputType="date"
        data={{
          opened: dueDateOpen,
          value: dueDateValue,
          saving: model.dueDateSaving,
          error: model.dueDateError,
          clearing: model.dueDateClearing,
          validation: '',
          validationAttempt: 0,
        }}
        canClear={Boolean(issue.dueDate)}
        onClear={handlers.onClearDueDate}
        onClose={handlers.onCloseDueDate}
        onChange={handlers.onDueDateChange}
        onSave={handlers.onSaveDueDate}
        onRetry={handlers.onRetryDueDate}
        labels={{
          title: t('issueActions.dueDate.title'),
          clearTitle: t('issueActions.dueDate.clear'),
          input: t('issueActions.dueDate.label'),
          hint: t('issueActions.dueDate.hint'),
          saving: t('issueActions.dueDate.saving'),
          clearing: t('issueActions.dueDate.clearing'),
          failed: t('issueActions.dueDate.failed'),
          clearFailed: t('issueActions.dueDate.clearFailed'),
          retry: t('issueActions.dueDate.retry'),
          clearRetry: t('issueActions.dueDate.retryClear'),
          clearHint: t('issueActions.dueDate.clearHint'),
          clearAction: t('issueActions.dueDate.clear'),
        }}
      />
    </>
  );
}
