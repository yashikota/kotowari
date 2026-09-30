import { describe, expect, it } from 'vite-plus/test';
import type { Issue, IssueWorkflowStatus } from '../types.ts';
import { autoAssignOnStartedTransition } from './issue-assignment.ts';

const workflowStatuses: IssueWorkflowStatus[] = [
  { id: 'backlog', name: 'Backlog', category: 'backlog' },
  { id: 'todo', name: 'Todo', category: 'todo' },
  { id: 'in_progress', name: 'In Progress', category: 'in_progress' },
  { id: 'done', name: 'Done', category: 'done' },
  { id: 'canceled', name: 'Canceled', category: 'canceled' },
];

const issue = {
  status: 'todo',
  workflowStatus: 'todo',
  assignee: undefined,
} as Pick<Issue, 'assignee' | 'status' | 'workflowStatus'>;

describe('autoAssignOnStartedTransition', () => {
  it('assigns an unassigned issue when it transitions into a started category', () => {
    expect(
      autoAssignOnStartedTransition(
        issue,
        { workflowStatus: 'in_progress' },
        workflowStatuses,
        true,
      ),
    ).toEqual({ workflowStatus: 'in_progress', assignee: 'self' });
  });

  it('supports custom workflow statuses categorized as started', () => {
    const statuses = [
      ...workflowStatuses,
      { id: 'doing-review', name: 'Doing review', category: 'in_progress' as const },
    ];
    expect(
      autoAssignOnStartedTransition(issue, { status: 'doing-review' }, statuses, true),
    ).toEqual({ status: 'doing-review', assignee: 'self' });
  });

  it('does not assign when disabled, already assigned, or not entering started', () => {
    expect(
      autoAssignOnStartedTransition(
        issue,
        { workflowStatus: 'in_progress' },
        workflowStatuses,
        false,
      ),
    ).toEqual({ workflowStatus: 'in_progress' });
    expect(
      autoAssignOnStartedTransition(
        { ...issue, assignee: 'agent' },
        { workflowStatus: 'in_progress' },
        workflowStatuses,
        true,
      ),
    ).toEqual({ workflowStatus: 'in_progress' });
    expect(
      autoAssignOnStartedTransition(issue, { workflowStatus: 'done' }, workflowStatuses, true),
    ).toEqual({ workflowStatus: 'done' });
  });

  it('preserves an explicit assignee while entering a started category', () => {
    expect(
      autoAssignOnStartedTransition(
        issue,
        { workflowStatus: 'in_progress', assignee: 'agent' },
        workflowStatuses,
        true,
      ),
    ).toEqual({ workflowStatus: 'in_progress', assignee: 'agent' });
  });

  it('does not assign when the issue is already in a started category', () => {
    const startedIssue: Pick<Issue, 'assignee' | 'status' | 'workflowStatus'> = {
      ...issue,
      status: 'in_progress',
      workflowStatus: 'in_progress',
    };
    expect(
      autoAssignOnStartedTransition(
        startedIssue,
        { workflowStatus: 'in_progress' },
        workflowStatuses,
        true,
      ),
    ).toEqual({ workflowStatus: 'in_progress' });
  });
});
