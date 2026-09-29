import { useEffect, useRef, useState } from 'react';
import { api } from '../api.ts';
import type { SearchHit } from '../types.ts';

type ParentSelection = {
  id?: number;
  identifier?: string;
  open?: boolean;
  selected?: SearchHit | null;
};

export function useIssueComposerParent(open: boolean) {
  const [id, setId] = useState<number | undefined>();
  const [isOpen, setIsOpen] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchHit[]>([]);
  const [selected, setSelected] = useState<SearchHit | null>(null);
  const [loading, setLoading] = useState(false);
  const lookupVersion = useRef(0);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (!open || !normalizedQuery) {
      setResults([]);
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      void api
        .search(normalizedQuery)
        .then((hits) => {
          if (active) setResults(hits.filter((hit) => hit.kind === 'issue').slice(0, 20));
        })
        .catch(() => {
          if (active) setResults([]);
        });
    }, 100);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [open, query]);

  function reset(selection: ParentSelection = {}) {
    lookupVersion.current += 1;
    setId(selection.id);
    setIsOpen(Boolean(selection.open));
    setIdentifier(selection.identifier ?? '');
    setQuery('');
    setResults([]);
    setSelected(selection.selected ?? null);
    setLoading(false);
  }

  function change(identifierValue: string | null) {
    const version = ++lookupVersion.current;
    setIdentifier(identifierValue ?? '');
    setQuery('');
    if (!identifierValue) {
      setId(undefined);
      setIsOpen(false);
      setSelected(null);
      setLoading(false);
      return;
    }
    setSelected(results.find((hit) => hit.id === identifierValue) ?? null);
    setLoading(true);
    void api
      .issue(identifierValue)
      .then((parentIssue) => {
        if (version !== lookupVersion.current) return;
        setId(parentIssue.id);
        setLoading(false);
      })
      .catch(() => {
        if (version !== lookupVersion.current) return;
        setId(undefined);
        setIdentifier('');
        setSelected(null);
        setLoading(false);
      });
  }

  const options = [
    ...(selected ? [selected] : []),
    ...results.filter((hit) => hit.id !== selected?.id),
  ].map((hit) => ({ value: hit.id, label: hit.title ? `${hit.id} ${hit.title}` : hit.id }));

  return {
    id,
    isOpen,
    identifier,
    query,
    loading,
    options,
    reset,
    onOpen: () => setIsOpen(true),
    onQueryChange: setQuery,
    onChange: change,
  };
}
