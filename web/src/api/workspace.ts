import { req } from './request.ts';
import type {
  Diagnostic,
  IssueWorkflowStatus,
  Label,
  ProjectWorkflowStatus,
  Workspace,
  WorkspaceResource,
} from '../types.ts';
export const workspaceApi = {
  workspace: () => req<Workspace>('/api/workspace'),
  patchWorkspace: (body: Partial<Workspace>) =>
    req<Workspace>('/api/workspace', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  createWorkspaceResource: (body: { url: string; title?: string }) =>
    req<WorkspaceResource>('/api/workspace/resources', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  deleteWorkspaceResource: (id: number) =>
    req<void>(`/api/workspace/resources/${id}`, { method: 'DELETE' }),
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
};
