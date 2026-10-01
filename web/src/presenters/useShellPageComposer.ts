import { useNavigate, useRouter } from '@tanstack/react-router';
import { useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { api } from '../api.ts';
import { useIntent, useIntentHandler } from '../application/Root.tsx';
import { isSubmitShortcut } from '../keymap.ts';

type PageCreateContext = { projectId?: number };

export function useShellPageComposer(setOpen: (open: boolean) => void) {
  const router = useRouter();
  const send = useIntent();
  const navigate = useNavigate();
  const [pageTitle, setPageTitle] = useState('');
  const [pageProjectId, setPageProjectId] = useState('');
  const [pageSubmitting, setPageSubmitting] = useState(false);
  const inFlight = useRef(false);

  function openCreatePage(context: PageCreateContext = {}) {
    if (inFlight.current) return;
    setPageTitle('');
    setPageProjectId(context.projectId ? String(context.projectId) : '');
    setOpen(true);
  }
  function closeCreatePage() {
    if (!inFlight.current) setOpen(false);
  }
  async function submitPage() {
    const title = pageTitle.trim();
    if (!title || inFlight.current) return;
    inFlight.current = true;
    setPageSubmitting(true);
    try {
      const slug =
        title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 48) || `page-${Date.now()}`;
      const page = await api.createPage({
        title,
        slug,
        projectId: pageProjectId ? Number(pageProjectId) : undefined,
      });
      setPageTitle('');
      setPageProjectId('');
      setOpen(false);
      await router.invalidate();
      await navigate({
        to: '/pages/$slug',
        params: { slug: page.slug },
        state: { autofocus: 'title' },
      });
    } finally {
      inFlight.current = false;
      setPageSubmitting(false);
    }
  }
  useIntentHandler('page.create', (value) => openCreatePage((value ?? {}) as PageCreateContext));
  useIntentHandler('submit:Page', submitPage);

  return {
    openCreatePage,
    closeCreatePage,
    data: { pageTitle, pageProjectId, pageSubmitting },
    handlers: {
      submitPage,
      onClick22: closeCreatePage,
      Page_project_onChange: (event: ChangeEvent<HTMLSelectElement>) =>
        setPageProjectId(event.currentTarget.value),
      Page_title_onChange24: (event: ChangeEvent<HTMLTextAreaElement>) =>
        setPageTitle(event.currentTarget.value),
      Page_title_onKeyDown25: (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.nativeEvent.isComposing || event.keyCode === 229) return;
        if (isSubmitShortcut(event)) {
          event.preventDefault();
          void send('submit:Page');
        }
      },
    },
  };
}
