import type { Initiative, InitiativeStatus, Project, ProjectWorkflowStatus } from './types.ts';

export type InitiativeScope = 'active' | 'planned' | 'all';
export type InitiativeGrouping = 'none' | 'status';
export type InitiativeOrderBy = 'manual' | 'name' | 'status' | 'targetDate' | 'updated';
export type InitiativeProjectFilter = 'all' | 'withProjects' | 'withoutProjects';
export type InitiativeDisplayProperty =
  | 'id'
  | 'description'
  | 'status'
  | 'projects'
  | 'activeProjects'
  | 'targetDate'
  | 'created'
  | 'updated';

export type InitiativeListSearch = {
  scope?: InitiativeScope;
  q?: string;
  statusFilter?: InitiativeStatus[];
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
  'status',
  'projects',
  'activeProjects',
  'targetDate',
  'created',
  'updated',
];

export const DEFAULT_INITIATIVE_DISPLAY_PROPERTIES: InitiativeDisplayProperty[] = [
  'status',
  'projects',
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
    raw.orderBy === 'targetDate' ||
    raw.orderBy === 'updated'
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
    if (orderBy === 'targetDate') {
      if (!left.targetDate && right.targetDate) return 1;
      if (left.targetDate && !right.targetDate) return -1;
      comparison = (left.targetDate ?? '').localeCompare(right.targetDate ?? '');
    }
    if (orderBy === 'updated') comparison = left.updatedAt.localeCompare(right.updatedAt);
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
