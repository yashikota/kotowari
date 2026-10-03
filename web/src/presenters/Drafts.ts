import { useCallback, useEffect, useState } from 'react';
import { useIntent } from '../application/Root.tsx';
import { ISSUE_DRAFTS_EVENT, readIssueDrafts } from '../issue-drafts.ts';

export function useDraftsPresenter() {
  const send = useIntent();
  const [state, setState] = useState(readIssueDrafts);
  const { drafts, error } = state;
  const refresh = useCallback(() => {
    const next = readIssueDrafts();
    setState((current) => (next.error ? { ...current, error: next.error } : next));
  }, []);

  useEffect(() => {
    window.addEventListener(ISSUE_DRAFTS_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(ISSUE_DRAFTS_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [refresh]);

  return {
    drafts,
    error,
    handlers: {
      onRetry: refresh,
      onOpenDraft: (id: string) => {
        if (error) return;
        const draft = drafts.find((candidate) => candidate.id === id);
        if (draft) send('issue.openDraft', draft);
      },
      onRequestDiscardDraft: (id: string) =>
        !error && send('issue.requestDiscardDraft', { kind: 'draft', id }),
      onRequestDiscardAll: () => !error && send('issue.requestDiscardDraft', { kind: 'all' }),
    },
  };
}
