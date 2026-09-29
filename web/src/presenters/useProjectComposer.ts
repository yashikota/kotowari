import { useNavigate, useRouter } from '@tanstack/react-router';
import type * as React from 'react';
import { useMemo, useState } from 'react';
import { api } from '../api.ts';
import { useRootMachineFlag } from '../application/Root.tsx';
import { signals } from '../application/mediator.ts';
import i18n from '../i18n/index.ts';
import { LABEL_COLORS } from '../label-colors.ts';
import type {
  Label,
  Project,
  ProjectDependency,
  ProjectTemplate,
  ProjectWorkflowStatus,
} from '../types.ts';
import { projectWorkflowStatusCategory } from '../project-workflow.tsx';

type ProjectMilestoneDraft = { name: string; description: string; targetDate: string };

type Props = {
  projects: Project[];
  labels: Label[];
  templates: ProjectTemplate[];
  workflowStatuses: ProjectWorkflowStatus[];
};

export function useProjectComposer({ projects, labels, templates, workflowStatuses }: Props) {
  const router = useRouter();
  const navigate = useNavigate({ from: '/projects' });
  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [icon, setIcon] = useState('cube');
  const [iconColor, setIconColor] = useState('blue');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('backlog');
  const [lead, setLead] = useState<'' | 'self'>('');
  const [priority, setPriority] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [createdLabels, setCreatedLabels] = useState<Label[]>([]);
  const [labelQuery, setLabelQuery] = useState('');
  const [labelCreatePending, setLabelCreatePending] = useState(false);
  const [labelCreateError, setLabelCreateError] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [initialMilestones, setInitialMilestones] = useState<ProjectMilestoneDraft[]>([]);
  const [milestonesExpanded, setMilestonesExpanded] = useState(false);
  const [milestoneDraftOpen, setMilestoneDraftOpen] = useState(false);
  const [milestoneDraftName, setMilestoneDraftName] = useState('');
  const [milestoneDraftDescription, setMilestoneDraftDescription] = useState('');
  const [milestoneDraftTargetDate, setMilestoneDraftTargetDate] = useState('');
  const [initialDependencies, setInitialDependencies] = useState<ProjectDependency[]>([]);
  const [dependencyDraftOpen, setDependencyDraftOpen] = useState(false);
  const [dependencyDraftProjectSlug, setDependencyDraftProjectSlug] = useState('');
  const [dependencyDraftKind, setDependencyDraftKind] =
    useState<ProjectDependency['kind']>('blocks');
  const [createOpen, setCreateOpen] = useRootMachineFlag('project.create');
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantId, setAssistantId] = useState('');
  const availableLabels = useMemo(() => {
    const labelsById = new Map(labels.map((label) => [label.id, label]));
    for (const label of createdLabels) labelsById.set(label.id, label);
    return [...labelsById.values()];
  }, [createdLabels, labels]);
  const availableDependencyProjects = projects.filter(
    (project) => !initialDependencies.some((dependency) => dependency.projectSlug === project.slug),
  );

  async function createProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const projectName = name.trim();
    if (!projectName) return;
    const base =
      projectName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || `project-${Date.now()}`;
    let slug = base;
    for (let suffix = 2; projects.some((project) => project.slug === slug); suffix++)
      slug = `${base}-${suffix}`;
    const project = await api.createProject({
      name: projectName,
      slug,
      summary,
      icon,
      iconColor,
      description,
      status: projectWorkflowStatusCategory(status, workflowStatuses),
      workflowStatus: status,
      lead,
      ...(selectedTemplate ? { templateSlug: selectedTemplate } : {}),
      priority,
      ...(startDate ? { startDate } : {}),
      ...(targetDate ? { targetDate } : {}),
      labels: selectedLabels,
      dependencies: initialDependencies,
      milestones: initialMilestones.map((milestone) => ({
        name: milestone.name,
        ...(milestone.description ? { description: milestone.description } : {}),
        ...(milestone.targetDate ? { targetDate: milestone.targetDate } : {}),
      })),
    });
    setCreateOpen(false);
    await navigate({
      to: '/projects/$slug',
      params: { slug: project.slug },
      state: { autofocus: 'description' },
    });
  }

  async function createProjectLabel(value: string) {
    const labelName = value.trim();
    if (!labelName || labelCreatePending) return;
    const existingLabel = availableLabels.find(
      (label) => label.name.toLocaleLowerCase() === labelName.toLocaleLowerCase(),
    );
    if (existingLabel) {
      setSelectedLabels((current) =>
        current.includes(existingLabel.name) ? current : [...current, existingLabel.name],
      );
      setLabelQuery('');
      return;
    }

    setLabelCreatePending(true);
    setLabelCreateError('');
    try {
      const created = await api.createLabel({
        name: labelName,
        color: LABEL_COLORS[availableLabels.length % LABEL_COLORS.length] ?? '#c4a574',
      });
      setCreatedLabels((current) => [...current, created]);
      setSelectedLabels((current) =>
        current.includes(created.name) ? current : [...current, created.name],
      );
      setLabelQuery('');
      signals.dispatchEvent(new Event('kotowari:refresh'));
      await router.invalidate();
    } catch {
      setLabelCreateError(i18n.t('projectLabelPicker.createFailed'));
    } finally {
      setLabelCreatePending(false);
    }
  }

  function applyTemplate(slug: string | null) {
    setSelectedTemplate(slug);
    const template = templates.find((candidate) => candidate.slug === slug);
    if (!template) return;
    setSummary(template.summary ?? '');
    setIcon(template.icon ?? '');
    setIconColor(template.iconColor ?? 'grey');
    setDescription(template.description);
    const templateStatus = template.workflowStatus ?? template.status;
    setStatus(
      workflowStatuses.some((workflowStatus) => workflowStatus.id === templateStatus)
        ? templateStatus
        : template.status,
    );
    setLead(template.lead ?? '');
    setPriority(template.priority);
    setSelectedLabels(
      template.labels.filter((label) =>
        availableLabels.some((available) => available.name === label),
      ),
    );
    setInitialMilestones(
      template.milestones.map((milestone) => ({
        name: milestone.name,
        description: milestone.description ?? '',
        targetDate: '',
      })),
    );
    setMilestonesExpanded(template.milestones.length > 0);
  }

  async function deleteSelectedTemplate() {
    if (!selectedTemplate) return;
    const template = templates.find((candidate) => candidate.slug === selectedTemplate);
    if (
      !template ||
      !window.confirm(i18n.t('projectTemplates.deleteConfirmation', { name: template.name }))
    )
      return;
    await api.deleteProjectTemplate(selectedTemplate);
    setSelectedTemplate(null);
    await router.invalidate();
  }

  function addInitialMilestone() {
    const milestoneName = milestoneDraftName.trim();
    if (!milestoneName) return;
    setInitialMilestones((current) => [
      ...current,
      {
        name: milestoneName,
        description: milestoneDraftDescription.trim(),
        targetDate: milestoneDraftTargetDate,
      },
    ]);
    setMilestoneDraftOpen(false);
    setMilestoneDraftName('');
    setMilestoneDraftDescription('');
    setMilestoneDraftTargetDate('');
  }

  function addInitialDependency() {
    if (!dependencyDraftProjectSlug) return;
    setInitialDependencies((current) => [
      ...current,
      { projectSlug: dependencyDraftProjectSlug, kind: dependencyDraftKind },
    ]);
    setDependencyDraftOpen(false);
    setDependencyDraftProjectSlug('');
  }

  return {
    data: {
      availableLabels,
      selectedProjectTemplate: selectedTemplate,
      name,
      summary,
      icon,
      iconColor,
      description,
      status,
      lead,
      priority,
      startDate,
      targetDate,
      selectedLabels,
      projectLabelQuery: labelQuery,
      projectLabelCreatePending: labelCreatePending,
      projectLabelCreateError: labelCreateError,
      initialMilestones,
      milestonesExpanded,
      milestoneDraftOpen,
      milestoneDraftName,
      milestoneDraftDescription,
      milestoneDraftTargetDate,
      initialDependencies,
      dependencyDraftOpen,
      dependencyDraftProjectSlug,
      dependencyDraftKind,
      availableDependencyProjects,
      projectNameBySlug: Object.fromEntries(
        projects.map((project) => [project.slug, project.name]),
      ),
      createOpen,
      projectAssistantOpen: assistantOpen,
      projectAssistantId: assistantId,
    },
    handlers: {
      onSubmit0: (event: Parameters<NonNullable<React.ComponentProps<'form'>['onSubmit']>>[0]) =>
        createProject(event),
      onOpenCreateProject: () => {
        setAssistantOpen(false);
        setAssistantId(`project-draft-${crypto.randomUUID()}`);
        setSelectedTemplate(null);
        setName('');
        setSummary('');
        setIcon('cube');
        setIconColor('blue');
        setDescription('');
        setStatus('backlog');
        setLead('');
        setPriority(0);
        setStartDate('');
        setTargetDate('');
        setSelectedLabels([]);
        setLabelQuery('');
        setLabelCreateError('');
        setInitialMilestones([]);
        setMilestonesExpanded(false);
        setMilestoneDraftOpen(false);
        setMilestoneDraftName('');
        setMilestoneDraftDescription('');
        setMilestoneDraftTargetDate('');
        setInitialDependencies([]);
        setDependencyDraftOpen(false);
        setDependencyDraftProjectSlug('');
        setDependencyDraftKind('blocks');
        setCreateOpen(true);
      },
      onCloseCreateProject: () => setCreateOpen(false),
      onToggleProjectAssistant: () => setAssistantOpen((current) => !current),
      onProjectTemplateChange: (value: string | null) => applyTemplate(value),
      onDeleteProjectTemplate: deleteSelectedTemplate,
      onToggleMilestones: () => setMilestonesExpanded((current) => !current),
      onOpenMilestoneDraft: () => {
        setMilestonesExpanded(true);
        setMilestoneDraftOpen(true);
      },
      onCancelMilestoneDraft: () => {
        setMilestoneDraftOpen(false);
        setMilestoneDraftName('');
        setMilestoneDraftDescription('');
        setMilestoneDraftTargetDate('');
      },
      onMilestoneDraftNameChange: (event: React.ChangeEvent<HTMLInputElement>) =>
        setMilestoneDraftName(event.target.value),
      onMilestoneDraftNameKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          addInitialMilestone();
        }
      },
      onMilestoneDraftDescriptionChange: (event: React.ChangeEvent<HTMLTextAreaElement>) =>
        setMilestoneDraftDescription(event.target.value),
      onMilestoneDraftTargetDateChange: (value: string) => setMilestoneDraftTargetDate(value),
      onAddInitialMilestone: addInitialMilestone,
      onRemoveInitialMilestone: (index: number) =>
        setInitialMilestones((current) => current.filter((_, itemIndex) => itemIndex !== index)),
      onOpenDependencyDraft: () => setDependencyDraftOpen(true),
      onCancelDependencyDraft: () => {
        setDependencyDraftOpen(false);
        setDependencyDraftProjectSlug('');
      },
      onDependencyDraftProjectChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
        setDependencyDraftProjectSlug(event.target.value),
      onDependencyDraftKindChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
        setDependencyDraftKind(event.target.value as ProjectDependency['kind']),
      onAddInitialDependency: addInitialDependency,
      onRemoveInitialDependency: (projectSlug: string) =>
        setInitialDependencies((current) =>
          current.filter((dependency) => dependency.projectSlug !== projectSlug),
        ),
      New_project_name_onChange1: (
        event: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setName(event.target.value),
      New_project_summary_onChange: (
        event: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setSummary(event.target.value),
      onProjectIconChange: (value: string) => setIcon(value),
      onProjectIconColorChange: (value: string) => setIconColor(value),
      New_project_description_onChange: (
        event: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => setDescription(event.target.value),
      New_project_status_onChange: (value: string | null) => value && setStatus(value),
      New_project_priority_onChange: (value: string | null) =>
        value !== null && setPriority(Number(value)),
      New_project_lead_onChange: (value: string | null) => setLead(value === 'self' ? 'self' : ''),
      onProjectStartDateChange: (value: string) => setStartDate(value),
      onProjectTargetDateChange: (value: string) => setTargetDate(value),
      New_project_labels_onChange: (value: string[]) => setSelectedLabels(value),
      onProjectLabelsSearchChange: (value: string) => {
        setLabelQuery(value);
        setLabelCreateError('');
      },
      onCreateProjectLabel: createProjectLabel,
    },
  };
}
