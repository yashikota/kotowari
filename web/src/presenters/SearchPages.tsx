import { useLoaderData, useNavigate, useSearch } from '@tanstack/react-router';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import {
  filterSearchHits,
  orderSearchHits,
  parseSearchDateFilter,
  serializeSearchDateFilter,
  type SearchDateField,
  type SearchDateFilter,
  type SearchDateFilters,
  type SearchDateGranularity,
  type SearchDateOperator,
  type SearchDateRange,
  type SearchOrder,
  type SearchTab,
} from '../search.ts';
import type { IssueStatus } from '../types.ts';

export function useSearchPagePresenter() {
  const search = useSearch({ from: '/search' });
  const { hits } = useLoaderData({ from: '/search' });
  const navigate = useNavigate({ from: '/search' });
  const [query, setQuery] = useState(search.q ?? '');
  const tab = search.tab ?? 'all';
  const order = search.ordering ?? 'relevance';
  const includeArchived = search.includeArchived ?? false;
  const statuses = (search.status?.split(',') ?? []) as IssueStatus[];
  const dates: SearchDateFilters = {
    ...(parseSearchDateFilter(search.created)
      ? { created: parseSearchDateFilter(search.created) }
      : {}),
    ...(parseSearchDateFilter(search.updated)
      ? { updated: parseSearchDateFilter(search.updated) }
      : {}),
  };
  const [customDateField, setCustomDateField] = useState<SearchDateField | null>(null);
  const [customDateInput, setCustomDateInput] = useState('');
  const [customDateGranularity, setCustomDateGranularity] =
    useState<SearchDateGranularity>('quarter');

  useEffect(() => setQuery(search.q ?? ''), [search.q]);

  return {
    _view: 0 as const,
    query,
    submittedQuery: search.q ?? '',
    tab,
    order,
    includeArchived,
    statuses,
    dates,
    customDateField,
    customDateInput,
    customDateGranularity,
    hasFilters: statuses.length > 0 || dates.created !== undefined || dates.updated !== undefined,
    hits: orderSearchHits(
      filterSearchHits(hits, tab, statuses, dates, Date.now(), includeArchived),
      order,
      search.q ?? '',
    ),
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
          search: (previous) => ({
            ...previous,
            ordering: order === 'relevance' ? undefined : order,
          }),
        }),
      onIncludeArchivedChange: (includeArchived: boolean) =>
        navigate({
          search: (previous) => ({
            ...previous,
            includeArchived: includeArchived ? true : undefined,
          }),
        }),
      onToggleStatus: (status: IssueStatus) =>
        navigate({
          search: (previous) => {
            const next = new Set((previous.status?.split(',') ?? []) as IssueStatus[]);
            if (next.has(status)) next.delete(status);
            else next.add(status);
            const statuses = [...next];
            return { ...previous, status: statuses.length ? statuses.join(',') : undefined };
          },
        }),
      onDateFilterChange: (field: SearchDateField, filter: SearchDateFilter | undefined) => {
        return navigate({
          search: (previous) => ({
            ...previous,
            [field]: filter ? serializeSearchDateFilter(filter) : undefined,
          }),
        });
      },
      onDateOperatorChange: (field: SearchDateField, operator: SearchDateOperator) => {
        const current = dates[field];
        if (!current || current.value.kind !== 'relative' || operator === 'in') return;
        return navigate({
          search: (previous) => ({
            ...previous,
            [field]: serializeSearchDateFilter({ ...current, operator }),
          }),
        });
      },
      onOpenCustomDate: (field: SearchDateField) => {
        const current = dates[field];
        setCustomDateField(field);
        setCustomDateGranularity('quarter');
        setCustomDateInput(
          current?.value.kind === 'range'
            ? current.value.start === current.value.end
              ? current.value.start
              : `${current.value.start}..${current.value.end}`
            : '',
        );
      },
      onCustomDateInputChange: (value: string) => setCustomDateInput(value),
      onCustomDateGranularityChange: (value: SearchDateGranularity) => {
        setCustomDateGranularity(value);
        setCustomDateInput('');
      },
      onCustomDateCancel: () => setCustomDateField(null),
      onCustomDateApply: (field: SearchDateField, range: SearchDateRange) => {
        setCustomDateField(null);
        return navigate({
          search: (previous) => ({
            ...previous,
            [field]: serializeSearchDateFilter({
              operator: 'in',
              value: { kind: 'range', ...range },
            }),
          }),
        });
      },
      onClearFilters: () =>
        navigate({
          search: (previous) => ({
            ...previous,
            status: undefined,
            created: undefined,
            updated: undefined,
          }),
        }),
    },
  };
}
