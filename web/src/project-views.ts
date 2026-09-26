import { useEffect, useState } from 'react';
import type { Project, ProjectHealth, ViewIconName } from './types.ts';

export type ProjectSearchOperator = 'contains' | 'doesNotContain';
export type ProjectGroupBy =
  | 'none'
  | 'status'
  | 'priority'
  | 'labels'
  | 'health'
  | 'startDate'
  | 'targetDate';

export type ProjectFilterField =
  | 'status'
  | 'priority'
  | 'health'
  | 'label'
  | 'milestone'
  | 'relation'
  | 'initiative'
  | 'template'
  | 'project'
  | 'title'
  | 'createdDate'
  | 'updatedDate'
  | 'startDate'
  | 'targetDate'
  | 'completedDate';

export type ProjectFilterCondition = {
  kind: 'condition';
  field?: ProjectFilterField;
  operator?: 'is' | 'isNot' | 'contains' | 'doesNotContain';
  value?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type ProjectFilterGroup = {
  kind: 'group';
  operator: 'and' | 'or';
  children: ProjectFilterNode[];
};

export type ProjectFilterNode = ProjectFilterCondition | ProjectFilterGroup;

export type ProjectViewSearch = {
  q?: string;
  qOperator?: ProjectSearchOperator;
  advancedFilter?: boolean;
  filterOperator?: 'and' | 'or';
  advancedFilterGroup?: ProjectFilterGroup;
  specificProject?: string;
  status?: string[];
  priority?: string[];
  health?: Array<ProjectHealth | 'none'>;
  labels?: string[];
  templates?: string[];
  initiatives?: string[];
  groupBy?: ProjectGroupBy;
  orderBy?:
    | 'manual'
    | 'name'
    | 'status'
    | 'priority'
    | 'healthUpdated'
    | 'startDate'
    | 'targetDate'
    | 'created'
    | 'updated';
  direction?: 'asc' | 'desc';
  closed?: 'all' | 'open' | 'closed';
  view?: 'list' | 'board' | 'timeline';
  columnsBy?: 'status' | 'priority';
  rowsBy?: 'none' | 'status' | 'priority';
  showEmptyColumns?: boolean;
  showProjectList?: boolean;
  showWeekNumbers?: boolean;
  timelineStart?: string;
  displayProperties?: string[];
  dateField?: 'startDate' | 'targetDate' | 'created' | 'updated' | 'completed';
  dateFrom?: string;
  dateTo?: string;
  milestones?: string[];
  relations?: Array<'blocks' | 'blocked_by' | 'related'>;
};

const PROJECT_FILTER_FIELDS = new Set<ProjectFilterField>([
  'status',
  'priority',
  'health',
  'label',
  'milestone',
  'relation',
  'initiative',
  'template',
  'project',
  'title',
  'createdDate',
  'updatedDate',
  'startDate',
  'targetDate',
  'completedDate',
]);

function parseDateBound(value: unknown): string | undefined {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

export function parseProjectFilterGroup(value: unknown): ProjectFilterGroup | undefined {
  let parsed = value;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return undefined;
    }
  }

  let visited = 0;
  function parseNode(node: unknown, depth: number): ProjectFilterNode | undefined {
    visited += 1;
    if (visited > 80 || depth > 6 || !node || typeof node !== 'object') return undefined;
    const candidate = node as Record<string, unknown>;
    if (candidate.kind === 'group') {
      if (candidate.operator !== 'and' && candidate.operator !== 'or') return undefined;
      if (!Array.isArray(candidate.children) || candidate.children.length > 40) return undefined;
      const children = candidate.children
        .map((child) => parseNode(child, depth + 1))
        .filter((child): child is ProjectFilterNode => child !== undefined);
      return { kind: 'group', operator: candidate.operator, children };
    }
    if (candidate.kind !== 'condition') return undefined;
    const field = PROJECT_FILTER_FIELDS.has(candidate.field as ProjectFilterField)
      ? (candidate.field as ProjectFilterField)
      : undefined;
    const operator =
      candidate.operator === 'is' ||
      candidate.operator === 'isNot' ||
      candidate.operator === 'contains' ||
      candidate.operator === 'doesNotContain'
        ? candidate.operator
        : undefined;
    const ruleValue =
      typeof candidate.value === 'string' && candidate.value.length <= 240
        ? candidate.value
        : undefined;
    const dateFrom = parseDateBound(candidate.dateFrom);
    const dateTo = parseDateBound(candidate.dateTo);
    return {
      kind: 'condition',
      field,
      operator,
      value: ruleValue,
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
    };
  }

  const result = parseNode(parsed, 0);
  return result?.kind === 'group' ? result : undefined;
}

export function matchesProjectTitleSummary(
  project: Pick<Project, 'name' | 'summary'>,
  query: string,
  operator: ProjectSearchOperator = 'contains',
) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;
  const searchable = `${project.name} ${project.summary ?? ''}`.toLocaleLowerCase();
  const containsQuery = searchable.includes(normalizedQuery);
  return operator === 'doesNotContain' ? !containsQuery : containsQuery;
}

export type ProjectSavedView = {
  slug: string;
  name: string;
  description: string;
  icon?: ViewIconName;
  search: ProjectViewSearch;
  updatedAt: string;
};

export const PROJECT_VIEWS_STORAGE_KEY = 'kotowari.project-views.v1';
export const PROJECT_VIEWS_EVENT = 'kotowari:project-views-changed';

function parseProjectViews(value: string | null): ProjectSavedView[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (view): view is ProjectSavedView =>
        typeof view === 'object' &&
        view !== null &&
        'slug' in view &&
        typeof view.slug === 'string' &&
        'name' in view &&
        typeof view.name === 'string' &&
        'search' in view &&
        typeof view.search === 'object' &&
        view.search !== null,
    );
  } catch {
    return [];
  }
}

export function getProjectViews(): ProjectSavedView[] {
  if (typeof window === 'undefined') return [];
  return parseProjectViews(window.localStorage.getItem(PROJECT_VIEWS_STORAGE_KEY));
}

function writeProjectViews(views: ProjectSavedView[]) {
  if (typeof window === 'undefined') return views;
  window.localStorage.setItem(PROJECT_VIEWS_STORAGE_KEY, JSON.stringify(views));
  window.dispatchEvent(new Event(PROJECT_VIEWS_EVENT));
  return views;
}

export function saveProjectView(view: ProjectSavedView): ProjectSavedView[] {
  const current = getProjectViews();
  const exists = current.some((item) => item.slug === view.slug);
  return writeProjectViews(
    exists ? current.map((item) => (item.slug === view.slug ? view : item)) : [...current, view],
  );
}

export function deleteProjectView(slug: string): ProjectSavedView[] {
  return writeProjectViews(getProjectViews().filter((view) => view.slug !== slug));
}

export function useProjectViews() {
  const [views, setViews] = useState(getProjectViews);
  useEffect(() => {
    const refresh = () => setViews(getProjectViews());
    window.addEventListener(PROJECT_VIEWS_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(PROJECT_VIEWS_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  return { views, save: saveProjectView, remove: deleteProjectView };
}
