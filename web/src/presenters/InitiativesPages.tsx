import { useLoaderData, useNavigate, useRouter, useSearch } from '@tanstack/react-router';
import type { ChangeEvent, FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api.ts';
import { queryCache } from '../application/cache.ts';
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
import {
  parseSearchDateFilter,
  serializeSearchDateFilter,
  type SearchDateFilter,
} from '../search.ts';
import { useProjectWorkflow } from '../project-workflow.tsx';
import type { Initiative, InitiativeStatus } from '../types.ts';
import { useRootMachineFlag } from '../application/Root.tsx';

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
      onStatusLabel: (value: InitiativeStatus) => t(`initiatives.${value}`),
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
        }),
    },
  };
}

export function useInitiativeDetailPresenter() {
  const {
    initiative,
    projects,
    labels: workspaceLabels,
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
  const [priority, setPriority] = useState(initiative.priority ?? 0);
  const [health, setHealth] = useState(initiative.health ?? '');
  const [labels, setLabels] = useState(initiative.labels ?? []);
  const [projectSlugs, setProjectSlugs] = useState(initiative.projectSlugs);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function saveInitiative(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await api.patchInitiative(initiative.slug, {
        name,
        description,
        status,
        color,
        priority,
        health,
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
      setSaving(false);
    }
  }

  async function deleteInitiative() {
    if (!window.confirm(t('initiatives.deleteConfirm'))) return;
    setSaving(true);
    setError('');
    try {
      await api.deleteInitiative(initiative.slug);
      queryCache.invalidate();
      await navigate({ to: '/initiatives' });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('common.error'));
      setSaving(false);
    }
  }

  return {
    _view: 0 as const,
    initiative,
    projects,
    name,
    description,
    status,
    color,
    startDate,
    targetDate,
    priority,
    health,
    labels,
    availableLabels: workspaceLabels.map((label) => label.name).sort((a, b) => a.localeCompare(b)),
    projectSlugs,
    availableProjects: projects.map((project) => ({ value: project.slug, label: project.name })),
    linkedProjects: projects.filter((project) => projectSlugs.includes(project.slug)),
    error,
    saving,
    handlers: {
      onNameChange: (event: ChangeEvent<HTMLInputElement>) => setName(event.target.value),
      onDescriptionChange: (event: ChangeEvent<HTMLTextAreaElement>) =>
        setDescription(event.target.value),
      onStatusChange: (value: string | null) => setStatus((value ?? 'planned') as InitiativeStatus),
      onColorChange: (value: string | null) => setColor(value ?? 'purple'),
      onStartDateChange: (event: ChangeEvent<HTMLInputElement>) => setStartDate(event.target.value),
      onTargetDateChange: (event: ChangeEvent<HTMLInputElement>) =>
        setTargetDate(event.target.value),
      onPriorityChange: (value: string | null) => setPriority(Number(value ?? 0)),
      onHealthChange: (value: string | null) => setHealth(value ?? ''),
      onLabelsChange: setLabels,
      onProjectSlugsChange: setProjectSlugs,
      onSubmit: saveInitiative,
      onDelete: deleteInitiative,
      onBack: () => void navigate({ to: '/initiatives' }),
      onProjectOpen: (slug: string) => void navigate({ to: '/projects/$slug', params: { slug } }),
      onStatusLabel: (value: InitiativeStatus) => t(`initiatives.${value}`),
    },
  };
}
