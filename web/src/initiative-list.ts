import type {
  Initiative,
  InitiativeStatus,
  Project,
  ProjectHealth,
  ProjectWorkflowStatus,
} from './types.ts';

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

const INITIATIVE_STATUSES: InitiativeStatus[] = ['planned', 'active', 'completed', 'canceled'];

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
  const filtered = initiatives.filter((initiative) => {
    if (search.scope === 'active' && initiative.status !== 'active') return false;
    if (search.scope === 'planned' && initiative.status !== 'planned') return false;
    if (search.statusFilter?.length && !search.statusFilter.includes(initiative.status))
      return false;
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
