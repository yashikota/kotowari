import { useReminderEditor } from './useReminderEditor.ts';
import { useLoaderData, useNavigate, useRouter, useSearch } from '@tanstack/react-router';
import type { ChangeEvent, FormEvent } from 'react';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api.ts';
import { signals } from '../application/mediator.ts';
import { queryCache } from '../query-cache.ts';
import {
  buildInitiativeList,
  DEFAULT_INITIATIVE_DISPLAY_PROPERTIES,
  INITIATIVE_DATE_SEARCH_KEYS,
  initiativeActiveProjectCount,
} from '../initiative-list.ts';
import type {
  InitiativeDateField,
  InitiativeDateFilters,
  InitiativeDisplayProperty,
  InitiativeListSearch,
} from '../initiative-list.ts';
import type { ProjectFilterGroup } from '../project-view-search.ts';
import {
  parseSearchDateFilter,
  serializeSearchDateFilter,
  type SearchDateFilter,
} from '../search.ts';
import { useProjectWorkflow } from '../project-workflow.tsx';
import type { Initiative, InitiativeStatus, ProjectHealth } from '../types.ts';
import type { HealthUpdateItem } from '../components/HealthUpdateFeed.tsx';
import { useKeyboard, useRootMachineFlag } from '../application/Root.tsx';
import {
  initiativeDetailSequenceFromKeyboard,
  initiativeDetailShortcutFromKeyboard,
} from '../keymap.ts';

function initiativeSlug(name: string, existing: Initiative[]): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  const slug = base || `initiative-${crypto.randomUUID().slice(0, 8)}`;
  if (!existing.some((initiative) => initiative.slug === slug)) return slug;
  let suffix = 2;
  while (existing.some((initiative) => initiative.slug === `${slug}-${suffix}`)) suffix += 1;
  return `${slug}-${suffix}`;
}

export function useInitiativesPagePresenter() {
  const {
    initiatives,
    projects,
    labels: workspaceLabels,
  } = useLoaderData({ from: '/initiatives' });
  const search = useSearch({ from: '/initiatives' });
  const { statuses: projectWorkflowStatuses } = useProjectWorkflow();
  const { t } = useTranslation();
  const navigate = useNavigate({ from: '/initiatives' });
  const router = useRouter();
  const [createOpen, setCreateOpen] = useRootMachineFlag('initiative.create');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<InitiativeStatus>('planned');
  const [color, setColor] = useState('purple');
  const [startDate, setStartDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [filterOpened, setFilterOpened] = useState(false);
  const [optionsOpened, setOptionsOpened] = useState(false);

  const groups = useMemo(
    () => buildInitiativeList({ initiatives, projects, search }),
    [initiatives, projects, search],
  );
  const displayProperties = search.displayProperties ?? DEFAULT_INITIATIVE_DISPLAY_PROPERTIES;
  const projectsFilter = search.projects ?? 'all';
  const priorityFilter = search.priorityFilter ?? [];
  const healthFilter = search.healthFilter ?? [];
  const labelFilter = search.labelFilter ?? [];
  const dateFilters: InitiativeDateFilters = {
    ...(parseSearchDateFilter(search.createdDate)
      ? { created: parseSearchDateFilter(search.createdDate) }
      : {}),
    ...(parseSearchDateFilter(search.updatedDate)
      ? { updated: parseSearchDateFilter(search.updatedDate) }
      : {}),
    ...(parseSearchDateFilter(search.completedDate)
      ? { completed: parseSearchDateFilter(search.completedDate) }
      : {}),
    ...(parseSearchDateFilter(search.latestUpdateDate)
      ? { latestUpdate: parseSearchDateFilter(search.latestUpdateDate) }
      : {}),
  };
  const labels = workspaceLabels.map((label) => label.name).sort((a, b) => a.localeCompare(b));
  const scope = search.scope ?? 'all';
  const hasFilters = Boolean(
    search.q ||
    search.statusFilter?.length ||
    search.priorityFilter?.length ||
    search.healthFilter?.length ||
    search.labelFilter?.length ||
    search.projects ||
    search.advancedFilter ||
    search.targetDateFrom ||
    search.targetDateTo ||
    Object.keys(dateFilters).length > 0,
  );
  const updateListSearch = (patch: Partial<InitiativeListSearch>) => {
    void navigate({
      to: '/initiatives',
      search: (previous) => ({ ...previous, ...patch }),
      replace: true,
    });
  };

  async function createInitiative(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const created = await api.createInitiative({
        name: name.trim(),
        slug: initiativeSlug(name, initiatives),
        description,
        status,
        color,
        ...(startDate ? { startDate } : {}),
        ...(targetDate ? { targetDate } : {}),
      });
      queryCache.invalidate();
      await router.invalidate();
      setCreateOpen(false);
      await navigate({ to: '/initiatives/$slug', params: { slug: created.slug } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  return {
    _view: 0 as const,
    initiatives,
    projects,
    groups,
    scope,
    query: search.q ?? '',
    statusFilter: search.statusFilter ?? [],
    priorityFilter,
    healthFilter,
    labelFilter,
    dateFilters,
    labels,
    projectsFilter,
    advancedFilter: search.advancedFilter ?? false,
    advancedFilterGroup: search.advancedFilterGroup,
    targetDateFrom: search.targetDateFrom ?? '',
    targetDateTo: search.targetDateTo ?? '',
    groupBy: search.groupBy ?? 'none',
    orderBy: search.orderBy ?? 'manual',
    direction: search.direction ?? 'asc',
    displayProperties,
    filterOpened,
    optionsOpened,
    hasFilters,
    onActiveProjectCount: (initiative: Initiative) =>
      initiativeActiveProjectCount(initiative, projects, projectWorkflowStatuses),
    createOpen,
    name,
    description,
    status,
    color,
    startDate,
    targetDate,
    error,
    saving,
    handlers: {
      onOpenCreate: () => {
        setName('');
        setDescription('');
        setStatus('planned');
        setColor('purple');
        setStartDate('');
        setTargetDate('');
        setError('');
        setCreateOpen(true);
      },
      onCloseCreate: () => setCreateOpen(false),
      onNameChange: (event: ChangeEvent<HTMLInputElement>) => setName(event.target.value),
      onDescriptionChange: (event: ChangeEvent<HTMLTextAreaElement>) =>
        setDescription(event.target.value),
      onStatusChange: (value: string | null) => setStatus((value ?? 'planned') as InitiativeStatus),
      onColorChange: (value: string | null) => setColor(value ?? 'purple'),
      onStartDateChange: (event: ChangeEvent<HTMLInputElement>) => setStartDate(event.target.value),
      onTargetDateChange: (event: ChangeEvent<HTMLInputElement>) =>
        setTargetDate(event.target.value),
      onSubmitCreate: createInitiative,
      onOpenInitiative: (initiative: Initiative) =>
        void navigate({ to: '/initiatives/$slug', params: { slug: initiative.slug } }),
      onProjectOpen: (slug: string) => void navigate({ to: '/projects/$slug', params: { slug } }),
      onScopeChange: (value: string | null) =>
        updateListSearch({ scope: (value ?? 'all') as InitiativeListSearch['scope'] }),
      onQueryChange: (event: ChangeEvent<HTMLInputElement>) =>
        updateListSearch({ q: event.target.value || undefined }),
      onFilterOpenedChange: setFilterOpened,
      onOptionsOpenedChange: setOptionsOpened,
      onStatusFilterChange: (value: string[]) =>
        updateListSearch({
          statusFilter: value.length ? (value as InitiativeStatus[]) : undefined,
        }),
      onPriorityFilterChange: (value: string[]) =>
        updateListSearch({
          priorityFilter: value.length ? value.map(Number).filter(Number.isInteger) : undefined,
        }),
      onHealthFilterChange: (value: string[]) =>
        updateListSearch({
          healthFilter: value.length ? (value as InitiativeListSearch['healthFilter']) : undefined,
        }),
      onLabelFilterChange: (value: string[]) =>
        updateListSearch({ labelFilter: value.length ? value : undefined }),
      onProjectsFilterChange: (value: string) =>
        updateListSearch({
          projects: value === 'all' ? undefined : (value as InitiativeListSearch['projects']),
        }),
      onAdvancedFilterChange: (enabled: boolean) =>
        updateListSearch({
          advancedFilter: enabled || undefined,
          advancedFilterGroup: enabled ? search.advancedFilterGroup : undefined,
        }),
      onAdvancedFilterGroupChange: (group: ProjectFilterGroup) =>
        updateListSearch({ advancedFilter: true, advancedFilterGroup: group }),
      onDateFilterChange: (field: InitiativeDateField, filter: SearchDateFilter | undefined) => {
        const searchKey = INITIATIVE_DATE_SEARCH_KEYS[field];
        updateListSearch({ [searchKey]: filter ? serializeSearchDateFilter(filter) : undefined });
      },
      onGroupByChange: (value: string) =>
        updateListSearch({ groupBy: value as InitiativeListSearch['groupBy'] }),
      onOrderByChange: (value: string) =>
        updateListSearch({ orderBy: value as InitiativeListSearch['orderBy'] }),
      onDirectionChange: (value: string) =>
        updateListSearch({ direction: value as InitiativeListSearch['direction'] }),
      onDisplayPropertiesChange: (values: InitiativeDisplayProperty[]) =>
        updateListSearch({ displayProperties: values.length ? values : undefined }),
      onClearFilters: () =>
        updateListSearch({
          q: undefined,
          statusFilter: undefined,
          priorityFilter: undefined,
          healthFilter: undefined,
          labelFilter: undefined,
          projects: undefined,
          targetDateFrom: undefined,
          targetDateTo: undefined,
          createdDate: undefined,
          updatedDate: undefined,
          completedDate: undefined,
          latestUpdateDate: undefined,
          advancedFilter: undefined,
          advancedFilterGroup: undefined,
        }),
    },
  };
}

export function useInitiativeDetailPresenter() {
  const {
    initiative,
    projects,
    labels: workspaceLabels,
    activities,
  } = useLoaderData({
    from: '/initiatives/$slug',
  });
  const { t } = useTranslation();
  const router = useRouter();
  const navigate = useNavigate();
  const [name, setName] = useState(initiative.name);
  const [description, setDescription] = useState(initiative.description);
  const [status, setStatus] = useState<InitiativeStatus>(initiative.status);
  const [color, setColor] = useState(initiative.color ?? 'purple');
  const [startDate, setStartDate] = useState(initiative.startDate ?? '');
  const [targetDate, setTargetDate] = useState(initiative.targetDate ?? '');
  const [owner, setOwner] = useState(initiative.owner ?? '');
  const [focusOwner, setFocusOwner] = useState(0);
  const [focusTargetDate, setFocusTargetDate] = useState(0);
  const [focusUpdates, setFocusUpdates] = useState(0);
  const [reminderMenuOpen, setReminderMenuOpen] = useState(false);
  const reminderEditor = useReminderEditor({
    entityKey: initiative.slug,
    reminderAt: initiative.reminderAt,
    save: setReminder,
    onSuccess: () => setReminderMenuOpen(false),
  });
  const [copied, setCopied] = useState(false);
  const [priority, setPriority] = useState(initiative.priority ?? 0);
  const health = initiative.health ?? '';
  const [labels, setLabels] = useState(initiative.labels ?? []);
  const [projectSlugs, setProjectSlugs] = useState(initiative.projectSlugs);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [updateHealth, setUpdateHealth] = useState<ProjectHealth>(initiative.health ?? 'on_track');
  const [updateBody, setUpdateBody] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [updating, setUpdating] = useState(false);
  const ownerSequenceSince = useRef<number | null>(null);
  const mutationPending = useRef(false);

  const updates: HealthUpdateItem[] = activities.flatMap((activity) => {
    if (activity.action !== 'status_update_posted') return [];
    const activityHealth = activity.payload.health;
    const body = activity.payload.body;
    if (
      (activityHealth !== 'on_track' &&
        activityHealth !== 'at_risk' &&
        activityHealth !== 'off_track') ||
      typeof body !== 'string'
    ) {
      return [];
    }
    return [
      {
        id: activity.id,
        health: activityHealth,
        body,
        createdAt: activity.createdAt,
      },
    ];
  });

  async function saveInitiative(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutationPending.current) return;
    mutationPending.current = true;
    setSaving(true);
    setError('');
    try {
      await api.patchInitiative(initiative.slug, {
        name,
        description,
        status,
        owner,
        color,
        priority,
        labels,
        ...(startDate ? { startDate } : { clearStartDate: true }),
        ...(targetDate ? { targetDate } : { clearTargetDate: true }),
        projectSlugs,
      });
      queryCache.invalidate();
      await router.invalidate();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('common.error'));
    } finally {
      mutationPending.current = false;
      setSaving(false);
    }
  }

  async function postUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = updateBody.trim();
    if (updating || !body) return;
    setUpdating(true);
    setUpdateError('');
    try {
      await api.postInitiativeUpdate(initiative.slug, updateHealth, body);
      queryCache.invalidate();
      await router.invalidate();
      setUpdateOpen(false);
      setUpdateBody('');
    } catch (cause) {
      setUpdateError(cause instanceof Error ? cause.message : t('common.error'));
    } finally {
      setUpdating(false);
    }
  }

  async function deleteInitiative() {
    if (mutationPending.current) return;
    if (!window.confirm(t('initiatives.deleteConfirm'))) return;
    mutationPending.current = true;
    setSaving(true);
    setError('');
    try {
      await api.deleteInitiative(initiative.slug);
      queryCache.invalidate();
      await navigate({ to: '/initiatives' });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('common.error'));
      setSaving(false);
    } finally {
      mutationPending.current = false;
    }
  }

  function openUpdate() {
    setUpdateHealth(health || 'on_track');
    setUpdateBody('');
    setUpdateError('');
    setUpdateOpen(true);
  }

  async function toggleFavorite() {
    setError('');
    try {
      await api.patchInitiative(initiative.slug, { isFavorite: !initiative.isFavorite });
      queryCache.invalidate();
      signals.dispatchEvent(new Event('kotowari:refresh'));
      await router.invalidate();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('common.error'));
    }
  }

  async function setReminder(value: Date | null) {
    await api.patchInitiative(
      initiative.slug,
      value ? { reminderAt: value.toISOString() } : { clearReminder: true },
    );
    queryCache.invalidate();
    signals.dispatchEvent(new Event('kotowari:refresh'));
    await router.invalidate().catch(() => undefined);
  }

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard permission can be unavailable in an embedded or non-secure context.
    }
  }

  function copyInitiativeId() {
    return copyText(String(initiative.id));
  }

  function copyInitiativeURL() {
    const url = new URL(
      `/initiatives/${encodeURIComponent(initiative.slug)}`,
      window.location.origin,
    );
    return copyText(url.href);
  }

  function copyInitiativeTitle() {
    return copyText(initiative.name);
  }

  useKeyboard((event) => {
    const ownerSequence = initiativeDetailSequenceFromKeyboard(
      event,
      ownerSequenceSince.current,
      Date.now(),
    );
    ownerSequenceSince.current = ownerSequence.pendingSince;
    if (ownerSequence.action === 'focus-owner') {
      event.preventDefault();
      setFocusOwner((value) => value + 1);
      return true;
    }
    if (ownerSequence.pendingSince !== null) {
      event.preventDefault();
      return true;
    }
    const shortcut = initiativeDetailShortcutFromKeyboard(event);
    if (!shortcut) return false;
    event.preventDefault();
    if (shortcut === 'write-update') openUpdate();
    else if (shortcut === 'focus-target-date') setFocusTargetDate((value) => value + 1);
    else if (shortcut === 'focus-updates') setFocusUpdates((value) => value + 1);
    else if (shortcut === 'open-reminder-menu') setReminderMenuOpen(true);
    else if (shortcut === 'copy-id') void copyInitiativeId();
    else if (shortcut === 'copy-url') void copyInitiativeURL();
    else if (shortcut === 'copy-title') void copyInitiativeTitle();
    else void toggleFavorite();
    return true;
  });

  return {
    _view: 0 as const,
    initiative,
    projects,
    name,
    description,
    status,
    owner,
    focusOwner,
    color,
    startDate,
    targetDate,
    focusTargetDate,
    focusUpdates,
    reminderMenuOpen,
    reminderEditor: reminderEditor.data,
    copied,
    priority,
    health,
    updates,
    labels,
    availableLabels: workspaceLabels.map((label) => label.name).sort((a, b) => a.localeCompare(b)),
    projectSlugs,
    availableProjects: projects.map((project) => ({ value: project.slug, label: project.name })),
    linkedProjects: projects.filter((project) => projectSlugs.includes(project.slug)),
    error,
    saving,
    updateOpen,
    updateHealth,
    updateBody,
    updateError,
    updating,
    handlers: {
      onNameChange: (event: ChangeEvent<HTMLInputElement>) => setName(event.target.value),
      onDescriptionChange: (event: ChangeEvent<HTMLTextAreaElement>) =>
        setDescription(event.target.value),
      onStatusChange: (value: string | null) => setStatus((value ?? 'planned') as InitiativeStatus),
      onOwnerChange: (value: string | null) => setOwner((value ?? '') as '' | 'self'),
      onColorChange: (value: string | null) => setColor(value ?? 'purple'),
      onStartDateChange: (event: ChangeEvent<HTMLInputElement>) => setStartDate(event.target.value),
      onTargetDateChange: (event: ChangeEvent<HTMLInputElement>) =>
        setTargetDate(event.target.value),
      onPriorityChange: (value: string | null) => setPriority(Number(value ?? 0)),
      onLabelsChange: setLabels,
      onProjectSlugsChange: setProjectSlugs,
      onSubmit: saveInitiative,
      onDelete: deleteInitiative,
      onBack: () => void navigate({ to: '/initiatives' }),
      onOpenUpdate: openUpdate,
      onToggleFavorite: toggleFavorite,
      onSetReminder: reminderEditor.write,
      onOpenCustomReminder: reminderEditor.open,
      onCloseCustomReminder: reminderEditor.close,
      onCustomReminderChange: reminderEditor.change,
      onCustomReminderSave: reminderEditor.submit,
      onRetryReminder: reminderEditor.retry,
      onReminderMenuChange: setReminderMenuOpen,
      onCopyInitiativeId: copyInitiativeId,
      onCopyInitiativeURL: copyInitiativeURL,
      onCopyInitiativeTitle: copyInitiativeTitle,
      onCloseUpdate: () => setUpdateOpen(false),
      onUpdateHealthChange: (value: string | null) =>
        setUpdateHealth((value ?? 'on_track') as ProjectHealth),
      onUpdateBodyChange: (event: ChangeEvent<HTMLTextAreaElement>) =>
        setUpdateBody(event.currentTarget.value),
      onSubmitUpdate: postUpdate,
      onProjectOpen: (slug: string) => void navigate({ to: '/projects/$slug', params: { slug } }),
    },
  };
}
