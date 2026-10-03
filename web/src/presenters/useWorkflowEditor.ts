import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

type WorkflowStatus<Category extends string> = {
  id: string;
  name: string;
  category: Category;
  description?: string;
};

/** One transaction model for editing, adding and removing workflow statuses. */
export function useWorkflowEditor<Category extends string>(
  source: WorkflowStatus<Category>[],
  update: (next: WorkflowStatus<Category>[]) => Promise<WorkflowStatus<Category>[]>,
  initialCategory: Category,
  idPrefix: string,
  messages: { nameRequired: string; saveFailed: string },
) {
  const pending = useRef(false);
  const draftDirty = useRef(false);
  const failedAttempt = useRef<(() => Promise<void>) | null>(null);
  const [statuses, setStatuses] = useState(source);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [formOpen, setFormOpen] = useState(false);
  const [nameError, setNameError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!pending.current && !draftDirty.current) setStatuses(source);
  }, [source]);

  const clearFeedback = () => {
    setSaved(false);
    setError('');
    failedAttempt.current = null;
  };
  const write = async (next: WorkflowStatus<Category>[], onSuccess?: () => void) => {
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    clearFeedback();
    try {
      const confirmed = await update(next);
      draftDirty.current = false;
      setStatuses(confirmed);
      onSuccess?.();
      setSaved(true);
    } catch (cause) {
      failedAttempt.current = () => write(next, onSuccess);
      setError(cause instanceof Error ? cause.message : messages.saveFailed);
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };
  const editStatus = (
    id: string,
    changes: Partial<Pick<WorkflowStatus<Category>, 'name' | 'description'>>,
  ) => {
    if (pending.current) return;
    const next = statuses.map((status) => (status.id === id ? { ...status, ...changes } : status));
    draftDirty.current = JSON.stringify(next) !== JSON.stringify(source);
    clearFeedback();
    setStatuses(next);
  };
  const changeName = (value: string) => {
    if (pending.current) return;
    clearFeedback();
    setNameError('');
    setName(value);
  };
  const changeDescription = (value: string) => {
    if (pending.current) return;
    clearFeedback();
    setDescription(value);
  };
  const changeCategory = (value: Category) => {
    if (pending.current) return;
    clearFeedback();
    setCategory(value);
  };
  const resetCreation = () => {
    setName('');
    setDescription('');
    setNameError('');
    setFormOpen(false);
  };
  return {
    data: {
      statuses,
      name,
      description,
      category,
      formOpen,
      nameError,
      saving,
      saved,
      error,
      dirty: JSON.stringify(statuses) !== JSON.stringify(source),
    },
    handlers: {
      changeName,
      changeDescription,
      changeCategory,
      editStatus,
      open: (value: Category) => {
        if (pending.current) return;
        clearFeedback();
        setCategory(value);
        setFormOpen(true);
      },
      close: () => {
        if (pending.current) return;
        clearFeedback();
        resetCreation();
      },
      save: (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        return write(statuses);
      },
      add: (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (pending.current) return;
        const trimmedName = name.trim();
        if (!trimmedName) {
          clearFeedback();
          setNameError(messages.nameRequired);
          return;
        }
        const slug = trimmedName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 48);
        const base = slug || `${idPrefix}-${Date.now().toString(36)}`;
        const used = new Set(statuses.map((status) => status.id));
        let id = base;
        for (let suffix = 2; used.has(id); suffix++) id = `${base.slice(0, 43)}-${suffix}`;
        const next = [
          ...statuses,
          {
            id,
            name: trimmedName,
            category,
            ...(description.trim() ? { description: description.trim() } : {}),
          },
        ];
        return write(next, resetCreation);
      },
      remove: (id: string) => write(statuses.filter((status) => status.id !== id)),
      retry: () => failedAttempt.current?.(),
    },
  };
}
