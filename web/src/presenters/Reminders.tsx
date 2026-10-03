import { useEffect, useRef, useState } from 'react';
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
  const [dismissStates, setDismissStates] = useState<
    Record<string, { saving: boolean; error: string }>
  >({});
  const pending = useRef(new Set<string>());
  const active = useRef(false);
  const revision = useRef(0);
  const readRevision = useRef(0);

  async function load() {
    if (pending.current.size) return;
    const read = ++readRevision.current;
    const version = revision.current;
    setLoading(true);
    setError('');
    try {
      await reload(read, version);
    } catch (e) {
      if (active.current && read === readRevision.current && version === revision.current)
        setError(e instanceof Error ? e.message : 'load failed');
    } finally {
      if (active.current && read === readRevision.current && version === revision.current)
        setLoading(false);
    }
  }

  async function reload(read: number, version: number) {
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
    if (!active.current || read !== readRevision.current || version !== revision.current) return;
    setReminders(
      [...issueReminders, ...initiativeReminders, ...projectReminders].sort((a, b) =>
        a.reminderAt.localeCompare(b.reminderAt),
      ),
    );
    setTimeZone(workspace.timezone || 'UTC');
  }

  useEffect(() => {
    active.current = true;
    void load();
    const refresh = () => void load();
    signals.addEventListener('kotowari:refresh', refresh);
    return () => {
      active.current = false;
      revision.current++;
      signals.removeEventListener('kotowari:refresh', refresh);
    };
  }, []);

  async function clearReminder(item: ReminderItem) {
    if (pending.current.has(item.key)) return;
    pending.current.add(item.key);
    revision.current++;
    setLoading(false);
    setDismissStates((current) => ({ ...current, [item.key]: { saving: true, error: '' } }));
    try {
      if (item.kind === 'issue')
        await patchIssueOptimistically(item.identifier, { reminderAt: null });
      else if (item.kind === 'initiative')
        await api.patchInitiative(item.slug, { clearReminder: true });
      else await api.patchProject(item.slug, { clearReminder: true });
      if (!active.current) return;
      setReminders((current) => current.filter((entry) => entry.key !== item.key));
      setDismissStates((current) => {
        const next = { ...current };
        delete next[item.key];
        return next;
      });
    } catch (cause) {
      if (active.current)
        setDismissStates((current) => ({
          ...current,
          [item.key]: {
            saving: false,
            error: cause instanceof Error ? cause.message : String(cause),
          },
        }));
    } finally {
      pending.current.delete(item.key);
      revision.current++;
      if (active.current && !pending.current.size)
        signals.dispatchEvent(new Event('kotowari:refresh'));
    }
  }

  return {
    reminders,
    timeZone,
    error,
    loading,
    dismissStates,
    handlers: {
      onClearReminder: clearReminder,
      onRetry: async () => {
        await load();
        signals.dispatchEvent(new Event('kotowari:refresh'));
      },
    },
  };
}
