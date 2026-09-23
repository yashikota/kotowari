import { useLoaderData, useNavigate, useParams, useRouter } from '@tanstack/react-router';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import { api } from '../api.ts';
import i18n from '../i18n/index.ts';
import type { Page, Project } from '../types.ts';

export function usePagesPagePresenter() {
  const pages = useLoaderData({ from: '/pages' }) as Page[];
  return { _view: 0 as const, pages, handlers: {} };
}

export function usePageDetailPagePresenter() {
  const { slug } = useParams({ from: '/pages/$slug' });
  const initial = useLoaderData({ from: '/pages/$slug' }) as Page;
  const router = useRouter();
  const navigate = useNavigate();
  const [page, setPage] = useState(initial);
  const [pages, setPages] = useState<Page[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tagDraft, setTagDraft] = useState(initial.tags.join(', '));

  useEffect(() => {
    setPage(initial);
    setTagDraft(initial.tags.join(', '));
  }, [initial]);

  useEffect(() => {
    void Promise.all([api.pages(), api.projects()]).then(([all, proj]) => {
      setPages(all);
      setProjects(proj);
    });
  }, [slug]);

  async function save(body: Record<string, unknown>) {
    const next = await api.patchPage(slug, body);
    setPage(next);
    await router.invalidate();
  }

  return {
    _view: 0 as const,
    slug,
    page,
    pages,
    projects,
    tagDraft,
    handlers: {
      Page_status_onChange0: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => save({ status: e.target.value }),
      onClick1: () => {
        if (!window.confirm(i18n.t('ui.deletePageConfirmation', { slug: page.slug }))) {
          return;
        }
        return api.deletePage(slug).then(async () => {
          await router.invalidate();
          await navigate({ to: '/pages' });
        });
      },
      Page_title_onChange2: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setPage({ ...page, title: e.target.value }),
      Page_title_onBlur3: () => save({ title: page.title }),
      Parent_page_onChange4: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) =>
        save({
          parentId: e.target.value ? Number(e.target.value) : null,
        }),
      Page_project_onChange5: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) =>
        save({
          projectId: e.target.value ? Number(e.target.value) : null,
        }),
      Document_date_onChange6: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => save({ date: e.target.value ? e.target.value : null }),
      Tags_onChange7: (e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0]) =>
        setTagDraft(e.target.value),
      Tags_onBlur8: () =>
        save({
          tags: tagDraft
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        }),
    },
  };
}
