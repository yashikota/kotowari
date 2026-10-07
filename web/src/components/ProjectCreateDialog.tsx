import {
  ActionIcon,
  Box,
  Button,
  Group,
  Modal,
  MultiSelect,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import {
  IconAntennaBars1,
  IconCircleDashed,
  IconSparkles,
  IconTag,
  IconTrash,
  IconUser,
} from '@tabler/icons-react';
import { useMediaQuery } from '@mantine/hooks';
import { useTranslation } from 'react-i18next';
import type { RefObject } from 'react';
import {
  ProjectCreateDependencyQuickAdd,
  ProjectCreateDependencySummary,
} from './ProjectCreateDependencies.tsx';
import { ProjectDateProperty } from './ProjectDateProperty.tsx';
import { ProjectIconPicker } from './ProjectIcon.tsx';
import { IssuePriorityIcon, IssueStatusIcon } from './issue-ui.tsx';
import { projectWorkflowStatusCategory, projectWorkflowStatusLabel } from '../project-workflow.tsx';
import { priorityLabel } from '../i18n/labels.ts';
import { ProjectCreationAssistant } from './ProjectCreationAssistant.tsx';
import { ProjectCreateMilestones } from './ProjectCreateMilestones.tsx';
import type { useProjectsPagePresenter } from '../presenters/Projects.tsx';
import type { IssueStatus, ProjectStatus } from '../types.ts';

type ProjectCreateDialogModel = ReturnType<typeof useProjectsPagePresenter>;

const PROJECT_STATUS_ISSUE_ICON: Record<ProjectStatus, IssueStatus> = {
  backlog: 'backlog',
  planned: 'todo',
  started: 'in_progress',
  completed: 'done',
  canceled: 'canceled',
};

export function ProjectCreateDialog({
  model,
  projectNameRef,
}: {
  model: ProjectCreateDialogModel;
  projectNameRef: RefObject<HTMLInputElement | null>;
}) {
  const { t } = useTranslation();
  const desktopViewport = useMediaQuery('(min-width: 800px)');
  const {
    availableLabels,
    createOpen,
    description,
    handlers,
    icon,
    iconColor,
    initialMilestones,
    lead,
    milestonesExpanded,
    milestoneDraftDescription,
    milestoneDraftName,
    milestoneDraftOpen,
    milestoneDraftTargetDate,
    name,
    priority,
    projectAssistantId,
    projectAssistantOpen,
    projectLabelCreateError,
    projectLabelCreatePending,
    projectLabelQuery,
    projectTemplates,
    selectedLabels,
    selectedProjectTemplate,
    startDate,
    status,
    summary,
    targetDate,
  } = model;
  const statusCategory = projectWorkflowStatusCategory(status, model.projectWorkflowStatuses);

  return (
    <Modal
      opened={createOpen}
      onClose={handlers.onCloseCreateProject}
      title={
        <Group
          justify="space-between"
          gap="md"
          wrap="nowrap"
          style={{ flex: 1, width: '100%', minWidth: 0 }}
        >
          <Group gap={7} wrap="nowrap" aria-label={t('projectList.newProject')}>
            <Group
              gap={6}
              wrap="nowrap"
              px={7}
              py={3}
              style={{
                border: '1px solid var(--mantine-color-default-border)',
                borderRadius: 999,
              }}
            >
              <Box
                component="span"
                aria-hidden="true"
                style={{
                  display: 'grid',
                  width: 14,
                  height: 14,
                  placeItems: 'center',
                  borderRadius: 999,
                  background: 'var(--mantine-primary-color-filled)',
                  color: 'white',
                  fontSize: 9,
                  fontWeight: 700,
                }}
              >
                {model.workspace.name.slice(0, 1).toUpperCase() || 'K'}
              </Box>
              <Text size="xs" fw={500}>
                {model.workspace.name || t('workspace.defaultName')}
              </Text>
            </Group>
            <Text size="sm" c="dimmed" aria-hidden="true">
              ›
            </Text>
            <Text size="sm">{t('projectList.newProject')}</Text>
          </Group>
          {desktopViewport && !projectAssistantOpen ? (
            <Button
              type="button"
              variant="default"
              size="compact-sm"
              leftSection={<IconSparkles size={14} aria-hidden="true" />}
              onClick={handlers.onToggleProjectAssistant}
            >
              {t('projectAssistant.show')}
            </Button>
          ) : null}
        </Group>
      }
      centered
      size={desktopViewport && projectAssistantOpen ? '1120px' : '920px'}
      styles={{
        inner: { padding: 12 },
        content: {
          height: 'min(88vh, 920px)',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 20,
        },
        header: { minHeight: 52, paddingLeft: 22, paddingRight: 26 },
        title: { flex: 1, minWidth: 0 },
        body: { flex: 1, minHeight: 0, padding: 0, overflow: 'hidden' },
      }}
    >
      <Group
        align="stretch"
        gap={0}
        wrap="nowrap"
        style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0 }}
      >
        <Box
          component="form"
          onSubmit={handlers.onSubmit0}
          style={{
            flex: '1 1 0',
            minWidth: 0,
            height: '100%',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <Stack px={26} pt={0} pb="xs" gap={4} style={{ minHeight: '100%' }}>
              <Group justify="space-between" align="center" gap="sm" wrap="nowrap" mb={7}>
                <ProjectIconPicker
                  icon={icon}
                  color={iconColor}
                  onChange={handlers.onProjectIconChange}
                  onColorChange={handlers.onProjectIconColorChange}
                  size={28}
                />
                {projectTemplates.length > 0 ? (
                  <Group
                    align="center"
                    gap="xs"
                    wrap="nowrap"
                    style={{ flex: '0 1 190px', minWidth: 170 }}
                  >
                    <Select
                      aria-label={t('projectTemplates.chooseTemplate')}
                      placeholder={t('projectTemplates.startBlank')}
                      value={selectedProjectTemplate}
                      onChange={handlers.onProjectTemplateChange}
                      data={projectTemplates.map((template) => ({
                        value: template.slug,
                        label: template.name,
                      }))}
                      searchable
                      clearable
                      size="xs"
                      style={{ flex: 1, minWidth: 0 }}
                      comboboxProps={{ withinPortal: false }}
                    />
                    {selectedProjectTemplate && (
                      <ActionIcon
                        type="button"
                        variant="default"
                        color="red"
                        aria-label={t('projectTemplates.deleteSelected')}
                        title={t('projectTemplates.deleteSelected')}
                        onClick={handlers.onDeleteProjectTemplate}
                      >
                        <IconTrash size={15} stroke={1.7} aria-hidden="true" />
                      </ActionIcon>
                    )}
                  </Group>
                ) : null}
              </Group>
              <TextInput
                ref={projectNameRef}
                autoFocus
                data-autofocus
                required
                maxLength={120}
                aria-label={t('modal.projectName')}
                placeholder={t('modal.projectName')}
                value={name}
                onChange={handlers.New_project_name_onChange1}
                size="xl"
                variant="unstyled"
                styles={{
                  input: {
                    fontSize: 22,
                    fontWeight: 600,
                    lineHeight: 1.2,
                    height: 32,
                    minHeight: 32,
                    paddingInline: 0,
                  },
                }}
              />
              <TextInput
                aria-label={t('modal.projectSummary')}
                placeholder={t('modal.projectSummaryPlaceholder')}
                value={summary}
                onChange={handlers.New_project_summary_onChange}
                variant="unstyled"
                size="lg"
                styles={{
                  input: { fontSize: 16, height: 30, minHeight: 30, paddingInline: 0 },
                }}
              />
              <Group gap={8} wrap="nowrap" align="center" mt={3}>
                <Select
                  aria-label={t('field.status')}
                  value={status}
                  onChange={handlers.New_project_status_onChange}
                  leftSection={
                    statusCategory === 'backlog' ? (
                      <IconCircleDashed
                        size={14}
                        stroke={1.75}
                        color="var(--mantine-color-orange-text)"
                        aria-hidden="true"
                      />
                    ) : (
                      <IssueStatusIcon status={PROJECT_STATUS_ISSUE_ICON[statusCategory]} />
                    )
                  }
                  leftSectionPointerEvents="none"
                  size="xs"
                  style={{ width: 80, flex: '0 0 80px' }}
                  styles={{
                    input: {
                      height: 24,
                      minHeight: 24,
                      borderRadius: 999,
                      paddingInlineEnd: 6,
                      color: 'var(--mantine-color-text)',
                      '&::placeholder': { opacity: 1, color: 'var(--mantine-color-text)' },
                    },
                    section: { width: 24 },
                  }}
                  searchable
                  comboboxProps={{ withinPortal: false }}
                  data={model.projectWorkflowStatuses.map((workflowStatus) => ({
                    value: workflowStatus.id,
                    label: projectWorkflowStatusLabel(
                      workflowStatus.id,
                      model.projectWorkflowStatuses,
                      t,
                    ),
                  }))}
                />
                <Select
                  aria-label={t('field.priority')}
                  value={String(priority)}
                  onChange={handlers.New_project_priority_onChange}
                  leftSection={
                    priority === 0 ? (
                      <IconAntennaBars1
                        size={13}
                        stroke={1.75}
                        color="var(--mantine-color-dimmed)"
                        aria-hidden="true"
                      />
                    ) : (
                      <IssuePriorityIcon priority={priority} />
                    )
                  }
                  leftSectionPointerEvents="none"
                  size="xs"
                  style={{ width: 95, flex: '0 0 95px' }}
                  styles={{
                    input: {
                      height: 24,
                      minHeight: 24,
                      borderRadius: 999,
                      paddingInlineEnd: 6,
                      color: 'var(--mantine-color-text)',
                      '&::placeholder': { opacity: 1, color: 'var(--mantine-color-text)' },
                    },
                    section: { width: 24 },
                  }}
                  searchable
                  comboboxProps={{ withinPortal: false }}
                  data={[0, 1, 2, 3, 4].map((value) => ({
                    value: String(value),
                    label: priorityLabel(value),
                  }))}
                />
                <Select
                  aria-label={t('projectList.property.lead')}
                  value={lead || null}
                  onChange={handlers.New_project_lead_onChange}
                  placeholder={t('projectList.property.lead')}
                  leftSection={
                    <IconUser
                      size={14}
                      stroke={1.7}
                      color="var(--mantine-color-dimmed)"
                      aria-hidden="true"
                    />
                  }
                  leftSectionPointerEvents="none"
                  size="xs"
                  style={{ width: 62, flex: '0 0 62px' }}
                  styles={{
                    input: {
                      height: 24,
                      minHeight: 24,
                      borderRadius: 999,
                      paddingInlineEnd: 6,
                      color: 'var(--mantine-color-text)',
                      '&::placeholder': { opacity: 1, color: 'var(--mantine-color-text)' },
                    },
                    section: { width: 24 },
                  }}
                  searchable
                  clearable
                  comboboxProps={{ withinPortal: false }}
                  data={[{ value: 'self', label: t('projectList.leadYou') }]}
                />
                <ProjectDateProperty
                  label={t('modal.projectStartDate')}
                  displayLabel={desktopViewport ? t('projectDate.startShort') : undefined}
                  compactWidth={desktopViewport ? 62 : undefined}
                  value={startDate}
                  onChange={handlers.onProjectStartDateChange}
                  compact={desktopViewport}
                />
                <ProjectDateProperty
                  label={t('modal.projectTargetDate')}
                  displayLabel={desktopViewport ? t('projectDate.targetShort') : undefined}
                  compactWidth={desktopViewport ? 70 : undefined}
                  value={targetDate}
                  onChange={handlers.onProjectTargetDateChange}
                  compact={desktopViewport}
                />
              </Group>
              <Group gap={8} wrap="wrap" align="center" mt={8}>
                <MultiSelect
                  aria-label={t('filters.projectLabels')}
                  placeholder={t('projectList.filterLabels')}
                  leftSection={<IconTag size={14} stroke={1.7} aria-hidden="true" />}
                  leftSectionPointerEvents="none"
                  value={selectedLabels}
                  onChange={handlers.New_project_labels_onChange}
                  searchValue={projectLabelQuery}
                  onSearchChange={handlers.onProjectLabelsSearchChange}
                  nothingFoundMessage={
                    projectLabelCreateError ? (
                      <Text size="xs" c="var(--mantine-color-error)">
                        {projectLabelCreateError}
                      </Text>
                    ) : projectLabelQuery.trim() ? (
                      <Button
                        type="button"
                        variant="subtle"
                        size="compact-sm"
                        fullWidth
                        justify="flex-start"
                        disabled={projectLabelCreatePending}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => void handlers.onCreateProjectLabel(projectLabelQuery)}
                      >
                        {t('projectLabelPicker.create', { name: projectLabelQuery.trim() })}
                      </Button>
                    ) : (
                      t('projectLabelPicker.startTypingToCreate')
                    )
                  }
                  data={availableLabels.map((label) => ({
                    value: label.name,
                    label: label.name,
                  }))}
                  searchable
                  hidePickedOptions
                  maxDropdownHeight={240}
                  size="xs"
                  style={{ width: selectedLabels.length ? 180 : 82 }}
                  styles={{
                    input: {
                      minHeight: 24,
                      height: selectedLabels.length ? undefined : 24,
                      borderRadius: 999,
                      paddingInlineStart: 28,
                      color: 'var(--mantine-color-text)',
                      '&::placeholder': { opacity: 1, color: 'var(--mantine-color-text)' },
                    },
                    section: { width: 25 },
                  }}
                />
                <ProjectCreateDependencyQuickAdd onOpen={handlers.onOpenDependencyDraft} />
              </Group>
              <ProjectCreateDependencySummary model={model} handlers={handlers} />
              <Textarea
                aria-label={t('modal.projectDescription')}
                placeholder={t('modal.projectDescriptionPlaceholder')}
                value={description}
                onChange={handlers.New_project_description_onChange}
                minRows={6}
                style={{ flex: '1 1 120px', minHeight: 120, display: 'flex' }}
                variant="unstyled"
                styles={{
                  root: { flex: '1 1 120px', minHeight: 120, display: 'flex' },
                  wrapper: { flex: '1 1 auto', display: 'flex' },
                  input: {
                    flex: '1 1 auto',
                    height: '100%',
                    minHeight: 120,
                    paddingTop: 29,
                    resize: 'none',
                    borderTop: '1px solid var(--mantine-color-default-border)',
                  },
                }}
                mt={17}
              />
              <ProjectCreateMilestones
                milestones={initialMilestones}
                expanded={milestonesExpanded}
                draftOpen={milestoneDraftOpen}
                draft={{
                  name: milestoneDraftName,
                  description: milestoneDraftDescription,
                  targetDate: milestoneDraftTargetDate,
                }}
                handlers={handlers}
              />
            </Stack>
          </Box>
          <Group
            justify="flex-end"
            px="lg"
            pt={11}
            pb={23}
            style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
          >
            <Button
              type="submit"
              size="compact-sm"
              styles={{ root: { height: 28, minHeight: 28, paddingInline: 10 } }}
            >
              {t('projectList.createTitle')}
            </Button>
          </Group>
        </Box>
        {desktopViewport && projectAssistantOpen && projectAssistantId ? (
          <ProjectCreationAssistant
            id={projectAssistantId}
            onHide={handlers.onToggleProjectAssistant}
          />
        ) : null}
      </Group>
    </Modal>
  );
}
