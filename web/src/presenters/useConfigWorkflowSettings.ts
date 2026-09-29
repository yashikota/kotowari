import type * as React from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  IssueStatus,
  IssueWorkflowStatus,
  ProjectStatus,
  ProjectWorkflowStatus,
} from '../types.ts';
import { useIssueWorkflow } from '../workflow.tsx';
import { useProjectWorkflow } from '../project-workflow.tsx';

export function useConfigWorkflowSettings() {
  const { t } = useTranslation();
  const { statuses: issueWorkflowStatuses, updateStatuses: saveIssueWorkflowStatuses } =
    useIssueWorkflow();
  const { statuses: projectWorkflowStatuses, updateStatuses: saveProjectWorkflowStatuses } =
    useProjectWorkflow();
  const [workflowDraft, setWorkflowDraft] = useState(issueWorkflowStatuses);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [workflowCategory, setWorkflowCategory] = useState<IssueStatus>('in_progress');
  const [workflowError, setWorkflowError] = useState('');
  const [workflowSaved, setWorkflowSaved] = useState(false);
  const [projectWorkflowDraft, setProjectWorkflowDraft] = useState(projectWorkflowStatuses);
  const [projectWorkflowName, setProjectWorkflowName] = useState('');
  const [projectWorkflowDescription, setProjectWorkflowDescription] = useState('');
  const [projectWorkflowCategory, setProjectWorkflowCategory] = useState<ProjectStatus>('started');
  const [projectWorkflowFormOpen, setProjectWorkflowFormOpen] = useState(false);
  const [projectWorkflowError, setProjectWorkflowError] = useState('');
  const [projectWorkflowSaved, setProjectWorkflowSaved] = useState(false);

  useEffect(() => {
    setWorkflowDraft(issueWorkflowStatuses);
  }, [issueWorkflowStatuses]);

  useEffect(() => {
    setProjectWorkflowDraft(projectWorkflowStatuses);
  }, [projectWorkflowStatuses]);

  return {
    data: {
      issueWorkflowStatuses: workflowDraft,
      workflowError,
      workflowSaved,
      workflowDirty: JSON.stringify(workflowDraft) !== JSON.stringify(issueWorkflowStatuses),
      workflowName,
      workflowDescription,
      workflowCategory,
      projectWorkflowStatuses: projectWorkflowDraft,
      projectWorkflowName,
      projectWorkflowDescription,
      projectWorkflowCategory,
      projectWorkflowFormOpen,
      projectWorkflowError,
      projectWorkflowSaved,
      projectWorkflowDirty:
        JSON.stringify(projectWorkflowDraft) !== JSON.stringify(projectWorkflowStatuses),
    },
    handlers: {
      onWorkflowStatusNameChange: (id: string, name: string) => {
        setWorkflowSaved(false);
        setWorkflowDraft((current) =>
          current.map((status) => (status.id === id ? { ...status, name } : status)),
        );
      },
      onWorkflowStatusDescriptionChange: (id: string, description: string) => {
        setWorkflowSaved(false);
        setWorkflowDraft((current) =>
          current.map((status) => (status.id === id ? { ...status, description } : status)),
        );
      },
      onWorkflowNameChange: (event: React.ChangeEvent<HTMLInputElement>) =>
        setWorkflowName(event.target.value),
      onWorkflowDescriptionChange: (event: React.ChangeEvent<HTMLInputElement>) =>
        setWorkflowDescription(event.target.value),
      onWorkflowCategoryChange: (value: string | null) => {
        if (
          value === 'backlog' ||
          value === 'todo' ||
          value === 'in_progress' ||
          value === 'done' ||
          value === 'canceled'
        )
          setWorkflowCategory(value);
      },
      onSaveWorkflow: (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setWorkflowError('');
        setWorkflowSaved(false);
        void saveIssueWorkflowStatuses(workflowDraft)
          .then(() => setWorkflowSaved(true))
          .catch((error: unknown) =>
            setWorkflowError(
              error instanceof Error ? error.message : t('config.workflowSaveFailed'),
            ),
          );
      },
      onAddWorkflowStatus: (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const name = workflowName.trim();
        if (!name) {
          setWorkflowError(t('config.workflowNameRequired'));
          return;
        }
        const base = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 48);
        const idBase = base || `custom-status-${Date.now().toString(36)}`;
        const used = new Set(workflowDraft.map((status) => status.id));
        let id = idBase;
        for (let suffix = 2; used.has(id); suffix++) id = `${idBase.slice(0, 43)}-${suffix}`;
        const status: IssueWorkflowStatus = {
          id,
          name,
          category: workflowCategory,
          ...(workflowDescription.trim() ? { description: workflowDescription.trim() } : {}),
        };
        const next = [...workflowDraft, status];
        setWorkflowError('');
        setWorkflowSaved(false);
        void saveIssueWorkflowStatuses(next)
          .then(() => {
            setWorkflowDraft(next);
            setWorkflowName('');
            setWorkflowDescription('');
            setWorkflowSaved(true);
          })
          .catch((error: unknown) =>
            setWorkflowError(
              error instanceof Error ? error.message : t('config.workflowSaveFailed'),
            ),
          );
      },
      onDeleteWorkflowStatus: (id: string) => {
        const next = workflowDraft.filter((status) => status.id !== id);
        setWorkflowError('');
        setWorkflowSaved(false);
        void saveIssueWorkflowStatuses(next)
          .then(() => {
            setWorkflowDraft(next);
            setWorkflowSaved(true);
          })
          .catch((error: unknown) =>
            setWorkflowError(
              error instanceof Error ? error.message : t('config.workflowSaveFailed'),
            ),
          );
      },
      onProjectWorkflowStatusNameChange: (id: string, name: string) => {
        setProjectWorkflowSaved(false);
        setProjectWorkflowDraft((current) =>
          current.map((status) => (status.id === id ? { ...status, name } : status)),
        );
      },
      onProjectWorkflowStatusDescriptionChange: (id: string, description: string) => {
        setProjectWorkflowSaved(false);
        setProjectWorkflowDraft((current) =>
          current.map((status) => (status.id === id ? { ...status, description } : status)),
        );
      },
      onProjectWorkflowNameChange: (event: React.ChangeEvent<HTMLInputElement>) =>
        setProjectWorkflowName(event.target.value),
      onProjectWorkflowDescriptionChange: (event: React.ChangeEvent<HTMLInputElement>) =>
        setProjectWorkflowDescription(event.target.value),
      onOpenProjectWorkflowStatus: (category: ProjectStatus) => {
        setProjectWorkflowCategory(category);
        setProjectWorkflowName('');
        setProjectWorkflowDescription('');
        setProjectWorkflowError('');
        setProjectWorkflowFormOpen(true);
      },
      onCloseProjectWorkflowStatus: () => setProjectWorkflowFormOpen(false),
      onAddProjectWorkflowStatus: (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const name = projectWorkflowName.trim();
        if (!name) {
          setProjectWorkflowError(t('config.workflowNameRequired'));
          return;
        }
        const base = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 48);
        const idBase = base || `project-status-${Date.now().toString(36)}`;
        const used = new Set(projectWorkflowDraft.map((status) => status.id));
        let id = idBase;
        for (let suffix = 2; used.has(id); suffix++) id = `${idBase.slice(0, 43)}-${suffix}`;
        const status: ProjectWorkflowStatus = {
          id,
          name,
          category: projectWorkflowCategory,
          ...(projectWorkflowDescription.trim()
            ? { description: projectWorkflowDescription.trim() }
            : {}),
        };
        const next = [...projectWorkflowDraft, status];
        setProjectWorkflowError('');
        setProjectWorkflowSaved(false);
        void saveProjectWorkflowStatuses(next)
          .then(() => {
            setProjectWorkflowDraft(next);
            setProjectWorkflowName('');
            setProjectWorkflowDescription('');
            setProjectWorkflowFormOpen(false);
            setProjectWorkflowSaved(true);
          })
          .catch((error: unknown) =>
            setProjectWorkflowError(
              error instanceof Error ? error.message : t('config.projectWorkflowSaveFailed'),
            ),
          );
      },
      onDeleteProjectWorkflowStatus: (id: string) => {
        const next = projectWorkflowDraft.filter((status) => status.id !== id);
        setProjectWorkflowError('');
        setProjectWorkflowSaved(false);
        void saveProjectWorkflowStatuses(next)
          .then(() => {
            setProjectWorkflowDraft(next);
            setProjectWorkflowSaved(true);
          })
          .catch((error: unknown) =>
            setProjectWorkflowError(
              error instanceof Error ? error.message : t('config.projectWorkflowSaveFailed'),
            ),
          );
      },
      onSaveProjectWorkflow: (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setProjectWorkflowError('');
        setProjectWorkflowSaved(false);
        void saveProjectWorkflowStatuses(projectWorkflowDraft)
          .then(() => setProjectWorkflowSaved(true))
          .catch((error: unknown) =>
            setProjectWorkflowError(
              error instanceof Error ? error.message : t('config.projectWorkflowSaveFailed'),
            ),
          );
      },
    },
  };
}
