import { Link } from '@tanstack/react-router';
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Modal,
  MultiSelect,
  NativeSelect,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { IconStar } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { IssueList } from '../components/IssueList.tsx';

import { ProjectActivityFeed } from '../components/ProjectActivityFeed.tsx';
import { HealthUpdateFeed } from '../components/HealthUpdateFeed.tsx';
import { HealthUpdateComposer } from '../components/HealthUpdateComposer.tsx';
import { ProjectIconPicker } from '../components/ProjectIcon.tsx';
import { ProjectMilestonesSection } from '../components/ProjectMilestonesSection.tsx';
import { ProjectDependenciesSection } from '../components/ProjectDependenciesSection.tsx';

import { projectWorkflowStatusLabel } from '../project-workflow.tsx';

import { priorityLabel } from '../i18n/labels.ts';

import { LabelChip, MetaBadge, PageHeader, Pane, Section, SplitLayout } from '../mantine-ui.tsx';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useAutofocusTarget, useFocusWhen } from '../focus.ts';
import { useProjectDetailPagePresenter } from '../presenters/ProjectDetail.tsx';

export function ProjectDetailPageView({
  model,
  descriptionRef,
}: {
  model: ReturnType<typeof useProjectDetailPagePresenter>;
  descriptionRef: ReturnType<typeof useFocusWhen<HTMLTextAreaElement>>;
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
        handlers,
      } = model;
      return (
        <Box h="100%" style={{ overflow: 'auto' }}>
          <SplitLayout single>
            <Pane single>
              <PageHeader
                title={
                  <Group gap="xs" wrap="nowrap">
                    <ProjectIconPicker
                      icon={project.icon}
                      color={project.iconColor}
                      onChange={handlers.onProjectIconChange}
                      onColorChange={handlers.onProjectIconColorChange}
                    />
                    <Text component="span" size="sm" fw={550} truncate>
                      {project.name}
                    </Text>
                  </Group>
                }
                actions={
                  <Group gap="xs" wrap="wrap">
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
                    <NativeSelect
                      aria-label={t('ui.projectStatus')}
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
                      value={String(project.priority)}
                      onChange={handlers.onPriorityChange}
                      data={[0, 1, 2, 3, 4].map((priority) => ({
                        value: String(priority),
                        label: priorityLabel(priority),
                      }))}
                    />
                    <NativeSelect
                      aria-label={t('projectList.property.health')}
                      value={project.health || 'none'}
                      onChange={handlers.onProjectHealthChange}
                      data={['none', 'on_track', 'at_risk', 'off_track'].map((health) => ({
                        value: health,
                        label: t(`projectHealth.status.${health}`),
                      }))}
                    />
                    <Button type="button" variant="subtle" onClick={handlers.onCreateIssue}>
                      {t('ui.newIssue')}
                    </Button>
                    <Button type="button" variant="default" onClick={handlers.onOpenProjectUpdate}>
                      {t('projectUpdates.postButton')}
                    </Button>
                    <Button type="button" variant="subtle" onClick={handlers.onOpenProjectTemplate}>
                      {t('projectTemplates.saveAsTemplate')}
                    </Button>
                    <Button
                      type="button"
                      variant="subtle"
                      onClick={handlers.onToggleProjectArchived}
                    >
                      {t(project.archivedAt ? 'projectList.restore' : 'projectList.archive')}
                    </Button>
                    <Button
                      type="button"
                      variant="subtle"
                      color="red"
                      onClick={handlers.onDeleteProject}
                    >
                      {t('ui.delete')}
                    </Button>
                  </Group>
                }
              />
              <Stack gap="md">
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
                    type="date"
                    aria-label={t('ui.startDate')}
                    label={t('ui.start')}
                    value={project.startDate?.slice(0, 10) ?? ''}
                    onChange={handlers.onStartDateChange}
                  />
                  <TextInput
                    type="date"
                    aria-label={t('ui.targetDate')}
                    label={t('ui.target')}
                    value={project.targetDate?.slice(0, 10) ?? ''}
                    onChange={handlers.onTargetDateChange}
                  />
                </Group>
                <Section title={t('initiatives.projectProperty')}>
                  <MultiSelect
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
                <Section title={t('filters.projectLabels')}>
                  {data.labels.length > 0 ? (
                    <Group gap={4}>
                      {data.labels.map((label) => (
                        <LabelChip
                          key={label.id}
                          name={label.name}
                          color={label.color}
                          selected={(project.labels ?? []).includes(label.name)}
                          onClick={() => handlers.onProjectLabelToggle(label.name)}
                        />
                      ))}
                    </Group>
                  ) : (
                    <Text size="sm" c="dimmed">
                      {t('filters.noProjectLabels')}
                    </Text>
                  )}
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
                <Stack gap="md" aria-label={t('ui.projectDocuments')}>
                  <Section
                    title={t('nav.adrs')}
                    action={
                      <Button
                        type="button"
                        variant="subtle"
                        size="xs"
                        onClick={handlers.onCreateADR}
                      >
                        {t('ui.newAdr')}
                      </Button>
                    }
                  >
                    <Stack
                      gap="xs"
                      component="ul"
                      style={{ listStyle: 'none', margin: 0, padding: 0 }}
                    >
                      {data.adrs
                        .filter(
                          (a) =>
                            a.projectSlug === slug ||
                            data.issues.some((i) => a.issueNumbers.includes(i.number)),
                        )
                        .map((a) => (
                          <Group component="li" key={a.identifier} gap="xs" wrap="wrap">
                            <Link to="/adrs/$identifier" params={{ identifier: a.identifier }}>
                              {a.identifier} {a.title}
                            </Link>
                            <MetaBadge>{a.status}</MetaBadge>
                          </Group>
                        ))}
                    </Stack>
                  </Section>
                  <Section title={t('nav.pages')}>
                    <Stack
                      gap="xs"
                      component="ul"
                      style={{ listStyle: 'none', margin: 0, padding: 0 }}
                    >
                      {data.pages
                        .filter((p) => p.projectSlug === slug)
                        .map((p) => (
                          <Text component="li" key={p.slug} size="sm">
                            <Link to="/pages/$slug" params={{ slug: p.slug }}>
                              {p.title}
                            </Link>
                          </Text>
                        ))}
                    </Stack>
                  </Section>
                </Stack>
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
                <Section title={t('projectActivity.heading')}>
                  <ProjectActivityFeed
                    activities={projectActivityItems}
                    emptyLabel={t('projectActivity.empty')}
                  />
                </Section>
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
  return (
    <ProjectDetailPageView
      model={{ ...model, handlers } as typeof model}
      descriptionRef={descriptionRef}
    />
  );
}
