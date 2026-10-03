import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { api } from './api.ts';
import { useWorkflowStatuses } from './useWorkflowStatuses.ts';
import { issueStatusLabel } from './i18n/labels.ts';
import type { IssueStatus, IssueWorkflowStatus } from './types.ts';

export const DEFAULT_ISSUE_WORKFLOW_STATUSES: IssueWorkflowStatus[] = [
  { id: 'backlog', name: 'Backlog', category: 'backlog' },
  { id: 'todo', name: 'Todo', category: 'todo' },
  { id: 'in_progress', name: 'In Progress', category: 'in_progress' },
  { id: 'done', name: 'Done', category: 'done' },
  { id: 'canceled', name: 'Canceled', category: 'canceled' },
  { id: 'duplicate', name: 'Duplicate', category: 'canceled' },
];

const IssueWorkflowContext = createContext<ReturnType<
  typeof useWorkflowStatuses<IssueWorkflowStatus>
> | null>(null);

export function IssueWorkflowProvider({ children }: { children: ReactNode }) {
  const state = useWorkflowStatuses(
    DEFAULT_ISSUE_WORKFLOW_STATUSES,
    api.issueWorkflowStatuses,
    api.updateIssueWorkflowStatuses,
  );

  return <IssueWorkflowContext.Provider value={state}>{children}</IssueWorkflowContext.Provider>;
}

export function useIssueWorkflow() {
  const context = useContext(IssueWorkflowContext);
  if (!context) throw new Error('IssueWorkflowProvider is required');
  return context;
}

export function workflowStatusLabel(
  id: string,
  statuses: IssueWorkflowStatus[] = DEFAULT_ISSUE_WORKFLOW_STATUSES,
): string {
  const status = statuses.find((entry) => entry.id === id);
  if (id === 'duplicate') return issueStatusLabel('duplicate');
  if (!status) return issueStatusLabel(id as IssueStatus);
  const defaultStatus = DEFAULT_ISSUE_WORKFLOW_STATUSES.find((entry) => entry.id === id);
  if (defaultStatus && status.name === defaultStatus.name)
    return issueStatusLabel(defaultStatus.category);
  return status.name;
}

export function workflowStatusCategory(
  id: string | null | undefined,
  statuses: IssueWorkflowStatus[] = DEFAULT_ISSUE_WORKFLOW_STATUSES,
  fallback: IssueStatus = 'backlog',
): IssueStatus {
  return statuses.find((status) => status.id === id)?.category ?? fallback;
}
