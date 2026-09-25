import { useMemo, useState } from 'react';
import { useLoaderData, useNavigate, useSearch } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import type { ProjectListControlsModel } from '../components/ProjectListControls.tsx';
import type { ProjectBoardModel } from '../components/ProjectBoardView.tsx';
import type { ProjectTimelineModel } from '../components/ProjectTimelineView.tsx';
import { useProjectWorkflow, projectWorkflowStatusLabel } from '../project-workflow.tsx';
import { DEFAULT_PROJECT_DISPLAY_PROPERTIES } from '../project-display.ts';
import type { ProjectDisplayProperty } from '../project-display.ts';
import { useProjectViews } from '../project-views.ts';
import type { ProjectSavedView, ProjectViewSearch } from '../project-views.ts';
import { priorityLabel } from '../i18n/labels.ts';
import type { Project, ViewIconName } from '../types.ts';
import { VIEW_ICON_NAMES } from '../components/ViewIcon.tsx';

type BuilderData = {
  projects: Project[];
  labels: import('../types.ts').Label[];
  issues: import('../types.ts').Issue[];
};

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

function dateOrdinal(date: Date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS;
}

function compactSearch(search: ProjectViewSearch): ProjectViewSearch {
  return Object.fromEntries(
    Object.entries(search).filter(([, value]) => value !== undefined && value !== ''),
  ) as ProjectViewSearch;
}

function uniqueSlug(name: string, views: ProjectSavedView[]) {
  const base =
    name
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `project-view-${Date.now()}`;
  let slug = base;
  for (let suffix = 2; views.some((view) => view.slug === slug); suffix++) {
    slug = `${base}-${suffix}`;
  }
  return slug;
}

export function useProjectViewBuilderPresenter() {
  const { t, i18n } = useTranslation();
  const data = useLoaderData({ from: '/views/projects/new' }) as BuilderData;
  const routeSearch = useSearch({ from: '/views/projects/new' }) as ProjectViewSearch;
  const search = routeSearch;
  const navigate = useNavigate({ from: '/views/projects/new' });
  const { statuses } = useProjectWorkflow();
  const projectViews = useProjectViews();
  const [name, setName] = useState(() => t('projectViews.defaultName'));
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState<ViewIconName>('list');
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const displayProperties = (search.displayProperties ??
    DEFAULT_PROJECT_DISPLAY_PROPERTIES) as ProjectDisplayProperty[];
  const availableMilestones = useMemo(
    () =>
      [
        ...new Set(
          data.projects.flatMap((project) => project.milestones.map((milestone) => milestone.name)),
        ),
      ].sort(),
    [data.projects],
  );

  const filteredProjects = useMemo(() => {
    const query = (search.q ?? '').trim().toLocaleLowerCase();
    const statusFilters = search.status ?? [];
    const priorityFilters = search.priority ?? [];
    const healthFilters = search.health ?? [];
    const labelFilters = search.labels ?? [];
    const milestoneFilters = search.milestones ?? [];
    const relationFilters = search.relations ?? [];
    const filtered = data.projects.filter((project) => {
      if (
        statusFilters.length &&
        !statusFilters.includes(project.workflowStatus ?? project.status) &&
        !statusFilters.includes(project.status)
      ) {
        return false;
      }
      if (priorityFilters.length && !priorityFilters.includes(String(project.priority)))
        return false;
      if (healthFilters.length && !healthFilters.includes(project.health || 'none')) return false;
      if (
        labelFilters.length &&
        !labelFilters.some((label) => (project.labels ?? []).includes(label))
      ) {
        return false;
      }
      if (
        milestoneFilters.length &&
        !milestoneFilters.some((milestone) =>
          project.milestones.some((item) => item.name === milestone),
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
      return (
        !query ||
        `${project.name} ${project.summary || project.description} ${project.description}`
          .toLocaleLowerCase()
          .includes(query)
      );
    });
    const originalOrder = new Map(data.projects.map((project, index) => [project.slug, index]));
    const statusOrder = new Map(statuses.map((status, index) => [status.id, index]));
    const direction = search.direction === 'desc' ? -1 : 1;
    const orderBy = search.orderBy ?? 'manual';
    return filtered.sort((left, right) => {
      let result = 0;
      if (orderBy === 'manual') {
        result = (originalOrder.get(left.slug) ?? 0) - (originalOrder.get(right.slug) ?? 0);
      } else if (orderBy === 'priority') {
        const rank = (priority: number) => (priority === 0 ? 5 : priority);
        result = rank(left.priority) - rank(right.priority);
      } else if (orderBy === 'status') {
        result =
          (statusOrder.get(left.workflowStatus ?? left.status) ?? 0) -
          (statusOrder.get(right.workflowStatus ?? right.status) ?? 0);
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
        result = (left[field] ?? '').localeCompare(right[field] ?? '');
      }
      return (result || left.slug.localeCompare(right.slug)) * direction;
    });
  }, [data.projects, search, statuses]);

  const groups = useMemo(() => {
    const groupBy = search.groupBy ?? 'none';
    if (groupBy === 'none') {
      return filteredProjects.length ? [{ key: 'all', label: '', projects: filteredProjects }] : [];
    }
    const grouped = new Map<string, Project[]>();
    for (const project of filteredProjects) {
      const key =
        groupBy === 'status'
          ? (project.workflowStatus ?? project.status)
          : String(project.priority);
      const group = grouped.get(key) ?? [];
      group.push(project);
      grouped.set(key, group);
    }
    const keys =
      groupBy === 'status'
        ? statuses.map((status) => status.id).filter((key) => grouped.has(key))
        : ['1', '2', '3', '4', '0'].filter((key) => grouped.has(key));
    return keys.map((key) => ({
      key,
      label:
        groupBy === 'status'
          ? projectWorkflowStatusLabel(key, statuses, t)
          : priorityLabel(Number(key)),
      projects: grouped.get(key) ?? [],
    }));
  }, [filteredProjects, search.groupBy, statuses, t]);

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
        label: new Intl.DateTimeFormat(i18n.language, {
          month: 'short',
          timeZone: 'UTC',
        }).format(new Date(Date.UTC(year, month - 1, 1))),
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
      groups,
    };
  }, [groups, i18n.language, timelineStart]);

  const projectBoard = useMemo<ProjectBoardModel>(() => {
    const columnsBy = search.columnsBy ?? 'status';
    const rowsBy = search.rowsBy ?? 'none';
    const keyFor = (project: Project, field: 'status' | 'priority') =>
      field === 'status' ? (project.workflowStatus ?? project.status) : String(project.priority);
    const allColumnKeys =
      columnsBy === 'status' ? statuses.map((status) => status.id) : ['1', '2', '3', '4', '0'];
    const columns = allColumnKeys
      .map((key) => ({
        key,
        label:
          columnsBy === 'status'
            ? projectWorkflowStatusLabel(key, statuses, t)
            : priorityLabel(Number(key)),
      }))
      .filter(
        (column) =>
          search.showEmptyColumns !== false ||
          filteredProjects.some((project) => keyFor(project, columnsBy) === column.key),
      );
    const rowKeys =
      rowsBy === 'none'
        ? ['all']
        : rowsBy === 'status'
          ? statuses
              .map((status) => status.id)
              .filter((key) => filteredProjects.some((p) => keyFor(p, 'status') === key))
          : ['1', '2', '3', '4', '0'].filter((key) =>
              filteredProjects.some((project) => keyFor(project, 'priority') === key),
            );
    return {
      columns,
      rows: rowKeys.map((rowKey) => ({
        key: rowKey,
        label:
          rowKey === 'all'
            ? ''
            : rowsBy === 'status'
              ? projectWorkflowStatusLabel(rowKey, statuses, t)
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
  }, [filteredProjects, search.columnsBy, search.rowsBy, search.showEmptyColumns, statuses, t]);

  function updateSearch(patch: Partial<ProjectViewSearch>) {
    return navigate({
      to: '/views/projects/new',
      search: (previous) => ({ ...previous, ...patch }),
      replace: true,
      resetScroll: false,
    });
  }

  const statusFilters = search.status ?? [];
  const priorityFilters = search.priority ?? [];
  const healthFilters = search.health ?? [];
  const labelFilters = search.labels ?? [];
  const milestoneFilters = search.milestones ?? [];
  const relationFilters = search.relations ?? [];
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
    groupBy: search.groupBy ?? 'none',
    orderBy: search.orderBy ?? 'manual',
    direction: search.direction ?? 'asc',
    closed: search.closed ?? 'all',
    view: search.view ?? 'list',
    columnsBy: search.columnsBy ?? 'status',
    rowsBy: search.rowsBy ?? 'none',
    showEmptyColumns: search.showEmptyColumns ?? true,
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
      onSearchChange: (value) => void updateSearch({ q: value || undefined }),
      onStatusesChange: (value) => void updateSearch({ status: value.length ? value : undefined }),
      onPrioritiesChange: (value) =>
        void updateSearch({ priority: value.length ? value : undefined }),
      onHealthsChange: (value) =>
        void updateSearch({
          health: value.length ? (value as ProjectViewSearch['health']) : undefined,
        }),
      onLabelsChange: (value) => void updateSearch({ labels: value.length ? value : undefined }),
      onDateFieldChange: (value) =>
        void updateSearch({
          dateField: (value as ProjectViewSearch['dateField']) || undefined,
          dateFrom: undefined,
          dateTo: undefined,
        }),
      onDateFromChange: (value) => void updateSearch({ dateFrom: value || undefined }),
      onDateToChange: (value) => void updateSearch({ dateTo: value || undefined }),
      onMilestonesChange: (value) =>
        void updateSearch({ milestones: value.length ? value : undefined }),
      onRelationsChange: (value) =>
        void updateSearch({
          relations: value.length ? (value as ProjectViewSearch['relations']) : undefined,
        }),
      onGroupByChange: (value) =>
        void updateSearch({ groupBy: (value as ProjectViewSearch['groupBy']) || 'none' }),
      onOrderByChange: (value) =>
        void updateSearch({ orderBy: (value as ProjectViewSearch['orderBy']) || 'manual' }),
      onDirectionChange: (value) =>
        void updateSearch({ direction: (value as ProjectViewSearch['direction']) || 'asc' }),
      onClosedChange: (value) =>
        void updateSearch({ closed: (value as ProjectViewSearch['closed']) || 'all' }),
      onViewChange: (value) => void updateSearch({ view: value === 'list' ? undefined : value }),
      onColumnsByChange: (value) =>
        void updateSearch({ columnsBy: (value as ProjectViewSearch['columnsBy']) || 'status' }),
      onRowsByChange: (value) =>
        void updateSearch({ rowsBy: (value as ProjectViewSearch['rowsBy']) || 'none' }),
      onShowEmptyColumnsChange: (value) =>
        void updateSearch({ showEmptyColumns: value ? undefined : false }),
      onShowProjectListChange: (value) =>
        void updateSearch({ showProjectList: value ? undefined : false }),
      onShowWeekNumbersChange: (value) =>
        void updateSearch({ showWeekNumbers: value ? true : undefined }),
      onDisplayPropertyToggle: (property: ProjectDisplayProperty) => {
        const next = displayProperties.includes(property)
          ? displayProperties.filter((item) => item !== property)
          : [...displayProperties, property];
        void updateSearch({ displayProperties: next });
      },
      onReset: () => void navigate({ to: '/views/projects/new', search: {}, replace: true }),
    },
  };

  function createView() {
    const cleanName = name.trim();
    if (!cleanName) return;
    const view: ProjectSavedView = {
      slug: uniqueSlug(cleanName, projectViews.views),
      name: cleanName,
      description: description.trim(),
      icon,
      search: compactSearch(search),
      updatedAt: new Date().toISOString(),
    };
    projectViews.save(view);
    void navigate({
      to: '/projects',
      search: { ...view.search, projectView: view.slug },
    });
  }

  return {
    _view: 0 as const,
    controls,
    data,
    filteredProjects,
    groups,
    projectBoard,
    projectTimeline,
    timelineFocusToday: !search.timelineStart,
    projectIssueCounts: Object.fromEntries(
      data.issues.reduce((counts, issue) => {
        if (issue.projectSlug)
          counts.set(issue.projectSlug, (counts.get(issue.projectSlug) ?? 0) + 1);
        return counts;
      }, new Map<string, number>()),
    ),
    displayProperties,
    name,
    description,
    icon,
    iconPickerOpen,
    iconOptions: VIEW_ICON_NAMES,
    handlers: {
      onNameChange: (event: { currentTarget: { value: string } }) =>
        setName(event.currentTarget.value),
      onDescriptionChange: (event: { currentTarget: { value: string } }) =>
        setDescription(event.currentTarget.value),
      onIconChange: (next: ViewIconName) => setIcon(next),
      onIconPickerChange: (next: boolean) => setIconPickerOpen(next),
      onCancel: () => void navigate({ to: '/projects', search: compactSearch(search) }),
      onCreate: createView,
    },
  };
}
