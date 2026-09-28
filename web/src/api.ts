import { queryCache } from './application/cache.ts';
import { updateIssue } from './application/issues.ts';
import type {
  Activity,
  Comment,
  Cycle,
  Diagnostic,
  Issue,
  IssueLink,
  IssueLinkSource,
  IssueTemplateFilterOption,
  IssueRelation,
  IssueTemplate,
  IssueWorkflowStatus,
  InboxActivity,
  Initiative,
  Label,
  LabelOperator,
  Page,
  ADR,
  Project,
  ProjectHealth,
  ProjectMilestone,
  ProjectTemplate,
  ProjectWorkflowStatus,
  RecurringIssue,
  SearchHit,
  View,
  Workspace,
} from './types.ts';
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type') && !(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(path, {
    ...init,
    headers,
  });
  if (res.status === 204) {
    return undefined as T;
  }
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      if (!res.ok) {
        throw new Error(text.trim() || res.statusText);
      }
      throw new Error(`invalid response: ${text.slice(0, 120)}`);
    }
  }
  if (!res.ok) {
    const err = data as { error?: string } | null;
    throw new Error(err?.error ?? res.statusText);
  }
  return data as T;
}

function req<T>(path: string, init?: RequestInit): Promise<T> {
  if (!init?.method || init.method === 'GET')
    return queryCache.read(path, () => request<T>(path, init));
  queryCache.invalidate();
  return request<T>(path, init).finally(() => queryCache.invalidate());
}

export const api = {
  workspace: () => req<Workspace>('/api/workspace'),
  patchWorkspace: (body: Partial<Workspace>) =>
    req<Workspace>('/api/workspace', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  issueWorkflowStatuses: () => req<IssueWorkflowStatus[]>('/api/issue-workflow-statuses'),
  updateIssueWorkflowStatuses: (statuses: IssueWorkflowStatus[]) =>
    req<IssueWorkflowStatus[]>('/api/issue-workflow-statuses', {
      method: 'PUT',
      body: JSON.stringify({ statuses }),
    }),
  projectWorkflowStatuses: () => req<ProjectWorkflowStatus[]>('/api/project-workflow-statuses'),
  updateProjectWorkflowStatuses: (statuses: ProjectWorkflowStatus[]) =>
    req<ProjectWorkflowStatus[]>('/api/project-workflow-statuses', {
      method: 'PUT',
      body: JSON.stringify({ statuses }),
    }),
  labels: () => req<Label[]>('/api/labels'),
  createLabel: (body: { name: string; color: string }) =>
    req<Label>('/api/labels', { method: 'POST', body: JSON.stringify(body) }),
  diagnostics: () => req<Diagnostic[]>('/api/diagnostics'),
  issues: (q = '') => req<Issue[]>(`/api/issues${q}`),
  issueLinkSources: () => req<IssueLinkSource[]>('/api/issue-link-sources'),
  issueTemplateFilterOptions: () => req<IssueTemplateFilterOption[]>('/api/issue-template-options'),
  issueTemplates: () => req<IssueTemplate[]>('/api/issue-templates'),
  createIssueTemplate: (identifier: string, name: string) =>
    req<IssueTemplate>(`/api/issues/${identifier}/templates`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  deleteIssueTemplate: (slug: string) =>
    req<void>(`/api/issue-templates/${encodeURIComponent(slug)}`, { method: 'DELETE' }),
  recurringIssues: () => req<RecurringIssue[]>('/api/recurring-issues'),
  createRecurringIssue: (
    identifier: string,
    body: { name: string; firstDueDate: string; interval: number; unit: RecurringIssue['unit'] },
  ) =>
    req<RecurringIssue>(`/api/issues/${identifier}/recurrences`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  patchRecurringIssue: (slug: string, body: { enabled: boolean }) =>
    req<RecurringIssue>(`/api/recurring-issues/${encodeURIComponent(slug)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteRecurringIssue: (slug: string) =>
    req<void>(`/api/recurring-issues/${encodeURIComponent(slug)}`, { method: 'DELETE' }),
  issue: (id: string) => req<Issue>(`/api/issues/${id}`),
  convertIssueToProject: (
    identifier: string,
    body: {
      name: string;
      description: string;
      status: string;
      workflowStatus?: string;
      priority: number;
      startDate?: string;
      targetDate?: string;
    },
  ) =>
    req<{ project: Project; issue: Issue }>(`/api/issues/${identifier}/projects`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  createIssue: (body: {
    title: string;
    body?: string;
    status?: string;
    workflowStatus?: string;
    assignee?: 'self' | 'agent';
    type?: string;
    priority?: number;
    estimate?: number | null;
    parentId?: number;
    projectId?: number;
    milestoneId?: number;
    cycleId?: number;
    labelIds?: number[];
    dueDate?: string;
    links?: { url: string; title?: string; kind?: IssueLink['kind'] }[];
    templateSlug?: string;
    recurring?: {
      name: string;
      firstDueDate: string;
      interval: number;
      unit: RecurringIssue['unit'];
    };
  }) => req<Issue>('/api/issues', { method: 'POST', body: JSON.stringify(body) }),
  patchIssue: (id: string, body: Record<string, unknown>) =>
    updateIssue(id, body, () =>
      req<Issue>(`/api/issues/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    ),
  deleteIssue: (id: string) => req<void>(`/api/issues/${id}`, { method: 'DELETE' }),
  addIssueLink: (id: string, body: { url: string; title?: string; kind?: IssueLink['kind'] }) =>
    req<IssueLink>(`/api/issues/${id}/links`, { method: 'POST', body: JSON.stringify(body) }),
  removeIssueLink: (id: string, linkId: number) =>
    req<void>(`/api/issues/${id}/links/${linkId}`, { method: 'DELETE' }),
  addIssueRelation: (id: string, body: { targetIdentifier: string; kind: IssueRelation['kind'] }) =>
    req<IssueRelation>(`/api/issues/${id}/relations`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  removeIssueRelation: (id: string, relationId: number) =>
    req<void>(`/api/issues/${id}/relations/${relationId}`, { method: 'DELETE' }),
  comments: (id: string) => req<Comment[]>(`/api/issues/${id}/comments`),
  toggleIssueReaction: (id: string, emoji: string) =>
    req<Issue>(`/api/issues/${id}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    }),
  toggleCommentReaction: (id: string, commentId: number, emoji: string) =>
    req<Comment>(`/api/issues/${id}/comments/${commentId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    }),
  addIssueAttachments: (id: string, files: File[]) => {
    const form = new FormData();
    files.forEach((file) => form.append('files', file, file.name));
    return req<Issue['attachments']>(`/api/issues/${id}/attachments`, {
      method: 'POST',
      body: form,
    });
  },
  deleteIssueAttachment: (id: string, attachmentId: string) =>
    req<void>(`/api/issues/${id}/attachments/${encodeURIComponent(attachmentId)}`, {
      method: 'DELETE',
    }),
  addComment: (id: string, body: string) =>
    req<Comment>(`/api/issues/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
  updateComment: (id: string, commentId: number, body: string) =>
    req<Comment>(`/api/issues/${id}/comments/${commentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ body }),
    }),
  deleteComment: (id: string, commentId: number) =>
    req<void>(`/api/issues/${id}/comments/${commentId}`, { method: 'DELETE' }),
  addCommentWithAttachments: (id: string, body: string, files: File[]) => {
    const form = new FormData();
    form.set('body', body);
    files.forEach((file) => form.append('files', file, file.name));
    return req<Comment>(`/api/issues/${id}/comments`, { method: 'POST', body: form });
  },
  activities: (id: string) => req<Activity[]>(`/api/issues/${id}/activities`),
  inboxActivities: async () => {
    const [activities, issues, projects] = await Promise.all([
      req<Omit<InboxActivity, 'status' | 'priority' | 'projectId' | 'projectName'>[]>(
        '/api/inbox/activities',
      ),
      req<Issue[]>('/api/issues'),
      req<Project[]>('/api/projects'),
    ]);
    const issueByIdentifier = new Map(issues.map((issue) => [issue.identifier, issue]));
    const projectById = new Map(projects.map((project) => [project.id, project]));
    return activities.map((activity): InboxActivity => {
      const issue = issueByIdentifier.get(activity.identifier);
      const project =
        issue?.projectId === null || issue?.projectId === undefined
          ? undefined
          : projectById.get(issue.projectId);
      return {
        ...activity,
        status: issue?.status ?? null,
        priority: issue?.priority ?? null,
        projectId: issue?.projectId ?? null,
        projectName: project?.name ?? null,
      };
    });
  },
  projects: (archived = false) =>
    req<Project[]>(`/api/projects${archived ? '?archived=true' : ''}`),
  initiatives: () => req<Initiative[]>('/api/initiatives'),
  initiative: (slug: string) => req<Initiative>(`/api/initiatives/${encodeURIComponent(slug)}`),
  initiativeActivities: (slug: string) =>
    req<Activity[]>(`/api/initiatives/${encodeURIComponent(slug)}/activities`),
  postInitiativeUpdate: (slug: string, health: ProjectHealth, body: string) =>
    req<Activity>(`/api/initiatives/${encodeURIComponent(slug)}/updates`, {
      method: 'POST',
      body: JSON.stringify({ health, body }),
    }),
  createInitiative: (body: {
    name: string;
    slug: string;
    description?: string;
    status?: Initiative['status'];
    color?: string;
    health?: Project['health'];
    priority?: number;
    labels?: string[];
    startDate?: string;
    targetDate?: string;
  }) => req<Initiative>('/api/initiatives', { method: 'POST', body: JSON.stringify(body) }),
  patchInitiative: (slug: string, body: Record<string, unknown>) =>
    req<Initiative>(`/api/initiatives/${encodeURIComponent(slug)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteInitiative: (slug: string) =>
    req<void>(`/api/initiatives/${encodeURIComponent(slug)}`, { method: 'DELETE' }),
  projectTemplates: () => req<ProjectTemplate[]>('/api/project-templates'),
  createProjectTemplate: (slug: string, name: string) =>
    req<ProjectTemplate>(`/api/projects/${encodeURIComponent(slug)}/templates`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  deleteProjectTemplate: (slug: string) =>
    req<void>(`/api/project-templates/${encodeURIComponent(slug)}`, { method: 'DELETE' }),
  project: (slug: string) => req<Project>(`/api/projects/${slug}`),
  projectActivities: (slug: string) => req<Activity[]>(`/api/projects/${slug}/activities`),
  postProjectUpdate: (slug: string, health: ProjectHealth, body: string) =>
    req<Activity>(`/api/projects/${slug}/updates`, {
      method: 'POST',
      body: JSON.stringify({ health, body }),
    }),
  createProject: (body: {
    name: string;
    slug: string;
    summary?: string;
    icon?: string;
    iconColor?: string;
    description?: string;
    status?: string;
    workflowStatus?: string;
    lead?: 'self' | '';
    templateSlug?: string;
    priority?: number;
    startDate?: string;
    targetDate?: string;
    labels?: string[];
    milestones?: { name: string; description?: string; targetDate?: string }[];
    dependencies?: { projectSlug: string; kind: 'blocks' | 'blocked_by' | 'related' }[];
  }) => req<Project>('/api/projects', { method: 'POST', body: JSON.stringify(body) }),
  patchProject: (slug: string, body: Record<string, unknown>) =>
    req<Project>(`/api/projects/${slug}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  createProjectDependency: (slug: string, body: { projectSlug: string; kind: string }) =>
    req<Project>(`/api/projects/${slug}/dependencies`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  deleteProjectDependency: (slug: string, dependencySlug: string) =>
    req<Project>(`/api/projects/${slug}/dependencies/${dependencySlug}`, { method: 'DELETE' }),
  createMilestone: (
    slug: string,
    body: { name: string; description?: string; targetDate?: string },
  ) =>
    req<ProjectMilestone>(`/api/projects/${slug}/milestones`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  patchMilestone: (slug: string, id: number, body: Record<string, unknown>) =>
    req<ProjectMilestone>(`/api/projects/${slug}/milestones/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteMilestone: (slug: string, id: number) =>
    req<void>(`/api/projects/${slug}/milestones/${id}`, { method: 'DELETE' }),
  deleteProject: (slug: string) => req<void>(`/api/projects/${slug}`, { method: 'DELETE' }),
  cycles: (archived = false) => req<Cycle[]>(`/api/cycles${archived ? '?archived=true' : ''}`),
  ensureCycleSchedule: () => req<Cycle[]>('/api/cycles/ensure', { method: 'POST' }),
  cycle: (n: number) => req<Cycle>(`/api/cycles/${n}`),
  cycleActivities: (n: number) => req<Activity[]>(`/api/cycles/${n}/activities`),
  createCycle: (body: { startsAt: string; endsAt: string; status?: string }) =>
    req<Cycle>('/api/cycles', { method: 'POST', body: JSON.stringify(body) }),
  patchCycle: (n: number, body: Record<string, unknown>) =>
    req<Cycle>(`/api/cycles/${n}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  addCycleResource: (
    n: number,
    body: { url: string; title?: string; kind?: 'link' | 'document' },
  ) => req<IssueLink>(`/api/cycles/${n}/links`, { method: 'POST', body: JSON.stringify(body) }),
  removeCycleResource: (n: number, resourceId: number) =>
    req<void>(`/api/cycles/${n}/links/${resourceId}`, { method: 'DELETE' }),
  pages: () => req<Page[]>('/api/pages'),
  page: (slug: string) => req<Page>(`/api/pages/${slug}`),
  createPage: (body: {
    title: string;
    slug: string;
    body?: string;
    status?: string;
    tags?: string[];
  }) => req<Page>('/api/pages', { method: 'POST', body: JSON.stringify(body) }),
  patchPage: (slug: string, body: Record<string, unknown>) =>
    req<Page>(`/api/pages/${slug}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deletePage: (slug: string) => req<void>(`/api/pages/${slug}`, { method: 'DELETE' }),
  adrs: () => req<ADR[]>('/api/adrs'),
  adr: (id: string) => req<ADR>(`/api/adrs/${id}`),
  createADR: (body: {
    projectSlug?: string | null;
    supersedes?: number;
    title: string;
    body?: string;
    status?: string;
    evaluation?: string;
    issueNumbers?: number[];
  }) => req<ADR>('/api/adrs', { method: 'POST', body: JSON.stringify(body) }),
  patchADR: (id: string, body: Record<string, unknown>) =>
    req<ADR>(`/api/adrs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  publishADR: (id: string) => req<ADR>(`/api/adrs/${id}/publish`, { method: 'POST' }),
  linkIssueADR: (issueId: string, number: number) =>
    req<Issue>(`/api/issues/${issueId}/links/adrs`, {
      method: 'POST',
      body: JSON.stringify({ number }),
    }),
  unlinkIssueADR: (issueId: string, number: number) =>
    req<void>(`/api/issues/${issueId}/links/adrs/${number}`, { method: 'DELETE' }),
  linkADRIssue: (adrId: string, number: number) =>
    req<ADR>(`/api/adrs/${adrId}/links/issues`, {
      method: 'POST',
      body: JSON.stringify({ number }),
    }),
  unlinkADRIssue: (adrId: string, number: number) =>
    req<void>(`/api/adrs/${adrId}/links/issues/${number}`, { method: 'DELETE' }),
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
    q.set('dateAsOf', filter.dateAsOf ?? localDateValue(new Date()));
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
