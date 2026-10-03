import { useRetriableSave } from './useRetriableSave.ts';
import { useEffect, useState } from 'react';
import type { Cycle, Issue } from '../types.ts';

type Props = {
  issue: Issue | null;
  cycles: Cycle[];
  patch: (body: Record<string, unknown>) => Promise<void>;
  onCloseIssueOptions: () => void;
};

export function useIssueDetailDueDate({ issue, cycles, patch, onCloseIssueOptions }: Props) {
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [dueDateValue, setDueDateValue] = useState('');
  const [dueDateClearing, setDueDateClearing] = useState(false);
  const mutation = useRetriableSave<string | null>({
    scope: issue?.identifier ?? '',
    save: async (value) => {
      await patch({ dueDate: value });
    },
    onSuccess: () => {
      setDueDateOpen(false);
      onCloseIssueOptions();
    },
    onFailure: (value) => {
      if (value !== null) setDueDateValue(value);
      setDueDateOpen(true);
      onCloseIssueOptions();
    },
  });
  useEffect(() => {
    setDueDateOpen(false);
    setDueDateValue('');
    setDueDateClearing(false);
  }, [issue?.identifier]);

  function localDateValue(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function dueDatePreset(kind: 'tomorrow' | 'week' | 'cycle') {
    const date = new Date();
    if (kind === 'cycle') {
      const nextCycle = cycles
        .filter((cycle) => new Date(cycle.startsAt) > date)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
      return nextCycle?.endsAt.slice(0, 10) ?? null;
    }
    date.setDate(date.getDate() + (kind === 'tomorrow' ? 1 : 7));
    return localDateValue(date);
  }

  function openDueDate() {
    if (mutation.isPending()) return;
    mutation.invalidate();
    setDueDateClearing(false);
    onCloseIssueOptions();
    setDueDateValue(issue?.dueDate ?? '');
    setDueDateOpen(true);
  }

  function saveDueDate(value: string | null) {
    if (mutation.isPending()) return;
    setDueDateClearing(value === null);
    return mutation.write(value);
  }

  return {
    data: {
      dueDateOpen,
      dueDateValue,
      dueDateClearing,
      dueDateSaving: mutation.saving,
      dueDateError: mutation.error,
    },
    handlers: {
      onOpenDueDate: () => openDueDate(),
      onSetDueDatePreset: (kind: 'tomorrow' | 'week' | 'cycle') => {
        const value = dueDatePreset(kind);
        return value ? saveDueDate(value) : undefined;
      },
      onDueDateChange: (value: string) => {
        if (!mutation.isPending()) {
          setDueDateValue(value);
          mutation.invalidate();
        }
      },
      onCloseDueDate: () => {
        if (!mutation.isPending()) setDueDateOpen(false);
      },
      onSaveDueDate: () => (dueDateValue ? saveDueDate(dueDateValue) : undefined),
      onRetryDueDate: mutation.retry,
      onClearDueDate: () => saveDueDate(null),
    },
  };
}
