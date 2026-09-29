import type {
  Initiative,
  InitiativeStatus,
  Project,
  ProjectHealth,
  ProjectWorkflowStatus,
} from './types.ts';
import {
  matchesSearchDateFilter,
  parseSearchDateFilter,
  serializeSearchDateFilter,
  type SearchDateFilter,
} from './search.ts';
import { parseProjectFilterGroup } from './project-view-search.ts';
import type {
  ProjectFilterCondition,
  ProjectFilterField,
  ProjectFilterGroup,
} from './project-view-search.ts';

export type InitiativeScope = 'active' | 'planned' | 'all';
export type InitiativeGrouping = 'none' | 'status';
export type InitiativeOrderBy =
  | 'manual'
  | 'name'
  | 'status'
  | 'priority'
  | 'health'
  | 'targetDate'
  | 'created'
  | 'updated'
  | 'completed';
export type InitiativeProjectFilter = 'all' | 'withProjects' | 'withoutProjects';
export type InitiativeDateField = 'created' | 'updated' | 'completed' | 'latestUpdate';
export type InitiativeDateFilters = Partial<Record<InitiativeDateField, SearchDateFilter>>;
export const INITIATIVE_DATE_SEARCH_KEYS = {
  created: 'createdDate',
  updated: 'updatedDate',
  completed: 'completedDate',
  latestUpdate: 'latestUpdateDate',
} as const satisfies Record<InitiativeDateField, string>;
export type InitiativeDisplayProperty =
  | 'id'
  | 'description'
  | 'health'
  | 'priority'
  | 'labels'
  | 'status'
  | 'projects'
  | 'activeProjects'
  | 'targetDate'
  | 'created'
  | 'updated'
  | 'completed';

export type InitiativeListSearch = {
  scope?: InitiativeScope;
  q?: string;
  statusFilter?: InitiativeStatus[];
  priorityFilter?: number[];
  healthFilter?: ProjectHealth[];
  labelFilter?: string[];
  projects?: InitiativeProjectFilter;
  targetDateFrom?: string;
  targetDateTo?: string;
  createdDate?: string;
  updatedDate?: string;
  completedDate?: string;
  latestUpdateDate?: string;
  advancedFilter?: boolean;
  advancedFilterGroup?: ProjectFilterGroup;
  groupBy?: InitiativeGrouping;
  orderBy?: InitiativeOrderBy;
  direction?: 'asc' | 'desc';
  displayProperties?: InitiativeDisplayProperty[];
};

export const INITIATIVE_DISPLAY_PROPERTIES: InitiativeDisplayProperty[] = [
  'id',
  'description',
  'health',
  'priority',
  'labels',
  'status',
  'projects',
  'activeProjects',
  'targetDate',
  'created',
  'updated',
  'completed',
];

export const DEFAULT_INITIATIVE_DISPLAY_PROPERTIES: InitiativeDisplayProperty[] = [
  'status',
  'priority',
  'projects',
  'health',
  'targetDate',
];

const INITIATIVE_STATUSES: InitiativeStatus[] = [
  'proposed',
  'planned',
  'active',
  'completed',
  'canceled',
];
const INITIATIVE_ADVANCED_FILTER_FIELDS: ProjectFilterField[] = [
  'status',
  'priority',
  'health',
  'label',
  'project',
  'title',
  'createdDate',
  'updatedDate',
  'targetDate',
  'completedDate',
  'latestUpdateDate',
];

export function parseInitiativeListSearch(raw: Record<string, unknown>): InitiativeListSearch {
  const search: InitiativeListSearch = {};
  if (raw.scope === 'active' || raw.scope === 'planned' || raw.scope === 'all') {
    search.scope = raw.scope;
  }
  if (typeof raw.q === 'string' && raw.q.trim()) search.q = raw.q.slice(0, 120);
  const statusValues = Array.isArray(raw.statusFilter)
    ? raw.statusFilter
    : typeof raw.statusFilter === 'string'
      ? raw.statusFilter.split(',')
      : [];
  const statusFilter = statusValues.filter(
    (value): value is InitiativeStatus =>
      typeof value === 'string' && INITIATIVE_STATUSES.includes(value as InitiativeStatus),
  );
  if (statusFilter.length) search.statusFilter = [...new Set(statusFilter)];
  const priorityValues = Array.isArray(raw.priorityFilter)
    ? raw.priorityFilter
    : typeof raw.priorityFilter === 'string'
      ? raw.priorityFilter.split(',')
      : [];
  const priorityFilter = priorityValues
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 4);
  if (priorityFilter.length) search.priorityFilter = [...new Set(priorityFilter)];
  const healthValues = Array.isArray(raw.healthFilter)
    ? raw.healthFilter
    : typeof raw.healthFilter === 'string'
      ? raw.healthFilter.split(',')
      : [];
  const healthFilter = healthValues.filter(
    (value): value is ProjectHealth =>
      value === 'on_track' || value === 'at_risk' || value === 'off_track',
  );
  if (healthFilter.length) search.healthFilter = [...new Set(healthFilter)];
  const labelValues = Array.isArray(raw.labelFilter)
    ? raw.labelFilter
    : typeof raw.labelFilter === 'string'
      ? raw.labelFilter.split(',')
      : [];
  const labelFilter = labelValues.filter(
    (value): value is string => typeof value === 'string' && value.trim().length > 0,
  );
  if (labelFilter.length) search.labelFilter = [...new Set(labelFilter)];
  if (raw.projects === 'withProjects' || raw.projects === 'withoutProjects') {
    search.projects = raw.projects;
  }
  for (const field of ['targetDateFrom', 'targetDateTo'] as const) {
    if (typeof raw[field] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw[field])) {
      search[field] = raw[field];
    }
  }
  for (const field of Object.values(INITIATIVE_DATE_SEARCH_KEYS)) {
    const filter = parseSearchDateFilter(raw[field]);
    if (filter) {
      switch (field) {
        case 'createdDate':
          search.createdDate = serializeSearchDateFilter(filter);
          break;
        case 'updatedDate':
          search.updatedDate = serializeSearchDateFilter(filter);
          break;
        case 'completedDate':
          search.completedDate = serializeSearchDateFilter(filter);
          break;
        case 'latestUpdateDate':
          search.latestUpdateDate = serializeSearchDateFilter(filter);
          break;
      }
    }
  }
  const advancedFilterGroup = parseProjectFilterGroup(
    raw.advancedFilterGroup,
    INITIATIVE_ADVANCED_FILTER_FIELDS,
  );
  if (raw.advancedFilter === true || advancedFilterGroup) search.advancedFilter = true;
  if (advancedFilterGroup) search.advancedFilterGroup = advancedFilterGroup;
  if (raw.groupBy === 'status' || raw.groupBy === 'none') search.groupBy = raw.groupBy;
  if (
    raw.orderBy === 'manual' ||
    raw.orderBy === 'name' ||
    raw.orderBy === 'status' ||
    raw.orderBy === 'priority' ||
    raw.orderBy === 'health' ||
    raw.orderBy === 'targetDate' ||
    raw.orderBy === 'created' ||
    raw.orderBy === 'updated' ||
    raw.orderBy === 'completed'
  ) {
    search.orderBy = raw.orderBy;
  }
  if (raw.direction === 'asc' || raw.direction === 'desc') search.direction = raw.direction;
  const properties = Array.isArray(raw.displayProperties)
    ? raw.displayProperties
    : typeof raw.displayProperties === 'string'
      ? raw.displayProperties.split(',')
      : [];
  const displayProperties = properties.filter(
    (value): value is InitiativeDisplayProperty =>
      typeof value === 'string' &&
      INITIATIVE_DISPLAY_PROPERTIES.includes(value as InitiativeDisplayProperty),
  );
  if (displayProperties.length) search.displayProperties = [...new Set(displayProperties)];
  return search;
}

function utcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function matchesAdvancedDate(
  dateValue: string | null | undefined,
  condition: ProjectFilterCondition,
  now: Date,
): boolean {
  const value = condition.value;
  if (!value) return true;
  const date = dateValue?.slice(0, 10);
  if (value === 'no-date' || value === 'never') return !date;
  if (!date) return false;
  if (value === 'custom') {
    return (
      (!condition.dateFrom || date >= condition.dateFrom) &&
      (!condition.dateTo || date <= condition.dateTo)
    );
  }
  const today = utcDateString(now);
  if (value === 'overdue') return date < today;
  const within = /^within:(\d+)([dwmy])$/.exec(value);
  if (within) {
    const end = new Date(now);
    const amount = Number(within[1]);
    if (within[2] === 'd') end.setUTCDate(end.getUTCDate() + amount);
    if (within[2] === 'w') end.setUTCDate(end.getUTCDate() + amount * 7);
    if (within[2] === 'm') end.setUTCMonth(end.getUTCMonth() + amount);
    if (within[2] === 'y') end.setUTCFullYear(end.getUTCFullYear() + amount);
    return date >= today && date <= utcDateString(end);
  }
  const last = /^last:(\d+)([dwmy])$/.exec(value);
  if (last) {
    const start = new Date(now);
    const amount = Number(last[1]);
    if (last[2] === 'd') start.setUTCDate(start.getUTCDate() - amount);
    if (last[2] === 'w') start.setUTCDate(start.getUTCDate() - amount * 7);
    if (last[2] === 'm') start.setUTCMonth(start.getUTCMonth() - amount);
    if (last[2] === 'y') start.setUTCFullYear(start.getUTCFullYear() - amount);
    return date >= utcDateString(start) && date <= today;
  }
  return date === value;
}

function matchesAdvancedFilterGroup(
  initiative: Initiative,
  projects: ReadonlyMap<string, Project>,
  group: ProjectFilterGroup,
  now: Date,
): boolean {
  if (group.children.length === 0) return true;
  const matches = group.children.map((child) => {
    if (child.kind === 'group') return matchesAdvancedFilterGroup(initiative, projects, child, now);
    if (!child.field || !child.value) return true;
    const operator = child.operator ?? 'is';
    if (
      child.field === 'createdDate' ||
      child.field === 'updatedDate' ||
      child.field === 'targetDate' ||
      child.field === 'completedDate' ||
      child.field === 'latestUpdateDate'
    ) {
      const dateValue =
        child.field === 'createdDate'
          ? initiative.createdAt
          : child.field === 'updatedDate'
            ? initiative.updatedAt
            : child.field === 'targetDate'
              ? initiative.targetDate
              : child.field === 'completedDate'
                ? initiative.completedAt
                : initiative.healthUpdatedAt;
      const found = matchesAdvancedDate(dateValue, child, now);
      return operator === 'isNot' ? !found : found;
    }
    const values = (() => {
      switch (child.field) {
        case 'status':
          return [initiative.status];
        case 'priority':
          return [String(initiative.priority ?? 0)];
        case 'health':
          return [initiative.health ?? 'none'];
        case 'label':
          return initiative.labels ?? [];
        case 'title':
          return [`${initiative.name} ${initiative.description}`.toLocaleLowerCase()];
        case 'project':
          return [
            initiative.projectSlugs.some((slug) => projects.has(slug))
              ? 'withProjects'
              : 'withoutProjects',
          ];
        default:
          return [];
      }
    })();
    const found =
      operator === 'contains' || operator === 'doesNotContain'
        ? values.some((candidate) =>
            candidate.toLocaleLowerCase().includes(child.value!.toLocaleLowerCase()),
          )
        : values.includes(child.value);
    return operator === 'isNot' || operator === 'doesNotContain' ? !found : found;
  });
  return group.operator === 'or' ? matches.some(Boolean) : matches.every(Boolean);
}

export type InitiativeListGroup = {
  key: string;
  status?: InitiativeStatus;
  initiatives: Initiative[];
};

export function buildInitiativeList({
  initiatives,
  projects,
  search,
}: {
  initiatives: Initiative[];
  projects: Project[];
  search: InitiativeListSearch;
}): InitiativeListGroup[] {
  const projectsBySlug = new Map(projects.map((project) => [project.slug, project]));
  const query = search.q?.trim().toLocaleLowerCase();
  const now = Date.now();
  const filtered = initiatives.filter((initiative) => {
    if (search.scope === 'active' && initiative.status !== 'active') return false;
    if (
      search.scope === 'planned' &&
      initiative.status !== 'proposed' &&
      initiative.status !== 'planned'
    ) {
      return false;
    }
    if (search.statusFilter?.length && !search.statusFilter.includes(initiative.status))
      return false;
    if (
      search.advancedFilter &&
      search.advancedFilterGroup &&
      !matchesAdvancedFilterGroup(
        initiative,
        projectsBySlug,
        search.advancedFilterGroup,
        new Date(now),
      )
    )
      return false;
    const dateValue: Record<InitiativeDateField, string | null | undefined> = {
      created: initiative.createdAt,
      updated: initiative.updatedAt,
      completed: initiative.completedAt,
      latestUpdate: initiative.healthUpdatedAt,
    };
    for (const [field, searchKey] of Object.entries(INITIATIVE_DATE_SEARCH_KEYS) as [
      InitiativeDateField,
      (typeof INITIATIVE_DATE_SEARCH_KEYS)[InitiativeDateField],
    ][]) {
      const dateFilter = parseSearchDateFilter(search[searchKey]);
      if (dateFilter && !matchesSearchDateFilter(dateValue[field] ?? undefined, dateFilter, now)) {
        return false;
      }
    }
    if (search.priorityFilter?.length && !search.priorityFilter.includes(initiative.priority ?? 0))
      return false;
    if (
      search.healthFilter?.length &&
      (!initiative.health || !search.healthFilter.includes(initiative.health))
    )
      return false;
    if (
      search.labelFilter?.length &&
      !search.labelFilter.some((label) => initiative.labels?.includes(label))
    ) {
      return false;
    }
    if (
      query &&
      !`${initiative.name}\n${initiative.description}`.toLocaleLowerCase().includes(query)
    ) {
      return false;
    }
    const linkedCount = initiative.projectSlugs.filter((slug) => projectsBySlug.has(slug)).length;
    if (search.projects === 'withProjects' && linkedCount === 0) return false;
    if (search.projects === 'withoutProjects' && linkedCount !== 0) return false;
    if (
      search.targetDateFrom &&
      (!initiative.targetDate || initiative.targetDate < search.targetDateFrom)
    ) {
      return false;
    }
    if (
      search.targetDateTo &&
      (!initiative.targetDate || initiative.targetDate > search.targetDateTo)
    ) {
      return false;
    }
    return true;
  });

  const orderBy = search.orderBy ?? 'manual';
  const direction = search.direction ?? 'asc';
  const directionMultiplier = direction === 'desc' ? -1 : 1;
  const originalIndex = new Map(initiatives.map((initiative, index) => [initiative.slug, index]));
  filtered.sort((left, right) => {
    if (orderBy === 'manual')
      return (originalIndex.get(left.slug) ?? 0) - (originalIndex.get(right.slug) ?? 0);
    let comparison = 0;
    if (orderBy === 'name') comparison = left.name.localeCompare(right.name);
    if (orderBy === 'status') {
      comparison =
        INITIATIVE_STATUSES.indexOf(left.status) - INITIATIVE_STATUSES.indexOf(right.status);
    }
    if (orderBy === 'priority') comparison = (left.priority ?? 0) - (right.priority ?? 0);
    if (orderBy === 'health') comparison = (left.health ?? '').localeCompare(right.health ?? '');
    if (orderBy === 'targetDate') {
      if (!left.targetDate && right.targetDate) return 1;
      if (left.targetDate && !right.targetDate) return -1;
      comparison = (left.targetDate ?? '').localeCompare(right.targetDate ?? '');
    }
    if (orderBy === 'updated') comparison = left.updatedAt.localeCompare(right.updatedAt);
    if (orderBy === 'created') comparison = left.createdAt.localeCompare(right.createdAt);
    if (orderBy === 'completed') {
      if (!left.completedAt && right.completedAt) return 1;
      if (left.completedAt && !right.completedAt) return -1;
      comparison = (left.completedAt ?? '').localeCompare(right.completedAt ?? '');
    }
    if (comparison === 0)
      comparison = (originalIndex.get(left.slug) ?? 0) - (originalIndex.get(right.slug) ?? 0);
    return comparison * directionMultiplier;
  });

  if ((search.groupBy ?? 'none') === 'none') return [{ key: 'all', initiatives: filtered }];
  return INITIATIVE_STATUSES.map((status) => ({
    key: status,
    status,
    initiatives: filtered.filter((initiative) => initiative.status === status),
  })).filter((group) => group.initiatives.length > 0);
}

export function initiativeActiveProjectCount(
  initiative: Initiative,
  projects: readonly Project[],
  workflowStatuses: readonly ProjectWorkflowStatus[] = [],
): number {
  const linked = new Set(initiative.projectSlugs);
  const categories = new Map(workflowStatuses.map((status) => [status.id, status.category]));
  return projects.filter((project) => {
    if (!linked.has(project.slug)) return false;
    const category = categories.get(project.workflowStatus ?? project.status) ?? project.status;
    return category === 'started';
  }).length;
}
