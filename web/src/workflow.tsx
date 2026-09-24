import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from './api.ts';
import { signals } from './application/mediator.ts';
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

type IssueWorkflowContextValue = {
  statuses: IssueWorkflowStatus[];
  updateStatuses: (statuses: IssueWorkflowStatus[]) => Promise<void>;
};

const IssueWorkflowContext = createContext<IssueWorkflowContextValue>({
  statuses: DEFAULT_ISSUE_WORKFLOW_STATUSES,
  updateStatuses: async () => {},
});

export function IssueWorkflowProvider({ children }: { children: ReactNode }) {
  const [statuses, setStatuses] = useState(DEFAULT_ISSUE_WORKFLOW_STATUSES);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      void api
        .issueWorkflowStatuses()
        .then((next) => {
          if (active && next.length >= DEFAULT_ISSUE_WORKFLOW_STATUSES.length) setStatuses(next);
        })
        .catch(() => {});
    };
    refresh();
    signals.addEventListener('kotowari:refresh', refresh);
    return () => {
      active = false;
      signals.removeEventListener('kotowari:refresh', refresh);
    };
  }, []);

  const updateStatuses = useCallback(async (next: IssueWorkflowStatus[]) => {
    const saved = await api.updateIssueWorkflowStatuses(next);
    setStatuses(saved);
    signals.dispatchEvent(new Event('kotowari:refresh'));
  }, []);

  return (
    <IssueWorkflowContext.Provider value={{ statuses, updateStatuses }}>
      {children}
    </IssueWorkflowContext.Provider>
  );
}

export function useIssueWorkflow() {
  return useContext(IssueWorkflowContext);
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
