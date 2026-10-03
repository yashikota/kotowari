import { useRetriableSave } from './useRetriableSave.ts';
import { useLoaderData, useNavigate, useParams, useRouter } from '@tanstack/react-router';
import type * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalStorage } from '@mantine/hooks';
import { api } from '../api.ts';
import i18n from '../i18n/index.ts';
import { useIntent } from '../application/Root.tsx';
import {
  groupPageList,
  DEFAULT_DOCUMENT_DISPLAY,
  parseDocumentDisplay,
  type DocumentDisplay,
  type PageListOrder,
} from '../page-list.ts';
import type { DocumentDateFilter } from '../date-filter.ts';
import type { Page, Project } from '../types.ts';

export function usePagesPagePresenter() {
  const { pages, projects } = useLoaderData({ from: '/pages' }) as {
    pages: Page[];
    projects: Project[];
  };
  const sendIntent = useIntent();
  const [query, setQuery] = useState('');
  const [displayOptionsOpen, setDisplayOptionsOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<DocumentDateFilter>({
    field: 'createdAt',
    range: 'all',
    from: '',
    to: '',
  });
  const [display, setDisplay] = useLocalStorage<DocumentDisplay>({
    key: 'kotowari.document-display',
    defaultValue: DEFAULT_DOCUMENT_DISPLAY,
    deserialize: parseDocumentDisplay,
  });
  const { grouping, order, direction, showCreated, showUpdated, showInactive, onlyMyProjects } =
    display;
  const [projectFilter, setProjectFilter] = useState('all');
  return {
    _view: 0 as const,
    pages,
    rows: groupPageList(pages, projects, {
      query,
      order,
      direction,
      grouping,
      projectFilter,
      dateFilter,
      showInactive,
      onlyMyProjects,
    }),
    projects,
    grouping,
    projectFilter,
    dateFilter,
    query,
    order,
    direction,
    showCreated,
    showUpdated,
    showInactive,
    onlyMyProjects,
    displayOptionsOpen,
    handlers: {
      onOnlyMyProjects: (event: React.ChangeEvent<HTMLInputElement>) => {
        const checked = event.currentTarget.checked;
        setDisplay((current) => ({ ...current, onlyMyProjects: checked }));
      },
      onClearFilters: () => {
        setQuery('');
        setProjectFilter('all');
        setDateFilter({ field: 'createdAt', range: 'all', from: '', to: '' });
        setDisplay((current) => ({ ...current, onlyMyProjects: false }));
      },
      onDisplayOptionsChange: setDisplayOptionsOpen,
      onShowInactive: (event: React.ChangeEvent<HTMLInputElement>) => {
        const checked = event.currentTarget.checked;
        setDisplay((current) => ({ ...current, showInactive: checked }));
      },
      onDateField: (event: React.ChangeEvent<HTMLSelectElement>) => {
        const field = event.currentTarget.value as DocumentDateFilter['field'];
        setDateFilter((current) => ({ ...current, field }));
      },
      onDateRange: (event: React.ChangeEvent<HTMLSelectElement>) => {
        const range = event.currentTarget.value;
        setDateFilter((current) => ({ ...current, range }));
      },
      onDateFrom: (event: React.ChangeEvent<HTMLInputElement>) => {
        const from = event.currentTarget.value;
        setDateFilter((current) => ({ ...current, from }));
      },
      onDateTo: (event: React.ChangeEvent<HTMLInputElement>) => {
        const to = event.currentTarget.value;
        setDateFilter((current) => ({ ...current, to }));
      },
      onGrouping: (event: React.ChangeEvent<HTMLSelectElement>) => {
        const grouping = event.currentTarget.value as 'none' | 'project';
        setDisplay((current) => ({ ...current, grouping }));
      },
      onProjectFilter: (event: React.ChangeEvent<HTMLSelectElement>) =>
        setProjectFilter(event.currentTarget.value),
      onCreatePage: () => {
        const project = projects.find((project) => String(project.id) === projectFilter);
        return sendIntent('page.create', { projectId: project?.id });
      },
      onQuery: (event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.currentTarget.value),
      onOrder: (event: React.ChangeEvent<HTMLSelectElement>) => {
        const order = event.currentTarget.value as PageListOrder;
        setDisplay((current) => ({ ...current, order }));
      },
      onDirection: () =>
        setDisplay((current) => ({
          ...current,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        })),
      onShowCreated: (event: React.ChangeEvent<HTMLInputElement>) => {
        const checked = event.currentTarget.checked;
        setDisplay((current) => ({ ...current, showCreated: checked }));
      },
      onShowUpdated: (event: React.ChangeEvent<HTMLInputElement>) => {
        const checked = event.currentTarget.checked;
        setDisplay((current) => ({ ...current, showUpdated: checked }));
      },
    },
  };
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

  type Properties = Pick<Page, 'title' | 'status' | 'parentId' | 'projectId' | 'date' | 'tags'>;
  const confirmed = useRef(initial);
  const dirty = useRef(false);
  const [propertiesDirty, setPropertiesDirty] = useState(false);
  const [propertiesSaved, setPropertiesSaved] = useState(false);
  const [optionsError, setOptionsError] = useState('');
  const [optionsLoading, setOptionsLoading] = useState(true);
  const optionsGeneration = useRef(0);
  const mutation = useRetriableSave<Partial<Properties>, Page>({
    scope: slug,
    save: (body) => api.patchPage(slug, body),
    onSuccess: (next) => {
      confirmed.current = next;
      dirty.current = false;
      setPage(next);
      setTagDraft(next.tags.join(', '));
      setPropertiesDirty(false);
      setPropertiesSaved(true);
    },
    onFailure: () => {},
  });
  useEffect(() => {
    if (initial.slug !== confirmed.current.slug || !dirty.current) {
      confirmed.current = initial;
      dirty.current = false;
      setPage(initial);
      setTagDraft(initial.tags.join(', '));
      setPropertiesDirty(false);
      setPropertiesSaved(false);
    }
  }, [initial]);
  const loadOptions = useCallback(async () => {
    const generation = ++optionsGeneration.current;
    setOptionsLoading(true);
    setOptionsError('');
    try {
      const [all, projects] = await Promise.all([api.pages(), api.projects()]);
      if (generation !== optionsGeneration.current) return;
      setPages(all);
      setProjects(projects);
    } catch (cause) {
      if (generation === optionsGeneration.current)
        setOptionsError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (generation === optionsGeneration.current) setOptionsLoading(false);
    }
  }, [slug]);
  useEffect(() => {
    setPages([]);
    setProjects([]);
    void loadOptions();
    return () => {
      optionsGeneration.current++;
    };
  }, [loadOptions]);
  function markDirty() {
    dirty.current = true;
    setPropertiesDirty(true);
    setPropertiesSaved(false);
    mutation.invalidate();
  }
  function save(changes: Partial<Properties>) {
    if (mutation.isPending()) return;
    const draft: Properties = {
      ...page,
      tags: tagDraft
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      ...changes,
    };
    const fields = ['title', 'status', 'parentId', 'projectId', 'date', 'tags'] as const;
    const body = Object.fromEntries(
      fields
        .filter((key) => JSON.stringify(draft[key]) !== JSON.stringify(confirmed.current[key]))
        .map((key) => [key, draft[key]]),
    ) as Partial<Properties>;
    if (!Object.keys(body).length) {
      dirty.current = false;
      setPropertiesDirty(false);
      return;
    }
    markDirty();
    setPage((current) => ({ ...current, ...draft }));
    return mutation.write(body);
  }

  return {
    _view: 0 as const,
    slug,
    page,
    pages,
    projects,
    tagDraft,
    propertiesSaving: mutation.saving,
    propertiesError: mutation.error,
    propertiesSaved,
    propertiesDirty,
    optionsError,
    optionsLoading,
    handlers: {
      onRetryProperties: mutation.retry,
      onSaveProperties: () => save({}),
      onRetryPropertyOptions: loadOptions,
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
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => {
        if (mutation.isPending()) return;
        markDirty();
        setPage((current) => ({ ...current, title: e.target.value }));
      },
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
      Tags_onChange7: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => {
        if (mutation.isPending()) return;
        markDirty();
        setTagDraft(e.target.value);
      },
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
