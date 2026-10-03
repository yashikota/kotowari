import { useState } from 'react';
import { useReminderEditor } from './useReminderEditor.ts';
import type { Cycle, Issue } from '../types.ts';

import { reminderPreset, type ReminderPreset } from '../reminder-dates.ts';

type Props = {
  issue: Issue | null;
  cycles: Cycle[];
  patch: (body: Record<string, unknown>) => Promise<void>;
  setIssueOptionsOpen: (opened: boolean) => void;
};

export function useIssueDetailReminders({ issue, cycles, patch, setIssueOptionsOpen }: Props) {
  const editor = useReminderEditor({
    entityKey: issue?.identifier ?? '',
    reminderAt: issue?.reminderAt,
    save: async (value) => {
      await patch({ reminderAt: value ? value.toISOString() : null });
    },
    onSuccess: () => setIssueOptionsOpen(false),
  });
  const [reminderMenuOpen, setReminderMenuOpen] = useState(false);

  return {
    data: { reminderEditor: editor.data, reminderMenuOpen },
    handlers: {
      onSetReminder: (kind: ReminderPreset) => {
        const date = reminderPreset(kind, cycles);
        return date ? editor.write(date) : undefined;
      },
      onOpenCustomReminder: () => {
        editor.open();
        setIssueOptionsOpen(false);
      },
      onCloseCustomReminder: editor.close,
      onOpenIssueReminderMenu: () => {
        setIssueOptionsOpen(true);
        setReminderMenuOpen(true);
      },
      onReminderMenuChange: (opened: boolean) => setReminderMenuOpen(opened),
      onIssueOptionsChange: (opened: boolean) => {
        setIssueOptionsOpen(opened);
        if (!opened) setReminderMenuOpen(false);
      },
      onCustomReminderChange: (value: string) => editor.change(value),
      onCustomReminderSave: editor.submit,
      onRetryReminder: editor.retry,
      onClearReminder: () => editor.write(null),
    },
  };
}
