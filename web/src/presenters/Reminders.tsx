import { useEffect, useState } from 'react';
import { api } from '../api.ts';
import { patchIssueOptimistically } from '../application/issues.ts';
import { signals } from '../application/mediator.ts';
import type { Initiative, Issue, Project } from '../types.ts';

export type ReminderItem =
  | { kind: 'issue'; key: string; reminderAt: string; identifier: string; title: string }
  | { kind: 'initiative'; key: string; reminderAt: string; slug: string; title: string }
  | { kind: 'project'; key: string; reminderAt: string; slug: string; title: string };

export function useRemindersPresenter() {
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [timeZone, setTimeZone] = useState('UTC');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    try {
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load failed');
    } finally {
      setLoading(false);
    }
  }

  async function reload() {
    const [issues, initiatives, activeProjects, archivedProjects, workspace] = await Promise.all([
      api.issues(),
      api.initiatives(),
      api.projects(),
      api.projects(true),
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
    const projectReminders: ReminderItem[] = [...activeProjects, ...archivedProjects].flatMap(
      (project: Project) =>
        project.reminderAt
          ? [
              {
                kind: 'project' as const,
                key: `project:${project.slug}`,
                reminderAt: project.reminderAt,
                slug: project.slug,
                title: project.name,
              },
            ]
          : [],
    );
    setReminders(
      [...issueReminders, ...initiativeReminders, ...projectReminders].sort((a, b) =>
        a.reminderAt.localeCompare(b.reminderAt),
      ),
    );
    setTimeZone(workspace.timezone || 'UTC');
  }

  useEffect(() => {
    void load();
    const refresh = () => void load();
    signals.addEventListener('kotowari:refresh', refresh);
    return () => signals.removeEventListener('kotowari:refresh', refresh);
  }, []);

  async function clearReminder(item: ReminderItem) {
    if (item.kind === 'issue') {
      await patchIssueOptimistically(item.identifier, { reminderAt: null });
    } else if (item.kind === 'initiative') {
      await api.patchInitiative(item.slug, { clearReminder: true });
      signals.dispatchEvent(new Event('kotowari:refresh'));
    } else {
      await api.patchProject(item.slug, { clearReminder: true });
      signals.dispatchEvent(new Event('kotowari:refresh'));
    }
    await reload();
  }

  return {
    reminders,
    timeZone,
    error,
    loading,
    handlers: { onClearReminder: clearReminder, onRetry: load },
  };
}
