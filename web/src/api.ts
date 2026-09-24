import { queryCache } from './application/cache.ts';
import { updateIssue } from './application/issues.ts';
import type {
  Activity,
  Comment,
  Cycle,
  Diagnostic,
  Issue,
  IssueLink,
  IssueRelation,
  IssueTemplate,
  Label,
  Page,
  ADR,
  Project,
  ProjectMilestone,
  RecurringIssue,
  SearchHit,
  View,
  Workspace,
} from './types.ts';

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
  labels: () => req<Label[]>('/api/labels'),
  createLabel: (body: { name: string; color: string }) =>
    req<Label>('/api/labels', { method: 'POST', body: JSON.stringify(body) }),
  diagnostics: () => req<Diagnostic[]>('/api/diagnostics'),
  issues: (q = '') => req<Issue[]>(`/api/issues${q}`),
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
    type?: string;
    priority?: number;
    estimate?: number | null;
    parentId?: number;
    projectId?: number;
    milestoneId?: number;
    cycleId?: number;
    labelIds?: number[];
    dueDate?: string;
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
  projects: () => req<Project[]>('/api/projects'),
  project: (slug: string) => req<Project>(`/api/projects/${slug}`),
  projectActivities: (slug: string) => req<Activity[]>(`/api/projects/${slug}/activities`),
  createProject: (body: {
    name: string;
    slug: string;
    summary?: string;
    icon?: string;
    iconColor?: string;
    description?: string;
    status?: string;
    priority?: number;
    startDate?: string;
    targetDate?: string;
    labels?: string[];
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
  createMilestone: (slug: string, body: { name: string; targetDate?: string }) =>
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
  cycles: () => req<Cycle[]>('/api/cycles'),
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
    project?: string | null;
    cycle?: number | null;
    labels?: string[];
    priority?: number | null;
    type?: string | null;
    estimate?: number | null;
    dueDate?: string;
    relation?: string;
    content?: string;
    milestoneName?: string;
    dateField?: string;
    dateRange?: string;
    projectStatus?: string;
    projectPriority?: number | null;
    projectLabels?: string[];
    addedToCycle?: string[];
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
  project?: string | null;
  cycle?: number | null;
  labels?: string[] | null;
  priority?: number | null;
  type?: string | null;
  estimate?: number | null;
  dueDate?: string | null;
  asOf?: string | null;
  relation?: string | null;
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
  if (filter.status) {
    q.set('status', filter.status);
  }
  if (filter.project) {
    q.set('project', filter.project);
  }
  if (filter.cycle) {
    q.set('cycle', String(filter.cycle));
  }
  if (filter.labels?.length) {
    q.set('labels', filter.labels.join(','));
  }
  if (filter.priority != null && filter.priority >= 0) {
    q.set('priority', String(filter.priority));
  }
  if (filter.type) {
    q.set('type', filter.type);
  }
  if (filter.estimate != null && filter.estimate >= 0) {
    q.set('estimate', String(filter.estimate));
  }
  if (filter.dueDate) {
    q.set('dueDate', filter.dueDate);
    q.set('asOf', filter.asOf ?? localDateValue(new Date()));
  }
  if (filter.relation) q.set('relation', filter.relation);
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
  status?: string;
  project?: string;
  cycle?: number;
  priority?: number;
  type?: string;
  estimate?: number;
  labels?: string;
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
  if (typeof raw.status === 'string' && raw.status) {
    out.status = raw.status;
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
  if (raw.priority !== undefined && raw.priority !== '') {
    const n = Number(raw.priority);
    if (Number.isFinite(n) && n >= 0) {
      out.priority = n;
    }
  }
  if (typeof raw.labels === 'string' && raw.labels) {
    out.labels = raw.labels;
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
  if (typeof raw.content === 'string' && raw.content.trim()) {
    out.content = raw.content.slice(0, 512);
  }
  if (typeof raw.milestoneName === 'string' && raw.milestoneName.trim()) {
    out.milestoneName = raw.milestoneName.slice(0, 512);
  }
  if (
    typeof raw.projectStatus === 'string' &&
    ['backlog', 'planned', 'started', 'completed', 'canceled'].includes(raw.projectStatus)
  ) {
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
  if (raw.estimate !== undefined && raw.estimate !== '') {
    const n = Number(raw.estimate);
    if (Number.isInteger(n) && n >= 0 && n <= 999) out.estimate = n;
  }
  return out;
}

export function searchToFilter(search: IssueSearch): {
  archived?: boolean;
  status?: string;
  project?: string;
  cycle?: number;
  labels?: string[];
  priority?: number;
  type?: string;
  estimate?: number;
  dueDate?: string;
  relation?: string;
  content?: string;
  milestoneName?: string;
  dateField?: string;
  dateRange?: string;
  projectStatus?: string;
  projectPriority?: number;
  projectLabels?: string[];
  addedToCycle?: ('planned' | 'during' | 'after')[];
} {
  return {
    archived: search.archived,
    status: search.status,
    project: search.project,
    cycle: search.cycle,
    labels: search.labels
      ? search.labels
          .split(',')
          .map((n) => n.trim())
          .filter(Boolean)
      : undefined,
    priority: search.priority,
    type: search.type,
    estimate: search.estimate,
    dueDate: search.dueDate,
    relation: search.relation,
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
