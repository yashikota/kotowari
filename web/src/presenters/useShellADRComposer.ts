import { useNavigate } from '@tanstack/react-router';
import { useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { api } from '../api.ts';
import type { ADR } from '../types.ts';
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
  const [adrSubmitting, setSubmitting] = useState(false);
  const [adrCreateError, setError] = useState('');
  const [adrCreated, setCreated] = useState(false);
  const inFlight = useRef(false);
  const created = useRef<ADR | null>(null);
  const contextKey = useRef('');
  function openCreateADR(next: Context = {}) {
    if (inFlight.current) return;
    const key = JSON.stringify(next);
    if (contextKey.current !== key) {
      contextKey.current = key;
      setAdrTitle(next.title ?? '');
      created.current = null;
      setCreated(false);
      setError('');
    }
    setContext(next);
    setOpen(true);
  }
  function closeCreateADR() {
    if (!inFlight.current) setOpen(false);
  }
  async function submitADR() {
    const title = adrTitle.trim();
    if ((!title && !created.current) || inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setError('');
    try {
      if (!created.current) {
        created.current = await api.createADR({
          title,
          supersedes: context.supersedes,
          projectSlug: context.projectSlug,
          issueNumbers: context.issueNumbers ?? (context.issueNumber ? [context.issueNumber] : []),
        });
        setCreated(true);
      }
      await navigate({
        to: '/adrs/$identifier',
        params: { identifier: created.current.identifier },
        state: { autofocus: 'title' },
      });
      setOpen(false);
      setAdrTitle('');
      contextKey.current = '';
      created.current = null;
      setCreated(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }
  useIntentHandler('adr.create', (value) => openCreateADR((value ?? {}) as Context));
  useIntentHandler('submit:ADR', submitADR);
  return {
    openCreateADR,
    closeCreateADR,
    data: {
      adrTitle,
      adrSubmitting,
      adrCreateError,
      adrCreated,
      adrLinkIssue: context.issueNumber,
      adrSupersedes: context.supersedes,
    },
    handlers: {
      submitADR,
      onClick18: closeCreateADR,
      ADR_title_onChange20: (event: ChangeEvent<HTMLTextAreaElement>) => {
        if (inFlight.current || created.current) return;
        setAdrTitle(event.currentTarget.value);
        setError('');
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
