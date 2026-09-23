import { useLoaderData, useRouter } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { api } from '../api.ts';
import { signals } from '../application/mediator.ts';
import i18n from '../i18n/index.ts';
import type { IssueTemplate, RecurringIssue } from '../types.ts';

export function useTemplatesPagePresenter() {
  const initial = useLoaderData({ from: '/templates' }) as IssueTemplate[];
  const router = useRouter();
  const [templates, setTemplates] = useState(initial);
  const [error, setError] = useState('');

  async function reload() {
    setTemplates(await api.issueTemplates());
  }

  useEffect(() => setTemplates(initial), [initial]);
  useEffect(() => {
    const refresh = () => void reload().catch(() => undefined);
    signals.addEventListener('kotowari:refresh', refresh);
    return () => signals.removeEventListener('kotowari:refresh', refresh);
  }, []);

  async function deleteTemplate(template: IssueTemplate) {
    if (!window.confirm(i18n.t('templates.deleteConfirmation', { name: template.name }))) return;
    try {
      await api.deleteIssueTemplate(template.slug);
      await reload();
      await router.invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to delete template');
    }
  }

  return {
    templates,
    error,
    handlers: { onDelete: deleteTemplate },
  };
}

export function useRecurringIssuesPagePresenter() {
  const initial = useLoaderData({ from: '/recurring' }) as RecurringIssue[];
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [error, setError] = useState('');

  async function reload() {
    setItems(await api.recurringIssues());
  }

  useEffect(() => setItems(initial), [initial]);
  useEffect(() => {
    const refresh = () => void reload().catch(() => undefined);
    signals.addEventListener('kotowari:refresh', refresh);
    return () => signals.removeEventListener('kotowari:refresh', refresh);
  }, []);

  async function toggle(item: RecurringIssue) {
    try {
      await api.patchRecurringIssue(item.slug, { enabled: !item.enabled });
      await reload();
      await router.invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to update recurring issue');
    }
  }

  async function deleteSchedule(item: RecurringIssue) {
    if (!window.confirm(i18n.t('recurringIssues.deleteConfirmation', { name: item.name }))) return;
    try {
      await api.deleteRecurringIssue(item.slug);
      await reload();
      await router.invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to delete recurring schedule');
    }
  }

  return {
    items,
    error,
    handlers: { onToggle: toggle, onDelete: deleteSchedule },
  };
}
