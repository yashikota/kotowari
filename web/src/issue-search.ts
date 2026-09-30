import { parseIssueFilterGroup, type IssueFilterGroup } from './issue-advanced-filter.ts';
import {
  COMPLETED_ISSUES_FILTERS,
  ISSUE_DISPLAY_PROPERTIES,
  ISSUE_GROUP_BY_VALUES,
  ISSUE_ORDER_BY_VALUES,
} from './issue-list.ts';
import type {
  CompletedIssuesFilter,
  IssueDisplayProperty,
  IssueGroupBy,
  IssueLayout,
  IssueOrderBy,
} from './issue-list.ts';
import type { LabelOperator } from './types.ts';
export function issuesQuery(filter: {
  status?: string | null;
  statuses?: string[] | null;
  assignee?: 'self' | 'agent' | 'none' | null;
  project?: string | null;
  cycle?: number | null;
  labels?: string[] | null;
  labelOperator?: LabelOperator | null;
  priority?: number | null;
  priorities?: number[] | null;
  type?: string | null;
  estimate?: number | null;
  estimates?: number[] | null;
  noEstimate?: boolean | null;
  dueDate?: string | null;
  asOf?: string | null;
  relation?: string | null;
  linkSources?: string[] | null;
  templateSlugs?: string[] | null;
  content?: string | null;
  milestoneName?: string | null;
  dateField?: string | null;
  dateRange?: string | null;
  dateAsOf?: string | null;
  projectStatus?: string | null;
  projectPriority?: number | null;
  projectLabels?: string[] | null;
  addedToCycle?: string[] | null;
  archived?: boolean;
}): string {
  const q = new URLSearchParams();
  const selectedEstimates = filter.estimates?.length
    ? filter.estimates
    : filter.noEstimate && filter.estimate != null
      ? [filter.estimate]
      : undefined;
  if (filter.status) {
    q.set('status', filter.status);
  }
  if (filter.statuses?.length) q.set('statuses', filter.statuses.join(','));
  if (filter.assignee) q.set('assignee', filter.assignee);
  if (filter.project) {
    q.set('project', filter.project);
  }
  if (filter.cycle) {
    q.set('cycle', String(filter.cycle));
  }
  if (filter.labels?.length) {
    q.set('labels', filter.labels.join(','));
    if (filter.labelOperator) q.set('labelOperator', filter.labelOperator);
  }
  if (filter.priority != null && filter.priority >= 0) {
    q.set('priority', String(filter.priority));
  }
  if (filter.priorities?.length) q.set('priorities', filter.priorities.join(','));
  if (filter.type) {
    q.set('type', filter.type);
  }
  if (
    !selectedEstimates?.length &&
    !filter.noEstimate &&
    filter.estimate != null &&
    filter.estimate >= 0
  ) {
    q.set('estimate', String(filter.estimate));
  }
  if (selectedEstimates?.length) q.set('estimates', selectedEstimates.join(','));
  if (filter.noEstimate) q.set('noEstimate', 'true');
  if (filter.dueDate) {
    q.set('dueDate', filter.dueDate);
    q.set('asOf', filter.asOf ?? localDateValue(new Date()));
  }
  if (filter.relation) q.set('relation', filter.relation);
  if (filter.linkSources?.length) q.set('linkSources', filter.linkSources.join(','));
  if (filter.templateSlugs?.length) q.set('templateSlugs', filter.templateSlugs.join(','));
  if (filter.content?.trim()) q.set('content', filter.content.trim());
  if (filter.milestoneName?.trim()) q.set('milestoneName', filter.milestoneName.trim());
  if (filter.dateField && filter.dateRange && filter.dateRange !== 'custom') {
    q.set('dateField', filter.dateField);
    q.set('dateRange', filter.dateRange);
    if (filter.dateAsOf != null || filter.dateField !== 'timeInCurrentStatus') {
      q.set('dateAsOf', filter.dateAsOf ?? localDateValue(new Date()));
    }
  }
  if (filter.projectStatus) q.set('projectStatus', filter.projectStatus);
  if (filter.projectPriority != null) q.set('projectPriority', String(filter.projectPriority));
  if (filter.projectLabels?.length) q.set('projectLabels', filter.projectLabels.join(','));
  if (filter.addedToCycle?.length) q.set('addedToCycle', filter.addedToCycle.join(','));
  if (filter.archived) q.set('archived', 'true');
  const s = q.toString();
  return s ? `?${s}` : '';
}

export type IssueSearch = {
  archived?: boolean;
  advancedFilter?: boolean;
  advancedFilterGroup?: IssueFilterGroup;
  view?: 'active' | 'backlog' | 'all';
  groupBy?: IssueGroupBy;
  subGroupBy?: IssueGroupBy;
  groupOrder?: string[];
  hiddenGroups?: string[];
  layout?: IssueLayout;
  orderBy?: IssueOrderBy;
  direction?: 'asc' | 'desc';
  completedIssues?: CompletedIssuesFilter;
  completedByRecency?: boolean;
  showSubIssues?: boolean;
  nestedSubIssues?: 'showMatching' | 'showAll';
  showEmptyGroups?: boolean;
  displayProperties?: IssueDisplayProperty[];
  myIssuesTab?: 'assigned' | 'created' | 'subscribed' | 'activity';
  assignee?: 'self' | 'agent' | 'none';
  subscribers?: 'self' | 'none';
  status?: string;
  statuses?: string[];
  project?: string;
  cycle?: number;
  priority?: number;
  priorities?: number[];
  type?: string;
  estimate?: number;
  estimates?: number[];
  noEstimate?: boolean;
  labels?: string;
  labelOperator?: LabelOperator;
  dueDate?:
    | 'overdue'
    | 'today'
    | 'tomorrow'
    | 'threeDays'
    | 'week'
    | 'month'
    | 'quarter'
    | 'custom'
    | 'none'
    | `on:${string}`;
  relation?: 'parent' | 'subissue' | 'blocked' | 'blocking' | 'recurring' | 'related' | 'duplicate';
  linkSources?: string[];
  templateSlugs?: string[];
  content?: string;
  milestoneName?: string;
  dateField?: 'createdAt' | 'updatedAt' | 'startedAt' | 'completedAt' | 'timeInCurrentStatus';
  dateRange?:
    | 'dayAgo'
    | 'threeDaysAgo'
    | 'weekAgo'
    | 'twoWeeksAgo'
    | 'monthAgo'
    | 'quarterAgo'
    | 'halfYearAgo'
    | 'yearAgo'
    | 'custom'
    | `on:${string}`;
  projectStatus?: string;
  projectPriority?: number;
  projectLabels?: string[];
  addedToCycle?: ('planned' | 'during' | 'after')[];
};

function localDateValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseIssueSearch(raw: Record<string, unknown>): IssueSearch {
  const out: IssueSearch = {};
  if (raw.archived === true || raw.archived === 'true') out.archived = true;
  const advancedFilterGroup = parseIssueFilterGroup(raw.advancedFilterGroup);
  if (raw.advancedFilter === true || raw.advancedFilter === 'true' || advancedFilterGroup) {
    out.advancedFilter = true;
  }
  if (advancedFilterGroup) out.advancedFilterGroup = advancedFilterGroup;
  if (
    raw.myIssuesTab === 'assigned' ||
    raw.myIssuesTab === 'created' ||
    raw.myIssuesTab === 'subscribed' ||
    raw.myIssuesTab === 'activity'
  ) {
    out.myIssuesTab = raw.myIssuesTab;
  }
  if (raw.view === 'active' || raw.view === 'backlog' || raw.view === 'all') {
    out.view = raw.view;
  }
  if (ISSUE_GROUP_BY_VALUES.includes(raw.groupBy as IssueGroupBy))
    out.groupBy = raw.groupBy as IssueGroupBy;
  if (ISSUE_GROUP_BY_VALUES.includes(raw.subGroupBy as IssueGroupBy))
    out.subGroupBy = raw.subGroupBy as IssueGroupBy;
  const groupOrder = [...new Set(parseStringList(raw.groupOrder).map((key) => key.trim()))].filter(
    Boolean,
  );
  if (groupOrder.length > 0 && groupOrder.length <= 500) out.groupOrder = groupOrder;
  const hiddenGroups = [
    ...new Set(parseStringList(raw.hiddenGroups).map((key) => key.trim())),
  ].filter(Boolean);
  if (hiddenGroups.length > 0 && hiddenGroups.length <= 500) out.hiddenGroups = hiddenGroups;
  if (raw.layout === 'list' || raw.layout === 'board') out.layout = raw.layout;
  if (ISSUE_ORDER_BY_VALUES.includes(raw.orderBy as IssueOrderBy))
    out.orderBy = raw.orderBy as IssueOrderBy;
  if (raw.direction === 'asc' || raw.direction === 'desc') out.direction = raw.direction;
  if (COMPLETED_ISSUES_FILTERS.includes(raw.completedIssues as CompletedIssuesFilter))
    out.completedIssues = raw.completedIssues as CompletedIssuesFilter;
  const completedByRecency = parseOptionalBoolean(raw.completedByRecency);
  if (completedByRecency !== undefined) out.completedByRecency = completedByRecency;
  const showSubIssues = parseOptionalBoolean(raw.showSubIssues);
  if (showSubIssues !== undefined) out.showSubIssues = showSubIssues;
  if (raw.nestedSubIssues === 'showMatching' || raw.nestedSubIssues === 'showAll')
    out.nestedSubIssues = raw.nestedSubIssues;
  const showEmptyGroups = parseOptionalBoolean(raw.showEmptyGroups);
  if (showEmptyGroups !== undefined) out.showEmptyGroups = showEmptyGroups;
  const hasDisplayProperties =
    Array.isArray(raw.displayProperties) ||
    (typeof raw.displayProperties === 'string' &&
      (raw.displayProperties.trim().length > 0 || raw.displayProperties.trim().startsWith('[')));
  if (hasDisplayProperties) {
    const displayProperties = parseStringList(raw.displayProperties);
    if (
      displayProperties.length <= ISSUE_DISPLAY_PROPERTIES.length &&
      displayProperties.every((property) =>
        ISSUE_DISPLAY_PROPERTIES.includes(property as IssueDisplayProperty),
      )
    ) {
      out.displayProperties = [...new Set(displayProperties)] as IssueDisplayProperty[];
    }
  }
  if (raw.assignee === 'self' || raw.assignee === 'agent' || raw.assignee === 'none') {
    out.assignee = raw.assignee;
  }
  if (raw.subscribers === 'self' || raw.subscribers === 'none') {
    out.subscribers = raw.subscribers;
  }
  if (typeof raw.status === 'string' && raw.status) {
    out.status = raw.status;
  }
  const selectedStatuses = [...new Set(parseStringList(raw.statuses).map((value) => value.trim()))];
  if (
    selectedStatuses.length > 0 &&
    selectedStatuses.length <= 50 &&
    selectedStatuses.every((value) => /^[a-z0-9_-]{1,48}$/.test(value))
  ) {
    out.statuses = selectedStatuses;
  }
  if (typeof raw.project === 'string' && raw.project) {
    out.project = raw.project;
  }
  if (raw.cycle !== undefined && raw.cycle !== '') {
    const n = Number(raw.cycle);
    if (Number.isFinite(n) && n > 0) {
      out.cycle = n;
    }
  }
  const selectedPriorities = [...new Set(parseNumberList(raw.priorities))];
  if (
    selectedPriorities.length > 0 &&
    selectedPriorities.length <= 5 &&
    selectedPriorities.every((value) => Number.isInteger(value) && value >= 0 && value <= 4)
  ) {
    if (selectedPriorities.length === 1) out.priority = selectedPriorities[0];
    else out.priorities = selectedPriorities;
  }
  if (
    out.priority === undefined &&
    !out.priorities &&
    raw.priority !== undefined &&
    raw.priority !== ''
  ) {
    const n = Number(raw.priority);
    if (Number.isFinite(n) && n >= 0) {
      out.priority = n;
    }
  }
  if (typeof raw.labels === 'string' && raw.labels) {
    const labels = [
      ...new Set(
        raw.labels
          .split(',')
          .map((label) => label.trim())
          .filter(Boolean),
      ),
    ];
    if (labels.length) {
      out.labels = labels.join(',');
      const operators: LabelOperator[] = ['includeAny', 'includeAll', 'excludeAny', 'excludeAll'];
      out.labelOperator = operators.includes(raw.labelOperator as LabelOperator)
        ? (raw.labelOperator as LabelOperator)
        : labels.length > 1
          ? 'includeAll'
          : 'includeAny';
    }
  }
  const dueDateFilters = [
    'overdue',
    'today',
    'tomorrow',
    'threeDays',
    'week',
    'month',
    'quarter',
    'custom',
    'none',
  ];
  if (typeof raw.dueDate === 'string' && dueDateFilters.includes(raw.dueDate)) {
    out.dueDate = raw.dueDate as IssueSearch['dueDate'];
  } else if (typeof raw.dueDate === 'string' && raw.dueDate.startsWith('on:')) {
    const date = raw.dueDate.slice(3);
    const parsed = new Date(`${date}T00:00:00`);
    if (
      /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      !Number.isNaN(parsed.getTime()) &&
      localDateValue(parsed) === date
    ) {
      out.dueDate = raw.dueDate as IssueSearch['dueDate'];
    }
  }
  const relationFilters = [
    'parent',
    'subissue',
    'blocked',
    'blocking',
    'recurring',
    'related',
    'duplicate',
  ];
  if (typeof raw.relation === 'string' && relationFilters.includes(raw.relation)) {
    out.relation = raw.relation as IssueSearch['relation'];
  }
  const linkSourceValues = parseStringList(raw.linkSources);
  if (linkSourceValues.length > 0) {
    const sources = linkSourceValues
      .map((source) => source.trim().toLowerCase())
      .filter((source) => /^[a-z0-9.-]{1,253}$/.test(source));
    const normalizedSources = [...new Set(sources)];
    if (normalizedSources.length > 0 && normalizedSources.length <= 32) {
      out.linkSources = normalizedSources;
    }
  }
  const templateValues = parseStringList(raw.templateSlugs);
  if (templateValues.length > 0) {
    const templates = [...new Set(templateValues.map((slug) => slug.trim().toLowerCase()))];
    if (
      templates.length <= 32 &&
      templates.every(
        (slug) =>
          slug === 'no-template' ||
          (slug.length <= 400 && /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u.test(slug)),
      )
    ) {
      out.templateSlugs = templates;
    }
  }
  if (typeof raw.content === 'string' && raw.content.trim()) {
    out.content = raw.content.slice(0, 512);
  }
  if (typeof raw.milestoneName === 'string' && raw.milestoneName.trim()) {
    out.milestoneName = raw.milestoneName.slice(0, 512);
  }
  if (typeof raw.projectStatus === 'string' && /^[a-z0-9_-]{1,48}$/.test(raw.projectStatus)) {
    out.projectStatus = raw.projectStatus;
  }
  if (raw.projectPriority !== undefined && raw.projectPriority !== '') {
    const projectPriority = Number(raw.projectPriority);
    if (Number.isInteger(projectPriority) && projectPriority >= 0 && projectPriority <= 4) {
      out.projectPriority = projectPriority;
    }
  }
  if (typeof raw.projectLabels === 'string' && raw.projectLabels.trim()) {
    const projectLabels = raw.projectLabels
      .split(',')
      .map((label) => label.trim())
      .filter(Boolean);
    if (projectLabels.length <= 32 && projectLabels.every((label) => label.length <= 100)) {
      out.projectLabels = [...new Set(projectLabels)];
    }
  }
  if (typeof raw.addedToCycle === 'string' && raw.addedToCycle.trim()) {
    const phases = raw.addedToCycle
      .split(',')
      .map((phase) => phase.trim())
      .filter((phase): phase is 'planned' | 'during' | 'after' =>
        ['planned', 'during', 'after'].includes(phase),
      );
    if (phases.length <= 3) out.addedToCycle = [...new Set(phases)];
  }
  const dateFields = ['createdAt', 'updatedAt', 'startedAt', 'completedAt', 'timeInCurrentStatus'];
  const dateRanges = [
    'dayAgo',
    'threeDaysAgo',
    'weekAgo',
    'twoWeeksAgo',
    'monthAgo',
    'quarterAgo',
    'halfYearAgo',
    'yearAgo',
  ];
  if (
    typeof raw.dateField === 'string' &&
    dateFields.includes(raw.dateField) &&
    typeof raw.dateRange === 'string' &&
    raw.dateRange === 'custom'
  ) {
    out.dateField = raw.dateField as IssueSearch['dateField'];
    out.dateRange = 'custom';
  } else if (
    typeof raw.dateField === 'string' &&
    dateFields.includes(raw.dateField) &&
    typeof raw.dateRange === 'string'
  ) {
    const exactDate = raw.dateRange.startsWith('on:') ? raw.dateRange.slice(3) : '';
    const exactDateValue = new Date(`${exactDate}T00:00:00`);
    if (
      dateRanges.includes(raw.dateRange) ||
      (/^\d{4}-\d{2}-\d{2}$/.test(exactDate) &&
        !Number.isNaN(exactDateValue.getTime()) &&
        localDateValue(exactDateValue) === exactDate)
    ) {
      out.dateField = raw.dateField as IssueSearch['dateField'];
      out.dateRange = raw.dateRange as IssueSearch['dateRange'];
    }
  }
  if (
    typeof raw.type === 'string' &&
    ['bug', 'feature', 'improvement', 'task'].includes(raw.type)
  ) {
    out.type = raw.type;
  }
  const selectedEstimates = [...new Set(parseNumberList(raw.estimates))];
  const noEstimate = raw.noEstimate === true || raw.noEstimate === 'true';
  if (
    selectedEstimates.length <= 50 &&
    selectedEstimates.every((value) => Number.isInteger(value) && value >= 0 && value <= 999)
  ) {
    if (selectedEstimates.length === 1 && !noEstimate) out.estimate = selectedEstimates[0];
    else if (selectedEstimates.length > 0) out.estimates = selectedEstimates;
    if (noEstimate) out.noEstimate = true;
  }
  if (raw.estimate !== undefined && raw.estimate !== '' && out.estimate === undefined) {
    const n = Number(raw.estimate);
    if (Number.isInteger(n) && n >= 0 && n <= 999) {
      if (noEstimate) {
        out.estimates = [...(out.estimates ?? []), n];
        out.noEstimate = true;
      } else if (!out.estimates) {
        out.estimate = n;
      }
    }
  }
  return out;
}

function parseOptionalBoolean(value: unknown): boolean | undefined {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return undefined;
}

function parseStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value !== 'string' || !value.trim()) return [];
  const trimmed = value.trim();
  if (trimmed.startsWith('[')) {
    try {
      const decoded: unknown = JSON.parse(trimmed);
      if (Array.isArray(decoded)) {
        return decoded.filter((item): item is string => typeof item === 'string');
      }
    } catch {
      return [];
    }
  }
  return trimmed.split(',');
}

function parseNumberList(value: unknown): number[] {
  let values: unknown[];
  if (Array.isArray(value)) {
    values = value;
  } else if (typeof value === 'string' && value.trim()) {
    const trimmed = value.trim();
    if (trimmed.startsWith('[')) {
      try {
        const decoded: unknown = JSON.parse(trimmed);
        if (!Array.isArray(decoded)) return [];
        values = decoded;
      } catch {
        return [];
      }
    } else {
      values = trimmed.split(',');
    }
  } else {
    return [];
  }
  const numbers = values.map((item) => {
    if (typeof item === 'number') return item;
    if (typeof item !== 'string' || !/^\d+$/.test(item.trim())) return Number.NaN;
    return Number(item);
  });
  return numbers.every(Number.isSafeInteger) ? numbers : [];
}

export function searchToFilter(search: IssueSearch): {
  archived?: boolean;
  assignee?: 'self' | 'agent' | 'none';
  status?: string;
  statuses?: string[];
  project?: string;
  cycle?: number;
  labels?: string[];
  labelOperator?: LabelOperator;
  priority?: number;
  priorities?: number[];
  type?: string;
  estimate?: number;
  estimates?: number[];
  noEstimate?: boolean;
  dueDate?: string;
  relation?: string;
  linkSources?: string[];
  templateSlugs?: string[];
  content?: string;
  milestoneName?: string;
  dateField?: string;
  dateRange?: string;
  projectStatus?: string;
  projectPriority?: number;
  projectLabels?: string[];
  addedToCycle?: ('planned' | 'during' | 'after')[];
} {
  const estimates =
    search.estimates ??
    (search.noEstimate && search.estimate !== undefined ? [search.estimate] : undefined);
  return {
    archived: search.archived,
    assignee: search.assignee,
    status: search.statuses?.length ? undefined : search.status,
    ...(search.statuses?.length ? { statuses: search.statuses } : {}),
    project: search.project,
    cycle: search.cycle,
    labels: search.labels
      ? search.labels
          .split(',')
          .map((n) => n.trim())
          .filter(Boolean)
      : undefined,
    labelOperator: search.labels ? (search.labelOperator ?? 'includeAll') : undefined,
    priority: search.priorities?.length ? undefined : search.priority,
    ...(search.priorities?.length ? { priorities: search.priorities } : {}),
    type: search.type,
    estimate: estimates?.length || search.noEstimate ? undefined : search.estimate,
    ...(estimates?.length ? { estimates } : {}),
    ...(search.noEstimate ? { noEstimate: true } : {}),
    dueDate: search.dueDate,
    relation: search.relation,
    linkSources: search.linkSources,
    templateSlugs: search.templateSlugs,
    content: search.content,
    milestoneName: search.milestoneName,
    dateField: search.dateRange === 'custom' ? undefined : search.dateField,
    dateRange: search.dateRange === 'custom' ? undefined : search.dateRange,
    projectStatus: search.projectStatus,
    projectPriority: search.projectPriority,
    projectLabels: search.projectLabels,
    addedToCycle: search.addedToCycle,
  };
}
