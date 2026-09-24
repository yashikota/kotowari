import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from './api.ts';
import { signals } from './application/mediator.ts';
import type { ProjectStatus, ProjectWorkflowStatus } from './types.ts';

export const DEFAULT_PROJECT_WORKFLOW_STATUSES: ProjectWorkflowStatus[] = [
  { id: 'backlog', name: 'Backlog', category: 'backlog' },
  { id: 'planned', name: 'Planned', category: 'planned' },
  { id: 'started', name: 'In Progress', category: 'started' },
  { id: 'completed', name: 'Completed', category: 'completed' },
  { id: 'canceled', name: 'Canceled', category: 'canceled' },
];

type ProjectWorkflowContextValue = {
  statuses: ProjectWorkflowStatus[];
  updateStatuses: (statuses: ProjectWorkflowStatus[]) => Promise<void>;
};

const ProjectWorkflowContext = createContext<ProjectWorkflowContextValue>({
  statuses: DEFAULT_PROJECT_WORKFLOW_STATUSES,
  updateStatuses: async () => {},
});

export function ProjectWorkflowProvider({ children }: { children: ReactNode }) {
  const [statuses, setStatuses] = useState(DEFAULT_PROJECT_WORKFLOW_STATUSES);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      void api
        .projectWorkflowStatuses()
        .then((next) => {
          if (active && next.length >= DEFAULT_PROJECT_WORKFLOW_STATUSES.length) setStatuses(next);
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

  const updateStatuses = useCallback(async (next: ProjectWorkflowStatus[]) => {
    const saved = await api.updateProjectWorkflowStatuses(next);
    setStatuses(saved);
    signals.dispatchEvent(new Event('kotowari:refresh'));
  }, []);

  return (
    <ProjectWorkflowContext.Provider value={{ statuses, updateStatuses }}>
      {children}
    </ProjectWorkflowContext.Provider>
  );
}

export function useProjectWorkflow() {
  return useContext(ProjectWorkflowContext);
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
