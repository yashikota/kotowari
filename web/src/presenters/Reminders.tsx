import { useEffect, useState } from 'react';
import { api } from '../api.ts';
import { patchIssueOptimistically } from '../application/issues.ts';
import { signals } from '../application/mediator.ts';
import type { Initiative, Issue } from '../types.ts';

export type ReminderItem =
  | { kind: 'issue'; key: string; reminderAt: string; identifier: string; title: string }
  | { kind: 'initiative'; key: string; reminderAt: string; slug: string; title: string };

export function useRemindersPresenter() {
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [timeZone, setTimeZone] = useState('UTC');
  const [error, setError] = useState('');

  async function reload() {
    const [issues, initiatives, workspace] = await Promise.all([
      api.issues(),
      api.initiatives(),
      api.workspace(),
    ]);
    const issueReminders: ReminderItem[] = issues.flatMap((issue: Issue) =>
      issue.reminderAt
        ? [
            {
              kind: 'issue' as const,
              key: `issue:${issue.identifier}`,
              reminderAt: issue.reminderAt,
              identifier: issue.identifier,
              title: issue.title,
            },
          ]
        : [],
    );
    const initiativeReminders: ReminderItem[] = initiatives.flatMap((initiative: Initiative) =>
      initiative.reminderAt
        ? [
            {
              kind: 'initiative' as const,
              key: `initiative:${initiative.slug}`,
              reminderAt: initiative.reminderAt,
              slug: initiative.slug,
              title: initiative.name,
            },
          ]
        : [],
    );
    setReminders(
      [...issueReminders, ...initiativeReminders].sort((a, b) =>
        a.reminderAt.localeCompare(b.reminderAt),
      ),
    );
    setTimeZone(workspace.timezone || 'UTC');
  }

  useEffect(() => {
    void reload().catch((e: unknown) => setError(e instanceof Error ? e.message : 'load failed'));
    const refresh = () => void reload().catch(() => undefined);
    signals.addEventListener('kotowari:refresh', refresh);
    return () => signals.removeEventListener('kotowari:refresh', refresh);
  }, []);

  async function clearReminder(item: ReminderItem) {
    if (item.kind === 'issue') {
      await patchIssueOptimistically(item.identifier, { reminderAt: null });
    } else {
      await api.patchInitiative(item.slug, { clearReminder: true });
      signals.dispatchEvent(new Event('kotowari:refresh'));
    }
    await reload();
  }

  return {
    reminders,
    timeZone,
    error,
    handlers: { onClearReminder: clearReminder },
  };
}
