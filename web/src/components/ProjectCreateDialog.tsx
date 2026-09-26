import {
  ActionIcon,
  Box,
  Button,
  Collapse,
  Group,
  Modal,
  MultiSelect,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { IconChevronDown, IconPlus, IconTrash } from '@tabler/icons-react';
import { useMediaQuery } from '@mantine/hooks';
import { useTranslation } from 'react-i18next';
import type { RefObject } from 'react';
import {
  ProjectCreateDependencyQuickAdd,
  ProjectCreateDependencySummary,
} from './ProjectCreateDependencies.tsx';
import { ProjectDateProperty } from './ProjectDateProperty.tsx';
import { ProjectIconPicker } from './ProjectIcon.tsx';
import { projectWorkflowStatusLabel } from '../project-workflow.tsx';
import { priorityLabel } from '../i18n/labels.ts';
import { formatCalendarDate } from '../time.ts';
import { ProjectCreationAssistant } from './ProjectCreationAssistant.tsx';
import type { useProjectsPagePresenter } from '../presenters/ProjectsCycles.tsx';

type ProjectCreateDialogModel = ReturnType<typeof useProjectsPagePresenter>;

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
    availableDependencyProjects,
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
    projectTemplates,
    selectedLabels,
    selectedProjectTemplate,
    startDate,
    status,
    summary,
    targetDate,
  } = model;

  return (
    <Modal
      opened={createOpen}
      onClose={handlers.onCloseCreateProject}
      title={`${t('nav.projects')} › ${t('projectList.newProject')}`}
      centered
      size="1080px"
      styles={{
        inner: { padding: 12 },
        content: { height: 'min(88vh, 920px)', display: 'flex', flexDirection: 'column' },
        header: { minHeight: 52 },
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
          {desktopViewport && !projectAssistantOpen ? (
            <Group justify="flex-end" px="lg" pt="xs">
              <Button
                type="button"
                variant="subtle"
                size="compact-sm"
                onClick={handlers.onToggleProjectAssistant}
              >
                {t('projectAssistant.show')}
              </Button>
            </Group>
          ) : null}
          <Box style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <Stack p="lg" pt="xs" gap="xs">
              <Group justify="space-between" align="center" gap="sm" wrap="nowrap">
                <ProjectIconPicker
                  icon={icon}
                  color={iconColor}
                  onChange={handlers.onProjectIconChange}
                  onColorChange={handlers.onProjectIconColorChange}
                  size={32}
                />
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
                    fontSize: 24,
                    fontWeight: 600,
                    lineHeight: 1.2,
                    height: 36,
                    minHeight: 36,
                    paddingInline: 0,
                  },
                }}
              />
              <TextInput
                aria-label={t('modal.projectSummary')}
                placeholder={t('modal.projectSummary')}
                value={summary}
                onChange={handlers.New_project_summary_onChange}
                variant="unstyled"
                size="lg"
                styles={{
                  input: { fontSize: 16, height: 30, minHeight: 30, paddingInline: 0 },
                }}
              />
              <Group gap="xs" wrap="wrap" align="center">
                <Select
                  aria-label={t('field.status')}
                  value={status}
                  onChange={handlers.New_project_status_onChange}
                  size="xs"
                  style={{ width: 110 }}
                  styles={{ input: { borderRadius: 999 } }}
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
                  size="xs"
                  style={{ width: 100 }}
                  styles={{ input: { borderRadius: 999 } }}
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
                  placeholder={t('projectList.leadUnassigned')}
                  size="xs"
                  style={{ width: 110 }}
                  styles={{ input: { borderRadius: 999 } }}
                  searchable
                  clearable
                  comboboxProps={{ withinPortal: false }}
                  data={[{ value: 'self', label: t('projectList.leadYou') }]}
                />
                <ProjectDateProperty
                  label={t('modal.projectStartDate')}
                  value={startDate}
                  onChange={handlers.onProjectStartDateChange}
                />
                <ProjectDateProperty
                  label={t('modal.projectTargetDate')}
                  value={targetDate}
                  onChange={handlers.onProjectTargetDateChange}
                />
                <MultiSelect
                  aria-label={t('filters.projectLabels')}
                  placeholder={t('filters.projectLabels')}
                  value={selectedLabels}
                  onChange={handlers.New_project_labels_onChange}
                  data={availableLabels.map((label) => ({
                    value: label.name,
                    label: label.name,
                  }))}
                  searchable
                  hidePickedOptions
                  maxDropdownHeight={240}
                  size="xs"
                  style={{ minWidth: 180, maxWidth: 280 }}
                  styles={{ input: { borderRadius: 999 } }}
                />
                <ProjectCreateDependencyQuickAdd
                  available={availableDependencyProjects.length > 0}
                  onOpen={handlers.onOpenDependencyDraft}
                />
              </Group>
              <ProjectCreateDependencySummary model={model} handlers={handlers} />
              <Textarea
                aria-label={t('modal.projectDescription')}
                placeholder={t('modal.projectDescription')}
                value={description}
                onChange={handlers.New_project_description_onChange}
                minRows={16}
                autosize
                variant="unstyled"
                styles={{ input: { borderTop: '1px solid var(--mantine-color-default-border)' } }}
              />
              <Stack gap="xs" aria-label={t('projectMilestones.heading')}>
                <Group justify="space-between" mih={32}>
                  <Button
                    type="button"
                    variant="subtle"
                    color="gray"
                    size="compact-sm"
                    leftSection={
                      <IconChevronDown
                        size={14}
                        stroke={1.8}
                        aria-hidden="true"
                        style={{
                          transform: milestonesExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                          transition: 'transform 120ms ease',
                        }}
                      />
                    }
                    aria-expanded={milestonesExpanded}
                    aria-controls="project-create-milestones-content"
                    onClick={handlers.onToggleMilestones}
                  >
                    {t('projectMilestones.heading')}
                  </Button>
                  <Button
                    type="button"
                    variant="subtle"
                    size="compact-sm"
                    leftSection={<IconPlus size={14} stroke={1.7} aria-hidden="true" />}
                    onClick={handlers.onOpenMilestoneDraft}
                  >
                    {t('projectMilestones.addToProject')}
                  </Button>
                </Group>
                <Collapse expanded={milestonesExpanded} transitionDuration={140} animateOpacity>
                  <Stack id="project-create-milestones-content" gap="xs">
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
                </Collapse>
              </Stack>
            </Stack>
          </Box>
          <Group
            justify="flex-end"
            px="lg"
            py="md"
            style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
          >
            <Button type="button" variant="default" onClick={handlers.onCloseCreateProject}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={!name.trim()}>
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
