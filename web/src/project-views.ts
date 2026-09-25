import { useEffect, useState } from 'react';
import type { ProjectHealth, ViewIconName } from './types.ts';

export type ProjectViewSearch = {
  q?: string;
  specificProject?: string;
  status?: string[];
  priority?: string[];
  health?: Array<ProjectHealth | 'none'>;
  labels?: string[];
  groupBy?: 'none' | 'status' | 'priority';
  orderBy?:
    | 'manual'
    | 'name'
    | 'status'
    | 'priority'
    | 'startDate'
    | 'targetDate'
    | 'created'
    | 'updated'
    | 'completed';
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
