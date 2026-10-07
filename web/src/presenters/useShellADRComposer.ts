import { useNavigate } from '@tanstack/react-router';
import { useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { api } from '../api.ts';
import { useRetriableCreation } from './useRetriableCreation.ts';
import { useIntent, useIntentHandler } from '../application/Root.tsx';
import { isSubmitShortcut } from '../keymap.ts';

type Context = {
  title?: string;
  issueNumber?: number;
  issueNumbers?: number[];
  projectSlug?: string | null;
  supersedes?: number;
};

export function useShellADRComposer(setOpen: (open: boolean) => void) {
  const navigate = useNavigate();
  const send = useIntent();
  const [context, setContext] = useState<Context>({});
  const [adrTitle, setAdrTitle] = useState('');
  const creation = useRetriableCreation({
    create: api.createADR,
    open: (adr) =>
      navigate({
        to: '/adrs/$identifier',
        params: { identifier: adr.identifier },
        state: { autofocus: 'title' },
      }),
  });
  const contextKey = useRef('');
  function openCreateADR(next: Context = {}) {
    if (creation.isPending()) return;
    const key = JSON.stringify(next);
    if (contextKey.current !== key) {
      contextKey.current = key;
      setAdrTitle(next.title ?? '');
      creation.reset();
    }
    setContext(next);
    setOpen(true);
  }
  function closeCreateADR() {
    if (!creation.isPending()) setOpen(false);
  }
  async function submitADR() {
    const title = adrTitle.trim();
    if ((!title && !creation.hasCreated()) || creation.isPending()) return;
    const opened = await creation.submit({
      title,
      supersedes: context.supersedes,
      projectSlug: context.projectSlug,
      issueNumbers: context.issueNumbers ?? (context.issueNumber ? [context.issueNumber] : []),
    });
    if (opened) {
      setOpen(false);
      setAdrTitle('');
      contextKey.current = '';
    }
  }
  useIntentHandler('adr.create', (value) => openCreateADR((value ?? {}) as Context));
  useIntentHandler('submit:ADR', submitADR);
  return {
    openCreateADR,
    closeCreateADR,
    data: {
      adrTitle,
      adrSubmitting: creation.submitting,
      adrCreateError: creation.error,
      adrCreated: creation.created,
      adrLinkIssue: context.issueNumber,
      adrSupersedes: context.supersedes,
    },
    handlers: {
      submitADR,
      onClick18: closeCreateADR,
      ADR_title_onChange20: (event: ChangeEvent<HTMLTextAreaElement>) => {
        if (creation.isPending() || creation.hasCreated()) return;
        setAdrTitle(event.currentTarget.value);
        creation.invalidate();
      },
      ADR_title_onKeyDown21: (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.nativeEvent.isComposing || event.keyCode === 229) return;
        if (isSubmitShortcut(event)) {
          event.preventDefault();
          return send('submit:ADR');
        }
      },
    },
  };
}
