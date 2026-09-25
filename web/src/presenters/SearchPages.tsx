import { useLoaderData, useNavigate, useSearch } from '@tanstack/react-router';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { filterSearchHits, orderSearchHits, type SearchOrder, type SearchTab } from '../search.ts';

export function useSearchPagePresenter() {
  const search = useSearch({ from: '/search' });
  const { hits } = useLoaderData({ from: '/search' });
  const navigate = useNavigate({ from: '/search' });
  const [query, setQuery] = useState(search.q ?? '');
  const tab = search.tab ?? 'all';
  const order = search.order ?? 'relevance';

  useEffect(() => setQuery(search.q ?? ''), [search.q]);

  return {
    _view: 0 as const,
    query,
    submittedQuery: search.q ?? '',
    tab,
    order,
    hits: orderSearchHits(filterSearchHits(hits, tab), order, search.q ?? ''),
    handlers: {
      onQueryChange: (value: string) => setQuery(value),
      onSubmit: (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        return navigate({
          search: (previous) => ({ ...previous, q: query.trim().slice(0, 200) || undefined }),
        });
      },
      onClear: () => {
        setQuery('');
        return navigate({ search: (previous) => ({ ...previous, q: undefined }) });
      },
      onTabChange: (value: string | null) => {
        if (value !== 'all' && value !== 'issues' && value !== 'projects' && value !== 'documents')
          return;
        const nextTab: SearchTab | undefined = value === 'all' ? undefined : value;
        return navigate({ search: (previous) => ({ ...previous, tab: nextTab }) });
      },
      onOrderChange: (order: SearchOrder) =>
        navigate({
          search: (previous) => ({ ...previous, order: order === 'relevance' ? undefined : order }),
        }),
    },
  };
}
