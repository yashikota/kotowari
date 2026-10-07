import { useNavigate } from '@tanstack/react-router';
import { useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { api } from '../api.ts';
import { useIntent, useIntentHandler } from '../application/Root.tsx';
import { isSubmitShortcut } from '../keymap.ts';
import { useRetriableCreation } from './useRetriableCreation.ts';

type PageCreateContext = { projectId?: number };

export function useShellPageComposer(setOpen: (open: boolean) => void) {
  const send = useIntent();
  const navigate = useNavigate();
  const [pageTitle, setPageTitle] = useState('');
  const [pageProjectId, setPageProjectId] = useState('');
  const contextKey = useRef('');
  const creation = useRetriableCreation({
    create: api.createPage,
    open: (page) =>
      navigate({ to: '/pages/$slug', params: { slug: page.slug }, state: { autofocus: 'title' } }),
  });

  function openCreatePage(context: PageCreateContext = {}) {
    if (creation.isPending()) return;
    const key = String(context.projectId ?? '');
    if (contextKey.current !== key) {
      setPageTitle('');
      setPageProjectId(context.projectId ? String(context.projectId) : '');
      creation.reset();
    }
    contextKey.current = key;
    setOpen(true);
  }
  function closeCreatePage() {
    if (!creation.isPending()) setOpen(false);
  }
  async function submitPage() {
    const title = pageTitle.trim();
    if ((!title && !creation.hasCreated()) || creation.isPending()) return;
    const slug =
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 48) || `page-${Date.now()}`;
    const opened = await creation.submit({
      title,
      slug,
      projectId: pageProjectId ? Number(pageProjectId) : undefined,
    });
    if (opened) {
      setPageTitle('');
      setPageProjectId('');
      setOpen(false);
      contextKey.current = '';
    }
  }
  useIntentHandler('page.create', (value) => openCreatePage((value ?? {}) as PageCreateContext));
  useIntentHandler('submit:Page', submitPage);

  return {
    openCreatePage,
    closeCreatePage,
    data: {
      pageTitle,
      pageProjectId,
      pageSubmitting: creation.submitting,
      pageCreateError: creation.error,
      pageCreated: creation.created,
    },
    handlers: {
      submitPage,
      onClick22: closeCreatePage,
      Page_project_onChange: (event: ChangeEvent<HTMLSelectElement>) => {
        if (creation.isPending() || creation.hasCreated()) return;
        setPageProjectId(event.currentTarget.value);
        creation.invalidate();
      },
      Page_title_onChange24: (event: ChangeEvent<HTMLTextAreaElement>) => {
        if (creation.isPending() || creation.hasCreated()) return;
        setPageTitle(event.currentTarget.value);
        creation.invalidate();
      },
      Page_title_onKeyDown25: (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.nativeEvent.isComposing || event.keyCode === 229) return;
        if (isSubmitShortcut(event)) {
          event.preventDefault();
          return send('submit:Page');
        }
      },
    },
  };
}
