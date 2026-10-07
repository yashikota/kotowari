import {
  ActionIcon,
  Box,
  Button,
  Group,
  Menu,
  Modal,
  MultiSelect,
  NativeSelect,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { IconDotsVertical, IconStar } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { IssueList } from '../components/IssueList.tsx';
import { useMenuActionFocus } from '../design-system/useMenuActionFocus.ts';
import { SaveFeedback } from '../design-system/SaveFeedback.tsx';
import {
  UnsavedChangesDialog,
  useUnsavedNavigation,
} from '../design-system/UnsavedChangesDialog.tsx';
import { ConfirmActionDialog } from '../design-system/ConfirmActionDialog.tsx';
import { ClipboardFeedback, useClipboardFocus } from '../design-system/ClipboardFeedback.tsx';

import { ProjectActivityFeed } from '../components/ProjectActivityFeed.tsx';
import { HealthUpdateFeed } from '../components/HealthUpdateFeed.tsx';
import { HealthUpdateComposer } from '../components/HealthUpdateComposer.tsx';
import { ProjectIconPicker } from '../components/ProjectIcon.tsx';
import { ProjectMilestonesSection } from '../components/ProjectMilestonesSection.tsx';
import { ProjectDependenciesSection } from '../components/ProjectDependenciesSection.tsx';
import { ProjectDocumentsSection } from '../components/ProjectDocumentsSection.tsx';
import { EntityReminderMenu } from '../components/EntityReminderMenu.tsx';

import { projectWorkflowStatusLabel } from '../project-workflow.tsx';

import { priorityLabel } from '../i18n/labels.ts';

import { MetaBadge, PageHeader, Pane, Section, SplitLayout } from '../mantine-ui.tsx';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useAutofocusTarget, useFocusWhen } from '../focus.ts';
import { useProjectDetailPagePresenter } from '../presenters/ProjectDetail.tsx';

export function ProjectDetailPageView({
  model,
  descriptionRef,
  statusRef,
  leadRef,
  initiativesRef,
  labelsRef,
  startDateRef,
  targetDateRef,
  updatesRef,
}: {
  model: ReturnType<typeof useProjectDetailPagePresenter>;
  descriptionRef: ReturnType<typeof useFocusWhen<HTMLTextAreaElement>>;
  statusRef: ReturnType<typeof useFocusWhen<HTMLSelectElement>>;
  leadRef: ReturnType<typeof useFocusWhen<HTMLSelectElement>>;
  initiativesRef: ReturnType<typeof useFocusWhen<HTMLInputElement>>;
  labelsRef: ReturnType<typeof useFocusWhen<HTMLInputElement>>;
  startDateRef: ReturnType<typeof useFocusWhen<HTMLInputElement>>;
  targetDateRef: ReturnType<typeof useFocusWhen<HTMLInputElement>>;
  updatesRef: ReturnType<typeof useFocusWhen<HTMLDivElement>>;
}) {
  const { t } = useTranslation();
  const { runCopy, onMenuExited } = useClipboardFocus({
    clipboard: model.clipboard,
    scope: model.slug,
    feedbackSelector: '[data-project-copy-feedback]',
    menuSelector: '[data-project-copy-menu]',
    fallback: () => document.querySelector<HTMLButtonElement>('[data-project-actions]'),
  });
  const archiveFocus = useMenuActionFocus({
    pending: model.archivePending,
    scope: model.slug,
    menuSelector: '[data-project-copy-menu]',
    feedbackSelector: '[data-project-archive-feedback]',
    triggerSelector: '[data-project-actions]',
  });
  const navigation = useUnsavedNavigation({
    dirty: model.hasUnsavedText && !model.deletion.confirmed,
    pending: model.projectSaving,
    error: model.projectSaveError,
    save: model.handlers.onSaveUnsavedText,
    scope: model.slug,
  });
  switch (model._view) {
    case 0: {
      const {
        slug,
        data,
        selected,
        project,
        projectUpdates,
        projectActivityItems,
        projectUpdateOpen,
        projectUpdateHealth,
        projectUpdateBody,
        projectTemplateOpen,
        projectTemplateName,
        projectTemplateError,
        milestoneName,
        milestoneDescription,
        milestoneTargetDate,
        availableDependencyProjects,
        dependencyProjectSlug,
        dependencyKind,
        reminderMenuOpen,
        clipboard,
        handlers,
      } = model;
      return (
        <Box h="100%" style={{ overflow: 'auto' }}>
          <Box inert={model.deletion.pending || model.deletion.confirmed ? true : undefined}>
            <SplitLayout single>
              <Pane single>
                <PageHeader
                  title={
                    <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                      <ProjectIconPicker
                        icon={project.icon}
                        color={project.iconColor}
                        onChange={handlers.onProjectIconChange}
                        onColorChange={handlers.onProjectIconColorChange}
                      />
                      {project.archivedAt ? (
                        <MetaBadge>{t('issueActions.archivedBadge')}</MetaBadge>
                      ) : null}
                      <Text
                        component="span"
                        size="md"
                        fw={600}
                        style={{ overflowWrap: 'anywhere', minWidth: 0 }}
                      >
                        {project.name}
                      </Text>
                    </Group>
                  }
                  actions={
                    <Group gap="xs" wrap="wrap">
                      <EntityReminderMenu
                        editor={model.reminderEditor}
                        onOpenCustom={handlers.onOpenCustomReminder}
                        onCloseCustom={handlers.onCloseCustomReminder}
                        onCustomChange={handlers.onCustomReminderChange}
                        onCustomSave={handlers.onCustomReminderSave}
                        onRetry={handlers.onRetryReminder}
                        reminderAt={project.reminderAt}
                        opened={reminderMenuOpen}
                        onMenuChange={handlers.onReminderMenuChange}
                        onSetReminder={handlers.onSetReminder}
                      />
                      <Menu
                        withinPortal
                        position="bottom-end"
                        opened={model.projectActionsOpen}
                        onChange={handlers.onProjectActionsChange}
                        onExitTransitionEnd={() => {
                          onMenuExited();
                          archiveFocus.onMenuExited();
                        }}
                      >
                        <Menu.Target>
                          <ActionIcon
                            type="button"
                            data-project-actions
                            onKeyDown={(event) => {
                              if (event.key === 'Escape' && model.projectActionsOpen) {
                                event.preventDefault();
                                event.stopPropagation();
                                handlers.onProjectActionsChange(false);
                              }
                            }}
                            variant="subtle"
                            color="gray"
                            aria-label={t('issueActions.moreActions')}
                            title={t('issueActions.moreActions')}
                          >
                            <IconDotsVertical size={16} stroke={1.8} aria-hidden="true" />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown data-project-copy-menu>
                          <Menu.Item
                            disabled={clipboard.pending}
                            onClick={() => runCopy(handlers.onCopyProjectId)}
                          >
                            {t('issueActions.copyId')}
                          </Menu.Item>
                          <Menu.Item
                            disabled={clipboard.pending}
                            onClick={() => runCopy(handlers.onCopyProjectURL)}
                          >
                            {t('issueActions.copyUrl')}
                          </Menu.Item>
                          <Menu.Item
                            disabled={clipboard.pending}
                            onClick={() => runCopy(handlers.onCopyProjectTitle)}
                          >
                            {t('issueActions.copyTitle')}
                          </Menu.Item>
                          <Menu.Divider />
                          <Menu.Item onClick={handlers.onOpenProjectTemplate}>
                            {t('projectTemplates.saveAsTemplate')}
                          </Menu.Item>
                          <Menu.Item
                            disabled={
                              model.archivePending ||
                              model.projectSaving ||
                              model.reminderEditor.saving ||
                              model.deletion.pending ||
                              model.deletion.confirmed
                            }
                            onClick={() => archiveFocus.run(handlers.onToggleProjectArchived)}
                          >
                            {t(project.archivedAt ? 'projectList.restore' : 'projectList.archive')}
                          </Menu.Item>
                          <Menu.Divider />
                          <Menu.Item
                            color="red"
                            disabled={
                              model.projectSaving ||
                              model.archivePending ||
                              model.reminderEditor.saving ||
                              model.deletion.pending ||
                              model.deletion.confirmed
                            }
                            onClick={handlers.onDeleteProject}
                          >
                            {t('ui.delete')}
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                      <ActionIcon
                        type="button"
                        variant="subtle"
                        color={project.isFavorite ? 'yellow' : 'gray'}
                        aria-label={t(
                          project.isFavorite ? 'projectFavorite.remove' : 'projectFavorite.add',
                        )}
                        aria-pressed={!!project.isFavorite}
                        title={t(
                          project.isFavorite ? 'projectFavorite.remove' : 'projectFavorite.add',
                        )}
                        onClick={handlers.onToggleFavorite}
                      >
                        <IconStar
                          size={15}
                          stroke={1.7}
                          fill={project.isFavorite ? 'currentColor' : 'none'}
                          aria-hidden="true"
                        />
                      </ActionIcon>
                      <Button type="button" onClick={handlers.onCreateIssue}>
                        {t('ui.newIssue')}
                      </Button>
                      <Button
                        type="button"
                        variant="default"
                        onClick={handlers.onOpenProjectUpdate}
                      >
                        {t('projectUpdates.postButton')}
                      </Button>
                    </Group>
                  }
                />
                <Stack gap="md" maw={960} mx="auto" w="100%" py="md">
                  {clipboard.pending || clipboard.error || clipboard.copied ? (
                    <Box data-project-copy-feedback>
                      <ClipboardFeedback
                        clipboard={clipboard}
                        onRetry={() => runCopy(clipboard.retry)}
                      />
                    </Box>
                  ) : null}
                  <Box data-project-archive-feedback>
                    <SaveFeedback
                      saving={model.archivePending}
                      saved={model.archiveSaved}
                      error={model.archiveError}
                      savingLabel={t('projectArchive.saving')}
                      savedLabel={t('projectArchive.saved')}
                      failureLabel={t('projectArchive.failed')}
                      retryLabel={t('projectArchive.retry')}
                      onRetry={() => archiveFocus.run(handlers.onRetryProjectArchive)}
                    />
                  </Box>
                  <SaveFeedback
                    saving={model.projectSaving}
                    saved={model.projectSaved}
                    error={model.projectSaveError}
                    savingLabel={t('projectSave.saving')}
                    savedLabel={t('projectSave.saved')}
                    failureLabel={t('projectSave.failed')}
                    retryLabel={t('projectSave.retry')}
                    onRetry={handlers.onRetryProjectSave}
                  />
                  <TextInput
                    aria-label={t('ui.projectSummary')}
                    label={t('ui.projectSummary')}
                    value={project.summary ?? ''}
                    onChange={handlers.onSummaryChange}
                    onBlur={handlers.onSummaryBlur}
                  />
                  <Textarea
                    ref={descriptionRef}
                    aria-label={t('ui.projectDescription')}
                    placeholder={t('ui.description')}
                    label={t('ui.projectDescription')}
                    autosize
                    minRows={2}
                    value={project.description}
                    onChange={handlers.onDescriptionChange}
                    onBlur={handlers.onDescriptionBlur}
                    styles={{
                      input: {
                        minHeight: 42,
                        padding: '8px 10px',
                        fontSize: 'var(--mantine-font-size-sm)',
                      },
                    }}
                  />
                  <Section
                    title={t('projectUpdates.heading')}
                    ariaLabel={t('projectUpdates.heading')}
                  >
                    <HealthUpdateFeed
                      updates={projectUpdates}
                      emptyLabel={t('projectUpdates.empty')}
                    />
                  </Section>
                  <Group gap="md" wrap="wrap" align="flex-end">
                    <NativeSelect
                      ref={statusRef}
                      aria-label={t('ui.projectStatus')}
                      label={t('ui.projectStatus')}
                      value={project.workflowStatus ?? project.status}
                      onChange={handlers.onStatusChange}
                      data={model.projectWorkflowStatuses.map((status) => ({
                        value: status.id,
                        label: projectWorkflowStatusLabel(
                          status.id,
                          model.projectWorkflowStatuses,
                          t,
                        ),
                      }))}
                    />
                    <NativeSelect
                      aria-label={t('field.priority')}
                      label={t('field.priority')}
                      value={String(project.priority)}
                      onChange={handlers.onPriorityChange}
                      data={[0, 1, 2, 3, 4].map((priority) => ({
                        value: String(priority),
                        label: priorityLabel(priority),
                      }))}
                    />
                    <NativeSelect
                      aria-label={t('projectList.property.health')}
                      label={t('projectList.property.health')}
                      value={project.health || 'none'}
                      onChange={handlers.onProjectHealthChange}
                      data={['none', 'on_track', 'at_risk', 'off_track'].map((health) => ({
                        value: health,
                        label: t(`projectHealth.status.${health}`),
                      }))}
                    />

                    <NativeSelect
                      ref={leadRef}
                      aria-label={t('projectList.property.lead')}
                      label={t('projectList.property.lead')}
                      value={project.lead ?? ''}
                      onChange={handlers.onProjectLeadChange}
                      data={[
                        { value: '', label: t('projectList.leadUnassigned') },
                        { value: 'self', label: t('projectList.leadYou') },
                      ]}
                    />
                    <TextInput
                      ref={startDateRef}
                      type="date"
                      aria-label={t('ui.startDate')}
                      label={t('ui.start')}
                      value={project.startDate?.slice(0, 10) ?? ''}
                      onChange={handlers.onStartDateChange}
                    />
                    <TextInput
                      ref={targetDateRef}
                      type="date"
                      aria-label={t('ui.targetDate')}
                      label={t('ui.target')}
                      value={project.targetDate?.slice(0, 10) ?? ''}
                      onChange={handlers.onTargetDateChange}
                    />
                  </Group>
                  <Section title={t('initiatives.projectProperty')}>
                    <MultiSelect
                      ref={initiativesRef}
                      aria-label={t('initiatives.projectProperty')}
                      value={project.initiativeSlugs ?? []}
                      onChange={handlers.onProjectInitiativesChange}
                      data={data.initiatives.map((initiative) => ({
                        value: initiative.slug,
                        label: initiative.name,
                      }))}
                      searchable
                      clearable
                      hidePickedOptions
                      comboboxProps={{ withinPortal: false }}
                    />
                  </Section>
                  <Section
                    title={t('filters.projectLabels')}
                    ariaLabel={t('filters.projectLabels')}
                  >
                    <MultiSelect
                      ref={labelsRef}
                      aria-label={t('filters.projectLabels')}
                      value={project.labels ?? []}
                      onChange={handlers.onProjectLabelsChange}
                      data={data.labels.map((label) => ({ value: label.name, label: label.name }))}
                      renderOption={({ option }) => {
                        const color = data.labels.find(
                          (label) => label.name === option.value,
                        )?.color;
                        return (
                          <Group gap="xs" wrap="nowrap">
                            <Box
                              w={8}
                              h={8}
                              aria-hidden
                              style={{ borderRadius: '50%', backgroundColor: color, flexShrink: 0 }}
                            />
                            <Text>{option.label}</Text>
                          </Group>
                        );
                      }}
                      nothingFoundMessage={
                        data.labels.length === 0 ? t('filters.noProjectLabels') : undefined
                      }
                      searchable
                      clearable
                      hidePickedOptions
                      comboboxProps={{ withinPortal: false }}
                    />
                  </Section>
                  <ProjectDependenciesSection
                    dependencies={project.dependencies ?? []}
                    projects={data.projects}
                    availableProjects={availableDependencyProjects}
                    selectedProjectSlug={dependencyProjectSlug}
                    kind={dependencyKind}
                    onProjectChange={handlers.onDependencyProjectChange}
                    onKindChange={handlers.onDependencyKindChange}
                    onAdd={handlers.onAddProjectDependency}
                    onRemove={handlers.onRemoveProjectDependency}
                  />
                  <ProjectMilestonesSection
                    milestones={project.milestones}
                    name={milestoneName}
                    description={milestoneDescription}
                    targetDate={milestoneTargetDate}
                    onCreate={handlers.onCreateMilestone}
                    onDraftNameChange={handlers.onMilestoneNameDraftChange}
                    onDraftDescriptionChange={handlers.onMilestoneDescriptionDraftChange}
                    onDraftTargetDateChange={handlers.onMilestoneTargetDateDraftChange}
                    onNameChange={handlers.onMilestoneNameChange}
                    onNameBlur={handlers.onMilestoneNameBlur}
                    onTargetDateChange={handlers.onMilestoneTargetDateChange}
                    onTargetDateBlur={handlers.onMilestoneTargetDateBlur}
                    onDescriptionBlur={handlers.onMilestoneDescriptionBlur}
                    onRemove={handlers.onRemoveMilestone}
                  />
                  <ProjectDocumentsSection
                    projectSlug={slug}
                    adrs={data.adrs}
                    pages={data.pages}
                    issues={data.issues}
                    onCreateADR={handlers.onCreateADR}
                    onCreatePage={handlers.onCreatePage}
                  />
                  <IssueList
                    issues={data.issues}
                    selectedId={selected}
                    onSelect={handlers.onIssueSelect}
                    groupBy="status"
                    hideProjectSlug
                    projects={data.projects}
                    cycles={data.cycles}
                    labels={data.labels}
                  />
                  <div
                    ref={updatesRef}
                    tabIndex={-1}
                    role="region"
                    aria-label={t('projectActivity.heading')}
                  >
                    <Section title={t('projectActivity.heading')}>
                      <ProjectActivityFeed
                        activities={projectActivityItems}
                        emptyLabel={t('projectActivity.empty')}
                      />
                    </Section>
                  </div>
                </Stack>
              </Pane>
            </SplitLayout>
          </Box>
          <UnsavedChangesDialog
            state={navigation}
            title={t('unsavedProject.title')}
            description={t('unsavedProject.description')}
            stayLabel={t('unsavedProject.stay')}
            discardLabel={t('unsavedProject.discard')}
            saveLabel={t('unsavedProject.save')}
            savingLabel={t('projectSave.saving')}
            failureLabel={t('projectSave.failed')}
          />
          <ConfirmActionDialog
            opened={model.deletion.opened}
            title={t(
              model.deletion.confirmed ? 'projectDeletion.deleted' : 'projectDeletion.title',
            )}
            description={t(
              model.deletion.confirmed
                ? 'projectDeletion.deletedDescription'
                : 'ui.deleteProjectConfirmation',
              { name: project.name },
            )}
            pending={model.deletion.pending}
            confirmed={model.deletion.confirmed}
            error={model.deletion.error}
            confirmLabel={t(model.deletion.confirmed ? 'projectDeletion.openList' : 'ui.delete')}
            cancelLabel={t('common.cancel')}
            savingLabel={t(
              model.deletion.confirmed ? 'projectDeletion.opening' : 'projectDeletion.deleting',
            )}
            savedLabel={t('projectDeletion.deleted')}
            failureLabel={t(
              model.deletion.confirmed ? 'projectDeletion.openFailed' : 'projectDeletion.failed',
            )}
            retryLabel={t(
              model.deletion.confirmed ? 'projectDeletion.openList' : 'projectDeletion.retry',
            )}
            onClose={model.deletion.close}
            onConfirm={model.deletion.confirm}
            returnFocusTo={() =>
              document.querySelector<HTMLButtonElement>('[data-project-actions]')
            }
          />
          <HealthUpdateComposer
            opened={projectUpdateOpen}
            onClose={handlers.onCloseProjectUpdate}
            title={t('projectUpdates.modalTitle')}
            onSubmit={handlers.onSubmitProjectUpdate}
            healthLabel={t('projectUpdates.health')}
            health={projectUpdateHealth}
            healthOptions={(['on_track', 'at_risk', 'off_track'] as const).map((health) => ({
              value: health,
              label: t(`projectHealth.status.${health}`),
            }))}
            onHealthChange={handlers.onProjectUpdateHealthChange}
            bodyLabel={t('projectUpdates.body')}
            bodyPlaceholder={t('projectUpdates.bodyPlaceholder')}
            body={projectUpdateBody}
            onBodyChange={handlers.onProjectUpdateBodyChange}
            cancelLabel={t('common.cancel')}
            submitLabel={t('projectUpdates.postButton')}
          />
          <Modal
            opened={projectTemplateOpen}
            onClose={handlers.onCloseProjectTemplate}
            title={t('projectTemplates.saveTitle')}
            centered
          >
            <Box component="form" onSubmit={handlers.onSubmitProjectTemplate}>
              <Stack>
                <TextInput
                  required
                  maxLength={100}
                  label={t('projectTemplates.templateName')}
                  value={projectTemplateName}
                  onChange={handlers.onProjectTemplateNameChange}
                  data-autofocus
                />
                {projectTemplateError && (
                  <Text size="sm" c="red" role="alert">
                    {projectTemplateError}
                  </Text>
                )}
                <Group justify="flex-end">
                  <Button type="button" variant="default" onClick={handlers.onCloseProjectTemplate}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={!projectTemplateName.trim()}>
                    {t('projectTemplates.saveAsTemplate')}
                  </Button>
                </Group>
              </Stack>
            </Box>
          </Modal>
        </Box>
      );
    }
  }
}

export function ProjectDetailPage() {
  return (
    <PresenterScope name="ProjectDetailPage">
      <ProjectDetailPageBinding />
    </PresenterScope>
  );
}

function ProjectDetailPageBinding() {
  const model = useProjectDetailPagePresenter();
  const handlers = useActions(model.handlers);
  const autofocusDescription = useAutofocusTarget('description');
  const descriptionRef = useFocusWhen<HTMLTextAreaElement>(autofocusDescription, [model.slug]);
  const statusRef = useFocusWhen<HTMLSelectElement>(model.focusProjectStatus > 0, [
    model.focusProjectStatus,
  ]);
  const leadRef = useFocusWhen<HTMLSelectElement>(model.focusProjectLead > 0, [
    model.focusProjectLead,
  ]);
  const initiativesRef = useFocusWhen<HTMLInputElement>(model.focusProjectInitiatives > 0, [
    model.focusProjectInitiatives,
  ]);
  const labelsRef = useFocusWhen<HTMLInputElement>(model.focusProjectLabels > 0, [
    model.focusProjectLabels,
  ]);
  const startDateRef = useFocusWhen<HTMLInputElement>(model.focusProjectStartDate > 0, [
    model.focusProjectStartDate,
  ]);
  const targetDateRef = useFocusWhen<HTMLInputElement>(model.focusProjectTargetDate > 0, [
    model.focusProjectTargetDate,
  ]);
  const updatesRef = useFocusWhen<HTMLDivElement>(model.focusProjectUpdates > 0, [
    model.focusProjectUpdates,
  ]);
  return (
    <ProjectDetailPageView
      model={{ ...model, handlers } as typeof model}
      descriptionRef={descriptionRef}
      statusRef={statusRef}
      leadRef={leadRef}
      initiativesRef={initiativesRef}
      labelsRef={labelsRef}
      startDateRef={startDateRef}
      targetDateRef={targetDateRef}
      updatesRef={updatesRef}
    />
  );
}
