import { req } from './request.ts';
import type { LabelOperator, SearchHit, View } from '../types.ts';
import type { IssueFilterGroup } from '../issue-advanced-filter.ts';
export const viewApi = {
  views: () => req<View[]>('/api/views'),
  view: (slug: string) => req<View>(`/api/views/${slug}`),
  createView: (body: {
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    display?: string;
    groupBy?: string;
    subGroupBy?: string;
    orderBy?: string;
    direction?: string;
    completedIssues?: string;
    showSubIssues?: boolean;
    nestedSubIssues?: string;
    showEmptyGroups?: boolean;
    displayProperties?: string[];
    status?: string | null;
    statuses?: string[];
    assignee?: 'self' | 'agent' | 'none' | null;
    subscriber?: 'self' | 'none' | null;
    project?: string | null;
    cycle?: number | null;
    labels?: string[];
    labelOperator?: LabelOperator;
    priority?: number | null;
    priorities?: number[];
    type?: string | null;
    estimate?: number | null;
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
    projectPriority?: number | null;
    projectLabels?: string[];
    addedToCycle?: string[];
    advancedFilter?: boolean;
    advancedFilterGroup?: IssueFilterGroup;
  }) => req<View>('/api/views', { method: 'POST', body: JSON.stringify(body) }),
  patchView: (slug: string, body: Record<string, unknown>) =>
    req<View>(`/api/views/${slug}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteView: (slug: string) => req<void>(`/api/views/${slug}`, { method: 'DELETE' }),
  search: (q: string) => req<SearchHit[]>(`/api/search?q=${encodeURIComponent(q)}`),
};
