import { Link } from '@tanstack/react-router';
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
  Switch,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import {
  IconExternalLink,
  IconFileText,
  IconPlus,
  IconStack2,
  IconTrash,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';

import { IssueBoard, IssueList } from '../components/IssueList.tsx';
import { IssueFilters } from '../components/IssueFilters.tsx';
import { CycleListItem } from '../components/CycleListItem.tsx';
import { CycleProgressSummary } from '../components/CycleProgressSummary.tsx';
import { CycleProgressChart } from '../components/CycleProgressChart.tsx';
import { ProjectListItem } from '../components/ProjectListItem.tsx';
import { ProjectListControls } from '../components/ProjectListControls.tsx';
import { ProjectBoardView } from '../components/ProjectBoardView.tsx';
import { ProjectTimelineView } from '../components/ProjectTimelineView.tsx';
import { ProjectActivityFeed } from '../components/ProjectActivityFeed.tsx';
import { ProjectUpdateFeed } from '../components/ProjectUpdateFeed.tsx';
import { ProjectIconPicker } from '../components/ProjectIcon.tsx';
import { ViewIcon } from '../components/ViewIcon.tsx';
import { projectWorkflowStatusLabel } from '../project-workflow.tsx';
import type { ProjectSavedView } from '../project-views.ts';
import { CYCLE_STATUSES } from '../types.ts';
import { priorityLabel } from '../i18n/labels.ts';
import { formatCalendarDate } from '../time.ts';
import {
  EmptyState,
  LabelChip,
  MetaBadge,
  PageHeader,
  Pane,
  Section,
  SplitLayout,
} from '../mantine-ui.tsx';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useAutofocusTarget, useFocusWhen } from '../focus.ts';
import {
  useCycleDetailPagePresenter,
  useCyclesPagePresenter,
  useProjectDetailPagePresenter,
  useProjectsPagePresenter,
} from '../presenters/ProjectsCycles.tsx';

export function ProjectsPageView({
  model,
  projectNameRef,
}: {
  model: ReturnType<typeof useProjectsPagePresenter>;
  projectNameRef: ReturnType<typeof useFocusWhen<HTMLInputElement>>;
}) {
  const { t } = useTranslation();
  switch (model._view) {
    case 0: {
      const {
        projectGroups,
        projectBoard,
        projectTimeline,
        timelineFocusToday,
        displayProperties,
        projectIssueCounts,
        projectViews,
        activeProjectView,
        visibleProjectCount,
        isGrouped,
        hasActiveSearch,
        controls,
        availableLabels,
        name,
        summary,
        icon,
        iconColor,
        description,
        status,
        priority,
        startDate,
        targetDate,
        selectedLabels,
        initialMilestones,
        milestoneDraftOpen,
        milestoneDraftName,
        milestoneDraftDescription,
        milestoneDraftTargetDate,
        initialDependencies,
        dependencyDraftOpen,
        dependencyDraftProjectSlug,
        dependencyDraftKind,
        availableDependencyProjects,
        projectNameBySlug,
        createOpen,
        handlers,
      } = model;
      return (
        <SplitLayout single>
          <Pane single flush>
            <PageHeader
              title={t('nav.projects')}
              minHeight={62}
              titleSize="md"
              paddingX={19}
              actions={
                <ActionIcon
                  type="button"
                  variant="default"
                  aria-label={t('projectList.newProject')}
                  title={t('projectList.newProject')}
                  onClick={handlers.onOpenCreateProject}
                >
                  <IconPlus size={16} stroke={1.7} aria-hidden="true" />
                </ActionIcon>
              }
            />
            <ProjectViewsBar
              views={projectViews}
              activeSlug={activeProjectView?.slug}
              handlers={handlers}
              controls={
                <ProjectListControls model={controls} compact filterPosition="bottom-end" />
              }
            />
            {visibleProjectCount === 0 && hasActiveSearch ? (
              <Stack align="center" py="xl" gap="xs">
                <Text c="dimmed" ta="center">
                  {t('projectList.noResults')}
                </Text>
                <Button type="button" variant="subtle" onClick={controls.handlers.onReset}>
                  {t('projectList.clearFilters')}
                </Button>
              </Stack>
            ) : visibleProjectCount === 0 ? (
              <Stack align="center" py="xl" gap="xs">
                <Text c="dimmed" ta="center">
                  {t('projectList.empty')}
                </Text>
                <Button type="button" variant="default" onClick={handlers.onOpenCreateProject}>
                  {t('projectList.newProject')}
                </Button>
              </Stack>
            ) : controls.view === 'board' ? (
              <ProjectBoardView
                model={projectBoard}
                showRows={controls.rowsBy !== 'none'}
                displayProperties={displayProperties}
                issueCounts={projectIssueCounts}
              />
            ) : controls.view === 'timeline' ? (
              <ProjectTimelineView
                model={projectTimeline}
                showProjectList={controls.showProjectList}
                showWeekNumbers={controls.showWeekNumbers}
                focusToday={timelineFocusToday}
                displayProperties={displayProperties}
                issueCounts={projectIssueCounts}
                grouped={isGrouped}
                handlers={{
                  onPrevious: handlers.onTimelinePrevious,
                  onNext: handlers.onTimelineNext,
                  onToday: handlers.onTimelineToday,
                }}
              />
            ) : (
              <Stack gap="md">
                {projectGroups.map((group) =>
                  isGrouped ? (
                    <Section key={group.key} title={group.label} ariaLabel={group.label}>
                      <Stack gap={0}>
                        {group.projects.map((project) => (
                          <ProjectListItem
                            key={project.slug}
                            project={project}
                            displayProperties={displayProperties}
                            issueCount={projectIssueCounts[project.slug] ?? 0}
                          />
                        ))}
                      </Stack>
                    </Section>
                  ) : (
                    <Stack key={group.key} gap={0}>
                      {group.projects.map((project) => (
                        <ProjectListItem
                          key={project.slug}
                          project={project}
                          displayProperties={displayProperties}
                          issueCount={projectIssueCounts[project.slug] ?? 0}
                        />
                      ))}
                    </Stack>
                  ),
                )}
              </Stack>
            )}
            <Modal
              opened={createOpen}
              onClose={handlers.onCloseCreateProject}
              title={t('projectList.createTitle')}
              centered
              size="lg"
            >
              <Box component="form" onSubmit={handlers.onSubmit0}>
                <Stack>
                  <Group align="flex-end" wrap="nowrap">
                    <ProjectIconPicker
                      icon={icon}
                      color={iconColor}
                      onChange={handlers.onProjectIconChange}
                      onColorChange={handlers.onProjectIconColorChange}
                    />
                    <TextInput
                      ref={projectNameRef}
                      autoFocus
                      required
                      maxLength={120}
                      style={{ flex: 1 }}
                      aria-label={t('modal.projectName')}
                      label={t('modal.projectName')}
                      value={name}
                      onChange={handlers.New_project_name_onChange1}
                    />
                  </Group>
                  <TextInput
                    label={t('modal.projectSummary')}
                    value={summary}
                    onChange={handlers.New_project_summary_onChange}
                  />
                  <Textarea
                    label={t('modal.projectDescription')}
                    value={description}
                    onChange={handlers.New_project_description_onChange}
                    minRows={3}
                    autosize
                  />
                  <Group grow>
                    <NativeSelect
                      label={t('field.status')}
                      value={status}
                      onChange={handlers.New_project_status_onChange}
                      data={model.projectWorkflowStatuses.map((workflowStatus) => ({
                        value: workflowStatus.id,
                        label: projectWorkflowStatusLabel(
                          workflowStatus.id,
                          model.projectWorkflowStatuses,
                          t,
                        ),
                      }))}
                    />
                    <NativeSelect
                      label={t('field.priority')}
                      value={String(priority)}
                      onChange={handlers.New_project_priority_onChange}
                      data={[0, 1, 2, 3, 4].map((value) => ({
                        value: String(value),
                        label: priorityLabel(value),
                      }))}
                    />
                  </Group>
                  <MultiSelect
                    label={t('filters.projectLabels')}
                    aria-label={t('filters.projectLabels')}
                    value={selectedLabels}
                    onChange={handlers.New_project_labels_onChange}
                    data={availableLabels.map((label) => ({
                      value: label.name,
                      label: label.name,
                    }))}
                    searchable
                    hidePickedOptions
                    maxDropdownHeight={240}
                  />
                  <Group grow>
                    <TextInput
                      type="date"
                      label={t('modal.projectStartDate')}
                      value={startDate}
                      onChange={handlers.New_project_start_onChange}
                    />
                    <TextInput
                      type="date"
                      label={t('modal.projectTargetDate')}
                      value={targetDate}
                      onChange={handlers.New_project_target_onChange}
                    />
                  </Group>
                  <Stack gap="xs" aria-label={t('projectDependencies.heading')}>
                    <Group justify="space-between">
                      <Text size="sm" fw={600}>
                        {t('projectDependencies.heading')}
                      </Text>
                      <Button
                        type="button"
                        variant="subtle"
                        size="sm"
                        disabled={availableDependencyProjects.length === 0}
                        onClick={handlers.onOpenDependencyDraft}
                      >
                        {t('projectDependencies.addFromCreate')}
                      </Button>
                    </Group>
                    {initialDependencies.map((dependency) => (
                      <Group key={dependency.projectSlug} justify="space-between" gap="xs">
                        <Text size="sm">
                          {t(`projectDependencies.kindOptions.${dependency.kind}`)}{' '}
                          {projectNameBySlug[dependency.projectSlug] ?? dependency.projectSlug}
                        </Text>
                        <ActionIcon
                          type="button"
                          variant="subtle"
                          color="gray"
                          aria-label={t('projectDependencies.remove', {
                            project:
                              projectNameBySlug[dependency.projectSlug] ?? dependency.projectSlug,
                          })}
                          onClick={() => handlers.onRemoveInitialDependency(dependency.projectSlug)}
                        >
                          <IconTrash size={14} stroke={1.7} aria-hidden="true" />
                        </ActionIcon>
                      </Group>
                    ))}
                    {dependencyDraftOpen && (
                      <Box
                        p="sm"
                        style={{
                          border: '1px solid var(--mantine-color-default-border)',
                          borderRadius: 'var(--mantine-radius-sm)',
                        }}
                      >
                        <Stack gap="xs">
                          <Group grow>
                            <NativeSelect
                              aria-label={t('projectDependencies.project')}
                              value={dependencyDraftProjectSlug}
                              onChange={handlers.onDependencyDraftProjectChange}
                              data={[
                                {
                                  value: '',
                                  label: t('projectDependencies.chooseProject'),
                                },
                                ...availableDependencyProjects.map((candidate) => ({
                                  value: candidate.slug,
                                  label: candidate.name,
                                })),
                              ]}
                            />
                            <NativeSelect
                              aria-label={t('projectDependencies.kind')}
                              value={dependencyDraftKind}
                              onChange={handlers.onDependencyDraftKindChange}
                              data={(['blocks', 'blocked_by', 'related'] as const).map((kind) => ({
                                value: kind,
                                label: t(`projectDependencies.kindOptions.${kind}`),
                              }))}
                            />
                          </Group>
                          <Group justify="flex-end">
                            <Button
                              type="button"
                              variant="default"
                              onClick={handlers.onCancelDependencyDraft}
                            >
                              {t('common.cancel')}
                            </Button>
                            <Button
                              type="button"
                              disabled={!dependencyDraftProjectSlug}
                              onClick={handlers.onAddInitialDependency}
                            >
                              {t('projectDependencies.add')}
                            </Button>
                          </Group>
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                  <Stack gap="xs" aria-label={t('projectMilestones.heading')}>
                    <Group justify="space-between">
                      <Text size="sm" fw={600}>
                        {t('projectMilestones.heading')}
                      </Text>
                      <Button
                        type="button"
                        variant="subtle"
                        size="sm"
                        onClick={handlers.onOpenMilestoneDraft}
                      >
                        {t('projectMilestones.addToProject')}
                      </Button>
                    </Group>
                    {initialMilestones.map((milestone, index) => (
                      <Group key={`${milestone.name}-${index}`} justify="space-between" gap="xs">
                        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                          <Text size="sm" fw={500}>
                            {milestone.name}
                          </Text>
                          {milestone.description && (
                            <Text size="xs" c="dimmed">
                              {milestone.description}
                            </Text>
                          )}
                          {milestone.targetDate && (
                            <Text size="xs" c="dimmed">
                              {formatCalendarDate(milestone.targetDate)}
                            </Text>
                          )}
                        </Stack>
                        <ActionIcon
                          type="button"
                          variant="subtle"
                          color="gray"
                          aria-label={t('projectMilestones.remove', { name: milestone.name })}
                          onClick={() => handlers.onRemoveInitialMilestone(index)}
                        >
                          <IconTrash size={14} stroke={1.7} aria-hidden="true" />
                        </ActionIcon>
                      </Group>
                    ))}
                    {milestoneDraftOpen && (
                      <Box
                        p="sm"
                        style={{
                          border: '1px solid var(--mantine-color-default-border)',
                          borderRadius: 'var(--mantine-radius-sm)',
                        }}
                      >
                        <Stack gap="xs">
                          <Text size="sm" fw={500}>
                            {t('projectMilestones.createMilestone')}
                          </Text>
                          <TextInput
                            autoFocus
                            required
                            maxLength={120}
                            label={t('projectMilestones.name')}
                            placeholder={t('projectMilestones.namePlaceholder')}
                            value={milestoneDraftName}
                            onChange={handlers.onMilestoneDraftNameChange}
                            onKeyDown={handlers.onMilestoneDraftNameKeyDown}
                          />
                          <Group grow align="flex-start">
                            <Textarea
                              label={t('projectMilestones.description')}
                              placeholder={t('projectMilestones.descriptionPlaceholder')}
                              value={milestoneDraftDescription}
                              onChange={handlers.onMilestoneDraftDescriptionChange}
                              minRows={2}
                              autosize
                            />
                            <TextInput
                              type="date"
                              label={t('projectMilestones.targetDate')}
                              value={milestoneDraftTargetDate}
                              onChange={handlers.onMilestoneDraftTargetDateChange}
                            />
                          </Group>
                          <Group justify="flex-end">
                            <Button
                              type="button"
                              variant="default"
                              onClick={handlers.onCancelMilestoneDraft}
                            >
                              {t('common.cancel')}
                            </Button>
                            <Button
                              type="button"
                              disabled={!milestoneDraftName.trim()}
                              onClick={handlers.onAddInitialMilestone}
                            >
                              {t('projectMilestones.add')}
                            </Button>
                          </Group>
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                  <Group justify="flex-end">
                    <Button type="button" variant="default" onClick={handlers.onCloseCreateProject}>
                      {t('common.cancel')}
                    </Button>
                    <Button type="submit" disabled={!name.trim()}>
                      {t('projectList.createTitle')}
                    </Button>
                  </Group>
                </Stack>
              </Box>
            </Modal>
          </Pane>
        </SplitLayout>
      );
    }
  }
}

function ProjectViewsBar({
  views,
  activeSlug,
  handlers,
  controls,
}: {
  views: ProjectSavedView[];
  activeSlug?: string;
  handlers: ReturnType<typeof useProjectsPagePresenter>['handlers'];
  controls: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <Group justify="space-between" align="center" gap="sm" wrap="wrap" mb="sm" pl={9} pr={8}>
      <Group gap={4} wrap="wrap" role="tablist" aria-label={t('projectViews.views')}>
        <Button
          type="button"
          size="xs"
          h={28}
          variant={activeSlug ? 'subtle' : 'light'}
          role="tab"
          aria-selected={!activeSlug}
          onClick={handlers.onShowAllProjects}
        >
          {t('projectViews.allProjects')}
        </Button>
        {views.map((view) => (
          <Button
            key={view.slug}
            type="button"
            size="xs"
            h={28}
            variant={activeSlug === view.slug ? 'light' : 'subtle'}
            role="tab"
            aria-selected={activeSlug === view.slug}
            title={view.description || view.name}
            onClick={() => void handlers.onApplyProjectView(view)}
          >
            <Group gap={4} wrap="nowrap">
              <ViewIcon name={view.icon ?? 'list'} />
              {view.name}
            </Group>
          </Button>
        ))}
        <ActionIcon
          type="button"
          size={28}
          variant="subtle"
          color="gray"
          aria-label={t('projectViews.add')}
          title={t('projectViews.add')}
          onClick={handlers.onOpenCreateProjectView}
        >
          <IconStack2 size={16} stroke={1.7} aria-hidden="true" />
        </ActionIcon>
        {activeSlug ? (
          <>
            <Button
              type="button"
              size="xs"
              variant="subtle"
              onClick={() => void handlers.onUpdateActiveProjectView()}
            >
              {t('projectViews.saveChanges')}
            </Button>
            <Button
              type="button"
              size="xs"
              variant="subtle"
              color="red"
              onClick={() => void handlers.onDeleteActiveProjectView()}
            >
              {t('projectViews.delete')}
            </Button>
          </>
        ) : null}
      </Group>
      <Box style={{ marginInlineEnd: 11 }}>{controls}</Box>
    </Group>
  );
}

export function ProjectsPage() {
  return (
    <PresenterScope name="ProjectsPage">
      <ProjectsPageBinding />
    </PresenterScope>
  );
}

function ProjectsPageBinding() {
  const model = useProjectsPagePresenter();
  const handlers = useActions(model.handlers);
  const projectNameRef = useFocusWhen<HTMLInputElement>(true);
  return (
    <ProjectsPageView
      model={{ ...model, handlers } as typeof model}
      projectNameRef={projectNameRef}
    />
  );
}

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
                    <NativeSelect
                      aria-label={t('ui.projectStatus')}
                      value={project.workflowStatus ?? project.status}
                      onChange={handlers.Project_status_onChange0}
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
                      onChange={handlers.Project_priority_onChange1}
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
                    <Button type="button" variant="subtle" onClick={handlers.onClick1}>
                      {t('ui.newIssue')}
                    </Button>
                    <Button type="button" variant="default" onClick={handlers.onOpenProjectUpdate}>
                      {t('projectUpdates.postButton')}
                    </Button>
                    <Button type="button" variant="subtle" color="red" onClick={handlers.onClick2}>
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
                  onChange={handlers.Project_summary_onChange}
                  onBlur={handlers.Project_summary_onBlur}
                />
                <Textarea
                  ref={descriptionRef}
                  aria-label={t('ui.projectDescription')}
                  placeholder={t('ui.description')}
                  value={project.description}
                  onChange={handlers.Project_description_onChange3}
                  onBlur={handlers.Project_description_onBlur4}
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
                  <ProjectUpdateFeed
                    updates={projectUpdates}
                    emptyLabel={t('projectUpdates.empty')}
                  />
                </Section>
                <Group gap="md" wrap="wrap" align="flex-end">
                  <TextInput
                    type="date"
                    aria-label={t('ui.startDate')}
                    label={t('ui.start')}
                    value={project.startDate?.slice(0, 10) ?? ''}
                    onChange={handlers.Start_date_onChange5}
                  />
                  <TextInput
                    type="date"
                    aria-label={t('ui.targetDate')}
                    label={t('ui.target')}
                    value={project.targetDate?.slice(0, 10) ?? ''}
                    onChange={handlers.Target_date_onChange6}
                  />
                </Group>
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
                <Section title={t('projectDependencies.heading')}>
                  <Box
                    component="form"
                    aria-label={t('projectDependencies.form')}
                    onSubmit={handlers.onAddProjectDependency}
                  >
                    <Group gap="xs" align="flex-end" wrap="wrap">
                      <NativeSelect
                        aria-label={t('projectDependencies.project')}
                        value={dependencyProjectSlug}
                        onChange={handlers.onDependencyProjectChange}
                        disabled={availableDependencyProjects.length === 0}
                        data={[
                          {
                            value: '',
                            label: availableDependencyProjects.length
                              ? t('projectDependencies.chooseProject')
                              : t('projectDependencies.noProjects'),
                          },
                          ...availableDependencyProjects.map((candidate) => ({
                            value: candidate.slug,
                            label: candidate.name,
                          })),
                        ]}
                      />
                      <NativeSelect
                        aria-label={t('projectDependencies.kind')}
                        value={dependencyKind}
                        onChange={handlers.onDependencyKindChange}
                        data={(['blocks', 'blocked_by', 'related'] as const).map((kind) => ({
                          value: kind,
                          label: t(`projectDependencies.kindOptions.${kind}`),
                        }))}
                      />
                      <Button
                        type="submit"
                        variant="default"
                        size="sm"
                        disabled={!dependencyProjectSlug}
                      >
                        {t('projectDependencies.add')}
                      </Button>
                    </Group>
                  </Box>
                  {(project.dependencies ?? []).length === 0 ? (
                    <Text size="sm" c="dimmed">
                      {t('projectDependencies.empty')}
                    </Text>
                  ) : (
                    <Stack
                      component="ul"
                      aria-label={t('projectDependencies.list')}
                      gap="xs"
                      style={{ listStyle: 'none', margin: 0, padding: 0 }}
                    >
                      {(project.dependencies ?? []).map((dependency) => {
                        const relatedProject = data.projects.find(
                          (candidate) => candidate.slug === dependency.projectSlug,
                        );
                        const relatedName = relatedProject?.name ?? dependency.projectSlug;
                        return (
                          <Group
                            component="li"
                            key={dependency.projectSlug}
                            justify="space-between"
                          >
                            <Group gap="xs">
                              <Text size="sm">
                                {t(`projectDependencies.kindOptions.${dependency.kind}`)}
                              </Text>
                              {relatedProject ? (
                                <Link
                                  to="/projects/$slug"
                                  params={{ slug: dependency.projectSlug }}
                                >
                                  {relatedName}
                                </Link>
                              ) : (
                                <Text size="sm">{relatedName}</Text>
                              )}
                            </Group>
                            <ActionIcon
                              type="button"
                              variant="subtle"
                              color="gray"
                              aria-label={t('projectDependencies.remove', { project: relatedName })}
                              onClick={() =>
                                handlers.onRemoveProjectDependency(dependency.projectSlug)
                              }
                            >
                              <IconTrash size={14} stroke={1.7} aria-hidden="true" />
                            </ActionIcon>
                          </Group>
                        );
                      })}
                    </Stack>
                  )}
                </Section>
                <Section title={t('projectMilestones.heading')}>
                  <Box
                    component="form"
                    aria-label={t('projectMilestones.heading')}
                    onSubmit={handlers.New_milestone_onSubmit49}
                  >
                    <Group gap="xs" align="flex-end" wrap="wrap">
                      <TextInput
                        aria-label={t('projectMilestones.name')}
                        placeholder={t('projectMilestones.namePlaceholder')}
                        value={milestoneName}
                        onChange={handlers.New_milestone_name_onChange47}
                        size="sm"
                        style={{ flex: '1 1 220px' }}
                      />
                      <Textarea
                        aria-label={t('projectMilestones.description')}
                        placeholder={t('projectMilestones.descriptionPlaceholder')}
                        value={milestoneDescription}
                        onChange={handlers.New_milestone_description_onChange}
                        minRows={1}
                        autosize
                        size="sm"
                        style={{ flex: '1 1 220px' }}
                      />
                      <TextInput
                        type="date"
                        aria-label={t('projectMilestones.targetDate')}
                        value={milestoneTargetDate}
                        onChange={handlers.New_milestone_target_onChange48}
                        size="sm"
                      />
                      <Button type="submit" variant="default" size="sm">
                        {t('projectMilestones.add')}
                      </Button>
                    </Group>
                  </Box>
                  {project.milestones.length === 0 ? (
                    <Text size="sm" c="dimmed" mt="sm">
                      {t('projectMilestones.empty')}
                    </Text>
                  ) : (
                    <Stack
                      component="ul"
                      gap="xs"
                      mt="sm"
                      style={{
                        listStyle: 'none',
                        margin: 'var(--mantine-spacing-sm) 0 0',
                        padding: 0,
                      }}
                    >
                      {project.milestones.map((milestone) => (
                        <Stack component="li" key={milestone.id} gap="xs">
                          <Group gap="xs" wrap="wrap">
                            <TextInput
                              aria-label={`${t('projectMilestones.name')}: ${milestone.name}`}
                              value={milestone.name}
                              onChange={(event) =>
                                handlers.Milestone_name_onChange42(milestone.id, event)
                              }
                              onBlur={() => handlers.Milestone_name_onBlur43(milestone.id)}
                              size="sm"
                              style={{ flex: '1 1 220px' }}
                            />
                            <TextInput
                              type="date"
                              aria-label={`${t('projectMilestones.targetDate')}: ${milestone.name}`}
                              value={milestone.targetDate?.slice(0, 10) ?? ''}
                              onChange={(event) =>
                                handlers.Milestone_target_onChange44(milestone.id, event)
                              }
                              onBlur={() => handlers.Milestone_target_onBlur45(milestone.id)}
                              size="sm"
                            />
                            <ActionIcon
                              type="button"
                              variant="subtle"
                              color="red"
                              aria-label={t('projectMilestones.remove', { name: milestone.name })}
                              onClick={() =>
                                handlers.Milestone_remove_onClick46(milestone.id, milestone.name)
                              }
                            >
                              <IconTrash size={14} stroke={1.7} aria-hidden="true" />
                            </ActionIcon>
                          </Group>
                          <Textarea
                            aria-label={`${t('projectMilestones.description')}: ${milestone.name}`}
                            placeholder={t('projectMilestones.descriptionPlaceholder')}
                            defaultValue={milestone.description ?? ''}
                            onBlur={(event) =>
                              handlers.Milestone_description_onBlur(
                                milestone.id,
                                event.currentTarget.value,
                              )
                            }
                            minRows={1}
                            autosize
                            size="sm"
                          />
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </Section>
                <Stack gap="md" aria-label={t('ui.projectDocuments')}>
                  <Section
                    title={t('nav.adrs')}
                    action={
                      <Button type="button" variant="subtle" size="xs" onClick={handlers.onClick7}>
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
                  onSelect={handlers.onSelect8}
                  groupBy="status"
                  hideProjectSlug
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
          <Modal
            opened={projectUpdateOpen}
            onClose={handlers.onCloseProjectUpdate}
            title={t('projectUpdates.modalTitle')}
            centered
          >
            <Box component="form" onSubmit={handlers.onSubmitProjectUpdate}>
              <Stack>
                <NativeSelect
                  label={t('projectUpdates.health')}
                  value={projectUpdateHealth}
                  onChange={handlers.onProjectUpdateHealthChange}
                  data={(['on_track', 'at_risk', 'off_track'] as const).map((health) => ({
                    value: health,
                    label: t(`projectHealth.status.${health}`),
                  }))}
                />
                <Textarea
                  required
                  maxLength={10000}
                  minRows={5}
                  autosize
                  label={t('projectUpdates.body')}
                  placeholder={t('projectUpdates.bodyPlaceholder')}
                  value={projectUpdateBody}
                  onChange={handlers.onProjectUpdateBodyChange}
                />
                <Group justify="flex-end">
                  <Button type="button" variant="default" onClick={handlers.onCloseProjectUpdate}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={!projectUpdateBody.trim()}>
                    {t('projectUpdates.postButton')}
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

export function CyclesPageView({ model }: { model: ReturnType<typeof useCyclesPagePresenter> }) {
  const { t } = useTranslation();
  switch (model._view) {
    case 0: {
      const {
        cycles,
        metadataCycle,
        datesCycle,
        nameDraft,
        descriptionDraft,
        startDateDraft,
        endDateDraft,
        datesValid,
        handlers,
      } = model;
      return (
        <SplitLayout single>
          <Pane single flush>
            <PageHeader
              title={t('nav.cycles')}
              minHeight={62}
              titleSize="md"
              paddingX={19}
              actions={
                <ActionIcon
                  type="button"
                  variant="default"
                  aria-label={t('cycle.newCycle')}
                  title={t('cycle.newCycle')}
                  onClick={handlers.onClick0}
                >
                  <IconPlus size={16} stroke={1.7} aria-hidden="true" />
                </ActionIcon>
              }
            />
            {cycles.length === 0 ? (
              <EmptyState>{t('cycle.emptyState')}</EmptyState>
            ) : (
              <Stack gap={0} p="md" pb="xl">
                {cycles.map((cycle) => (
                  <CycleListItem key={cycle.number} cycle={cycle} />
                ))}
              </Stack>
            )}
            <Modal
              opened={metadataCycle !== null}
              onClose={handlers.onCloseMetadata}
              title={t('cycle.editNameAndDescription')}
              centered
            >
              <Box component="form" onSubmit={handlers.onSaveMetadata}>
                <Stack>
                  <TextInput
                    required
                    maxLength={120}
                    label={t('cycle.name')}
                    value={nameDraft}
                    onChange={handlers.onNameChange}
                  />
                  <Textarea
                    label={t('cycle.description')}
                    value={descriptionDraft}
                    onChange={handlers.onDescriptionChange}
                    minRows={3}
                    autosize
                  />
                  <Group justify="flex-end">
                    <Button type="button" variant="default" onClick={handlers.onCloseMetadata}>
                      {t('common.cancel')}
                    </Button>
                    <Button type="submit" disabled={!nameDraft.trim()}>
                      {t('common.save')}
                    </Button>
                  </Group>
                </Stack>
              </Box>
            </Modal>
            <Modal
              opened={datesCycle !== null}
              onClose={handlers.onCloseDates}
              title={t('cycle.changeDates')}
              centered
            >
              <Box component="form" onSubmit={handlers.onSaveDates}>
                <Stack>
                  <TextInput
                    type="date"
                    label={t('cycle.startDate')}
                    value={startDateDraft}
                    disabled={datesCycle?.status === 'active'}
                    onChange={handlers.onStartDateChange}
                  />
                  {datesCycle?.status === 'active' ? (
                    <Text size="xs" c="dimmed">
                      {t('cycle.activeStartDateHint')}
                    </Text>
                  ) : null}
                  <TextInput
                    type="date"
                    label={t('cycle.endDate')}
                    value={endDateDraft}
                    onChange={handlers.onEndDateChange}
                  />
                  <Group justify="flex-end">
                    <Button type="button" variant="default" onClick={handlers.onCloseDates}>
                      {t('common.cancel')}
                    </Button>
                    <Button type="submit" disabled={!datesValid}>
                      {t('common.save')}
                    </Button>
                  </Group>
                </Stack>
              </Box>
            </Modal>
          </Pane>
        </SplitLayout>
      );
    }
  }
}

export function CyclesPage() {
  return (
    <PresenterScope name="CyclesPage">
      <CyclesPageBinding />
    </PresenterScope>
  );
}

function CyclesPageBinding() {
  const model = useCyclesPagePresenter();
  const handlers = useActions(model.handlers);
  return <CyclesPageView model={{ ...model, handlers } as typeof model} />;
}

export function CycleDetailPageView({
  model,
}: {
  model: ReturnType<typeof useCycleDetailPagePresenter>;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || i18n.language;
  switch (model._view) {
    case 0: {
      const {
        data,
        issues,
        search,
        selected,
        cycle,
        resources,
        progressTimeline,
        started,
        startedPercent,
        done,
        completionPercent,
        metadataOpen,
        datesOpen,
        resourceLinkOpen,
        resourceURL,
        resourceTitle,
        resourceError,
        cycleLinkCopied,
        nameDraft,
        descriptionDraft,
        startDateDraft,
        endDateDraft,
        datesValid,
        groupBy,
        layout,
        orderBy,
        subGroupBy,
        direction,
        completedIssues,
        showSubIssues,
        nestedSubIssues,
        showEmptyGroups,
        displayProperties,
        handlers,
      } = model;
      return (
        <Box h="100%" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <PageHeader
            title={cycle.name || t('field.cycleN', { number: cycle.number })}
            actions={
              <Group gap="xs" wrap="wrap">
                <Switch
                  aria-label={t('cycle.favorite')}
                  checked={!!cycle.isFavorite}
                  onChange={handlers.onToggleFavorite}
                />
                <NativeSelect
                  aria-label={t('field.status')}
                  value={cycle.status}
                  onChange={handlers.Cycle_status_onChange0}
                  data={CYCLE_STATUSES.map((s) => ({
                    value: s,
                    label: t(`cycle.status.${s}`),
                  }))}
                />
                <Menu withinPortal shadow="md" position="bottom-end">
                  <Menu.Target>
                    <Button type="button" variant="default" aria-label={t('cycle.options')}>
                      {t('cycle.options')}
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item onClick={handlers.onOpenMetadata}>
                      {t('cycle.editNameAndDescription')}
                    </Menu.Item>
                    {cycle.status !== 'completed' ? (
                      <Menu.Item onClick={handlers.onOpenDates}>{t('cycle.changeDates')}</Menu.Item>
                    ) : null}
                    {cycle.status === 'upcoming' ? (
                      <Menu.Item onClick={handlers.onStartCycleToday}>
                        {t('cycle.startToday')}
                      </Menu.Item>
                    ) : null}
                    <Menu.Item onClick={handlers.onCopyLink}>
                      {cycleLinkCopied ? t('cycle.linkCopied') : t('cycle.copyLink')}
                    </Menu.Item>
                    <Menu.Item onClick={handlers.onExportIssues}>
                      {t('cycle.exportIssues')}
                    </Menu.Item>
                    <Menu.Item onClick={handlers.onExportCalendar}>
                      {t('cycle.exportCalendar')}
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
                <Button type="button" variant="subtle" onClick={handlers.onClick1}>
                  {t('cycle.newIssue')}
                </Button>
              </Group>
            }
          />
          <Box style={{ flex: 1, minHeight: 0 }}>
            <SplitLayout>
              <Pane variant="list">
                <Group
                  justify="space-between"
                  px="md"
                  py="sm"
                  mih={44}
                  style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
                >
                  <Text size="sm" c="dimmed">
                    {t('cycle.issuesCount', { count: issues.length })}
                  </Text>
                </Group>
                <IssueFilters
                  search={search}
                  projects={data.projects}
                  cycles={data.cycles}
                  labels={data.labels}
                  onChange={handlers.onFilterChange}
                  groupBy={groupBy}
                  onGroupBy={handlers.onGroupBy}
                  layout={layout}
                  onLayout={handlers.onLayout}
                  orderBy={orderBy}
                  onOrderBy={handlers.onOrderBy}
                  subGroupBy={subGroupBy}
                  onSubGroupBy={handlers.onSubGroupBy}
                  direction={direction}
                  onDirection={handlers.onDirection}
                  completedIssues={completedIssues}
                  onCompletedIssues={handlers.onCompletedIssues}
                  showSubIssues={showSubIssues}
                  onShowSubIssues={handlers.onShowSubIssues}
                  nestedSubIssues={nestedSubIssues}
                  onNestedSubIssues={handlers.onNestedSubIssues}
                  showEmptyGroups={showEmptyGroups}
                  onShowEmptyGroups={handlers.onShowEmptyGroups}
                  displayProperties={displayProperties}
                  onDisplayPropertyToggle={handlers.onDisplayPropertyToggle}
                />
                <Box style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                  {layout === 'list' ? (
                    <IssueList
                      issues={issues}
                      selectedId={selected}
                      onSelect={handlers.onSelect2}
                      groupBy={groupBy}
                      orderBy={orderBy}
                      subGroupBy={subGroupBy}
                      direction={direction}
                      showEmptyGroups={showEmptyGroups}
                      showSubIssues={showSubIssues}
                      displayProperties={displayProperties}
                    />
                  ) : (
                    <Box p="md" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                      <IssueBoard
                        issues={issues}
                        orderBy={orderBy}
                        direction={direction}
                        showSubIssues={showSubIssues}
                        onOpen={handlers.onBoardOpen}
                        onMove={handlers.onBoardMove}
                      />
                    </Box>
                  )}
                </Box>
              </Pane>
              <Pane variant="detail">
                <Stack gap="lg">
                  <Stack gap="xs">
                    <Text size="xs" c="dimmed">
                      {t('cycle.dates')}
                    </Text>
                    <Group justify="space-between" align="center" wrap="nowrap">
                      <Text size="sm">
                        {formatCalendarDate(cycle.startsAt, locale)} —{' '}
                        {formatCalendarDate(cycle.endsAt, locale)}
                      </Text>
                      <Button
                        type="button"
                        size="compact-xs"
                        variant="subtle"
                        onClick={handlers.onOpenDates}
                      >
                        {t('cycle.changeDates')}
                      </Button>
                    </Group>
                  </Stack>
                  <CycleProgressSummary
                    scope={data.cycleIssues.length}
                    started={started}
                    startedPercent={startedPercent}
                    completed={done}
                    completionPercent={completionPercent}
                  />
                  <CycleProgressChart cycle={cycle} points={progressTimeline} locale={locale} />
                  {cycle.description ? <Text size="sm">{cycle.description}</Text> : null}
                  <Stack
                    component="section"
                    aria-label={t('cycle.resourcesHeading')}
                    gap="sm"
                    pt="md"
                    style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
                  >
                    <Group justify="space-between" align="center" gap="xs" wrap="nowrap">
                      <Text size="sm" fw={550}>
                        {t('cycle.resourcesHeading')}
                      </Text>
                      <Menu withinPortal shadow="md" position="bottom-end">
                        <Menu.Target>
                          <Button type="button" size="compact-sm" variant="subtle">
                            {t('cycle.addDocumentOrLink')}
                          </Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item onClick={handlers.onCreateDocument}>
                            {t('cycle.createDocument')}
                          </Menu.Item>
                          <Menu.Item onClick={handlers.onOpenResourceLink}>
                            {t('cycle.addLink')}
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                    {resources.length === 0 ? (
                      <Text size="sm" c="dimmed">
                        {t('cycle.noResources')}
                      </Text>
                    ) : (
                      <Stack gap="xs" role="list" aria-label={t('cycle.resourcesHeading')}>
                        {resources.map((resource) => (
                          <Group
                            key={resource.id}
                            justify="space-between"
                            wrap="nowrap"
                            role="listitem"
                          >
                            <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                              {resource.pageSlug ? (
                                <IconFileText size={15} aria-hidden="true" />
                              ) : (
                                <IconExternalLink size={15} aria-hidden="true" />
                              )}
                              {resource.pageSlug ? (
                                <Link to="/pages/$slug" params={{ slug: resource.pageSlug }}>
                                  {resource.displayTitle}
                                </Link>
                              ) : (
                                <a href={resource.url} target="_blank" rel="noreferrer">
                                  {resource.displayTitle}
                                </a>
                              )}
                              <MetaBadge>{t(`issueLinks.${resource.kind}`)}</MetaBadge>
                            </Group>
                            <ActionIcon
                              type="button"
                              variant="subtle"
                              color="gray"
                              aria-label={t('cycle.removeResource', {
                                title: resource.displayTitle,
                              })}
                              onClick={() => handlers.onRemoveResource(resource.id)}
                            >
                              <IconTrash size={15} />
                            </ActionIcon>
                          </Group>
                        ))}
                      </Stack>
                    )}
                  </Stack>
                </Stack>
              </Pane>
            </SplitLayout>
          </Box>
          <Modal
            opened={metadataOpen}
            onClose={handlers.onCloseMetadata}
            title={t('cycle.editNameAndDescription')}
            centered
          >
            <Box component="form" onSubmit={handlers.onSaveMetadata}>
              <Stack>
                <TextInput
                  required
                  maxLength={120}
                  label={t('cycle.name')}
                  value={nameDraft}
                  onChange={handlers.onNameChange}
                />
                <Textarea
                  label={t('cycle.description')}
                  value={descriptionDraft}
                  onChange={handlers.onDescriptionChange}
                  minRows={3}
                  autosize
                />
                <Group justify="flex-end">
                  <Button type="button" variant="default" onClick={handlers.onCloseMetadata}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={!nameDraft.trim()}>
                    {t('common.save')}
                  </Button>
                </Group>
              </Stack>
            </Box>
          </Modal>
          <Modal
            opened={datesOpen}
            onClose={handlers.onCloseDates}
            title={t('cycle.changeDates')}
            centered
          >
            <Box component="form" onSubmit={handlers.onSaveDates}>
              <Stack>
                <TextInput
                  type="date"
                  label={t('cycle.startDate')}
                  value={startDateDraft}
                  disabled={cycle.status === 'active'}
                  onChange={handlers.onStartDateChange}
                />
                {cycle.status === 'active' ? (
                  <Text size="xs" c="dimmed">
                    {t('cycle.activeStartDateHint')}
                  </Text>
                ) : null}
                <TextInput
                  type="date"
                  label={t('cycle.endDate')}
                  value={endDateDraft}
                  onChange={handlers.onEndDateChange}
                />
                <Group justify="flex-end">
                  <Button type="button" variant="default" onClick={handlers.onCloseDates}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={!datesValid}>
                    {t('common.save')}
                  </Button>
                </Group>
              </Stack>
            </Box>
          </Modal>
          <Modal
            opened={resourceLinkOpen}
            onClose={handlers.onCloseResourceLink}
            title={t('cycle.addLinkTitle')}
            centered
          >
            <Box component="form" onSubmit={handlers.onAddResourceLink}>
              <Stack>
                <TextInput
                  type="url"
                  required
                  label={t('cycle.url')}
                  placeholder={t('ui.urlPlaceholder')}
                  value={resourceURL}
                  onChange={handlers.onResourceURLChange}
                />
                <TextInput
                  label={t('cycle.linkTitle')}
                  value={resourceTitle}
                  onChange={handlers.onResourceTitleChange}
                />
                {resourceError ? (
                  <Text size="sm" c="red" role="alert">
                    {resourceError}
                  </Text>
                ) : null}
                <Group justify="flex-end">
                  <Button type="button" variant="default" onClick={handlers.onCloseResourceLink}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit">{t('cycle.saveLink')}</Button>
                </Group>
              </Stack>
            </Box>
          </Modal>
        </Box>
      );
    }
  }
}

export function CycleDetailPage() {
  return (
    <PresenterScope name="CycleDetailPage">
      <CycleDetailPageBinding />
    </PresenterScope>
  );
}

function CycleDetailPageBinding() {
  const model = useCycleDetailPagePresenter();
  const handlers = useActions(model.handlers);
  return <CycleDetailPageView model={{ ...model, handlers } as typeof model} />;
}
