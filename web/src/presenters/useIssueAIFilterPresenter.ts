import type { ChangeEvent, KeyboardEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { IssueSearch } from '../issue-search.ts';
import { interpretIssueFilterQuery } from '../issue-filter-query.ts';
import { useMachineFlag } from '../application/Root.tsx';

export function useIssueAIFilterPresenter({
  getSearch,
  setSearch,
  closeFilter,
}: {
  getSearch: () => IssueSearch;
  setSearch: (patch: IssueSearch) => void;
  closeFilter: () => void;
}) {
  const { t } = useTranslation();
  const [isOpen, setOpen] = useMachineFlag('ai-filter');
  const [query, setQuery] = useState('');
  const [error, setError] = useState(false);
  const suggestions = [
    t('issueFilters.aiSuggestionAssignedToMe'),
    t('issueFilters.aiSuggestionCompletedLastMonth'),
    t('issueFilters.aiSuggestionDueInTwoWeeks'),
  ].map((suggestion) => ({ query: suggestion }));

  function clear() {
    setQuery('');
    setError(false);
  }

  function open() {
    setOpen(true);
    clear();
  }

  function close() {
    setOpen(false);
    clear();
  }

  function apply(queryToApply = query) {
    const interpreted = interpretIssueFilterQuery(queryToApply);
    if (!interpreted) {
      setError(true);
      return;
    }
    const generatedGroup = interpreted.advancedFilterGroup;
    if (generatedGroup) {
      const currentGroup = getSearch().advancedFilterGroup;
      const combinedGroup = currentGroup?.children.length
        ? {
            kind: 'group' as const,
            operator: 'and' as const,
            children: [currentGroup, generatedGroup],
          }
        : generatedGroup;
      setSearch({ ...interpreted, advancedFilter: true, advancedFilterGroup: combinedGroup });
    } else {
      setSearch(interpreted);
    }
    closeFilter();
    close();
  }

  return {
    isOpen,
    query,
    error,
    suggestions,
    open,
    close,
    apply,
    onQueryChange: (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.currentTarget.value);
      setError(false);
    },
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      apply();
    },
  };
}
