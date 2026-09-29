import { parseProjectFilterGroup } from './project-view-search.ts';
import type { ProjectViewSearch } from './project-view-search.ts';
type ProjectListSearch = ProjectViewSearch & { projectView?: string; archived?: boolean };

function searchStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value === 'string' && value) {
    if (value.startsWith('[')) {
      try {
        const parsed: unknown = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.filter((item): item is string => typeof item === 'string');
        }
      } catch {
        // Fall back to the comma-separated form used by older shared project links.
      }
    }
    return value.split(',').filter(Boolean);
  }
  return [];
}

export function parseProjectListSearch(raw: Record<string, unknown>): ProjectListSearch {
  const result: ProjectListSearch = {};
  if (raw.archived === true || raw.archived === 'true') result.archived = true;
  if (typeof raw.q === 'string' && raw.q.trim()) result.q = raw.q;
  if (raw.qOperator === 'doesNotContain') result.qOperator = raw.qOperator;
  if (raw.advancedFilter === true || raw.advancedFilter === 'true') result.advancedFilter = true;
  if (raw.filterOperator === 'or') result.filterOperator = 'or';
  const advancedFilterGroup = parseProjectFilterGroup(raw.advancedFilterGroup);
  if (advancedFilterGroup) result.advancedFilterGroup = advancedFilterGroup;
  if (
    typeof raw.specificProject === 'string' &&
    /^[a-z0-9][a-z0-9_-]{0,119}$/i.test(raw.specificProject)
  ) {
    result.specificProject = raw.specificProject;
  }
  if (typeof raw.projectView === 'string' && raw.projectView.length <= 120) {
    result.projectView = raw.projectView;
  }
  const status = searchStringList(raw.status).filter((value) => /^[a-z0-9_-]{1,48}$/.test(value));
  if (status.length) result.status = status;
  const priority = searchStringList(raw.priority).filter((value) => /^[0-4]$/.test(value));
  if (priority.length) result.priority = priority;
  const health = searchStringList(raw.health).filter((value) =>
    ['none', 'on_track', 'at_risk', 'off_track'].includes(value),
  );
  if (health.length) result.health = health as NonNullable<ProjectListSearch['health']>;
  const leads = searchStringList(raw.leads).filter((value) => value === 'self' || value === 'none');
  if (leads.length) result.leads = leads as NonNullable<ProjectListSearch['leads']>;
  const labels = searchStringList(raw.labels).filter((value) => value.length <= 100);
  if (labels.length) result.labels = labels;
  const templates = searchStringList(raw.templates).filter((value) =>
    /^template:(?:[\p{L}\p{N}-]+)?$/u.test(value),
  );
  if (templates.length) result.templates = templates;
  const initiatives = searchStringList(raw.initiatives).filter((value) =>
    /^initiative:(?:none|[\p{L}\p{N}-]+)$/u.test(value),
  );
  if (initiatives.length) result.initiatives = initiatives;
  if (
    raw.groupBy === 'none' ||
    raw.groupBy === 'status' ||
    raw.groupBy === 'priority' ||
    raw.groupBy === 'labels' ||
    raw.groupBy === 'lead' ||
    raw.groupBy === 'health' ||
    raw.groupBy === 'startDate' ||
    raw.groupBy === 'targetDate'
  ) {
    result.groupBy = raw.groupBy;
  }
  if (
    raw.orderBy === 'manual' ||
    raw.orderBy === 'name' ||
    raw.orderBy === 'status' ||
    raw.orderBy === 'priority' ||
    raw.orderBy === 'healthUpdated' ||
    raw.orderBy === 'startDate' ||
    raw.orderBy === 'targetDate' ||
    raw.orderBy === 'created' ||
    raw.orderBy === 'updated'
  ) {
    result.orderBy = raw.orderBy;
  }
  if (raw.direction === 'asc' || raw.direction === 'desc') result.direction = raw.direction;
  const manualOrder = searchStringList(raw.manualOrder)
    .filter((value) => /^[a-z0-9][a-z0-9_-]{0,119}$/i.test(value))
    .slice(0, 2000);
  if (manualOrder.length) result.manualOrder = manualOrder;
  if (raw.closed === 'open' || raw.closed === 'closed') result.closed = raw.closed;
  if (raw.view === 'board') result.view = 'board';
  if (raw.view === 'timeline') result.view = 'timeline';
  const boardGroupings = [
    'lead',
    'status',
    'priority',
    'labels',
    'health',
    'startDate',
    'targetDate',
  ] as const;
  if (boardGroupings.some((value) => value === raw.columnsBy)) {
    result.columnsBy = raw.columnsBy as ProjectListSearch['columnsBy'];
  }
  if (boardGroupings.some((value) => value === raw.rowsBy)) {
    result.rowsBy = raw.rowsBy as ProjectListSearch['rowsBy'];
  }
  if (result.rowsBy === (result.columnsBy ?? 'status')) result.rowsBy = 'none';
  const boardGroupKey = /^[a-z0-9_-]{1,48}$/i;
  for (const key of [
    'statusColumnOrder',
    'priorityColumnOrder',
    'labelsColumnOrder',
    'leadColumnOrder',
    'healthColumnOrder',
    'startDateColumnOrder',
    'targetDateColumnOrder',
    'hiddenStatusColumns',
    'hiddenPriorityColumns',
    'hiddenLabelsColumns',
    'hiddenLeadColumns',
    'hiddenHealthColumns',
    'hiddenStartDateColumns',
    'hiddenTargetDateColumns',
  ] as const) {
    const groups = searchStringList(raw[key])
      .filter((value) => boardGroupKey.test(value))
      .slice(0, 60);
    if (groups.length) result[key] = groups;
  }
  if (raw.showEmptyColumns === false || raw.showEmptyColumns === 'false') {
    result.showEmptyColumns = false;
  } else if (raw.showEmptyColumns === true || raw.showEmptyColumns === 'true') {
    result.showEmptyColumns = true;
  }
  if (raw.showProjectList === false || raw.showProjectList === 'false') {
    result.showProjectList = false;
  }
  if (raw.showWeekNumbers === true || raw.showWeekNumbers === 'true') {
    result.showWeekNumbers = true;
  }
  if (typeof raw.timelineStart === 'string' && /^\d{4}-\d{2}$/.test(raw.timelineStart)) {
    result.timelineStart = raw.timelineStart;
  }
  const displayProperties = searchStringList(raw.displayProperties).filter((value) =>
    [
      'id',
      'milestones',
      'summary',
      'priority',
      'status',
      'health',
      'lead',
      'dependencies',
      'startDate',
      'targetDate',
      'issues',
      'created',
      'updated',
      'completed',
      'labels',
    ].includes(value),
  );
  if (
    displayProperties.length ||
    (typeof raw.displayProperties === 'string' && raw.displayProperties.startsWith('[')) ||
    Array.isArray(raw.displayProperties)
  ) {
    result.displayProperties = displayProperties;
  }
  if (
    raw.dateField === 'startDate' ||
    raw.dateField === 'targetDate' ||
    raw.dateField === 'created' ||
    raw.dateField === 'updated' ||
    raw.dateField === 'completed'
  ) {
    result.dateField = raw.dateField;
  }
  if (typeof raw.dateFrom === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.dateFrom)) {
    result.dateFrom = raw.dateFrom;
  }
  if (typeof raw.dateTo === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.dateTo)) {
    result.dateTo = raw.dateTo;
  }
  const milestones = searchStringList(raw.milestones).filter((value) => value.length <= 120);
  if (milestones.length) result.milestones = milestones;
  const relations = searchStringList(raw.relations).filter((value) =>
    ['blocks', 'blocked_by', 'related'].includes(value),
  );
  if (relations.length) result.relations = relations as NonNullable<ProjectListSearch['relations']>;
  return result;
}
