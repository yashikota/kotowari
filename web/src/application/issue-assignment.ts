import type { Issue, IssueStatus, IssueWorkflowStatus } from '../types.ts';

type IssueStatusPatch = Record<string, unknown>;

function statusCategory(
  id: string,
  statuses: IssueWorkflowStatus[],
  fallback: IssueStatus = 'backlog',
): IssueStatus {
  return statuses.find((status) => status.id === id)?.category ?? fallback;
}

export function autoAssignOnStartedTransition(
  issue: Pick<Issue, 'assignee' | 'status' | 'workflowStatus'>,
  patch: IssueStatusPatch,
  statuses: IssueWorkflowStatus[],
  enabled: boolean,
): IssueStatusPatch {
  const destination = patch.workflowStatus ?? patch.status;
  if (
    !enabled ||
    issue.assignee ||
    Object.hasOwn(patch, 'assignee') ||
    typeof destination !== 'string'
  )
    return patch;

  const currentStatus = issue.workflowStatus ?? issue.status;
  const currentCategory = statusCategory(currentStatus, statuses, issue.status);
  const destinationCategory = statusCategory(destination, statuses);
  if (currentCategory === 'in_progress' || destinationCategory !== 'in_progress') return patch;

  return { ...patch, assignee: 'self' };
}
