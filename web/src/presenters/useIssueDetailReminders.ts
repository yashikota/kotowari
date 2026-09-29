import type * as React from 'react';
import { useState } from 'react';
import type { Cycle, Issue } from '../types.ts';

type ReminderPreset = 'hour' | 'tomorrow' | 'week' | 'month' | 'cycle';

type Props = {
  issue: Issue | null;
  cycles: Cycle[];
  patch: (body: Record<string, unknown>) => Promise<void>;
  setIssueOptionsOpen: (opened: boolean) => void;
};

export function useIssueDetailReminders({ issue, cycles, patch, setIssueOptionsOpen }: Props) {
  const [customReminderOpen, setCustomReminderOpen] = useState(false);
  const [customReminderValue, setCustomReminderValue] = useState('');
  const [reminderMenuOpen, setReminderMenuOpen] = useState(false);

  function reminderPreset(kind: ReminderPreset) {
    const now = new Date();
    const next = new Date(now);
    if (kind === 'hour') {
      next.setHours(next.getHours() + 1);
      next.setSeconds(0, 0);
    }
    if (kind === 'tomorrow') next.setDate(next.getDate() + 1);
    if (kind === 'week') {
      const daysToMonday = (8 - next.getDay()) % 7 || 7;
      next.setDate(next.getDate() + daysToMonday);
    }
    if (kind === 'month') next.setMonth(next.getMonth() + 1);
    if (kind === 'cycle') {
      const upcoming = cycles
        .filter((cycle) => new Date(cycle.startsAt) > now)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
      if (!upcoming) return;
      next.setTime(new Date(upcoming.startsAt).getTime());
    }
    if (kind !== 'hour') next.setHours(9, 0, 0, 0);
    return next;
  }

  async function setReminder(value: Date | null) {
    await patch({ reminderAt: value ? value.toISOString() : null });
    setCustomReminderOpen(false);
    setIssueOptionsOpen(false);
  }

  function formatLocalDateTime(value: string | null) {
    if (!value) return '';
    const date = new Date(value);
    const parts = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ];
    return `${parts[0]}-${parts[1]}-${parts[2]}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  return {
    data: { customReminderOpen, customReminderValue, reminderMenuOpen },
    handlers: {
      onSetReminder: (kind: ReminderPreset) => {
        const date = reminderPreset(kind);
        return date ? setReminder(date) : undefined;
      },
      onOpenCustomReminder: () => {
        setCustomReminderValue(
          formatLocalDateTime(issue?.reminderAt ?? null) ||
            formatLocalDateTime(new Date(Date.now() + 60 * 60 * 1000).toISOString()),
        );
        setCustomReminderOpen(true);
        setIssueOptionsOpen(false);
      },
      onCloseCustomReminder: () => setCustomReminderOpen(false),
      onOpenIssueReminderMenu: () => {
        setIssueOptionsOpen(true);
        setReminderMenuOpen(true);
      },
      onReminderMenuChange: (opened: boolean) => setReminderMenuOpen(opened),
      onIssueOptionsChange: (opened: boolean) => {
        setIssueOptionsOpen(opened);
        if (!opened) setReminderMenuOpen(false);
      },
      onCustomReminderChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setCustomReminderValue(e.target.value),
      onCustomReminderSave: () => {
        const value = new Date(customReminderValue);
        return Number.isNaN(value.getTime()) ? undefined : setReminder(value);
      },
      onClearReminder: () => setReminder(null),
    },
  };
}
