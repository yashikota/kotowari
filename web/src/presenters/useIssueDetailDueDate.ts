import type * as React from 'react';
import { useState } from 'react';
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
    onCloseIssueOptions();
    setDueDateValue(issue?.dueDate ?? '');
    setDueDateOpen(true);
  }

  async function saveDueDate(value: string | null) {
    await patch({ dueDate: value });
    setDueDateOpen(false);
    onCloseIssueOptions();
  }

  return {
    data: { dueDateOpen, dueDateValue },
    handlers: {
      onOpenDueDate: () => openDueDate(),
      onSetDueDatePreset: (kind: 'tomorrow' | 'week' | 'cycle') => {
        const value = dueDatePreset(kind);
        return value ? saveDueDate(value) : undefined;
      },
      onDueDateChange: (e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0]) =>
        setDueDateValue(e.target.value),
      onCloseDueDate: () => setDueDateOpen(false),
      onSaveDueDate: () => saveDueDate(dueDateValue || null),
      onClearDueDate: () => saveDueDate(null),
    },
  };
}
