import {
  useLoaderData,
  useNavigate,
  useParams,
  useRouter,
  useSearch,
} from '@tanstack/react-router';
import type * as React from 'react';
import { useMemo, useState } from 'react';
import { api, type IssueSearch } from '../api.ts';
import { useIntent } from '../application/Root.tsx';
import { signals } from '../application/mediator.ts';
import i18n from '../i18n/index.ts';
import { cycleCalendarICS, cycleIssuesCSV } from '../cycle-export.ts';
import { cycleProgressTimeline } from '../cycle-progress.ts';
import { IssueList } from '../components/IssueList.tsx';
import {
  DEFAULT_DISPLAY_PROPERTIES,
  filterCompletedIssues,
  includeNestedIssueMatches,
  type CompletedIssuesFilter,
  type IssueDisplayProperty,
  type IssueGroupBy,
  type IssueLayout,
  type IssueOrderBy,
} from '../issue-list.ts';
import type { ProjectListControlsModel } from '../components/ProjectListControls.tsx';
import type { ProjectBoardModel } from '../components/ProjectBoardView.tsx';
import type { ProjectTimelineModel } from '../components/ProjectTimelineView.tsx';
import { DEFAULT_PROJECT_DISPLAY_PROPERTIES } from '../project-display.ts';
import type { ProjectDisplayProperty } from '../project-display.ts';
import { useProjectViews } from '../project-views.ts';
import type { ProjectSavedView, ProjectViewSearch } from '../project-views.ts';
import { priorityLabel } from '../i18n/labels.ts';
import { PROJECT_STATUSES } from '../types.ts';
import type { Activity, ADR, Cycle, Issue, Label, Page, Project, ProjectHealth } from '../types.ts';

const DAY_MS = 86_400_000;

function monthKey(year: number, month: number) {
  const value = new Date(Date.UTC(year, month, 1));
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}`;
}

function shiftMonthKey(key: string, offset: number) {
  const [year, month] = key.split('-').map(Number);
  return monthKey(year, month - 1 + offset);
}

function monthOrdinal(key: string) {
  const [year, month] = key.split('-').map(Number);
  return Date.UTC(year, month - 1, 1) / DAY_MS;
}

function dateOrdinal(value: Date) {
  return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / DAY_MS;
}

function describeProjectActivity(activity: Activity, projects: Project[]) {
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
        from: i18n.t(`projectStatus.${from}`),
        to: i18n.t(`projectStatus.${to}`),
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

export function useProjectsPagePresenter() {
  const data = useLoaderData({ from: '/projects' }) as {
    projects: Project[];
    labels: Label[];
    issues: Issue[];
  };
  const { projects } = data;
  const search = useSearch({ from: '/projects' });
  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [icon, setIcon] = useState('');
  const [iconColor, setIconColor] = useState('grey');
  const [description, setDescription] = useState('');
  const [status, setStatus] =
    useState<(typeof import('../types.ts').PROJECT_STATUSES)[number]>('planned');
  const [priority, setPriority] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [projectViewDialogOpen, setProjectViewDialogOpen] = useState(false);
  const [projectViewName, setProjectViewName] = useState('');
  const [projectViewDescription, setProjectViewDescription] = useState('');
  const projectViews = useProjectViews();
  const navigate = useNavigate({ from: '/projects' });

  function updateProjectSearch(patch: Partial<typeof search>) {
    return navigate({
      to: '/projects',
      search: (previous) => ({ ...previous, ...patch }),
      replace: true,
      resetScroll: false,
    });
  }

  function projectViewSearch(): ProjectViewSearch {
    return {
      q: search.q,
      status: search.status,
      priority: search.priority,
      health: search.health,
      labels: search.labels,
      groupBy,
      orderBy: search.orderBy ?? 'manual',
      direction: search.direction ?? 'asc',
      closed: search.closed ?? 'all',
      view: search.view ?? 'list',
      columnsBy,
      rowsBy,
      showEmptyColumns,
      showProjectList: search.showProjectList ?? true,
      showWeekNumbers: search.showWeekNumbers ?? false,
      timelineStart: search.timelineStart,
      displayProperties,
      dateField: search.dateField,
      dateFrom: search.dateFrom,
      dateTo: search.dateTo,
      milestones: search.milestones,
      relations: search.relations,
    };
  }

  function applyProjectView(view: ProjectSavedView) {
    return navigate({
      to: '/projects',
      search: { ...view.search, projectView: view.slug },
      resetScroll: false,
    });
  }

  function openProjectView() {
    setProjectViewName('');
    setProjectViewDescription('');
    setProjectViewDialogOpen(true);
  }

  async function createProjectView(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = projectViewName.trim();
    if (!name) return;
    const base =
      name
        .toLocaleLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || `project-view-${Date.now()}`;
    let slug = base;
    for (let suffix = 2; projectViews.views.some((view) => view.slug === slug); suffix++) {
      slug = `${base}-${suffix}`;
    }
    const view: ProjectSavedView = {
      slug,
      name,
      description: projectViewDescription.trim(),
      search: projectViewSearch(),
      updatedAt: new Date().toISOString(),
    };
    projectViews.save(view);
    setProjectViewDialogOpen(false);
    await applyProjectView(view);
  }

  const activeProjectView = projectViews.views.find((view) => view.slug === search.projectView);

  async function updateActiveProjectView() {
    if (!activeProjectView) return;
    const updated = {
      ...activeProjectView,
      search: projectViewSearch(),
      updatedAt: new Date().toISOString(),
    };
    projectViews.save(updated);
  }

  async function deleteActiveProjectView() {
    if (!activeProjectView) return;
    projectViews.remove(activeProjectView.slug);
    await navigate({ to: '/projects', search: {}, resetScroll: false });
  }

  function showAllProjects() {
    return navigate({ to: '/projects', search: {}, resetScroll: false });
  }

  const statusFilters = search.status ?? [];
  const priorityFilters = search.priority ?? [];
  const healthFilters = search.health ?? [];
  const labelFilters = search.labels ?? [];
  const milestoneFilters = search.milestones ?? [];
  const relationFilters = search.relations ?? [];
  const availableMilestones = useMemo(
    () =>
      [
        ...new Set(
          projects.flatMap((project) => project.milestones.map((milestone) => milestone.name)),
        ),
      ].sort(),
    [projects],
  );
  const displayProperties = (search.displayProperties ??
    DEFAULT_PROJECT_DISPLAY_PROPERTIES) as ProjectDisplayProperty[];
  const projectIssueCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const issue of data.issues) {
      if (issue.projectSlug)
        counts.set(issue.projectSlug, (counts.get(issue.projectSlug) ?? 0) + 1);
    }
    return counts;
  }, [data.issues]);
  const filteredProjects = useMemo(() => {
    const query = (search.q ?? '').trim().toLocaleLowerCase();
    const projectsToSort = projects.filter((project) => {
      if (statusFilters.length && !statusFilters.includes(project.status)) return false;
      if (priorityFilters.length && !priorityFilters.includes(String(project.priority)))
        return false;
      if (healthFilters.length && !healthFilters.includes(project.health || 'none')) return false;
      if (
        labelFilters.length &&
        !labelFilters.some((label) => (project.labels ?? []).includes(label))
      )
        return false;
      if (
        milestoneFilters.length &&
        !milestoneFilters.some((name) =>
          project.milestones.some((milestone) => milestone.name === name),
        )
      ) {
        return false;
      }
      if (
        relationFilters.length &&
        !relationFilters.some((kind) =>
          project.dependencies?.some((dependency) => dependency.kind === kind),
        )
      ) {
        return false;
      }
      if (search.dateField && (search.dateFrom || search.dateTo)) {
        const value =
          search.dateField === 'startDate'
            ? project.startDate
            : search.dateField === 'targetDate'
              ? project.targetDate
              : search.dateField === 'created'
                ? project.createdAt
                : search.dateField === 'updated'
                  ? project.updatedAt
                  : search.dateField === 'completed'
                    ? project.completedAt
                    : null;
        const date = value?.slice(0, 10);
        if (
          !date ||
          (search.dateFrom && date < search.dateFrom) ||
          (search.dateTo && date > search.dateTo)
        ) {
          return false;
        }
      }
      const closed = project.status === 'completed' || project.status === 'canceled';
      if (search.closed === 'open' && closed) return false;
      if (search.closed === 'closed' && !closed) return false;
      if (
        query &&
        !`${project.name} ${project.summary || project.description} ${project.description}`
          .toLocaleLowerCase()
          .includes(query)
      ) {
        return false;
      }
      return true;
    });
    const orderBy = search.orderBy ?? 'manual';
    const direction = search.direction === 'desc' ? -1 : 1;
    const originalOrder = new Map(projects.map((project, index) => [project.slug, index]));
    projectsToSort.sort((left, right) => {
      let result = 0;
      if (orderBy === 'manual') {
        result = (originalOrder.get(left.slug) ?? 0) - (originalOrder.get(right.slug) ?? 0);
      } else if (orderBy === 'priority') {
        const rank = (value: number) => (value === 0 ? 5 : value);
        result = rank(left.priority) - rank(right.priority);
      } else if (orderBy === 'status') {
        result =
          PROJECT_STATUSES.indexOf(left.status as (typeof PROJECT_STATUSES)[number]) -
          PROJECT_STATUSES.indexOf(right.status as (typeof PROJECT_STATUSES)[number]);
      } else {
        const field =
          orderBy === 'name'
            ? 'name'
            : orderBy === 'startDate'
              ? 'startDate'
              : orderBy === 'targetDate'
                ? 'targetDate'
                : orderBy === 'created'
                  ? 'createdAt'
                  : orderBy === 'completed'
                    ? 'completedAt'
                    : 'updatedAt';
        const value = (project: Project) => project[field] ?? '';
        result = value(left).localeCompare(value(right));
      }
      return result === 0 ? left.slug.localeCompare(right.slug) : result * direction;
    });
    return projectsToSort;
  }, [
    projects,
    search.closed,
    search.dateField,
    search.dateFrom,
    search.dateTo,
    search.direction,
    search.orderBy,
    search.q,
    statusFilters,
    priorityFilters,
    healthFilters,
    labelFilters,
    milestoneFilters,
    relationFilters,
  ]);

  const groupBy = search.groupBy ?? 'none';
  const projectGroups = useMemo(() => {
    if (groupBy === 'none') {
      return filteredProjects.length ? [{ key: 'all', label: '', projects: filteredProjects }] : [];
    }
    const groups = new Map<string, Project[]>();
    for (const project of filteredProjects) {
      const key = groupBy === 'status' ? project.status : String(project.priority);
      const group = groups.get(key) ?? [];
      group.push(project);
      groups.set(key, group);
    }
    const keys =
      groupBy === 'status'
        ? PROJECT_STATUSES.filter((statusValue) => groups.has(statusValue))
        : ['1', '2', '3', '4', '0'].filter((priorityValue) => groups.has(priorityValue));
    return keys.map((key) => ({
      key,
      label: groupBy === 'status' ? i18n.t(`projectStatus.${key}`) : priorityLabel(Number(key)),
      projects: groups.get(key) ?? [],
    }));
  }, [filteredProjects, groupBy]);

  const view = search.view ?? 'list';
  const columnsBy = search.columnsBy ?? 'status';
  const rowsBy = search.rowsBy ?? 'none';
  const showEmptyColumns = search.showEmptyColumns ?? true;
  const projectBoard = useMemo<ProjectBoardModel>(() => {
    const columnKeys = columnsBy === 'status' ? [...PROJECT_STATUSES] : ['1', '2', '3', '4', '0'];
    const rowKeys =
      rowsBy === 'none'
        ? ['all']
        : rowsBy === 'status'
          ? PROJECT_STATUSES.filter((key) =>
              filteredProjects.some((project) => project.status === key),
            )
          : ['1', '2', '3', '4', '0'].filter((key) =>
              filteredProjects.some((project) => String(project.priority) === key),
            );
    const keyFor = (project: Project, by: 'status' | 'priority') =>
      by === 'status' ? project.status : String(project.priority);
    const columns = columnKeys
      .map((key) => ({
        key,
        label: columnsBy === 'status' ? i18n.t(`projectStatus.${key}`) : priorityLabel(Number(key)),
      }))
      .filter(
        (column) =>
          showEmptyColumns ||
          filteredProjects.some((project) => keyFor(project, columnsBy) === column.key),
      );
    return {
      columns,
      rows: rowKeys.map((rowKey) => ({
        key: rowKey,
        label:
          rowKey === 'all'
            ? ''
            : rowsBy === 'status'
              ? i18n.t(`projectStatus.${rowKey}`)
              : priorityLabel(Number(rowKey)),
        cells: Object.fromEntries(
          columns.map((column) => [
            column.key,
            filteredProjects.filter(
              (project) =>
                (rowKey === 'all' || keyFor(project, rowsBy as 'status' | 'priority') === rowKey) &&
                keyFor(project, columnsBy) === column.key,
            ),
          ]),
        ),
      })),
    };
  }, [columnsBy, filteredProjects, rowsBy, showEmptyColumns]);

  const timelineStart =
    search.timelineStart ??
    shiftMonthKey(monthKey(new Date().getFullYear(), new Date().getMonth()), -8);
  const projectTimeline = useMemo<ProjectTimelineModel>(() => {
    const startOrdinal = monthOrdinal(timelineStart);
    const endOrdinal = monthOrdinal(shiftMonthKey(timelineStart, 16));
    const totalDays = endOrdinal - startOrdinal;
    const months = Array.from({ length: 16 }, (_, index) => {
      const key = shiftMonthKey(timelineStart, index);
      const monthStart = monthOrdinal(key);
      const nextMonth = monthOrdinal(shiftMonthKey(key, 1));
      const [year, month] = key.split('-').map(Number);
      return {
        key,
        label: new Intl.DateTimeFormat(i18n.language, { month: 'short', timeZone: 'UTC' }).format(
          new Date(Date.UTC(year, month - 1, 1)),
        ),
        year: String(year),
        left: ((monthStart - startOrdinal) / totalDays) * 100,
        width: ((nextMonth - monthStart) / totalDays) * 100,
      };
    });
    const firstDayOfWeek = new Date(startOrdinal * DAY_MS).getUTCDay();
    const firstWeekStart = startOrdinal - ((firstDayOfWeek + 6) % 7);
    const weeks: ProjectTimelineModel['weeks'] = [];
    for (let weekStart = firstWeekStart; weekStart < endOrdinal; weekStart += 7) {
      const visibleStart = Math.max(weekStart, startOrdinal);
      const visibleEnd = Math.min(weekStart + 7, endOrdinal);
      const thursday = new Date(weekStart * DAY_MS);
      thursday.setUTCDate(thursday.getUTCDate() + 3);
      const januaryFourth = Date.UTC(thursday.getUTCFullYear(), 0, 4) / DAY_MS;
      const weekOneMonday =
        januaryFourth - ((new Date(januaryFourth * DAY_MS).getUTCDay() + 6) % 7);
      const weekNumber = Math.floor((weekStart - weekOneMonday) / 7) + 1;
      weeks.push({
        key: String(weekStart),
        label: `W${String(weekNumber).padStart(2, '0')}`,
        left: ((visibleStart - startOrdinal) / totalDays) * 100,
        width: ((visibleEnd - visibleStart) / totalDays) * 100,
      });
    }
    const todayOrdinal = dateOrdinal(new Date());
    return {
      startMonth: timelineStart,
      totalDays,
      months,
      weeks,
      todayPosition:
        todayOrdinal >= startOrdinal && todayOrdinal < endOrdinal
          ? ((todayOrdinal - startOrdinal) / totalDays) * 100
          : null,
      groups: projectGroups,
    };
  }, [projectGroups, timelineStart]);

  const filterCount =
    statusFilters.length +
    priorityFilters.length +
    healthFilters.length +
    labelFilters.length +
    milestoneFilters.length +
    relationFilters.length +
    (search.dateField && (search.dateFrom || search.dateTo) ? 1 : 0) +
    (search.closed ? 1 : 0);
  const controls: ProjectListControlsModel = {
    search: search.q ?? '',
    statuses: statusFilters,
    priorities: priorityFilters,
    healths: healthFilters,
    labels: labelFilters,
    groupBy,
    orderBy: search.orderBy ?? 'manual',
    direction: search.direction ?? 'asc',
    closed: search.closed ?? 'all',
    view,
    columnsBy,
    rowsBy,
    showEmptyColumns,
    showProjectList: search.showProjectList ?? true,
    showWeekNumbers: search.showWeekNumbers ?? false,
    displayProperties,
    dateField: search.dateField ?? '',
    dateFrom: search.dateFrom ?? '',
    dateTo: search.dateTo ?? '',
    milestones: milestoneFilters,
    relations: relationFilters,
    availableMilestones,
    availableLabels: data.labels,
    filterCount,
    handlers: {
      onSearchChange: (value) => void updateProjectSearch({ q: value || undefined }),
      onStatusesChange: (value) =>
        void updateProjectSearch({ status: value.length ? value : undefined }),
      onPrioritiesChange: (value) =>
        void updateProjectSearch({ priority: value.length ? value : undefined }),
      onHealthsChange: (value) =>
        void updateProjectSearch({
          health: value.length ? (value as NonNullable<typeof search.health>) : undefined,
        }),
      onLabelsChange: (value) =>
        void updateProjectSearch({ labels: value.length ? value : undefined }),
      onDateFieldChange: (value) =>
        void updateProjectSearch({
          dateField: value ? (value as typeof search.dateField) : undefined,
          dateFrom: undefined,
          dateTo: undefined,
        }),
      onDateFromChange: (value) => void updateProjectSearch({ dateFrom: value || undefined }),
      onDateToChange: (value) => void updateProjectSearch({ dateTo: value || undefined }),
      onMilestonesChange: (value) =>
        void updateProjectSearch({ milestones: value.length ? value : undefined }),
      onRelationsChange: (value) =>
        void updateProjectSearch({
          relations: value.length ? (value as NonNullable<typeof search.relations>) : undefined,
        }),
      onGroupByChange: (value) =>
        void updateProjectSearch({ groupBy: value as typeof search.groupBy }),
      onOrderByChange: (value) =>
        void updateProjectSearch({ orderBy: value as typeof search.orderBy }),
      onDirectionChange: (value) =>
        void updateProjectSearch({ direction: value as typeof search.direction }),
      onClosedChange: (value) =>
        void updateProjectSearch({ closed: value as typeof search.closed }),
      onViewChange: (value) =>
        void updateProjectSearch({ view: value === 'list' ? undefined : value }),
      onColumnsByChange: (value) =>
        void updateProjectSearch({ columnsBy: value as typeof search.columnsBy }),
      onRowsByChange: (value) =>
        void updateProjectSearch({ rowsBy: value as typeof search.rowsBy }),
      onShowEmptyColumnsChange: (value) =>
        void updateProjectSearch({ showEmptyColumns: value ? undefined : false }),
      onShowProjectListChange: (value) =>
        void updateProjectSearch({ showProjectList: value ? undefined : false }),
      onShowWeekNumbersChange: (value) =>
        void updateProjectSearch({ showWeekNumbers: value ? true : undefined }),
      onDisplayPropertyToggle: (property) => {
        const next = displayProperties.includes(property)
          ? displayProperties.filter((item) => item !== property)
          : [...displayProperties, property];
        void updateProjectSearch({ displayProperties: next });
      },
      onReset: () =>
        void updateProjectSearch({
          q: undefined,
          status: undefined,
          priority: undefined,
          health: undefined,
          labels: undefined,
          dateField: undefined,
          dateFrom: undefined,
          dateTo: undefined,
          milestones: undefined,
          relations: undefined,
          groupBy: undefined,
          orderBy: undefined,
          direction: undefined,
          closed: undefined,
          view: undefined,
          columnsBy: undefined,
          rowsBy: undefined,
          showEmptyColumns: undefined,
          showProjectList: undefined,
          showWeekNumbers: undefined,
          timelineStart: undefined,
        }),
    },
  };

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
      summary,
      icon,
      iconColor,
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
    projectGroups,
    projectBoard,
    projectTimeline,
    timelineFocusToday: !search.timelineStart,
    displayProperties,
    projectIssueCounts: Object.fromEntries(projectIssueCounts),
    projectViews: projectViews.views,
    activeProjectView,
    projectViewDialogOpen,
    projectViewName,
    projectViewDescription,
    visibleProjectCount: filteredProjects.length,
    isGrouped: groupBy !== 'none',
    hasActiveSearch: Boolean(search.q?.trim()) || filterCount > 0,
    controls,
    availableLabels: data.labels,
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
    createOpen,
    handlers: {
      onOpenCreateProjectView: openProjectView,
      onCloseProjectView: () => setProjectViewDialogOpen(false),
      onProjectViewNameChange: (event: React.ChangeEvent<HTMLInputElement>) =>
        setProjectViewName(event.target.value),
      onProjectViewDescriptionChange: (event: React.ChangeEvent<HTMLTextAreaElement>) =>
        setProjectViewDescription(event.target.value),
      onSubmitProjectView: createProjectView,
      onApplyProjectView: (view: ProjectSavedView) => applyProjectView(view),
      onShowAllProjects: showAllProjects,
      onUpdateActiveProjectView: updateActiveProjectView,
      onDeleteActiveProjectView: deleteActiveProjectView,
      onTimelinePrevious: () =>
        void updateProjectSearch({ timelineStart: shiftMonthKey(timelineStart, -4) }),
      onTimelineNext: () =>
        void updateProjectSearch({ timelineStart: shiftMonthKey(timelineStart, 4) }),
      onTimelineToday: () => void updateProjectSearch({ timelineStart: undefined }),
      onSubmit0: (e: Parameters<NonNullable<React.ComponentProps<'form'>['onSubmit']>>[0]) => {
        return createProject(e);
      },
      onOpenCreateProject: () => {
        setName('');
        setSummary('');
        setIcon('');
        setIconColor('grey');
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
      New_project_summary_onChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setSummary(e.target.value),
      onProjectIconChange: (value: string) => setIcon(value),
      onProjectIconColorChange: (value: string) => setIconColor(value),
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
    projects: Project[];
    issues: Issue[];
    adrs: ADR[];
    pages: Page[];
    labels: Label[];
    activities: Activity[];
  };
  const router = useRouter();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [project, setProject] = useState(data.project);
  const [milestoneName, setMilestoneName] = useState('');
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

  if (project.slug !== data.project.slug) {
    setProject(data.project);
    setSelected(null);
    setDependencyProjectSlug('');
    setDependencyKind('blocks');
    setProjectUpdateHealth(data.project.health ?? 'on_track');
    setProjectUpdateBody('');
    setProjectUpdateOpen(false);
  }

  async function save(body: Record<string, unknown>) {
    const before = project;
    const next = await api.patchProject(slug, body);
    setProject((current) => {
      const locallyEditable = [
        'name',
        'summary',
        'icon',
        'iconColor',
        'description',
        'status',
        'health',
        'priority',
        'startDate',
        'targetDate',
        'labels',
      ] as const;
      const newerEdits = Object.fromEntries(
        locallyEditable
          .filter((field) => current[field] !== before[field])
          .map((field) => [field, current[field]]),
      );
      return current.slug === before.slug ? { ...next, ...newerEdits } : current;
    });
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
        message: describeProjectActivity(activity, data.projects),
        createdAt: activity.createdAt,
      })),
    projectUpdateOpen,
    projectUpdateHealth,
    projectUpdateBody,
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
    milestoneTargetDate,
    handlers: {
      Project_status_onChange0: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => save({ status: e.target.value }),
      Project_priority_onChange1: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => save({ priority: Number(e.target.value) }),
      onProjectHealthChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
        save({ health: e.target.value === 'none' ? '' : e.target.value }),
      onOpenProjectUpdate: () => {
        setProjectUpdateHealth(project.health ?? 'on_track');
        setProjectUpdateBody('');
        setProjectUpdateOpen(true);
      },
      onCloseProjectUpdate: () => setProjectUpdateOpen(false),
      onProjectUpdateHealthChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
        setProjectUpdateHealth(e.target.value as ProjectHealth),
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
      onProjectLabelToggle: (name: string) => {
        const current = project.labels ?? [];
        const next = current.includes(name)
          ? current.filter((label) => label !== name)
          : [...current, name];
        return save({ labels: next });
      },
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
      Project_summary_onChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => {
        const summaryDraft = e.currentTarget.value;
        setProject((current) => ({ ...current, summary: summaryDraft }));
      },
      Project_summary_onBlur: (e: React.FocusEvent<HTMLInputElement>) =>
        save({ summary: e.currentTarget.value }),
      onProjectIconChange: (value: string) => save({ icon: value }),
      onProjectIconColorChange: (value: string) => save({ iconColor: value }),
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
  const search = useSearch({ from: '/cycles/$number' }) as IssueSearch;
  const data = useLoaderData({ from: '/cycles/$number' }) as {
    cycle: Cycle;
    issues: Issue[];
    cycleIssues: Issue[];
    activities: Activity[];
    pages: Page[];
    projects: Project[];
    cycles: Cycle[];
    labels: Label[];
  };
  const router = useRouter();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [cycle, setCycle] = useState(data.cycle);
  const progressTimeline = cycleProgressTimeline(cycle, data.cycleIssues, data.activities);
  const asOf = Math.min(Date.parse(cycle.endsAt), Math.max(Date.parse(cycle.startsAt), Date.now()));
  const progress = progressTimeline.reduce(
    (current, point) => (Date.parse(point.at) <= asOf ? point : current),
    progressTimeline[0] ?? { at: cycle.startsAt, scope: 0, started: 0, completed: 0 },
  );
  const started = progress.started;
  const done = progress.completed;
  const startedPercent = data.cycleIssues.length
    ? Math.round((started / data.cycleIssues.length) * 100)
    : 0;
  const completionPercent = data.cycleIssues.length
    ? Math.round((done / data.cycleIssues.length) * 100)
    : 0;
  const [groupBy, setGroupBy] = useState<IssueGroupBy>('status');
  const [layout, setLayout] = useState<IssueLayout>('list');
  const [orderBy, setOrderBy] = useState<IssueOrderBy>('manual');
  const [subGroupBy, setSubGroupBy] = useState<IssueGroupBy>('none');
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc');
  const [completedIssues, setCompletedIssues] = useState<CompletedIssuesFilter>('all');
  const [showSubIssues, setShowSubIssues] = useState(true);
  const [nestedSubIssues, setNestedSubIssues] = useState<'showMatching' | 'showAll'>(
    'showMatching',
  );
  const [showEmptyGroups, setShowEmptyGroups] = useState(false);
  const [displayProperties, setDisplayProperties] = useState<IssueDisplayProperty[]>([
    ...DEFAULT_DISPLAY_PROPERTIES,
  ]);
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

  const matchingIssues = search.cycle != null && search.cycle !== cycle.number ? [] : data.issues;
  const issues = filterCompletedIssues(
    includeNestedIssueMatches(matchingIssues, data.issues, nestedSubIssues),
    completedIssues,
    data.cycles,
  );
  const selectedId =
    selected && issues.some((issue) => issue.identifier === selected) ? selected : null;

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
    issues,
    search,
    selected: selectedId,
    cycle,
    resources,
    progressTimeline,
    started,
    startedPercent,
    done,
    completionPercent,
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
      onFilterChange: (next: IssueSearch) =>
        navigate({
          to: '/cycles/$number',
          params: { number: String(cycle.number) },
          search: next,
        }),
      onGroupBy: (next: IssueGroupBy) => setGroupBy(next),
      onLayout: (next: IssueLayout) => setLayout(next),
      onOrderBy: (next: IssueOrderBy) => setOrderBy(next),
      onSubGroupBy: (next: IssueGroupBy) => setSubGroupBy(next),
      onDirection: (next: 'asc' | 'desc') => setDirection(next),
      onCompletedIssues: (next: CompletedIssuesFilter) => setCompletedIssues(next),
      onShowSubIssues: (next: boolean) => setShowSubIssues(next),
      onNestedSubIssues: (next: 'showMatching' | 'showAll') => setNestedSubIssues(next),
      onShowEmptyGroups: (next: boolean) => setShowEmptyGroups(next),
      onDisplayPropertyToggle: (property: IssueDisplayProperty) =>
        setDisplayProperties((current) =>
          current.includes(property)
            ? current.filter((item) => item !== property)
            : [...current, property],
        ),
      onBoardOpen: (identifier: string) =>
        navigate({ to: '/issues/$identifier', params: { identifier } }),
      onBoardMove: async (identifier: string, status: string, sortOrder: number) => {
        await api.patchIssue(identifier, { workflowStatus: status, sortOrder });
        await router.invalidate();
        signals.dispatchEvent(new Event('kotowari:refresh'));
      },
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
