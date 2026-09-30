import { req } from './request.ts';
import type {
  Activity,
  Comment,
  Issue,
  IssueLink,
  IssueLinkSource,
  IssueRelation,
  IssueTemplate,
  IssueTemplateFilterOption,
  Project,
  RecurringIssue,
} from '../types.ts';
export const issueApi = {
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
    skipDefaultTemplate?: boolean;
    status?: string;
    workflowStatus?: string;
    creator?: 'self' | 'agent';
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
};
