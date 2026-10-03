import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { api } from './api.ts';
import { useWorkflowStatuses } from './useWorkflowStatuses.ts';
import type { ProjectStatus, ProjectWorkflowStatus } from './types.ts';

export const DEFAULT_PROJECT_WORKFLOW_STATUSES: ProjectWorkflowStatus[] = [
  { id: 'backlog', name: 'Backlog', category: 'backlog' },
  { id: 'planned', name: 'Planned', category: 'planned' },
  { id: 'started', name: 'In Progress', category: 'started' },
  { id: 'completed', name: 'Completed', category: 'completed' },
  { id: 'canceled', name: 'Canceled', category: 'canceled' },
];

const ProjectWorkflowContext = createContext<ReturnType<
  typeof useWorkflowStatuses<ProjectWorkflowStatus>
> | null>(null);

export function ProjectWorkflowProvider({ children }: { children: ReactNode }) {
  const state = useWorkflowStatuses(
    DEFAULT_PROJECT_WORKFLOW_STATUSES,
    api.projectWorkflowStatuses,
    api.updateProjectWorkflowStatuses,
  );

  return (
    <ProjectWorkflowContext.Provider value={state}>{children}</ProjectWorkflowContext.Provider>
  );
}

export function useProjectWorkflow() {
  const context = useContext(ProjectWorkflowContext);
  if (!context) throw new Error('ProjectWorkflowProvider is required');
  return context;
}

export function projectWorkflowStatusCategory(
  id: string | null | undefined,
  statuses: ProjectWorkflowStatus[] = DEFAULT_PROJECT_WORKFLOW_STATUSES,
  fallback: ProjectStatus = 'planned',
): ProjectStatus {
  return statuses.find((status) => status.id === id)?.category ?? fallback;
}

export function projectWorkflowStatusLabel(
  id: string,
  statuses: ProjectWorkflowStatus[],
  translate: (key: string) => string,
): string {
  const status = statuses.find((entry) => entry.id === id);
  const defaultStatus = DEFAULT_PROJECT_WORKFLOW_STATUSES.find((entry) => entry.id === id);
  if (defaultStatus && status?.name === defaultStatus.name) {
    return translate(`projectStatus.${id}`);
  }
  return status?.name ?? translate(`projectStatus.${id}`);
}
