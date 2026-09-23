import { useEffect, useState } from 'react';
import { api } from '../api.ts';
import { signals } from '../application/mediator.ts';
import type { Issue } from '../types.ts';

export function useRemindersPresenter() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [timeZone, setTimeZone] = useState('UTC');
  const [error, setError] = useState('');

  async function reload() {
    const [all, workspace] = await Promise.all([api.issues(), api.workspace()]);
    setIssues(
      all
        .filter((issue) => issue.reminderAt)
        .sort((a, b) => a.reminderAt!.localeCompare(b.reminderAt!)),
    );
    setTimeZone(workspace.timezone || 'UTC');
  }

  useEffect(() => {
    void reload().catch((e: unknown) => setError(e instanceof Error ? e.message : 'load failed'));
    const refresh = () => void reload().catch(() => undefined);
    signals.addEventListener('kotowari:refresh', refresh);
    return () => signals.removeEventListener('kotowari:refresh', refresh);
  }, []);

  async function clearReminder(identifier: string) {
    await api.patchIssue(identifier, { reminderAt: null });
    await reload();
  }

  return {
    issues,
    timeZone,
    error,
    handlers: { onClearReminder: clearReminder },
  };
}
