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

import { PageHeader, Pane, Section, SplitLayout } from '../mantine-ui.tsx';

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
        reminderError,
        copied,
        handlers,
      } = model;
      return (
        <Box h="100%" style={{ overflow: 'auto' }}>
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
                      reminderAt={project.reminderAt}
                      opened={reminderMenuOpen}
                      onMenuChange={handlers.onReminderMenuChange}
                      onSetReminder={handlers.onSetReminder}
                    />
                    {copied ? (
                      <Text size="xs" c="dimmed" role="status">
                        {t('ui.copied')}
                      </Text>
                    ) : null}
                    {reminderError ? (
                      <Text size="xs" c="red" role="alert">
                        {reminderError}
                      </Text>
                    ) : null}
                    <Menu withinPortal position="bottom-end">
                      <Menu.Target>
                        <ActionIcon
                          type="button"
                          variant="subtle"
                          color="gray"
                          aria-label={t('issueActions.moreActions')}
                          title={t('issueActions.moreActions')}
                        >
                          <IconDotsVertical size={16} stroke={1.8} aria-hidden="true" />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item onClick={handlers.onCopyProjectId}>
                          {t('issueActions.copyId')}
                        </Menu.Item>
                        <Menu.Item onClick={handlers.onCopyProjectURL}>
                          {t('issueActions.copyUrl')}
                        </Menu.Item>
                        <Menu.Item onClick={handlers.onCopyProjectTitle}>
                          {t('issueActions.copyTitle')}
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Item onClick={handlers.onOpenProjectTemplate}>
                          {t('projectTemplates.saveAsTemplate')}
                        </Menu.Item>
                        <Menu.Item onClick={handlers.onToggleProjectArchived}>
                          {t(project.archivedAt ? 'projectList.restore' : 'projectList.archive')}
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Item color="red" onClick={handlers.onDeleteProject}>
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
                    <Button type="button" variant="default" onClick={handlers.onOpenProjectUpdate}>
                      {t('projectUpdates.postButton')}
                    </Button>
                  </Group>
                }
              />
              <Stack gap="md" maw={960} mx="auto" w="100%" py="md">
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
                <Section title={t('filters.projectLabels')} ariaLabel={t('filters.projectLabels')}>
                  <MultiSelect
                    ref={labelsRef}
                    aria-label={t('filters.projectLabels')}
                    value={project.labels ?? []}
                    onChange={handlers.onProjectLabelsChange}
                    data={data.labels.map((label) => ({ value: label.name, label: label.name }))}
                    renderOption={({ option }) => {
                      const color = data.labels.find((label) => label.name === option.value)?.color;
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
