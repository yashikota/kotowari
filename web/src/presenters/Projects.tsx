import { useLoaderData, useNavigate, useRouter, useSearch } from '@tanstack/react-router';
import { useCallback, useMemo } from 'react';
import { api } from '../api.ts';
import { useKeyboard } from '../application/Root.tsx';
import i18n from '../i18n/index.ts';

import type { ProjectListControlsModel } from '../project-list-controls.ts';
import {
  buildProjectTimelineModel,
  defaultProjectTimelineStart,
  shiftProjectTimelineMonth,
} from '../project-timeline.ts';
import { DEFAULT_PROJECT_DISPLAY_PROPERTIES } from '../project-display.ts';
import type { ProjectDisplayProperty } from '../project-display.ts';
import { useProjectViews } from '../project-views.ts';
import type {
  ProjectBoardGrouping,
  ProjectGroupBy,
  ProjectViewSearch,
} from '../project-view-search.ts';
import type { ProjectSavedView } from '../project-views.ts';
import { matchesProjectViewSearch } from '../project-view-filtering.ts';
import { groupProjects } from '../project-grouping.ts';
import type { ProjectGroupValue } from '../project-grouping.ts';
import { projectGroupLabel } from '../project-group-label.ts';
import { manualProjectOrder, sortProjectList } from '../project-ordering.ts';
import {
  buildProjectBoardLayout,
  moveProjectBoardGroup,
  projectBoardProjectPatch,
  projectBoardHiddenPatch,
  projectBoardOrderPatch,
  projectBoardSearchHidden,
  projectBoardSearchOrder,
} from '../project-board.ts';
import { isTypingTarget } from '../keymap.ts';
import { priorityLabel } from '../i18n/labels.ts';
import type { Issue, Initiative, Label, Project, ProjectTemplate, Workspace } from '../types.ts';
import { useProjectWorkflow, projectWorkflowStatusLabel } from '../project-workflow.tsx';
import { useProjectComposer } from './useProjectComposer.ts';

export function useProjectsPagePresenter() {
  const data = useLoaderData({ from: '/projects' }) as {
    projects: Project[];
    labels: Label[];
    issues: Issue[];
    projectTemplates: ProjectTemplate[];
    initiatives: Initiative[];
    workspace: Workspace;
  };
  const { projects } = data;
  const { statuses: projectWorkflowStatuses } = useProjectWorkflow();
  const search = useSearch({ from: '/projects' });
  const router = useRouter();
  const projectComposer = useProjectComposer({
    projects,
    labels: data.labels,
    templates: data.projectTemplates,
    workflowStatuses: projectWorkflowStatuses,
  });
  const { data: projectComposerData, handlers: projectComposerHandlers } = projectComposer;
  const { availableLabels: availableProjectLabels } = projectComposerData;
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
      leads: search.leads,
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
      statusColumnOrder: search.statusColumnOrder,
      priorityColumnOrder: search.priorityColumnOrder,
      labelsColumnOrder: search.labelsColumnOrder,
      leadColumnOrder: search.leadColumnOrder,
      healthColumnOrder: search.healthColumnOrder,
      startDateColumnOrder: search.startDateColumnOrder,
      targetDateColumnOrder: search.targetDateColumnOrder,
      hiddenStatusColumns: search.hiddenStatusColumns,
      hiddenPriorityColumns: search.hiddenPriorityColumns,
      hiddenLabelsColumns: search.hiddenLabelsColumns,
      hiddenLeadColumns: search.hiddenLeadColumns,
      hiddenHealthColumns: search.hiddenHealthColumns,
      hiddenStartDateColumns: search.hiddenStartDateColumns,
      hiddenTargetDateColumns: search.hiddenTargetDateColumns,
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

  useKeyboard((event) => {
    if (
      !event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.repeat ||
      event.key.toLowerCase() !== 'v' ||
      isTypingTarget(event.target)
    ) {
      return false;
    }
    event.preventDefault();
    void navigate({ to: '/views/projects/new', search: projectViewSearch() });
    return true;
  }, true);

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
  const leadFilters = search.leads ?? [];
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
    const matching = projects.filter((project) => matchesProjectViewSearch(project, search));
    return sortProjectList(
      matching,
      projects,
      search.orderBy ?? 'manual',
      search.direction ?? 'asc',
      search.manualOrder,
      projectWorkflowStatuses.map((status) => status.id),
    );
  }, [projects, search, projectWorkflowStatuses]);

  const groupBy = search.groupBy ?? 'none';
  const formatProjectGroupLabel = useCallback(
    (by: ProjectGroupBy, value: ProjectGroupValue) =>
      projectGroupLabel(by, value, {
        language: i18n.language,
        translate: i18n.t,
        statusLabel: (status) =>
          projectWorkflowStatusLabel(status, projectWorkflowStatuses, i18n.t),
        priorityLabel,
      }),
    [projectWorkflowStatuses, i18n.language],
  );
  const projectGroups = useMemo(() => {
    return groupProjects(
      filteredProjects,
      groupBy,
      projectWorkflowStatuses.map((status) => status.id),
      formatProjectGroupLabel,
    );
  }, [filteredProjects, formatProjectGroupLabel, groupBy, projectWorkflowStatuses]);

  const view = search.view ?? 'list';
  const columnsBy: ProjectBoardGrouping = search.columnsBy ?? 'status';
  const rowsBy = search.rowsBy ?? 'none';
  const showEmptyColumns = search.showEmptyColumns ?? true;
  const hiddenBoardGroupKeys = projectBoardSearchHidden(search, columnsBy);
  const boardLayout = useMemo(
    () =>
      buildProjectBoardLayout({
        projects: filteredProjects,
        columnsBy,
        rowsBy,
        statuses: projectWorkflowStatuses.map((status) => status.id),
        labels: availableProjectLabels.map((label) => label.name),
        showEmpty: showEmptyColumns,
        preferredOrder: projectBoardSearchOrder(search, columnsBy),
        hiddenKeys: projectBoardSearchHidden(search, columnsBy),
        labelFor: formatProjectGroupLabel,
      }),
    [
      columnsBy,
      availableProjectLabels,
      filteredProjects,
      projectWorkflowStatuses,
      formatProjectGroupLabel,
      rowsBy,
      search,
      showEmptyColumns,
    ],
  );
  const projectBoardGroups = boardLayout.groups;
  const projectBoard = boardLayout.model;

  const timelineStart = search.timelineStart ?? defaultProjectTimelineStart();
  const projectTimeline = useMemo(
    () =>
      buildProjectTimelineModel({
        startMonth: timelineStart,
        language: i18n.language,
        groups: projectGroups,
      }),
    [projectGroups, timelineStart, i18n.language],
  );

  const filterCount =
    statusFilters.length +
    priorityFilters.length +
    healthFilters.length +
    leadFilters.length +
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
    const currentOrder = manualProjectOrder(projects, search.manualOrder);
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
    const column = projectBoard.columns.find((item) => item.key === columnKey);
    const row =
      rowsBy === 'none' ? undefined : projectBoard.rows.find((item) => item.key === rowKey);
    if (!column) return;
    const changes = projectBoardProjectPatch(project, [column, ...(row ? [row] : [])]);
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
    leads: leadFilters,
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
    availableLabels: availableProjectLabels,
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
      onLeadsChange: (value) =>
        void updateProjectSearch({ leads: value.length ? value : undefined }),
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
        void updateProjectSearch(projectBoardOrderPatch(columnsBy, order));
      },
      onBoardGroupVisibilityChange: (key, visible) => {
        if (!visible && projectBoardGroups.filter((group) => group.visible).length <= 1) return;
        const hidden = new Set(hiddenBoardGroupKeys ?? []);
        if (visible) hidden.delete(key);
        else hidden.add(key);
        const value = hidden.size ? [...hidden] : undefined;
        void updateProjectSearch(projectBoardHiddenPatch(columnsBy, value));
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
          leads: undefined,
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
          labelsColumnOrder: undefined,
          leadColumnOrder: undefined,
          healthColumnOrder: undefined,
          startDateColumnOrder: undefined,
          targetDateColumnOrder: undefined,
          hiddenStatusColumns: undefined,
          hiddenPriorityColumns: undefined,
          hiddenLabelsColumns: undefined,
          hiddenLeadColumns: undefined,
          hiddenHealthColumns: undefined,
          hiddenStartDateColumns: undefined,
          hiddenTargetDateColumns: undefined,
          showEmptyColumns: undefined,
          showProjectList: undefined,
          showWeekNumbers: undefined,
          timelineStart: undefined,
          displayProperties: undefined,
        }),
    },
  };

  return {
    _view: 0 as const,
    archived: !!search.archived,
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
    workspace: data.workspace,
    projectTemplates: data.projectTemplates,
    ...projectComposerData,
    projectWorkflowStatuses,
    handlers: {
      onOpenCreateProjectView: () =>
        navigate({
          to: '/views/projects/new',
          search: projectViewSearch(),
        }),
      onApplyProjectView: (view: ProjectSavedView) => applyProjectView(view),
      onShowAllProjects: showAllProjects,
      onToggleArchivedProjects: () =>
        updateProjectSearch({
          archived: search.archived ? undefined : true,
          projectView: undefined,
        }),
      onUpdateActiveProjectView: updateActiveProjectView,
      onDeleteActiveProjectView: deleteActiveProjectView,
      onTimelinePrevious: () =>
        void updateProjectSearch({ timelineStart: shiftProjectTimelineMonth(timelineStart, -4) }),
      onTimelineNext: () =>
        void updateProjectSearch({ timelineStart: shiftProjectTimelineMonth(timelineStart, 4) }),
      onTimelineToday: () => void updateProjectSearch({ timelineStart: undefined }),
      onReorderProject: reorderProject,
      onMoveProjectOnBoard: moveProjectOnBoard,
      ...projectComposerHandlers,
    },
  };
}
