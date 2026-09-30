import { useLoaderData, useNavigate, useParams, useRouter } from '@tanstack/react-router';
import type * as React from 'react';
import { useRef, useState } from 'react';
import { api } from '../api.ts';
import { useIntent, useKeyboard } from '../application/Root.tsx';
import { signals } from '../application/mediator.ts';
import i18n from '../i18n/index.ts';
import { projectDateShortcutFromKeyboard, projectDetailSequenceFromKeyboard } from '../keymap.ts';

import { IssueList } from '../components/IssueList.tsx';

import { priorityLabel } from '../i18n/labels.ts';
import type { Activity, ADR, Cycle, Issue, Label, Page, Project, ProjectHealth } from '../types.ts';
import { useProjectWorkflow, projectWorkflowStatusLabel } from '../project-workflow.tsx';

function describeProjectActivity(
  activity: Activity,
  projects: Project[],
  workflowStatuses: import('../types.ts').ProjectWorkflowStatus[],
) {
  const payload = activity.payload;
  const payloadString = (value: unknown) =>
    typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  const from = payloadString(payload.from);
  const to = payloadString(payload.to);
  switch (activity.action) {
    case 'created':
      return i18n.t('projectActivity.events.created');
    case 'status_changed':
      return i18n.t('projectActivity.events.statusChanged', {
        from: projectWorkflowStatusLabel(from, workflowStatuses, i18n.t),
        to: projectWorkflowStatusLabel(to, workflowStatuses, i18n.t),
      });
    case 'health_changed':
      return i18n.t('projectActivity.events.healthChanged', {
        from: i18n.t(`projectHealth.status.${from || 'none'}`),
        to: i18n.t(`projectHealth.status.${to || 'none'}`),
      });
    case 'priority_changed':
      return i18n.t('projectActivity.events.priorityChanged', {
        from: priorityLabel(Number(from)),
        to: priorityLabel(Number(to)),
      });
    case 'lead_changed':
      return i18n.t('projectActivity.events.leadChanged', {
        from: i18n.t(from === 'self' ? 'projectList.leadYou' : 'projectList.leadUnassigned'),
        to: i18n.t(to === 'self' ? 'projectList.leadYou' : 'projectList.leadUnassigned'),
      });
    case 'dependency_added':
    case 'dependency_removed': {
      const projectSlug = payloadString(payload.projectSlug);
      const projectName =
        projects.find((project) => project.slug === projectSlug)?.name ?? projectSlug;
      return i18n.t(
        activity.action === 'dependency_added'
          ? 'projectActivity.events.dependencyAdded'
          : 'projectActivity.events.dependencyRemoved',
        { project: projectName },
      );
    }
    case 'milestone_created':
    case 'milestone_updated':
    case 'milestone_deleted': {
      const name = payloadString(payload.name);
      const key =
        activity.action === 'milestone_created'
          ? 'projectActivity.events.milestoneCreated'
          : activity.action === 'milestone_updated'
            ? 'projectActivity.events.milestoneUpdated'
            : 'projectActivity.events.milestoneDeleted';
      return i18n.t(key, { name });
    }
    default:
      return i18n.t('projectActivity.events.updated');
  }
}

export function useProjectDetailPagePresenter() {
  const sendIntent = useIntent();
  const { slug } = useParams({ from: '/projects/$slug' });
  const data = useLoaderData({ from: '/projects/$slug' }) as {
    project: Project;
    projects: Project[];
    cycles: Cycle[];
    issues: Issue[];
    adrs: ADR[];
    pages: Page[];
    labels: Label[];
    activities: Activity[];
    initiatives: import('../types.ts').Initiative[];
  };
  const router = useRouter();
  const { statuses: projectWorkflowStatuses } = useProjectWorkflow();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [project, setProject] = useState(data.project);
  const summaryDraft = useRef({ slug: data.project.slug, value: data.project.summary ?? '' });
  const persistedSummary = useRef({ slug: data.project.slug, value: data.project.summary ?? '' });
  const projectSaveQueue = useRef<Promise<void>>(Promise.resolve());
  const [milestoneName, setMilestoneName] = useState('');
  const [milestoneDescription, setMilestoneDescription] = useState('');
  const [milestoneTargetDate, setMilestoneTargetDate] = useState('');
  const [dependencyProjectSlug, setDependencyProjectSlug] = useState('');
  const [dependencyKind, setDependencyKind] = useState<'blocks' | 'blocked_by' | 'related'>(
    'blocks',
  );
  const [projectUpdateOpen, setProjectUpdateOpen] = useState(false);
  const [projectUpdateHealth, setProjectUpdateHealth] = useState<ProjectHealth>(
    project.health ?? 'on_track',
  );
  const [projectUpdateBody, setProjectUpdateBody] = useState('');
  const [projectTemplateOpen, setProjectTemplateOpen] = useState(false);
  const [projectTemplateName, setProjectTemplateName] = useState('');
  const [projectTemplateError, setProjectTemplateError] = useState('');
  const [focusProjectStatus, setFocusProjectStatus] = useState(0);
  const [focusProjectLead, setFocusProjectLead] = useState(0);
  const [focusProjectInitiatives, setFocusProjectInitiatives] = useState(0);
  const [focusProjectLabels, setFocusProjectLabels] = useState(0);
  const [focusProjectStartDate, setFocusProjectStartDate] = useState(0);
  const [focusProjectTargetDate, setFocusProjectTargetDate] = useState(0);
  const projectStatusSequenceSince = useRef<number | null>(null);
  const projectStatusSequenceSlug = useRef(slug);

  useKeyboard((event) => {
    if (projectStatusSequenceSlug.current !== slug) {
      projectStatusSequenceSlug.current = slug;
      projectStatusSequenceSince.current = null;
    }
    if (
      event.target instanceof Element &&
      event.target.closest('[role="menu"], [role="listbox"], [role="dialog"]')
    ) {
      projectStatusSequenceSince.current = null;
      return false;
    }
    const dateShortcut = projectDateShortcutFromKeyboard(event);
    if (dateShortcut) {
      event.preventDefault();
      if (dateShortcut === 'focus-project-start-date') {
        setFocusProjectStartDate((current) => current + 1);
      } else {
        setFocusProjectTargetDate((current) => current + 1);
      }
      return true;
    }
    const sequence = projectDetailSequenceFromKeyboard(
      event,
      projectStatusSequenceSince.current,
      Date.now(),
    );
    projectStatusSequenceSince.current = sequence.pendingSince;
    if (
      sequence.action === 'focus-project-status' ||
      sequence.action === 'focus-project-lead' ||
      sequence.action === 'focus-project-initiatives' ||
      sequence.action === 'focus-project-labels'
    ) {
      event.preventDefault();
      if (sequence.action === 'focus-project-status') {
        setFocusProjectStatus((current) => current + 1);
      } else if (sequence.action === 'focus-project-lead') {
        setFocusProjectLead((current) => current + 1);
      } else if (sequence.action === 'focus-project-initiatives') {
        setFocusProjectInitiatives((current) => current + 1);
      } else {
        setFocusProjectLabels((current) => current + 1);
      }
      return true;
    }
    if (sequence.pendingSince !== null) {
      event.preventDefault();
      return true;
    }
    return false;
  });

  if (project.slug !== data.project.slug) {
    setProject(data.project);
    summaryDraft.current = { slug: data.project.slug, value: data.project.summary ?? '' };
    persistedSummary.current = { slug: data.project.slug, value: data.project.summary ?? '' };
    setSelected(null);
    setDependencyProjectSlug('');
    setDependencyKind('blocks');
    setProjectUpdateHealth(data.project.health ?? 'on_track');
    setProjectUpdateBody('');
    setProjectUpdateOpen(false);
  }

  async function save(body: Record<string, unknown>) {
    const before = project;
    const pending = projectSaveQueue.current
      .catch(() => undefined)
      .then(async () => {
        const patch = { ...body };
        if (
          !('summary' in patch) &&
          summaryDraft.current.slug === slug &&
          persistedSummary.current.slug === slug &&
          summaryDraft.current.value !== persistedSummary.current.value
        ) {
          patch.summary = summaryDraft.current.value;
        }
        const next = await api.patchProject(slug, patch);
        if ('summary' in patch && persistedSummary.current.slug === slug) {
          persistedSummary.current = { slug, value: next.summary ?? '' };
        }
        setProject((current) => {
          const locallyEditable = [
            'name',
            'summary',
            'icon',
            'iconColor',
            'description',
            'status',
            'workflowStatus',
            'isFavorite',
            'lead',
            'health',
            'priority',
            'startDate',
            'targetDate',
            'labels',
            'initiativeSlugs',
          ] as const;
          const newerEdits = Object.fromEntries(
            locallyEditable
              .filter((field) => current[field] !== before[field])
              .map((field) => [field, current[field]]),
          );
          return current.slug === before.slug ? { ...next, ...newerEdits } : current;
        });
        await router.invalidate();
      });
    projectSaveQueue.current = pending.then(
      () => undefined,
      () => undefined,
    );
    await pending;
  }

  async function refreshProject() {
    await router.invalidate();
    setProject(await api.project(slug));
  }

  async function createMilestone(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = milestoneName.trim();
    if (!name) return;
    await api.createMilestone(slug, {
      name,
      ...(milestoneDescription.trim() ? { description: milestoneDescription.trim() } : {}),
      ...(milestoneTargetDate ? { targetDate: milestoneTargetDate } : {}),
    });
    setMilestoneName('');
    setMilestoneDescription('');
    setMilestoneTargetDate('');
    await refreshProject();
  }

  return {
    _view: 0 as const,
    slug,
    data,
    focusProjectStatus,
    focusProjectLead,
    focusProjectInitiatives,
    focusProjectLabels,
    focusProjectStartDate,
    focusProjectTargetDate,
    projectWorkflowStatuses,
    selected,
    project,
    projectUpdates: data.activities.flatMap((activity) => {
      if (activity.action !== 'status_update_posted') return [];
      const health = activity.payload.health;
      const body = activity.payload.body;
      if (
        (health !== 'on_track' && health !== 'at_risk' && health !== 'off_track') ||
        typeof body !== 'string'
      ) {
        return [];
      }
      return [
        { id: activity.id, health: health as ProjectHealth, body, createdAt: activity.createdAt },
      ];
    }),
    projectActivityItems: data.activities
      .filter((activity) => activity.action !== 'status_update_posted')
      .map((activity) => ({
        id: activity.id,
        message: describeProjectActivity(activity, data.projects, projectWorkflowStatuses),
        createdAt: activity.createdAt,
      })),
    projectUpdateOpen,
    projectUpdateHealth,
    projectUpdateBody,
    projectTemplateOpen,
    projectTemplateName,
    projectTemplateError,
    availableDependencyProjects: data.projects.filter(
      (candidate) =>
        candidate.slug !== slug &&
        !(project.dependencies ?? []).some(
          (dependency) => dependency.projectSlug === candidate.slug,
        ),
    ),
    dependencyProjectSlug,
    dependencyKind,
    milestoneName,
    milestoneDescription,
    milestoneTargetDate,
    handlers: {
      onStatusChange: (e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0]) =>
        save({ workflowStatus: e.target.value }),
      onPriorityChange: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => save({ priority: Number(e.target.value) }),
      onToggleFavorite: async () => {
        await save({ isFavorite: !project.isFavorite });
        signals.dispatchEvent(new Event('kotowari:refresh'));
      },
      onProjectLeadChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
        save({ lead: e.target.value }),
      onProjectHealthChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
        save({ health: e.target.value === 'none' ? '' : e.target.value }),
      onOpenProjectUpdate: () => {
        setProjectUpdateHealth(project.health ?? 'on_track');
        setProjectUpdateBody('');
        setProjectUpdateOpen(true);
      },
      onCloseProjectUpdate: () => setProjectUpdateOpen(false),
      onProjectUpdateHealthChange: (value: string | null) =>
        setProjectUpdateHealth((value ?? 'on_track') as ProjectHealth),
      onProjectUpdateBodyChange: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
        setProjectUpdateBody(e.target.value),
      onSubmitProjectUpdate: async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const body = projectUpdateBody.trim();
        if (!body) return;
        await api.postProjectUpdate(slug, projectUpdateHealth, body);
        setProjectUpdateOpen(false);
        setProjectUpdateBody('');
        await refreshProject();
      },
      onOpenProjectTemplate: () => {
        setProjectTemplateName(project.name);
        setProjectTemplateError('');
        setProjectTemplateOpen(true);
      },
      onCloseProjectTemplate: () => setProjectTemplateOpen(false),
      onProjectTemplateNameChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        setProjectTemplateName(e.target.value);
        setProjectTemplateError('');
      },
      onSubmitProjectTemplate: async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const name = projectTemplateName.trim();
        if (!name) return;
        try {
          await api.createProjectTemplate(slug, name);
          setProjectTemplateOpen(false);
          setProjectTemplateName('');
          setProjectTemplateError('');
          await router.invalidate();
        } catch (error) {
          setProjectTemplateError(
            error instanceof Error && error.message.includes('already exists')
              ? i18n.t('projectTemplates.duplicateName')
              : i18n.t('projectTemplates.saveFailed'),
          );
        }
      },
      onProjectLabelsChange: (labels: string[]) => save({ labels }),
      onProjectInitiativesChange: (initiativeSlugs: string[]) => save({ initiativeSlugs }),
      onDependencyProjectChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
        setDependencyProjectSlug(e.target.value),
      onDependencyKindChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
        setDependencyKind(e.target.value as typeof dependencyKind),
      onAddProjectDependency: async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!dependencyProjectSlug) return;
        await api.createProjectDependency(slug, {
          projectSlug: dependencyProjectSlug,
          kind: dependencyKind,
        });
        setDependencyProjectSlug('');
        await refreshProject();
      },
      onRemoveProjectDependency: async (dependencySlug: string) => {
        await api.deleteProjectDependency(slug, dependencySlug);
        await refreshProject();
      },
      onCreateIssue: () => sendIntent('issue.create', { projectId: project.id }),
      onToggleProjectArchived: async () => {
        const archived = !project.archivedAt;
        await api.patchProject(slug, { archived });
        signals.dispatchEvent(new Event('kotowari:refresh'));
        await navigate({ to: '/projects', search: { archived } });
      },
      onDeleteProject: () => {
        if (!window.confirm(i18n.t('ui.deleteProjectConfirmation', { name: project.name }))) {
          return;
        }
        return api.deleteProject(slug).then(async () => {
          await router.invalidate();
          await navigate({ to: '/projects' });
        });
      },
      onDescriptionChange: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => setProject({ ...project, description: e.target.value }),
      onDescriptionBlur: () => save({ description: project.description }),
      onSummaryChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => {
        const summaryValue = e.currentTarget.value;
        summaryDraft.current = { slug, value: summaryValue };
        setProject((current) => ({ ...current, summary: summaryValue }));
      },
      onSummaryBlur: (e: React.FocusEvent<HTMLInputElement>) =>
        save({ summary: e.currentTarget.value }),
      onProjectIconChange: (value: string) => save({ icon: value }),
      onProjectIconColorChange: (value: string) => save({ iconColor: value }),
      onStartDateChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => save(e.target.value ? { startDate: e.target.value } : { clearStartDate: true }),
      onTargetDateChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => save(e.target.value ? { targetDate: e.target.value } : { clearTargetDate: true }),
      onCreateADR: () => {
        const title = window.prompt(i18n.t('modal.adrTitle'));
        if (title?.trim())
          return api
            .createADR({ title, projectSlug: slug })
            .then((a) =>
              navigate({ to: '/adrs/$identifier', params: { identifier: a.identifier } }),
            );
      },
      onMilestoneNameChange: (
        id: number,
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) =>
        setProject({
          ...project,
          milestones: project.milestones.map((item) =>
            item.id === id ? { ...item, name: e.target.value } : item,
          ),
        }),
      onMilestoneNameBlur: async (id: number) => {
        const milestone = project.milestones.find((item) => item.id === id);
        if (!milestone) return;
        await api.patchMilestone(slug, id, { name: milestone.name });
        await refreshProject();
      },
      onMilestoneTargetDateChange: (
        id: number,
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) =>
        setProject({
          ...project,
          milestones: project.milestones.map((item) =>
            item.id === id ? { ...item, targetDate: e.target.value || null } : item,
          ),
        }),
      onMilestoneTargetDateBlur: async (id: number) => {
        const milestone = project.milestones.find((item) => item.id === id);
        if (!milestone) return;
        await api.patchMilestone(slug, id, { targetDate: milestone.targetDate });
        await refreshProject();
      },
      onMilestoneDescriptionBlur: async (id: number, description: string) => {
        await api.patchMilestone(slug, id, { description });
        await refreshProject();
      },
      onRemoveMilestone: async (id: number, name: string) => {
        if (!window.confirm(i18n.t('projectMilestones.removeConfirmation', { name }))) return;
        await api.deleteMilestone(slug, id);
        await refreshProject();
      },
      onMilestoneNameDraftChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setMilestoneName(e.target.value),
      onMilestoneTargetDateDraftChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setMilestoneTargetDate(e.target.value),
      onMilestoneDescriptionDraftChange: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => setMilestoneDescription(e.target.value),
      onCreateMilestone: (e: React.FormEvent<HTMLFormElement>) => createMilestone(e),
      onIssueSelect: (
        ...args: Parameters<NonNullable<React.ComponentProps<typeof IssueList>['onSelect']>>
      ) => {
        const handle: NonNullable<React.ComponentProps<typeof IssueList>['onSelect']> = setSelected;
        return handle(...args);
      },
    },
  };
}
