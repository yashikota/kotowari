import {
  useLoaderData,
  useNavigate,
  useParams,
  useRouter,
  useSearch,
} from '@tanstack/react-router';
import type * as React from 'react';
import { useState } from 'react';
import { api } from '../api.ts';
import { useIntent } from '../application/Root.tsx';
import { signals } from '../application/mediator.ts';
import i18n from '../i18n/index.ts';
import { cycleCalendarICS, cycleIssuesCSV } from '../cycle-export.ts';
import { IssueList } from '../components/IssueList.tsx';
import type { ADR, Cycle, Issue, Label, Page, Project } from '../types.ts';

export function useProjectsPagePresenter() {
  const data = useLoaderData({ from: '/projects' }) as { projects: Project[]; labels: Label[] };
  const { projects } = data;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] =
    useState<(typeof import('../types.ts').PROJECT_STATUSES)[number]>('planned');
  const [priority, setPriority] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const navigate = useNavigate();

  async function createProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
      description,
      status,
      priority,
      ...(startDate ? { startDate } : {}),
      ...(targetDate ? { targetDate } : {}),
      labels: selectedLabels,
    });
    setCreateOpen(false);
    await navigate({
      to: '/projects/$slug',
      params: { slug: project.slug },
      state: { autofocus: 'description' },
    });
  }
  return {
    _view: 0 as const,
    projects,
    availableLabels: data.labels,
    name,
    description,
    status,
    priority,
    startDate,
    targetDate,
    selectedLabels,
    createOpen,
    handlers: {
      onSubmit0: (e: Parameters<NonNullable<React.ComponentProps<'form'>['onSubmit']>>[0]) => {
        return createProject(e);
      },
      onOpenCreateProject: () => {
        setName('');
        setDescription('');
        setStatus('planned');
        setPriority(0);
        setStartDate('');
        setTargetDate('');
        setSelectedLabels([]);
        setCreateOpen(true);
      },
      onCloseCreateProject: () => setCreateOpen(false),
      New_project_name_onChange1: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setName(e.target.value),
      New_project_description_onChange: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => setDescription(e.target.value),
      New_project_status_onChange: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => setStatus(e.target.value as (typeof import('../types.ts').PROJECT_STATUSES)[number]),
      New_project_priority_onChange: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => setPriority(Number(e.target.value)),
      New_project_start_onChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setStartDate(e.target.value),
      New_project_target_onChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setTargetDate(e.target.value),
      New_project_labels_onChange: (value: string[]) => setSelectedLabels(value),
    },
  };
}

export function useProjectDetailPagePresenter() {
  const sendIntent = useIntent();
  const { slug } = useParams({ from: '/projects/$slug' });
  const data = useLoaderData({ from: '/projects/$slug' }) as {
    project: Project;
    issues: Issue[];
    adrs: ADR[];
    pages: Page[];
    labels: Label[];
  };
  const router = useRouter();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [project, setProject] = useState(data.project);
  const [milestoneName, setMilestoneName] = useState('');
  const [milestoneTargetDate, setMilestoneTargetDate] = useState('');

  if (project.slug !== data.project.slug) {
    setProject(data.project);
    setSelected(null);
  }

  async function save(body: Record<string, unknown>) {
    const next = await api.patchProject(slug, body);
    setProject(next);
    await router.invalidate();
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
      ...(milestoneTargetDate ? { targetDate: milestoneTargetDate } : {}),
    });
    setMilestoneName('');
    setMilestoneTargetDate('');
    await refreshProject();
  }

  return {
    _view: 0 as const,
    slug,
    data,
    selected,
    project,
    milestoneName,
    milestoneTargetDate,
    handlers: {
      Project_status_onChange0: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => save({ status: e.target.value }),
      Project_priority_onChange1: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => save({ priority: Number(e.target.value) }),
      onProjectLabelToggle: (name: string) => {
        const current = project.labels ?? [];
        const next = current.includes(name)
          ? current.filter((label) => label !== name)
          : [...current, name];
        return save({ labels: next });
      },
      onClick1: () => sendIntent('issue.create', { projectId: project.id }),
      onClick2: () => {
        if (!window.confirm(i18n.t('ui.deleteProjectConfirmation', { name: project.name }))) {
          return;
        }
        return api.deleteProject(slug).then(async () => {
          await router.invalidate();
          await navigate({ to: '/projects' });
        });
      },
      Project_description_onChange3: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => setProject({ ...project, description: e.target.value }),
      Project_description_onBlur4: () => save({ description: project.description }),
      Start_date_onChange5: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => save(e.target.value ? { startDate: e.target.value } : { clearStartDate: true }),
      Target_date_onChange6: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => save(e.target.value ? { targetDate: e.target.value } : { clearTargetDate: true }),
      onClick7: () => {
        const title = window.prompt(i18n.t('modal.adrTitle'));
        if (title?.trim())
          return api
            .createADR({ title, projectSlug: slug })
            .then((a) =>
              navigate({ to: '/adrs/$identifier', params: { identifier: a.identifier } }),
            );
      },
      Milestone_name_onChange42: (
        id: number,
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) =>
        setProject({
          ...project,
          milestones: project.milestones.map((item) =>
            item.id === id ? { ...item, name: e.target.value } : item,
          ),
        }),
      Milestone_name_onBlur43: async (id: number) => {
        const milestone = project.milestones.find((item) => item.id === id);
        if (!milestone) return;
        await api.patchMilestone(slug, id, { name: milestone.name });
        await refreshProject();
      },
      Milestone_target_onChange44: (
        id: number,
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) =>
        setProject({
          ...project,
          milestones: project.milestones.map((item) =>
            item.id === id ? { ...item, targetDate: e.target.value || null } : item,
          ),
        }),
      Milestone_target_onBlur45: async (id: number) => {
        const milestone = project.milestones.find((item) => item.id === id);
        if (!milestone) return;
        await api.patchMilestone(slug, id, { targetDate: milestone.targetDate });
        await refreshProject();
      },
      Milestone_remove_onClick46: async (id: number, name: string) => {
        if (!window.confirm(i18n.t('projectMilestones.removeConfirmation', { name }))) return;
        await api.deleteMilestone(slug, id);
        await refreshProject();
      },
      New_milestone_name_onChange47: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setMilestoneName(e.target.value),
      New_milestone_target_onChange48: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setMilestoneTargetDate(e.target.value),
      New_milestone_onSubmit49: (e: React.FormEvent<HTMLFormElement>) => createMilestone(e),
      onSelect8: (
        ...args: Parameters<NonNullable<React.ComponentProps<typeof IssueList>['onSelect']>>
      ) => {
        const handle: NonNullable<React.ComponentProps<typeof IssueList>['onSelect']> = setSelected;
        return handle(...args);
      },
    },
  };
}

export function useCyclesPagePresenter() {
  const data = useLoaderData({ from: '/cycles' }) as { cycles: Cycle[]; issues: Issue[] };
  const { scope } = useSearch({ from: '/cycles' });
  const router = useRouter();
  const [copiedCycleNumber, setCopiedCycleNumber] = useState<number | null>(null);
  const [metadataCycle, setMetadataCycle] = useState<Cycle | null>(null);
  const [datesCycle, setDatesCycle] = useState<Cycle | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [startDateDraft, setStartDateDraft] = useState('');
  const [endDateDraft, setEndDateDraft] = useState('');
  const scopedCycles =
    scope === 'current'
      ? data.cycles.filter((cycle) => cycle.status === 'active')
      : scope === 'upcoming'
        ? data.cycles.filter((cycle) => cycle.status === 'upcoming')
        : data.cycles;
  const navigate = useNavigate();

  function cycleURL(number: number) {
    return new URL(
      `${import.meta.env.BASE_URL}cycles/${number}`,
      window.location.origin,
    ).toString();
  }

  async function updateCycle(number: number, body: Record<string, unknown>) {
    await api.patchCycle(number, body);
    await router.invalidate();
    signals.dispatchEvent(new Event('kotowari:refresh'));
  }

  function openCycleMetadata(cycle: Cycle) {
    setNameDraft(cycle.name || `Cycle ${cycle.number}`);
    setDescriptionDraft(cycle.description ?? '');
    setMetadataCycle(cycle);
  }

  function openCycleDates(cycle: Cycle) {
    setStartDateDraft(cycle.startsAt.slice(0, 10));
    setEndDateDraft(cycle.endsAt.slice(0, 10));
    setDatesCycle(cycle);
  }

  async function saveCycleMetadata(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!metadataCycle || !nameDraft.trim()) return;
    await updateCycle(metadataCycle.number, {
      name: nameDraft.trim(),
      description: descriptionDraft,
    });
    setMetadataCycle(null);
  }

  async function saveCycleDates(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!datesCycle || !startDateDraft || !endDateDraft || endDateDraft <= startDateDraft) return;
    await updateCycle(datesCycle.number, {
      startsAt: `${startDateDraft}T00:00:00Z`,
      endsAt: `${endDateDraft}T00:00:00Z`,
    });
    setDatesCycle(null);
  }

  async function copyCycleLink(number: number) {
    try {
      await navigator.clipboard.writeText(cycleURL(number));
      setCopiedCycleNumber(number);
      window.setTimeout(() => setCopiedCycleNumber(null), 1200);
    } catch {
      // Clipboard permission can be unavailable in an embedded or non-secure context.
    }
  }

  function exportCalendar(cycle: Cycle) {
    const content = cycleCalendarICS(cycle, cycleURL(cycle.number));
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `cycle-${cycle.number}.ics`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  const cycles = [...scopedCycles]
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
    .map((cycle) => {
      const issues = data.issues.filter((issue) => issue.cycleId === cycle.id);
      const today = new Date();
      const todayValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      return {
        ...cycle,
        issueCount: issues.length,
        startedCount: issues.filter((issue) => issue.status === 'in_progress').length,
        completedCount: issues.filter(
          (issue) => issue.status === 'done' || issue.status === 'canceled',
        ).length,
        linkCopied: copiedCycleNumber === cycle.number,
        onEdit: () => openCycleMetadata(cycle),
        onChangeDates: () => openCycleDates(cycle),
        onStartCycleToday: () =>
          updateCycle(cycle.number, { startsAt: `${todayValue}T00:00:00Z`, status: 'active' }),
        onToggleFavorite: () => updateCycle(cycle.number, { isFavorite: !cycle.isFavorite }),
        onCopyLink: () => copyCycleLink(cycle.number),
        onExportCalendar: () => exportCalendar(cycle),
      };
    });
  return {
    _view: 0 as const,
    cycles,
    scope,
    metadataCycle,
    datesCycle,
    nameDraft,
    descriptionDraft,
    startDateDraft,
    endDateDraft,
    datesValid: !!startDateDraft && !!endDateDraft && endDateDraft > startDateDraft,
    handlers: {
      onCloseMetadata: () => setMetadataCycle(null),
      onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => setNameDraft(e.target.value),
      onDescriptionChange: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
        setDescriptionDraft(e.target.value),
      onSaveMetadata: saveCycleMetadata,
      onCloseDates: () => setDatesCycle(null),
      onStartDateChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setStartDateDraft(e.target.value),
      onEndDateChange: (e: React.ChangeEvent<HTMLInputElement>) => setEndDateDraft(e.target.value),
      onSaveDates: saveCycleDates,
      onClick0: () => {
        const start = new Date();
        const end = new Date(start.getTime() + 14 * 86400000);
        return api
          .createCycle({
            startsAt: start.toISOString(),
            endsAt: end.toISOString(),
          })
          .then((c) =>
            navigate({
              to: '/cycles/$number',
              params: { number: String(c.number) },
            }),
          );
      },
    },
  };
}

export function useCycleDetailPagePresenter() {
  const sendIntent = useIntent();
  const data = useLoaderData({ from: '/cycles/$number' }) as {
    cycle: Cycle;
    issues: Issue[];
    pages: Page[];
  };
  const router = useRouter();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [cycle, setCycle] = useState(data.cycle);
  const done = data.issues.filter((i) => i.status === 'done' || i.status === 'canceled').length;
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [resourceLinkOpen, setResourceLinkOpen] = useState(false);
  const [resourceURL, setResourceURL] = useState('');
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceError, setResourceError] = useState('');
  const [cycleLinkCopied, setCycleLinkCopied] = useState(false);
  const [nameDraft, setNameDraft] = useState(cycle.name ?? `Cycle ${cycle.number}`);
  const [descriptionDraft, setDescriptionDraft] = useState(cycle.description ?? '');
  const [startDateDraft, setStartDateDraft] = useState(cycle.startsAt.slice(0, 10));
  const [endDateDraft, setEndDateDraft] = useState(cycle.endsAt.slice(0, 10));

  if (cycle.number !== data.cycle.number) {
    setCycle(data.cycle);
    setSelected(null);
  }

  async function save(body: Record<string, unknown>) {
    const next = await api.patchCycle(cycle.number, body);
    setCycle(next);
    await router.invalidate();
    signals.dispatchEvent(new Event('kotowari:refresh'));
  }

  async function refreshCycle() {
    const next = await api.cycle(cycle.number);
    setCycle(next);
    await router.invalidate();
    signals.dispatchEvent(new Event('kotowari:refresh'));
  }

  function pageSlugForResource(url: string): string | null {
    try {
      const parsed = new URL(url);
      const marker = '/pages/';
      const markerIndex = parsed.pathname.lastIndexOf(marker);
      if (parsed.origin !== window.location.origin || markerIndex < 0) return null;
      const candidate = parsed.pathname.slice(markerIndex + marker.length);
      return candidate && !candidate.includes('/') ? decodeURIComponent(candidate) : null;
    } catch {
      return null;
    }
  }

  const resources = (cycle.resources ?? []).map((resource) => {
    const pageSlug = pageSlugForResource(resource.url);
    const page = pageSlug ? data.pages.find((item) => item.slug === pageSlug) : undefined;
    return {
      ...resource,
      pageSlug,
      displayTitle: page?.title || resource.title || resource.url,
    };
  });

  async function createCycleDocument() {
    const title = i18n.t('issueActions.newDocumentTitle');
    const page = await api.createPage({ title, slug: `document-${Date.now()}` });
    const href = new URL(
      `${import.meta.env.BASE_URL}pages/${encodeURIComponent(page.slug)}`,
      window.location.origin,
    ).toString();
    await api.addCycleResource(cycle.number, { url: href, title, kind: 'document' });
    await refreshCycle();
    await navigate({ to: '/pages/$slug', params: { slug: page.slug } });
  }

  function openResourceLink() {
    setResourceURL('');
    setResourceTitle('');
    setResourceError('');
    setResourceLinkOpen(true);
  }

  async function addResourceLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await api.addCycleResource(cycle.number, {
        url: resourceURL.trim(),
        title: resourceTitle.trim() || undefined,
      });
      setResourceLinkOpen(false);
      await refreshCycle();
    } catch {
      setResourceError(i18n.t('cycle.resourceAddFailed'));
    }
  }

  async function removeResource(resourceId: number) {
    await api.removeCycleResource(cycle.number, resourceId);
    await refreshCycle();
  }

  function dateAtUTCStart(value: string) {
    return `${value}T00:00:00Z`;
  }

  function localDateToday() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function exportIssues() {
    const content = `\uFEFF${cycleIssuesCSV(data.issues)}`;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `cycle-${cycle.number}-issues.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function exportCalendar() {
    const content = cycleCalendarICS(cycle, window.location.href);
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `cycle-${cycle.number}.ics`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function copyCycleLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCycleLinkCopied(true);
      window.setTimeout(() => setCycleLinkCopied(false), 1200);
    } catch {
      // Clipboard permission can be unavailable in an embedded or non-secure context.
    }
  }

  return {
    _view: 0 as const,
    data,
    selected,
    cycle,
    resources,
    done,
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
    datesValid: !!startDateDraft && !!endDateDraft && endDateDraft > startDateDraft,
    handlers: {
      Cycle_status_onChange0: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => save({ status: e.target.value }),
      onClick1: () => sendIntent('issue.create', { cycleId: cycle.id }),
      onOpenMetadata: () => {
        setNameDraft(cycle.name ?? `Cycle ${cycle.number}`);
        setDescriptionDraft(cycle.description ?? '');
        setMetadataOpen(true);
      },
      onCloseMetadata: () => setMetadataOpen(false),
      onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => setNameDraft(e.target.value),
      onDescriptionChange: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
        setDescriptionDraft(e.target.value),
      onSaveMetadata: async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        await save({ name: nameDraft.trim(), description: descriptionDraft });
        setMetadataOpen(false);
      },
      onOpenDates: () => {
        setStartDateDraft(cycle.startsAt.slice(0, 10));
        setEndDateDraft(cycle.endsAt.slice(0, 10));
        setDatesOpen(true);
      },
      onCloseDates: () => setDatesOpen(false),
      onStartDateChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setStartDateDraft(e.target.value),
      onEndDateChange: (e: React.ChangeEvent<HTMLInputElement>) => setEndDateDraft(e.target.value),
      onSaveDates: async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!startDateDraft || !endDateDraft || endDateDraft <= startDateDraft) return;
        await save({
          startsAt: dateAtUTCStart(startDateDraft),
          endsAt: dateAtUTCStart(endDateDraft),
        });
        setDatesOpen(false);
      },
      onToggleFavorite: () => save({ isFavorite: !cycle.isFavorite }),
      onStartCycleToday: () =>
        save({ startsAt: dateAtUTCStart(localDateToday()), status: 'active' }),
      onExportIssues: exportIssues,
      onExportCalendar: exportCalendar,
      onCopyLink: copyCycleLink,
      onCreateDocument: createCycleDocument,
      onOpenResourceLink: openResourceLink,
      onCloseResourceLink: () => setResourceLinkOpen(false),
      onResourceURLChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setResourceURL(e.target.value),
      onResourceTitleChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setResourceTitle(e.target.value),
      onAddResourceLink: addResourceLink,
      onRemoveResource: (resourceId: number) => removeResource(resourceId),
      onSelect2: (
        ...args: Parameters<NonNullable<React.ComponentProps<typeof IssueList>['onSelect']>>
      ) => {
        const handle: NonNullable<React.ComponentProps<typeof IssueList>['onSelect']> = setSelected;
        return handle(...args);
      },
    },
  };
}
