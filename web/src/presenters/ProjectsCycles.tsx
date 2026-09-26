import {
  useLoaderData,
  useNavigate,
  useParams,
  useRouter,
  useRouterState,
  useSearch,
} from '@tanstack/react-router';
import type * as React from 'react';
import { useMemo, useState } from 'react';
import { api, type IssueSearch } from '../api.ts';
import { useIntent, useKeyboard, useRootMachineFlag } from '../application/Root.tsx';
import { signals } from '../application/mediator.ts';
import i18n from '../i18n/index.ts';
import { cycleCalendarICS, cycleGoogleCalendarURL, cycleIssuesCSV } from '../cycle-export.ts';
import { cycleProgressTimeline } from '../cycle-progress.ts';
import { IssueList } from '../components/IssueList.tsx';
import type { IssueNavigationState } from '../focus.ts';
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
import { matchesProjectViewSearch } from '../project-view-filtering.ts';
import { groupProjects } from '../project-grouping.ts';
import { moveProjectBoardGroup, orderProjectBoardGroups } from '../project-board.ts';
import { isTypingTarget } from '../keymap.ts';
import { priorityLabel } from '../i18n/labels.ts';
import type {
  Activity,
  ADR,
  Cycle,
  Issue,
  Initiative,
  Label,
  Page,
  Project,
  ProjectDependency,
  ProjectHealth,
  ProjectTemplate,
} from '../types.ts';
import {
  useProjectWorkflow,
  projectWorkflowStatusCategory,
  projectWorkflowStatusLabel,
} from '../project-workflow.tsx';

const CYCLE_PROGRESS_OPEN_KEY = 'kotowari.cycle-progress-open.v1';

function readCycleProgressOpen(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(CYCLE_PROGRESS_OPEN_KEY) !== 'false';
  } catch {
    return true;
  }
}

function writeCycleProgressOpen(open: boolean) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CYCLE_PROGRESS_OPEN_KEY, String(open));
  } catch {
    // Keep the view usable when browser storage is unavailable.
  }
}

const DAY_MS = 86_400_000;

type ProjectMilestoneDraft = { name: string; description: string; targetDate: string };

function cycleURL(number: number) {
  return new URL(`${import.meta.env.BASE_URL}cycles/${number}`, window.location.origin).toString();
}

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

export function useProjectsPagePresenter() {
  const data = useLoaderData({ from: '/projects' }) as {
    projects: Project[];
    labels: Label[];
    issues: Issue[];
    projectTemplates: ProjectTemplate[];
    initiatives: Initiative[];
  };
  const { projects } = data;
  const { statuses: projectWorkflowStatuses } = useProjectWorkflow();
  const search = useSearch({ from: '/projects' });
  const router = useRouter();
  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [icon, setIcon] = useState('');
  const [iconColor, setIconColor] = useState('grey');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('planned');
  const [lead, setLead] = useState<'' | 'self'>('');
  const [priority, setPriority] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [selectedProjectTemplate, setSelectedProjectTemplate] = useState<string | null>(null);
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
  const [projectAssistantOpen, setProjectAssistantOpen] = useState(true);
  const [projectAssistantId, setProjectAssistantId] = useState('');
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
      qOperator: search.qOperator,
      advancedFilter: search.advancedFilter,
      filterOperator: search.filterOperator,
      advancedFilterGroup: search.advancedFilterGroup,
      specificProject: search.specificProject,
      status: search.status,
      priority: search.priority,
      health: search.health,
      labels: search.labels,
      templates: search.templates,
      initiatives: search.initiatives,
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
      manualOrder: search.manualOrder,
    };
  }

  function applyProjectView(view: ProjectSavedView) {
    return navigate({
      to: '/projects',
      search: { ...view.search, projectView: view.slug },
      resetScroll: false,
    });
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
  const templateFilters = search.templates ?? [];
  const initiativeFilters = search.initiatives ?? [];
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
  const availableTemplates = useMemo(() => {
    const templateNames = new Map(
      data.projectTemplates.map((template) => [template.slug, template.name]),
    );
    for (const project of projects) {
      if (project.templateSlug && !templateNames.has(project.templateSlug)) {
        templateNames.set(project.templateSlug, project.templateSlug);
      }
    }
    return [...templateNames].map(([slug, label]) => ({ value: `template:${slug}`, label }));
  }, [data.projectTemplates, projects]);
  const availableInitiatives = useMemo(
    () =>
      data.initiatives.map((initiative) => ({
        value: `initiative:${initiative.slug}`,
        label: initiative.name,
      })),
    [data.initiatives],
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
    const projectsToSort = projects.filter((project) => matchesProjectViewSearch(project, search));
    const orderBy = search.orderBy ?? 'manual';
    const direction = search.direction === 'desc' ? -1 : 1;
    const originalOrder = new Map(projects.map((project, index) => [project.slug, index]));
    const manualOrder = new Map((search.manualOrder ?? []).map((slug, index) => [slug, index]));
    const statusOrder = new Map(projectWorkflowStatuses.map((item, index) => [item.id, index]));
    projectsToSort.sort((left, right) => {
      let result = 0;
      if (orderBy === 'manual') {
        const leftIndex = manualOrder.get(left.slug);
        const rightIndex = manualOrder.get(right.slug);
        if (leftIndex !== undefined || rightIndex !== undefined) {
          if (leftIndex === undefined) return 1;
          if (rightIndex === undefined) return -1;
          result = leftIndex - rightIndex;
        } else {
          result = (originalOrder.get(left.slug) ?? 0) - (originalOrder.get(right.slug) ?? 0);
        }
      } else if (orderBy === 'priority') {
        const rank = (value: number) => (value === 0 ? 5 : value);
        result = rank(left.priority) - rank(right.priority);
      } else if (orderBy === 'status') {
        result =
          (statusOrder.get(left.workflowStatus ?? left.status) ?? 0) -
          (statusOrder.get(right.workflowStatus ?? right.status) ?? 0);
      } else if (orderBy === 'healthUpdated') {
        const leftDate = left.healthUpdatedAt || '';
        const rightDate = right.healthUpdatedAt || '';
        if (!leftDate || !rightDate) {
          if (leftDate !== rightDate) return leftDate ? -1 : 1;
        } else result = leftDate.localeCompare(rightDate);
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
    search,
    projectWorkflowStatuses,
  ]);

  const groupBy = search.groupBy ?? 'none';
  const projectGroups = useMemo(() => {
    return groupProjects(
      filteredProjects,
      groupBy,
      projectWorkflowStatuses.map((status) => status.id),
      (by, value) => {
        if (value === null) {
          if (by === 'labels') return i18n.t('projectList.groupNoLabel');
          if (by === 'startDate' || by === 'targetDate') return i18n.t('projectList.groupNoDate');
          if (by === 'health') return i18n.t('projectHealth.status.none');
        }
        if (by === 'status')
          return projectWorkflowStatusLabel(value ?? '', projectWorkflowStatuses, i18n.t);
        if (by === 'priority') return priorityLabel(Number(value));
        if (by === 'health') return i18n.t(`projectHealth.status.${value}`);
        if (by === 'startDate' || by === 'targetDate') {
          const [year, month, day] = (value ?? '').split('-').map(Number);
          return new Intl.DateTimeFormat(i18n.language, {
            dateStyle: 'medium',
            timeZone: 'UTC',
          }).format(new Date(Date.UTC(year, month - 1, day)));
        }
        return value ?? '';
      },
    );
  }, [filteredProjects, groupBy, projectWorkflowStatuses, i18n.language]);

  const view = search.view ?? 'list';
  const columnsBy = search.columnsBy ?? 'status';
  const rowsBy = search.rowsBy ?? 'none';
  const showEmptyColumns = search.showEmptyColumns ?? true;
  const boardGroupOrder =
    columnsBy === 'status' ? search.statusColumnOrder : search.priorityColumnOrder;
  const hiddenBoardGroupKeys =
    columnsBy === 'status' ? search.hiddenStatusColumns : search.hiddenPriorityColumns;
  const projectBoardGroups = useMemo(() => {
    const keys =
      columnsBy === 'status'
        ? projectWorkflowStatuses.map((status) => status.id)
        : ['1', '2', '3', '4', '0'];
    const groups = keys.map((key) => ({
      key,
      label:
        columnsBy === 'status'
          ? projectWorkflowStatusLabel(key, projectWorkflowStatuses, i18n.t)
          : priorityLabel(Number(key)),
      visible: !hiddenBoardGroupKeys?.includes(key),
    }));
    return orderProjectBoardGroups(groups, boardGroupOrder);
  }, [boardGroupOrder, columnsBy, hiddenBoardGroupKeys, projectWorkflowStatuses]);
  const projectBoard = useMemo<ProjectBoardModel>(() => {
    const columnGroups = projectBoardGroups
      .filter((group) => group.visible)
      .filter(
        (group) =>
          showEmptyColumns ||
          filteredProjects.some((project) =>
            columnsBy === 'status'
              ? (project.workflowStatus ?? project.status) === group.key
              : String(project.priority) === group.key,
          ),
      );
    const rowKeys =
      rowsBy === 'none'
        ? ['all']
        : rowsBy === 'status'
          ? projectWorkflowStatuses
              .map((status) => status.id)
              .filter(
                (key) =>
                  showEmptyColumns ||
                  filteredProjects.some(
                    (project) => (project.workflowStatus ?? project.status) === key,
                  ),
              )
          : ['1', '2', '3', '4', '0'].filter(
              (key) =>
                showEmptyColumns ||
                filteredProjects.some((project) => String(project.priority) === key),
            );
    const keyFor = (project: Project, by: 'status' | 'priority') =>
      by === 'status' ? (project.workflowStatus ?? project.status) : String(project.priority);
    const columns = columnGroups.map(({ key, label }) => ({ key, label }));
    return {
      columns,
      rows: rowKeys.map((rowKey) => ({
        key: rowKey,
        label:
          rowKey === 'all'
            ? ''
            : rowsBy === 'status'
              ? projectWorkflowStatusLabel(rowKey, projectWorkflowStatuses, i18n.t)
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
  }, [columnsBy, filteredProjects, projectBoardGroups, rowsBy, showEmptyColumns]);

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
    templateFilters.length +
    initiativeFilters.length +
    milestoneFilters.length +
    relationFilters.length +
    Number(Boolean(search.q?.trim())) +
    (search.dateField && (search.dateFrom || search.dateTo) ? 1 : 0) +
    (search.closed ? 1 : 0) +
    (search.specificProject ? 1 : 0);
  function reorderProject(source: string, target: string, direction: -1 | 1) {
    if ((search.orderBy ?? 'manual') !== 'manual' || source === target) return;
    const originalOrder = new Map(projects.map((project, index) => [project.slug, index]));
    const currentOrder = projects
      .map((project) => project.slug)
      .sort((left, right) => {
        const leftIndex = search.manualOrder?.indexOf(left) ?? -1;
        const rightIndex = search.manualOrder?.indexOf(right) ?? -1;
        if (leftIndex >= 0 || rightIndex >= 0) {
          if (leftIndex < 0) return 1;
          if (rightIndex < 0) return -1;
          return leftIndex - rightIndex;
        }
        return (originalOrder.get(left) ?? 0) - (originalOrder.get(right) ?? 0);
      });
    const sourceIndex = currentOrder.indexOf(source);
    const targetIndex = currentOrder.indexOf(target);
    if (sourceIndex < 0 || targetIndex < 0) return;
    currentOrder.splice(sourceIndex, 1);
    const insertion = currentOrder.indexOf(target) + (direction > 0 ? 1 : 0);
    currentOrder.splice(insertion, 0, source);
    void updateProjectSearch({ manualOrder: currentOrder });
  }

  async function moveProjectOnBoard(projectSlug: string, columnKey: string, rowKey: string) {
    if (rowsBy !== 'none' && rowsBy === columnsBy) return;
    const project = projects.find((item) => item.slug === projectSlug);
    if (!project) return;
    const workflowStatus =
      columnsBy === 'status'
        ? columnKey
        : rowsBy === 'status' && rowKey !== 'all'
          ? rowKey
          : undefined;
    const priority =
      columnsBy === 'priority'
        ? Number(columnKey)
        : rowsBy === 'priority' && rowKey !== 'all'
          ? Number(rowKey)
          : undefined;
    const changes: Record<string, unknown> = {};
    if (workflowStatus && workflowStatus !== (project.workflowStatus ?? project.status)) {
      changes.workflowStatus = workflowStatus;
    }
    if (priority !== undefined && priority !== project.priority) changes.priority = priority;
    if (!Object.keys(changes).length) return;
    await api.patchProject(projectSlug, changes);
    await router.invalidate();
  }

  const controls: ProjectListControlsModel = {
    search: search.q ?? '',
    searchOperator: search.qOperator ?? 'contains',
    advancedFilter: search.advancedFilter ?? false,
    filterOperator: search.filterOperator ?? 'and',
    advancedFilterGroup: search.advancedFilterGroup,
    statuses: statusFilters,
    priorities: priorityFilters,
    healths: healthFilters,
    labels: labelFilters,
    templates: templateFilters,
    initiatives: initiativeFilters,
    groupBy,
    orderBy: search.orderBy ?? 'manual',
    direction: search.direction ?? 'asc',
    closed: search.closed ?? 'all',
    view,
    columnsBy,
    rowsBy,
    showEmptyColumns,
    boardGroups: projectBoardGroups,
    showProjectList: search.showProjectList ?? true,
    showWeekNumbers: search.showWeekNumbers ?? false,
    displayProperties,
    dateField: search.dateField ?? '',
    dateFrom: search.dateFrom ?? '',
    dateTo: search.dateTo ?? '',
    milestones: milestoneFilters,
    relations: relationFilters,
    availableMilestones,
    availableTemplates,
    availableInitiatives,
    availableProjects: projects.map((project) => ({ value: project.slug, label: project.name })),
    specificProject: search.specificProject ?? '',
    availableLabels: data.labels,
    filterCount,
    handlers: {
      onAdvancedFilterToggle: () =>
        void updateProjectSearch(
          search.advancedFilter
            ? {
                advancedFilter: undefined,
                filterOperator: undefined,
                advancedFilterGroup: undefined,
              }
            : {
                advancedFilter: true,
                filterOperator: 'or',
                advancedFilterGroup: { kind: 'group', operator: 'or', children: [] },
              },
        ),
      onAdvancedFilterGroupChange: (value) =>
        void updateProjectSearch({ advancedFilterGroup: value, filterOperator: value.operator }),
      onSearchChange: (value) =>
        void updateProjectSearch({
          q: value || undefined,
          qOperator: value ? search.qOperator : undefined,
        }),
      onSearchOperatorChange: (value) =>
        void updateProjectSearch({
          qOperator: value === 'doesNotContain' ? 'doesNotContain' : undefined,
        }),
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
      onTemplatesChange: (value) =>
        void updateProjectSearch({ templates: value.length ? value : undefined }),
      onInitiativesChange: (value) =>
        void updateProjectSearch({ initiatives: value.length ? value : undefined }),
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
      onSpecificProjectChange: (value) =>
        void updateProjectSearch({ specificProject: value || undefined }),
      onGroupByChange: (value) =>
        void updateProjectSearch({ groupBy: value as typeof search.groupBy }),
      onOrderByChange: (value) =>
        void updateProjectSearch({ orderBy: value as typeof search.orderBy }),
      onSortProperty: (property) => {
        const orderBy =
          property === 'name'
            ? 'name'
            : property === 'priority' ||
                property === 'status' ||
                property === 'startDate' ||
                property === 'targetDate' ||
                property === 'created' ||
                property === 'updated'
              ? property
              : undefined;
        if (!orderBy) return;
        const direction =
          (search.orderBy ?? 'manual') === orderBy && search.direction !== 'desc' ? 'desc' : 'asc';
        void updateProjectSearch({ orderBy, direction });
      },
      onDirectionChange: (value) =>
        void updateProjectSearch({ direction: value as typeof search.direction }),
      onClosedChange: (value) =>
        void updateProjectSearch({ closed: value as typeof search.closed }),
      onViewChange: (value) =>
        void updateProjectSearch({ view: value === 'list' ? undefined : value }),
      onColumnsByChange: (value) => {
        const nextColumnsBy = value as typeof search.columnsBy;
        void updateProjectSearch({
          columnsBy: nextColumnsBy,
          ...(nextColumnsBy === rowsBy ? { rowsBy: 'none' } : {}),
        });
      },
      onRowsByChange: (value) =>
        void updateProjectSearch({ rowsBy: value as typeof search.rowsBy }),
      onShowEmptyColumnsChange: (value) =>
        void updateProjectSearch({ showEmptyColumns: value ? undefined : false }),
      onMoveBoardGroup: (key, destinationIndex) => {
        const order = moveProjectBoardGroup(
          projectBoardGroups.map((group) => group.key),
          key,
          destinationIndex,
        );
        if (columnsBy === 'status') void updateProjectSearch({ statusColumnOrder: order });
        else void updateProjectSearch({ priorityColumnOrder: order });
      },
      onBoardGroupVisibilityChange: (key, visible) => {
        if (!visible && projectBoardGroups.filter((group) => group.visible).length <= 1) return;
        const hidden = new Set(hiddenBoardGroupKeys ?? []);
        if (visible) hidden.delete(key);
        else hidden.add(key);
        const value = hidden.size ? [...hidden] : undefined;
        if (columnsBy === 'status') void updateProjectSearch({ hiddenStatusColumns: value });
        else void updateProjectSearch({ hiddenPriorityColumns: value });
      },
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
          qOperator: undefined,
          advancedFilter: undefined,
          filterOperator: undefined,
          advancedFilterGroup: undefined,
          specificProject: undefined,
          status: undefined,
          priority: undefined,
          health: undefined,
          labels: undefined,
          templates: undefined,
          initiatives: undefined,
          dateField: undefined,
          dateFrom: undefined,
          dateTo: undefined,
          milestones: undefined,
          relations: undefined,
          groupBy: undefined,
          orderBy: undefined,
          manualOrder: undefined,
          direction: undefined,
          closed: undefined,
          view: undefined,
          columnsBy: undefined,
          rowsBy: undefined,
          statusColumnOrder: undefined,
          priorityColumnOrder: undefined,
          hiddenStatusColumns: undefined,
          hiddenPriorityColumns: undefined,
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
      status: projectWorkflowStatusCategory(status, projectWorkflowStatuses),
      workflowStatus: status,
      lead,
      ...(selectedProjectTemplate ? { templateSlug: selectedProjectTemplate } : {}),
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

  function applyProjectTemplate(slug: string | null) {
    setSelectedProjectTemplate(slug);
    const template = data.projectTemplates.find((candidate) => candidate.slug === slug);
    if (!template) return;
    setSummary(template.summary ?? '');
    setIcon(template.icon ?? '');
    setIconColor(template.iconColor ?? 'grey');
    setDescription(template.description);
    const templateStatus = template.workflowStatus ?? template.status;
    setStatus(
      projectWorkflowStatuses.some((workflowStatus) => workflowStatus.id === templateStatus)
        ? templateStatus
        : template.status,
    );
    setLead(template.lead ?? '');
    setPriority(template.priority);
    setSelectedLabels(
      template.labels.filter((label) => data.labels.some((available) => available.name === label)),
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

  async function deleteSelectedProjectTemplate() {
    if (!selectedProjectTemplate) return;
    const template = data.projectTemplates.find(
      (candidate) => candidate.slug === selectedProjectTemplate,
    );
    if (
      !template ||
      !window.confirm(i18n.t('projectTemplates.deleteConfirmation', { name: template.name }))
    )
      return;
    await api.deleteProjectTemplate(selectedProjectTemplate);
    setSelectedProjectTemplate(null);
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

  const availableDependencyProjects = projects.filter(
    (candidate) =>
      !initialDependencies.some((dependency) => dependency.projectSlug === candidate.slug),
  );

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
    visibleProjectCount: filteredProjects.length,
    isGrouped: groupBy !== 'none',
    hasActiveSearch: Boolean(search.q?.trim()) || filterCount > 0,
    controls,
    availableLabels: data.labels,
    projectTemplates: data.projectTemplates,
    selectedProjectTemplate,
    projectWorkflowStatuses,
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
    projectNameBySlug: Object.fromEntries(projects.map((project) => [project.slug, project.name])),
    createOpen,
    projectAssistantOpen,
    projectAssistantId,
    handlers: {
      onOpenCreateProjectView: () =>
        navigate({
          to: '/views/projects/new',
          search: projectViewSearch(),
        }),
      onApplyProjectView: (view: ProjectSavedView) => applyProjectView(view),
      onShowAllProjects: showAllProjects,
      onUpdateActiveProjectView: updateActiveProjectView,
      onDeleteActiveProjectView: deleteActiveProjectView,
      onTimelinePrevious: () =>
        void updateProjectSearch({ timelineStart: shiftMonthKey(timelineStart, -4) }),
      onTimelineNext: () =>
        void updateProjectSearch({ timelineStart: shiftMonthKey(timelineStart, 4) }),
      onTimelineToday: () => void updateProjectSearch({ timelineStart: undefined }),
      onReorderProject: reorderProject,
      onMoveProjectOnBoard: moveProjectOnBoard,
      onSubmit0: (e: Parameters<NonNullable<React.ComponentProps<'form'>['onSubmit']>>[0]) => {
        return createProject(e);
      },
      onOpenCreateProject: () => {
        setProjectAssistantOpen(true);
        setProjectAssistantId(`project-draft-${crypto.randomUUID()}`);
        setSelectedProjectTemplate(null);
        setName('');
        setSummary('');
        setIcon('');
        setIconColor('grey');
        setDescription('');
        setStatus('planned');
        setLead('');
        setPriority(0);
        setStartDate('');
        setTargetDate('');
        setSelectedLabels([]);
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
      onToggleProjectAssistant: () => setProjectAssistantOpen((current) => !current),
      onProjectTemplateChange: (value: string | null) => applyProjectTemplate(value),
      onDeleteProjectTemplate: deleteSelectedProjectTemplate,
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
      onMilestoneDraftNameChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setMilestoneDraftName(e.target.value),
      onMilestoneDraftNameKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addInitialMilestone();
        }
      },
      onMilestoneDraftDescriptionChange: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
        setMilestoneDraftDescription(e.target.value),
      onMilestoneDraftTargetDateChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setMilestoneDraftTargetDate(e.target.value),
      onAddInitialMilestone: addInitialMilestone,
      onRemoveInitialMilestone: (index: number) =>
        setInitialMilestones((current) => current.filter((_, itemIndex) => itemIndex !== index)),
      onOpenDependencyDraft: () => setDependencyDraftOpen(true),
      onCancelDependencyDraft: () => {
        setDependencyDraftOpen(false);
        setDependencyDraftProjectSlug('');
      },
      onDependencyDraftProjectChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
        setDependencyDraftProjectSlug(e.target.value),
      onDependencyDraftKindChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
        setDependencyDraftKind(e.target.value as ProjectDependency['kind']),
      onAddInitialDependency: addInitialDependency,
      onRemoveInitialDependency: (projectSlug: string) =>
        setInitialDependencies((current) =>
          current.filter((dependency) => dependency.projectSlug !== projectSlug),
        ),
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
      New_project_status_onChange: (value: string | null) => value && setStatus(value),
      New_project_priority_onChange: (value: string | null) =>
        value !== null && setPriority(Number(value)),
      New_project_lead_onChange: (value: string | null) => setLead(value === 'self' ? 'self' : ''),
      onProjectStartDateChange: (value: string) => setStartDate(value),
      onProjectTargetDateChange: (value: string) => setTargetDate(value),
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
        'workflowStatus',
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
      Project_status_onChange0: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => save({ workflowStatus: e.target.value }),
      Project_priority_onChange1: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => save({ priority: Number(e.target.value) }),
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
      onProjectLabelToggle: (name: string) => {
        const current = project.labels ?? [];
        const next = current.includes(name)
          ? current.filter((label) => label !== name)
          : [...current, name];
        return save({ labels: next });
      },
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
      Milestone_description_onBlur: async (id: number, description: string) => {
        await api.patchMilestone(slug, id, { description });
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
      New_milestone_description_onChange: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => setMilestoneDescription(e.target.value),
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
  const data = useLoaderData({ from: '/cycles' }) as {
    cycles: Cycle[];
    issues: Issue[];
    activeCycleActivities: Activity[];
  };
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
        googleCalendarURL: cycleGoogleCalendarURL(cycle, cycleURL(cycle.number)),
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
  const activeCycle = scopedCycles.find((cycle) => cycle.status === 'active');
  const activeCycleIssues = activeCycle
    ? data.issues.filter((issue) => issue.cycleId === activeCycle.id)
    : [];
  const currentCyclePoints = activeCycle
    ? cycleProgressTimeline(activeCycle, activeCycleIssues, data.activeCycleActivities)
    : [];
  const currentProgress = currentCyclePoints.reduce(
    (current, point) => (Date.parse(point.at) <= Date.now() ? point : current),
    currentCyclePoints[0] ?? { at: '', scope: 0, started: 0, completed: 0 },
  );
  const currentCycleOverview = activeCycle
    ? {
        cycle: activeCycle,
        points: currentCyclePoints,
        scope: currentProgress.scope,
        started: currentProgress.started,
        startedPercent: currentProgress.scope
          ? Math.round((currentProgress.started / currentProgress.scope) * 100)
          : 0,
        completed: currentProgress.completed,
        completionPercent: currentProgress.scope
          ? Math.round((currentProgress.completed / currentProgress.scope) * 100)
          : 0,
      }
    : null;
  return {
    _view: 0 as const,
    cycles,
    scope,
    currentCycleOverview,
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
  const locationState = useRouterState({ select: (state) => state.location.state });
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
  const [selected, setSelected] = useState<string | null>(
    locationState.issueListSelectedId ?? null,
  );
  const [cycle, setCycle] = useState(data.cycle);
  const [cycleDetailsOpen, setCycleDetailsOpen] = useState(true);
  const [cycleProgressOpen, setCycleProgressOpen] = useState(readCycleProgressOpen);
  const googleCalendarURL = cycleGoogleCalendarURL(cycle, cycleURL(cycle.number));
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
  const [layout, setLayout] = useState<IssueLayout>(locationState.issueListLayout ?? 'list');
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

  const cycleNavigationOptions = useMemo(() => {
    const otherCycles = data.cycles.filter((candidate) => candidate.number !== cycle.number);
    const next = otherCycles
      .filter((candidate) => candidate.status === 'upcoming' && candidate.number > cycle.number)
      .sort((a, b) => a.number - b.number);
    const previous = otherCycles
      .filter((candidate) => candidate.status === 'completed' && candidate.number < cycle.number)
      .sort((a, b) => b.number - a.number);
    return {
      next: next.slice(0, 1),
      previous: previous.slice(0, 1),
    };
  }, [cycle.number, data.cycles]);

  function navigateToCycle(number: number) {
    void navigate({ to: '/cycles/$number', params: { number: String(number) } });
  }

  useKeyboard((event) => {
    if (
      !event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.repeat ||
      isTypingTarget(event.target)
    )
      return false;

    const key = event.key.toLowerCase();
    if (key === 'k' && cycleNavigationOptions.next[0]) {
      event.preventDefault();
      navigateToCycle(cycleNavigationOptions.next[0].number);
      return true;
    }
    if (key === 'j' && cycleNavigationOptions.previous[0]) {
      event.preventDefault();
      navigateToCycle(cycleNavigationOptions.previous[0].number);
      return true;
    }
    return false;
  }, true);

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
    cycleDetailsOpen,
    cycleProgressOpen,
    googleCalendarURL,
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
      onStatusChange: (status: Cycle['status']) => save({ status }),
      onStartDatePickerChange: async (value: string) => {
        if (cycle.status !== 'upcoming' || value >= cycle.endsAt.slice(0, 10)) return;
        await save({ startsAt: dateAtUTCStart(value) });
      },
      onEndDatePickerChange: async (value: string) => {
        if (cycle.status === 'completed' || value <= cycle.startsAt.slice(0, 10)) return;
        await save({ endsAt: dateAtUTCStart(value) });
      },
      onClick1: () => sendIntent('issue.create', { cycleId: cycle.id }),
      onToggleCycleDetails: () => setCycleDetailsOpen((open) => !open),
      onToggleCycleProgress: () =>
        setCycleProgressOpen((open) => {
          const next = !open;
          writeCycleProgressOpen(next);
          return next;
        }),
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
      onBoardOpen: (identifier: string, state: IssueNavigationState) =>
        navigate({ to: '/issues/$identifier', params: { identifier }, state }),
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
