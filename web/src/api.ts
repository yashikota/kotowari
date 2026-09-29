import { cycleApi } from './api/cycles.ts';
import { documentApi } from './api/documents.ts';
import { inboxApi } from './api/inbox.ts';
import { issueApi } from './api/issues.ts';
import { projectApi } from './api/projects.ts';
import { viewApi } from './api/views.ts';
import { workspaceApi } from './api/workspace.ts';

export const api = {
  ...workspaceApi,
  ...issueApi,
  ...inboxApi,
  ...projectApi,
  ...cycleApi,
  ...documentApi,
  ...viewApi,
};

export { issuesQuery, parseIssueSearch, searchToFilter } from './issue-search.ts';
export type { IssueSearch } from './issue-search.ts';
