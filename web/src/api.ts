import { queryCache } from './query-cache.ts';
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
import type { IssueFilterGroup } from './issue-advanced-filter.ts';

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
    req<Issue>(`/api/issues/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
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
export { issuesQuery, parseIssueSearch, searchToFilter } from './issue-search.ts';
export type { IssueSearch } from './issue-search.ts';
