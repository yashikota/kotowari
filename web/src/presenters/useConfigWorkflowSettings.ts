import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  IssueStatus,
  IssueWorkflowStatus,
  ProjectStatus,
  ProjectWorkflowStatus,
} from '../types.ts';
import { useIssueWorkflow } from '../workflow.tsx';
import { useProjectWorkflow } from '../project-workflow.tsx';

function useWorkflowWrite<T>(
  statuses: T[],
  update: (next: T[]) => Promise<void>,
  fallback: string,
) {
  const pending = useRef(false);
  const dirty = useRef(false);
  const retry = useRef<(() => Promise<void>) | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState(statuses);
  useEffect(() => {
    if (!pending.current && !dirty.current) setDraft(statuses);
  }, [statuses]);
  const write = async (next: T[], onSuccess: () => void = () => {}) => {
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    setError('');
    setSaved(false);
    retry.current = () => write(next, onSuccess);
    try {
      await update(next);
      dirty.current = false;
      setDraft(next);
      onSuccess();
      setSaved(true);
      retry.current = null;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : fallback);
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };
  const edit = (change: React.SetStateAction<T[]>) => {
    if (pending.current) return;
    dirty.current = true;
    setSaved(false);
    setError('');
    retry.current = null;
    setDraft(change);
  };
  return {
    draft,
    edit,
    error,
    setError,
    saved,
    setSaved,
    saving,
    pending,
    write,
    retry: () => retry.current?.(),
  };
}

export function useConfigWorkflowSettings() {
  const { t } = useTranslation();
  const { statuses: issueWorkflowStatuses, updateStatuses: saveIssueWorkflowStatuses } =
    useIssueWorkflow();
  const { statuses: projectWorkflowStatuses, updateStatuses: saveProjectWorkflowStatuses } =
    useProjectWorkflow();
  const issueWrite = useWorkflowWrite(
    issueWorkflowStatuses,
    saveIssueWorkflowStatuses,
    t('config.workflowSaveFailed'),
  );
  const {
    draft: workflowDraft,
    edit: setWorkflowDraft,
    error: workflowError,
    setError: setWorkflowError,
    saved: workflowSaved,
    setSaved: setWorkflowSaved,
  } = issueWrite;
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [workflowCategory, setWorkflowCategory] = useState<IssueStatus>('in_progress');
  const projectWrite = useWorkflowWrite(
    projectWorkflowStatuses,
    saveProjectWorkflowStatuses,
    t('config.projectWorkflowSaveFailed'),
  );
  const {
    draft: projectWorkflowDraft,
    edit: setProjectWorkflowDraft,
    error: projectWorkflowError,
    setError: setProjectWorkflowError,
    saved: projectWorkflowSaved,
    setSaved: setProjectWorkflowSaved,
  } = projectWrite;
  const [projectWorkflowName, setProjectWorkflowName] = useState('');
  const [projectWorkflowDescription, setProjectWorkflowDescription] = useState('');
  const [projectWorkflowCategory, setProjectWorkflowCategory] = useState<ProjectStatus>('started');
  const [projectWorkflowFormOpen, setProjectWorkflowFormOpen] = useState(false);
  return {
    data: {
      issueWorkflowStatuses: workflowDraft,
      workflowSaving: issueWrite.saving,
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
      projectWorkflowSaving: projectWrite.saving,
      projectWorkflowError,
      projectWorkflowSaved,
      projectWorkflowDirty:
        JSON.stringify(projectWorkflowDraft) !== JSON.stringify(projectWorkflowStatuses),
    },
    handlers: {
      onRetryWorkflow: issueWrite.retry,
      onRetryProjectWorkflow: projectWrite.retry,
      onWorkflowStatusNameChange: (id: string, name: string) => {
        if (issueWrite.pending.current) return;
        setWorkflowSaved(false);
        setWorkflowDraft((current) =>
          current.map((status) => (status.id === id ? { ...status, name } : status)),
        );
      },
      onWorkflowStatusDescriptionChange: (id: string, description: string) => {
        if (issueWrite.pending.current) return;
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
        if (issueWrite.pending.current) return;
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
        if (issueWrite.pending.current) return;
        setWorkflowError('');
        setWorkflowSaved(false);
        void issueWrite.write(workflowDraft, () => setWorkflowSaved(true));
      },
      onAddWorkflowStatus: (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (issueWrite.pending.current) return;
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
        void issueWrite.write(next, () => {
          setWorkflowName('');
          setWorkflowDescription('');
          setWorkflowSaved(true);
        });
      },
      onDeleteWorkflowStatus: (id: string) => {
        if (issueWrite.pending.current) return;
        const next = workflowDraft.filter((status) => status.id !== id);
        setWorkflowError('');
        setWorkflowSaved(false);
        void issueWrite.write(next, () => {
          setWorkflowSaved(true);
        });
      },
      onProjectWorkflowStatusNameChange: (id: string, name: string) => {
        if (projectWrite.pending.current) return;
        setProjectWorkflowSaved(false);
        setProjectWorkflowDraft((current) =>
          current.map((status) => (status.id === id ? { ...status, name } : status)),
        );
      },
      onProjectWorkflowStatusDescriptionChange: (id: string, description: string) => {
        if (projectWrite.pending.current) return;
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
        if (projectWrite.pending.current) return;
        setProjectWorkflowCategory(category);
        setProjectWorkflowName('');
        setProjectWorkflowDescription('');
        setProjectWorkflowError('');
        setProjectWorkflowFormOpen(true);
      },
      onCloseProjectWorkflowStatus: () => {
        if (!projectWrite.pending.current) setProjectWorkflowFormOpen(false);
      },
      onAddProjectWorkflowStatus: (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (projectWrite.pending.current) return;
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
        void projectWrite.write(next, () => {
          setProjectWorkflowName('');
          setProjectWorkflowDescription('');
          setProjectWorkflowFormOpen(false);
          setProjectWorkflowSaved(true);
        });
      },
      onDeleteProjectWorkflowStatus: (id: string) => {
        if (projectWrite.pending.current) return;
        const next = projectWorkflowDraft.filter((status) => status.id !== id);
        setProjectWorkflowError('');
        setProjectWorkflowSaved(false);
        void projectWrite.write(next, () => {
          setProjectWorkflowSaved(true);
        });
      },
      onSaveProjectWorkflow: (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (projectWrite.pending.current) return;
        setProjectWorkflowError('');
        setProjectWorkflowSaved(false);
        void projectWrite.write(projectWorkflowDraft, () => setProjectWorkflowSaved(true));
      },
    },
  };
}
