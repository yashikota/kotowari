import type { ProjectBoardModel } from './components/ProjectBoardView.tsx';
import { compareProjectGroupValues, projectGroupValues } from './project-grouping.ts';
import type { ProjectGroupValue } from './project-grouping.ts';
import type { Project } from './types.ts';
import type { ProjectBoardGrouping, ProjectGroupBy, ProjectViewSearch } from './project-views.ts';

export type ProjectBoardGroup = {
  key: string;
  label: string;
  visible: boolean;
  groupBy?: ProjectBoardGrouping;
  value?: ProjectGroupValue;
};

export const PROJECT_BOARD_GROUPINGS: ProjectBoardGrouping[] = [
  'lead',
  'status',
  'priority',
  'labels',
  'health',
  'startDate',
  'targetDate',
];

const BOARD_GROUP_SEARCH_FIELDS: Record<
  ProjectBoardGrouping,
  { order: keyof ProjectViewSearch; hidden: keyof ProjectViewSearch }
> = {
  status: { order: 'statusColumnOrder', hidden: 'hiddenStatusColumns' },
  priority: { order: 'priorityColumnOrder', hidden: 'hiddenPriorityColumns' },
  labels: { order: 'labelsColumnOrder', hidden: 'hiddenLabelsColumns' },
  lead: { order: 'leadColumnOrder', hidden: 'hiddenLeadColumns' },
  health: { order: 'healthColumnOrder', hidden: 'hiddenHealthColumns' },
  startDate: { order: 'startDateColumnOrder', hidden: 'hiddenStartDateColumns' },
  targetDate: { order: 'targetDateColumnOrder', hidden: 'hiddenTargetDateColumns' },
};

export function projectBoardOrderSearchField(groupBy: ProjectBoardGrouping) {
  return BOARD_GROUP_SEARCH_FIELDS[groupBy].order;
}

export function projectBoardHiddenSearchField(groupBy: ProjectBoardGrouping) {
  return BOARD_GROUP_SEARCH_FIELDS[groupBy].hidden;
}

export function projectBoardOrderPatch(
  groupBy: ProjectBoardGrouping,
  order: string[] | undefined,
): Partial<ProjectViewSearch> {
  return { [projectBoardOrderSearchField(groupBy)]: order };
}

export function projectBoardHiddenPatch(
  groupBy: ProjectBoardGrouping,
  hidden: string[] | undefined,
): Partial<ProjectViewSearch> {
  return { [projectBoardHiddenSearchField(groupBy)]: hidden };
}

export function projectBoardSearchOrder(
  search: ProjectViewSearch,
  groupBy: ProjectBoardGrouping,
): string[] | undefined {
  return search[projectBoardOrderSearchField(groupBy)] as string[] | undefined;
}

export function projectBoardSearchHidden(
  search: ProjectViewSearch,
  groupBy: ProjectBoardGrouping,
): string[] | undefined {
  return search[projectBoardHiddenSearchField(groupBy)] as string[] | undefined;
}

function stableGroupKey(groupBy: ProjectBoardGrouping, value: ProjectGroupValue) {
  if (value === null) return 'none';
  if (
    (groupBy === 'status' && /^[a-z0-9_-]{1,48}$/i.test(value)) ||
    (groupBy === 'priority' && /^\d{1,2}$/.test(value))
  ) {
    return value;
  }
  if (groupBy === 'startDate' || groupBy === 'targetDate') return `${groupBy}_${value}`;

  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  const prefix =
    groupBy === 'labels'
      ? 'label'
      : groupBy === 'lead'
        ? 'lead'
        : groupBy === 'health'
          ? 'health'
          : 'group';
  return `${prefix}_${(hash >>> 0).toString(36)}`;
}

function standardGroupValues(
  groupBy: ProjectBoardGrouping,
  statuses: readonly string[],
  labels: readonly string[],
): ProjectGroupValue[] {
  switch (groupBy) {
    case 'status':
      return [...statuses];
    case 'priority':
      return ['1', '2', '3', '4', '0'];
    case 'lead':
      return ['self', null];
    case 'labels':
      return [...labels, null];
    case 'health':
      return ['on_track', 'at_risk', 'off_track', null];
    case 'startDate':
    case 'targetDate':
      return [null];
  }
}

export function buildProjectBoardLayout({
  projects,
  columnsBy,
  rowsBy,
  statuses,
  labels,
  showEmpty,
  preferredOrder = [],
  hiddenKeys = [],
  labelFor,
}: {
  projects: Project[];
  columnsBy: ProjectBoardGrouping;
  rowsBy: 'none' | ProjectBoardGrouping;
  statuses: readonly string[];
  labels: readonly string[];
  showEmpty: boolean;
  preferredOrder?: readonly string[];
  hiddenKeys?: readonly string[];
  labelFor: (groupBy: ProjectGroupBy, value: ProjectGroupValue) => string;
}): { groups: ProjectBoardGroup[]; model: ProjectBoardModel } {
  const makeGroups = (groupBy: ProjectBoardGrouping) => {
    const buckets = new Map<ProjectGroupValue, Project[]>();
    for (const value of standardGroupValues(groupBy, statuses, labels)) buckets.set(value, []);
    for (const project of projects) {
      for (const value of projectGroupValues(project, groupBy)) {
        const groupProjects = buckets.get(value) ?? [];
        groupProjects.push(project);
        buckets.set(value, groupProjects);
      }
    }
    return [...buckets]
      .sort(([left], [right]) => compareProjectGroupValues(left, right, groupBy, statuses))
      .map(([value, groupProjects]) => ({
        key: stableGroupKey(groupBy, value),
        label: labelFor(groupBy, value),
        value,
        groupBy,
        projects: groupProjects,
      }));
  };

  const allColumnGroups = makeGroups(columnsBy);
  const ordered = orderProjectBoardGroups(
    allColumnGroups.map((group) => ({
      key: group.key,
      label: group.label,
      visible: !hiddenKeys.includes(group.key),
      groupBy: group.groupBy,
      value: group.value,
    })),
    preferredOrder,
  );
  const groupsByKey = new Map(allColumnGroups.map((group) => [group.key, group]));
  const columnGroups = ordered
    .filter((group) => group.visible)
    .map((group) => groupsByKey.get(group.key))
    .filter((group): group is NonNullable<typeof group> => Boolean(group))
    .filter((group) => showEmpty || group.projects.length > 0);
  const rowGroups =
    rowsBy === 'none'
      ? [{ key: 'all', label: '', value: null, projects }]
      : makeGroups(rowsBy).filter((group) => showEmpty || group.projects.length > 0);

  return {
    groups: ordered,
    model: {
      columns: columnGroups.map(({ key, label, value, groupBy }) => ({
        key,
        label,
        groupBy,
        value,
      })),
      rows: rowGroups.map(({ key, label, value, projects: rowProjects }) => ({
        key,
        label,
        ...(rowsBy === 'none' ? {} : { groupBy: rowsBy, value }),
        cells: Object.fromEntries(
          columnGroups.map((column) => [
            column.key,
            column.projects.filter((project) => rowProjects.includes(project)),
          ]),
        ),
      })),
    },
  };
}

export function orderProjectBoardGroups(
  groups: ProjectBoardGroup[],
  preferredOrder: readonly string[] = [],
): ProjectBoardGroup[] {
  const groupsByKey = new Map(groups.map((group) => [group.key, group]));
  const ordered: ProjectBoardGroup[] = [];
  const seen = new Set<string>();
  for (const key of preferredOrder) {
    const group = groupsByKey.get(key);
    if (!group || seen.has(key)) continue;
    ordered.push(group);
    seen.add(key);
  }
  for (const group of groups) {
    if (seen.has(group.key)) continue;
    ordered.push(group);
    seen.add(group.key);
  }
  return ordered;
}

export function moveProjectBoardGroup(
  order: readonly string[],
  key: string,
  destinationIndex: number,
): string[] {
  const sourceIndex = order.indexOf(key);
  if (sourceIndex < 0 || order.length < 2) return [...order];
  const next = [...order];
  const [group] = next.splice(sourceIndex, 1);
  if (!group) return [...order];
  next.splice(Math.max(0, Math.min(destinationIndex, next.length)), 0, group);
  return next;
}
