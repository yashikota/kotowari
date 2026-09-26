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
import { matchesProjectViewSearch } from '../project-view-filtering.ts';
import { groupProjects } from '../project-grouping.ts';
import { priorityLabel } from '../i18n/labels.ts';
import type { Initiative, Project, ProjectTemplate, ViewIconName } from '../types.ts';
import { VIEW_ICON_NAMES } from '../components/ViewIcon.tsx';

type BuilderData = {
  projects: Project[];
  projectTemplates: ProjectTemplate[];
  initiatives: Initiative[];
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
  const availableTemplates = useMemo(() => {
    const templateNames = new Map(
      data.projectTemplates.map((template) => [template.slug, template.name]),
    );
    for (const project of data.projects) {
      if (project.templateSlug && !templateNames.has(project.templateSlug))
        templateNames.set(project.templateSlug, project.templateSlug);
    }
    return [...templateNames].map(([slug, label]) => ({ value: `template:${slug}`, label }));
  }, [data.projectTemplates, data.projects]);
  const availableInitiatives = useMemo(
    () =>
      data.initiatives.map((initiative) => ({
        value: `initiative:${initiative.slug}`,
        label: initiative.name,
      })),
    [data.initiatives],
  );

  const filteredProjects = useMemo(() => {
    const filtered = data.projects.filter((project) => matchesProjectViewSearch(project, search));
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
        result = (left[field] ?? '').localeCompare(right[field] ?? '');
      }
      return (result || left.slug.localeCompare(right.slug)) * direction;
    });
  }, [data.projects, search, statuses]);

  const groups = useMemo(() => {
    const groupBy = search.groupBy ?? 'none';
    return groupProjects(
      filteredProjects,
      groupBy,
      statuses.map((status) => status.id),
      (by, value) => {
        if (value === null) {
          if (by === 'labels') return t('projectList.groupNoLabel');
          if (by === 'startDate' || by === 'targetDate') return t('projectList.groupNoDate');
          if (by === 'health') return t('projectHealth.status.none');
        }
        if (by === 'status') return projectWorkflowStatusLabel(value ?? '', statuses, t);
        if (by === 'priority') return priorityLabel(Number(value));
        if (by === 'health') return t(`projectHealth.status.${value}`);
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
  }, [filteredProjects, search.groupBy, statuses, t, i18n.language]);

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
  const templateFilters = search.templates ?? [];
  const initiativeFilters = search.initiatives ?? [];
  const milestoneFilters = search.milestones ?? [];
  const relationFilters = search.relations ?? [];
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

  const controls: ProjectListControlsModel = {
    search: search.q ?? '',
    searchOperator: search.qOperator ?? 'contains',
    advancedFilter: search.advancedFilter ?? false,
    filterOperator: search.filterOperator ?? 'and',
    statuses: statusFilters,
    priorities: priorityFilters,
    healths: healthFilters,
    labels: labelFilters,
    templates: templateFilters,
    initiatives: initiativeFilters,
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
    availableTemplates,
    availableInitiatives,
    availableProjects: data.projects.map((project) => ({
      value: project.slug,
      label: project.name,
    })),
    specificProject: search.specificProject ?? '',
    availableLabels: data.labels,
    filterCount,
    handlers: {
      onAdvancedFilterToggle: () =>
        void updateSearch(
          search.advancedFilter
            ? { advancedFilter: undefined, filterOperator: undefined }
            : { advancedFilter: true, filterOperator: 'or' },
        ),
      onFilterOperatorChange: (value) =>
        void updateSearch({ filterOperator: value === 'or' ? 'or' : undefined }),
      onSearchChange: (value) =>
        void updateSearch({
          q: value || undefined,
          qOperator: value ? search.qOperator : undefined,
        }),
      onSearchOperatorChange: (value) =>
        void updateSearch({
          qOperator: value === 'doesNotContain' ? 'doesNotContain' : undefined,
        }),
      onStatusesChange: (value) => void updateSearch({ status: value.length ? value : undefined }),
      onPrioritiesChange: (value) =>
        void updateSearch({ priority: value.length ? value : undefined }),
      onHealthsChange: (value) =>
        void updateSearch({
          health: value.length ? (value as ProjectViewSearch['health']) : undefined,
        }),
      onLabelsChange: (value) => void updateSearch({ labels: value.length ? value : undefined }),
      onTemplatesChange: (value) =>
        void updateSearch({ templates: value.length ? value : undefined }),
      onInitiativesChange: (value) =>
        void updateSearch({ initiatives: value.length ? value : undefined }),
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
      onSpecificProjectChange: (value) =>
        void updateSearch({ specificProject: value || undefined }),
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
