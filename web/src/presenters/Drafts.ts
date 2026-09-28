import { useEffect, useState } from 'react';
import { useIntent } from '../application/Root.tsx';
import { ISSUE_DRAFTS_EVENT, listIssueDrafts } from '../issue-drafts.ts';

export function useDraftsPresenter() {
  const send = useIntent();
  const [drafts, setDrafts] = useState(listIssueDrafts);

  useEffect(() => {
    const refresh = () => setDrafts(listIssueDrafts());
    window.addEventListener(ISSUE_DRAFTS_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(ISSUE_DRAFTS_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return {
    drafts,
    handlers: {
      onOpenDraft: (id: string) => {
        const draft = drafts.find((candidate) => candidate.id === id);
        if (draft) send('issue.openDraft', draft);
      },
      onRequestDiscardDraft: (id: string) =>
        send('issue.requestDiscardDraft', { kind: 'draft', id }),
      onRequestDiscardAll: () => send('issue.requestDiscardDraft', { kind: 'all' }),
    },
  };
}
