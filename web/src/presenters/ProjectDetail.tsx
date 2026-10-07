import { useProjectDependencyChanges } from './useProjectDependencyChanges.ts';
import { useHealthUpdateSubmission } from './useHealthUpdateSubmission.ts';
import { useReminderEditor } from './useReminderEditor.ts';
import { useClipboardCopy } from './useClipboardCopy.ts';
import { useMilestoneEdits } from './useMilestoneEdits.ts';
import { useItemRemoval } from './useItemRemoval.ts';
import { useRetriableCreation } from './useRetriableCreation.ts';
import { useRetriableSave } from './useRetriableSave.ts';
import { useRetriableRemoval } from './useRetriableRemoval.ts';
import { useLoaderData, useNavigate, useParams, useRouter } from '@tanstack/react-router';
import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { api } from '../api.ts';
import { useIntent, useKeyboard } from '../application/Root.tsx';
import { signals } from '../application/mediator.ts';
import i18n from '../i18n/index.ts';
import {
  projectDateShortcutFromKeyboard,
  projectDetailSequenceFromKeyboard,
  projectEntityShortcutFromKeyboard,
} from '../keymap.ts';

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
  const [projectActivities, setProjectActivities] = useState(data.activities);
  const projectRefreshGeneration = useRef(0);
  useEffect(() => {
    if (data.project.slug !== slug) return;
    setProjectActivities((current) =>
      Array.from(
        new Map([...current, ...data.activities].map((item) => [item.id, item])).values(),
      ).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id),
    );
  }, [data.activities, data.project.slug, slug]);
  const latestProject = useRef(project);
  latestProject.current = project;
  const summaryDraft = useRef({ slug: data.project.slug, value: data.project.summary ?? '' });
  const persistedSummary = useRef({ slug: data.project.slug, value: data.project.summary ?? '' });
  const persistedDescription = useRef({ slug: data.project.slug, value: data.project.description });
  const projectSaveQueue = useRef<Promise<void>>(Promise.resolve());
  const [projectSavingCount, setProjectSavingCount] = useState(0);
  const [projectSaveError, setProjectSaveError] = useState('');
  const [projectSaved, setProjectSaved] = useState(false);
  const failedProjectPatch = useRef<Record<string, unknown> | null>(null);
  const saveScope = useRef(slug);
  const saveGeneration = useRef(0);
  const pendingProjectSaves = useRef(0);
  saveScope.current = slug;
  useEffect(() => {
    return () => {
      saveGeneration.current++;
    };
  }, []);
  const [milestoneName, setMilestoneName] = useState('');
  const [milestoneDescription, setMilestoneDescription] = useState('');
  const [milestoneTargetDate, setMilestoneTargetDate] = useState('');
  const [milestoneNameError, setMilestoneNameError] = useState('');
  const [milestoneValidationAttempt, setMilestoneValidationAttempt] = useState(0);
  const [milestoneCreated, setMilestoneCreated] = useState(false);
  const [dependencyProjectSlug, setDependencyProjectSlug] = useState('');
  const [dependencyKind, setDependencyKind] = useState<'blocks' | 'blocked_by' | 'related'>(
    'blocks',
  );
  const [projectTemplateOpen, setProjectTemplateOpen] = useState(false);
  const [projectTemplateName, setProjectTemplateName] = useState('');
  const [projectTemplateError, setProjectTemplateError] = useState('');
  const [focusProjectStatus, setFocusProjectStatus] = useState(0);
  const [focusProjectLead, setFocusProjectLead] = useState(0);
  const [focusProjectInitiatives, setFocusProjectInitiatives] = useState(0);
  const [focusProjectLabels, setFocusProjectLabels] = useState(0);
  const [focusProjectStartDate, setFocusProjectStartDate] = useState(0);
  const [focusProjectTargetDate, setFocusProjectTargetDate] = useState(0);
  const [focusProjectUpdates, setFocusProjectUpdates] = useState(0);
  const [reminderMenuOpen, setReminderMenuOpen] = useState(false);
  const [projectActionsOpen, setProjectActionsOpen] = useState(false);
  const reminderEditor = useReminderEditor({
    entityKey: slug,
    reminderAt: project.reminderAt,
    save: setReminder,
    onSuccess: () => setReminderMenuOpen(false),
  });
  const clipboard = useClipboardCopy(slug);
  const deletion = useRetriableRemoval({
    scope: slug,
    remove: api.deleteProject,
    openList: async () => {
      await navigate({ to: '/projects' });
      signals.dispatchEvent(new Event('kotowari:refresh'));
    },
  });
  const milestoneRemoval = useItemRemoval<number>({
    scope: slug,
    remove: (id) => api.deleteMilestone(slug, id),
    refresh: refreshProject,
    onRemoved: (id) => {
      if (saveScope.current !== slug) return;
      setProject((current) =>
        current.slug === slug
          ? { ...current, milestones: current.milestones.filter((item) => item.id !== id) }
          : current,
      );
    },
  });
  const [archiveSaved, setArchiveSaved] = useState(false);
  useEffect(() => setArchiveSaved(false), [slug]);
  const archive = useRetriableSave<boolean, Project>({
    scope: slug,
    save: (archived) => api.patchProject(slug, { archived }),
    onSuccess: (next) => {
      if (saveScope.current !== slug) return;
      setProject((current) =>
        current.slug === slug ? { ...current, archivedAt: next.archivedAt } : current,
      );
      setArchiveSaved(true);
      void router.invalidate().catch(() => undefined);
      signals.dispatchEvent(new Event('kotowari:refresh'));
    },
    onFailure: () => setArchiveSaved(false),
  });
  const milestoneEdits = useMilestoneEdits({
    scope: slug,
    milestones: project.milestones,
    save: (id, body) => api.patchMilestone(slug, id, body),
    onSaved: (milestone) => {
      setProject((current) =>
        current.slug === slug
          ? {
              ...current,
              milestones: current.milestones.map((item) =>
                item.id === milestone.id ? milestone : item,
              ),
            }
          : current,
      );
      const token = saveGeneration.current;
      void api
        .projectActivities(slug)
        .then((activities) => {
          if (saveScope.current === slug && token === saveGeneration.current)
            setProjectActivities(activities);
        })
        .catch(() => undefined);
    },
  });
  const projectStatusSequenceSince = useRef<number | null>(null);
  const projectStatusSequenceSlug = useRef(slug);

  function copyProjectId() {
    setProjectActionsOpen(false);
    return clipboard.copy(String(project.id));
  }

  function copyProjectURL() {
    setProjectActionsOpen(false);
    const url = new URL(`/projects/${encodeURIComponent(project.slug)}`, window.location.origin);
    return clipboard.copy(url.href);
  }

  function copyProjectTitle() {
    setProjectActionsOpen(false);
    return clipboard.copy(project.name);
  }

  async function setReminder(value: Date | null) {
    const token = saveGeneration.current;
    const next = await api.patchProject(
      slug,
      value ? { reminderAt: value.toISOString() } : { clearReminder: true },
    );
    if (saveScope.current !== slug || token !== saveGeneration.current) return;
    setProject((current) =>
      current.slug === slug ? { ...current, reminderAt: next.reminderAt } : current,
    );
    signals.dispatchEvent(new Event('kotowari:refresh'));
  }

  useKeyboard((event) => {
    if (deletion.opened || deletion.isPending() || deletion.isRemoved() || milestoneRemoval.opened)
      return false;
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
    const entityShortcut = projectEntityShortcutFromKeyboard(event);
    if (entityShortcut) {
      event.preventDefault();
      if (entityShortcut === 'open-reminder-menu') setReminderMenuOpen(true);
      else if (entityShortcut === 'focus-updates') {
        setFocusProjectUpdates((current) => current + 1);
      } else if (entityShortcut === 'copy-id') void copyProjectId();
      else if (entityShortcut === 'copy-url') void copyProjectURL();
      else void copyProjectTitle();
      return true;
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
    saveGeneration.current++;
    pendingProjectSaves.current = 0;
    setProjectSavingCount(0);
    setProjectSaveError('');
    setProjectSaved(false);
    failedProjectPatch.current = null;
    setProject(data.project);
    setProjectActivities(data.activities);
    projectRefreshGeneration.current++;
    summaryDraft.current = { slug: data.project.slug, value: data.project.summary ?? '' };
    persistedSummary.current = { slug: data.project.slug, value: data.project.summary ?? '' };
    persistedDescription.current = { slug: data.project.slug, value: data.project.description };
    setMilestoneName('');
    setMilestoneDescription('');
    setMilestoneTargetDate('');
    setMilestoneNameError('');
    setMilestoneCreated(false);
    setSelected(null);
    setDependencyProjectSlug('');
    setDependencyKind('blocks');
    setReminderMenuOpen(false);
    setProjectActionsOpen(false);
  }

  async function save(body: Record<string, unknown>) {
    if (deletion.isPending() || deletion.isRemoved()) return;
    const before = project;
    const token = saveGeneration.current;
    pendingProjectSaves.current++;
    setProjectSavingCount((count) => count + 1);
    setProjectSaved(false);
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
        if (saveScope.current !== slug || token !== saveGeneration.current) return;
        if (
          failedProjectPatch.current &&
          Object.keys(failedProjectPatch.current).every((key) => key in patch)
        ) {
          failedProjectPatch.current = null;
          setProjectSaveError('');
        }
        if ('summary' in patch && persistedSummary.current.slug === slug) {
          persistedSummary.current = { slug, value: next.summary ?? '' };
        }
        if ('description' in patch)
          persistedDescription.current = { slug, value: next.description };
        setProject((current) => {
          const locallyEditable = [
            'name',
            'archivedAt',
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
            'reminderAt',
            'labels',
            'initiativeSlugs',
            'milestones',
            'dependencies',
          ] as const;
          const newerEdits = Object.fromEntries(
            locallyEditable
              .filter(
                (field) =>
                  current[field] !== before[field] ||
                  (field === 'description' &&
                    !('description' in patch) &&
                    current.description !== persistedDescription.current.value),
              )
              .map((field) => [field, current[field]]),
          );
          return current.slug === before.slug ? { ...next, ...newerEdits } : current;
        });
        const latest = latestProject.current;
        const newerText =
          latest.slug === slug &&
          ((latest.summary !== before.summary && latest.summary !== next.summary) ||
            (latest.description !== before.description && latest.description !== next.description));
        const unsavedText =
          (latest.summary ?? '') !== persistedSummary.current.value ||
          latest.description !== persistedDescription.current.value;
        setProjectSaved(!newerText && !unsavedText);
        await router.invalidate().catch(() => undefined);
      });
    projectSaveQueue.current = pending.then(
      () => undefined,
      () => undefined,
    );
    try {
      await pending;
    } catch (error) {
      if (saveScope.current === slug && token === saveGeneration.current) {
        failedProjectPatch.current = { ...failedProjectPatch.current, ...body };
        setProjectSaveError(error instanceof Error ? error.message : String(error));
        setProjectSaved(false);
      }
    } finally {
      if (saveScope.current === slug && token === saveGeneration.current) {
        pendingProjectSaves.current--;
        setProjectSavingCount((count) => count - 1);
      }
    }
  }

  async function refreshProject() {
    const milestonesBeforeRefresh = latestProject.current.milestones;
    const dependenciesBeforeRefresh = latestProject.current.dependencies;
    const token = saveGeneration.current;
    const refresh = ++projectRefreshGeneration.current;
    const [next, activities] = await Promise.all([api.project(slug), api.projectActivities(slug)]);
    if (
      saveScope.current !== slug ||
      token !== saveGeneration.current ||
      refresh !== projectRefreshGeneration.current
    )
      return;
    setProjectActivities(activities);
    const summary = persistedSummary.current.value;
    const description = persistedDescription.current.value;
    setProject((current) => ({
      ...next,
      milestones:
        current.milestones !== milestonesBeforeRefresh ? current.milestones : next.milestones,
      dependencies:
        current.dependencies !== dependenciesBeforeRefresh
          ? current.dependencies
          : next.dependencies,
      summary: (current.summary ?? '') !== summary ? current.summary : next.summary,
      description: current.description !== description ? current.description : next.description,
    }));
    persistedSummary.current = { slug, value: next.summary ?? '' };
    persistedDescription.current = { slug, value: next.description };
  }

  const healthUpdate = useHealthUpdateSubmission({
    scope: slug,
    initialHealth: project.health ?? 'on_track',
    post: (health, body) => api.postProjectUpdate(slug, health, body),
    onConfirmed: (activity) => {
      if (saveScope.current !== slug) return;
      const health = activity.payload.health;
      if (health === 'on_track' || health === 'at_risk' || health === 'off_track')
        setProject((current) => ({ ...current, health }));
      setProjectActivities((current) => [
        activity,
        ...current.filter((item) => item.id !== activity.id),
      ]);
    },
    refresh: refreshProject,
  });

  const dependencyChanges = useProjectDependencyChanges({
    scope: slug,
    onConfirmed: (change) => {
      if (saveScope.current !== slug) return;
      setProject((current) => ({
        ...current,
        dependencies:
          change.action === 'add'
            ? [
                ...(current.dependencies ?? []).filter(
                  (item) => item.projectSlug !== change.dependency.projectSlug,
                ),
                change.dependency,
              ]
            : (current.dependencies ?? []).filter(
                (item) => item.projectSlug !== change.projectSlug,
              ),
      }));
      if (change.action === 'add') setDependencyProjectSlug('');
    },
    refresh: refreshProject,
  });

  const milestoneCreation = useRetriableCreation({
    scope: slug,
    create: (body: { name: string; description?: string; targetDate?: string }) =>
      api.createMilestone(slug, body),
    open: async (milestone) => {
      if (saveScope.current !== slug) return;
      setProject((current) => ({
        ...current,
        milestones: current.milestones.some((item) => item.id === milestone.id)
          ? current.milestones
          : [...current.milestones, milestone],
      }));
      setMilestoneName('');
      setMilestoneDescription('');
      setMilestoneTargetDate('');
      await refreshProject();
    },
  });
  async function createMilestone() {
    if (milestoneCreation.isPending()) return;
    const name = milestoneName.trim();
    if (!milestoneCreation.hasCreated() && !name) {
      setMilestoneNameError(i18n.t('milestoneCreation.nameRequired'));
      setMilestoneValidationAttempt((value) => value + 1);
      return;
    }
    const token = saveGeneration.current;
    setMilestoneCreated(false);
    const success = await milestoneCreation.submit({
      name,
      ...(milestoneDescription.trim() ? { description: milestoneDescription.trim() } : {}),
      ...(milestoneTargetDate ? { targetDate: milestoneTargetDate } : {}),
    });
    if (token === saveGeneration.current && saveScope.current === slug)
      setMilestoneCreated(success);
    return success;
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
    focusProjectUpdates,
    reminderMenuOpen,
    projectActionsOpen,
    reminderEditor: reminderEditor.data,
    clipboard,
    deletion: {
      ...deletion,
      confirm: () => {
        if (
          pendingProjectSaves.current > 0 ||
          reminderEditor.data.saving ||
          archive.isPending() ||
          milestoneEdits.isPending() ||
          milestoneCreation.isPending() ||
          dependencyChanges.isPending() ||
          healthUpdate.isPending()
        )
          return;
        return deletion.confirm();
      },
    },
    projectWorkflowStatuses,
    selected,
    project,
    projectUpdates: projectActivities.flatMap((activity) => {
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
    projectActivityItems: projectActivities
      .filter((activity) => activity.action !== 'status_update_posted')
      .map((activity) => ({
        id: activity.id,
        message: describeProjectActivity(activity, data.projects, projectWorkflowStatuses),
        createdAt: activity.createdAt,
      })),
    projectUpdateOpen: healthUpdate.opened,
    projectUpdateHealth: healthUpdate.health,
    projectUpdateBody: healthUpdate.body,
    healthUpdate,
    projectTemplateOpen,
    projectTemplateName,
    projectTemplateError,
    projectSaving: projectSavingCount > 0,
    hasUnsavedText:
      (project.summary ?? '') !== persistedSummary.current.value ||
      project.description !== persistedDescription.current.value,
    projectSaveError,
    milestoneEdits,
    milestoneRemoval,
    archivePending: archive.saving,
    archiveError: archive.error,
    archiveSaved,
    projectSaved: projectSaved && !projectSaveError,
    availableDependencyProjects: data.projects.filter(
      (candidate) =>
        candidate.slug !== slug &&
        !(project.dependencies ?? []).some(
          (dependency) => dependency.projectSlug === candidate.slug,
        ),
    ),
    dependencyProjectSlug,
    dependencyKind,
    dependencyChanges: {
      ...dependencyChanges,
      dirty: Boolean(
        dependencyProjectSlug || dependencyChanges.error || dependencyChanges.confirmed,
      ),
    },
    milestoneCreation: {
      scope: slug,
      dirty: Boolean(
        milestoneName || milestoneDescription || milestoneTargetDate || milestoneCreation.created,
      ),
      pending: milestoneCreation.submitting,
      created: milestoneCreation.created,
      saved: milestoneCreated,
      error: milestoneCreation.error,
      nameError: milestoneNameError,
      validationAttempt: milestoneValidationAttempt,
    },
    milestoneName,
    milestoneDescription,
    milestoneTargetDate,
    handlers: {
      onSaveUnsavedText: async (signal?: AbortSignal) => {
        if (
          pendingProjectSaves.current > 0 ||
          milestoneEdits.isPending() ||
          milestoneCreation.isPending() ||
          dependencyChanges.isPending() ||
          healthUpdate.isPending() ||
          milestoneRemoval.isPending() ||
          deletion.isPending() ||
          deletion.isRemoved()
        )
          return;
        const token = saveGeneration.current;
        const patch = { ...failedProjectPatch.current };
        if ((project.summary ?? '') !== persistedSummary.current.value)
          patch.summary = project.summary ?? '';
        if (project.description !== persistedDescription.current.value)
          patch.description = project.description;
        if (Object.keys(patch).length > 0) await save(patch);
        if (failedProjectPatch.current || signal?.aborted) return;
        if (!(await milestoneEdits.saveAll(signal))) return;
        if (signal?.aborted || token !== saveGeneration.current || saveScope.current !== slug)
          return;
        if (
          milestoneName ||
          milestoneDescription ||
          milestoneTargetDate ||
          milestoneCreation.hasCreated()
        )
          if (!(await createMilestone())) return;
        if (signal?.aborted || token !== saveGeneration.current || saveScope.current !== slug)
          return;
        if (dependencyChanges.needsRecovery()) {
          if (!(await dependencyChanges.retry())) return;
        } else if (dependencyProjectSlug)
          if (
            !(await dependencyChanges.write({
              action: 'add',
              dependency: { projectSlug: dependencyProjectSlug, kind: dependencyKind },
            }))
          )
            return;
        if (signal?.aborted || token !== saveGeneration.current || saveScope.current !== slug)
          return;
        if (healthUpdate.dirty) return healthUpdate.submit();
      },
      onRetryProjectSave: () => {
        if (pendingProjectSaves.current > 0 || !failedProjectPatch.current) return;
        const patch = { ...failedProjectPatch.current };
        if ('summary' in patch) patch.summary = project.summary ?? '';
        if ('description' in patch) patch.description = project.description;
        return save(patch);
      },
      onStatusChange: (e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0]) =>
        save({ workflowStatus: e.target.value }),
      onPriorityChange: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => save({ priority: Number(e.target.value) }),
      onToggleFavorite: async () => {
        await save({ isFavorite: !project.isFavorite });
        signals.dispatchEvent(new Event('kotowari:refresh'));
      },
      onSetReminder: reminderEditor.write,
      onOpenCustomReminder: reminderEditor.open,
      onCloseCustomReminder: reminderEditor.close,
      onCustomReminderChange: reminderEditor.change,
      onCustomReminderSave: reminderEditor.submit,
      onRetryReminder: reminderEditor.retry,
      onReminderMenuChange: setReminderMenuOpen,
      onCopyProjectId: copyProjectId,
      onProjectActionsChange: setProjectActionsOpen,
      onCopyProjectURL: copyProjectURL,
      onCopyProjectTitle: copyProjectTitle,
      onProjectLeadChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
        save({ lead: e.target.value }),
      onProjectHealthChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
        save({ health: e.target.value === 'none' ? '' : e.target.value }),
      onOpenProjectUpdate: () => {
        if (pendingProjectSaves.current > 0 || deletion.isPending() || deletion.isRemoved()) return;
        healthUpdate.open();
      },
      onCloseProjectUpdate: healthUpdate.close,
      onProjectUpdateHealthChange: healthUpdate.changeHealth,
      onProjectUpdateBodyChange: healthUpdate.changeBody,
      onSubmitProjectUpdate: healthUpdate.onSubmit,
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
      onDependencyProjectChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
        dependencyChanges.invalidate();
        setDependencyProjectSlug(e.target.value);
      },
      onDependencyKindChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
        dependencyChanges.invalidate();
        setDependencyKind(e.target.value as typeof dependencyKind);
      },
      onAddProjectDependency: (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!dependencyProjectSlug) return;
        return dependencyChanges.write({
          action: 'add',
          dependency: { projectSlug: dependencyProjectSlug, kind: dependencyKind },
        });
      },
      onRemoveProjectDependency: (projectSlug: string) =>
        dependencyChanges.write({ action: 'remove', projectSlug }),
      onCreateIssue: () => sendIntent('issue.create', { projectId: project.id }),
      onRetryProjectArchive: archive.retry,
      onToggleProjectArchived: () => {
        if (
          deletion.isPending() ||
          deletion.isRemoved() ||
          pendingProjectSaves.current > 0 ||
          reminderEditor.data.saving ||
          archive.isPending() ||
          milestoneEdits.isPending() ||
          milestoneCreation.isPending() ||
          dependencyChanges.isPending() ||
          healthUpdate.isPending()
        )
          return;
        setProjectActionsOpen(false);
        return archive.write(!project.archivedAt);
      },
      onDeleteProject: () => {
        if (
          pendingProjectSaves.current > 0 ||
          reminderEditor.data.saving ||
          archive.isPending() ||
          milestoneEdits.isPending() ||
          milestoneCreation.isPending() ||
          dependencyChanges.isPending() ||
          healthUpdate.isPending()
        )
          return;
        setProjectActionsOpen(false);
        healthUpdate.close();
        setProjectTemplateOpen(false);
        setReminderMenuOpen(false);
        reminderEditor.close();
        deletion.request();
      },
      onDescriptionChange: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => {
        setProjectSaved(false);
        const description = e.target.value;
        setProject((current) => ({ ...current, description }));
      },
      onDescriptionBlur: () =>
        project.description !== persistedDescription.current.value
          ? save({ description: project.description })
          : undefined,
      onSummaryChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => {
        const summaryValue = e.currentTarget.value;
        setProjectSaved(false);
        summaryDraft.current = { slug, value: summaryValue };
        setProject((current) => ({ ...current, summary: summaryValue }));
      },
      onSummaryBlur: (e: React.FocusEvent<HTMLInputElement>) =>
        e.currentTarget.value !== persistedSummary.current.value
          ? save({ summary: e.currentTarget.value })
          : undefined,
      onProjectIconChange: (value: string) => save({ icon: value }),
      onProjectIconColorChange: (value: string) => save({ iconColor: value }),
      onStartDateChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => save(e.target.value ? { startDate: e.target.value } : { clearStartDate: true }),
      onTargetDateChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => save(e.target.value ? { targetDate: e.target.value } : { clearTargetDate: true }),
      onCreatePage: () => sendIntent('page.create', { projectId: project.id }),
      onCreateADR: () => sendIntent('adr.create', { projectSlug: slug }),
      onMilestoneEditChange: milestoneEdits.change,
      onSaveMilestoneEdit: milestoneEdits.commit,
      onRemoveMilestone: (id: number, name: string) => {
        if (
          milestoneEdits.isPending() ||
          milestoneCreation.isPending() ||
          dependencyChanges.isPending() ||
          healthUpdate.isPending() ||
          milestoneRemoval.isPending() ||
          deletion.isPending() ||
          deletion.isRemoved()
        )
          return;
        milestoneRemoval.request(id, name);
      },
      onMilestoneNameDraftChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => {
        milestoneCreation.invalidate();
        setMilestoneCreated(false);
        setMilestoneNameError('');
        setMilestoneName(e.target.value);
      },
      onMilestoneTargetDateDraftChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => {
        milestoneCreation.invalidate();
        setMilestoneCreated(false);
        setMilestoneTargetDate(e.target.value);
      },
      onMilestoneDescriptionDraftChange: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => {
        milestoneCreation.invalidate();
        setMilestoneCreated(false);
        setMilestoneDescription(e.target.value);
      },
      onCreateMilestone: (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        return createMilestone();
      },
      onRetryMilestoneCreation: createMilestone,
      onIssueSelect: (
        ...args: Parameters<NonNullable<React.ComponentProps<typeof IssueList>['onSelect']>>
      ) => {
        const handle: NonNullable<React.ComponentProps<typeof IssueList>['onSelect']> = setSelected;
        return handle(...args);
      },
    },
  };
}
