import { describe, expect, it } from 'vite-plus/test';
import {
  addRecentSearch,
  clearRecentSearches,
  loadRecentSearches,
  parseRecentSearches,
  RECENT_SEARCH_LIMIT,
  rememberRecentSearch,
} from './search-history.ts';

const storageKey = 'kotowari.recent-searches.v1';

function storage(initial?: string) {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(storageKey, initial);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    values,
  };
}

describe('recent search history', () => {
  it('trims, de-duplicates case-insensitively, and limits loaded searches', () => {
    expect(
      parseRecentSearches(
        JSON.stringify([
          ' Alpha ',
          'alpha',
          '',
          3,
          ...Array.from({ length: 9 }, (_, i) => `q${i}`),
        ]),
      ),
    ).toEqual(['Alpha', ...Array.from({ length: RECENT_SEARCH_LIMIT - 1 }, (_, i) => `q${i}`)]);
    expect(parseRecentSearches('{invalid')).toEqual([]);
    expect(parseRecentSearches(JSON.stringify({ query: 'Alpha' }))).toEqual([]);
  });

  it('puts a submitted query first and keeps the newest unique searches', () => {
    const searches = ['Release', 'Cycle', 'Issue'];
    expect(addRecentSearch(searches, ' cycle ')).toEqual(['cycle', 'Release', 'Issue']);
    expect(addRecentSearch(searches, '   ')).toEqual(searches);
    expect(
      addRecentSearch(
        Array.from({ length: RECENT_SEARCH_LIMIT }, (_, i) => `q${i}`),
        'new',
      ),
    ).toEqual(['new', ...Array.from({ length: RECENT_SEARCH_LIMIT - 1 }, (_, i) => `q${i}`)]);
  });

  it('persists and clears recent searches in browser storage', () => {
    const localStorage = storage(JSON.stringify(['Earlier']));
    expect(loadRecentSearches(localStorage)).toEqual(['Earlier']);
    expect(rememberRecentSearch('Current', localStorage)).toEqual(['Current', 'Earlier']);
    expect(JSON.parse(localStorage.values.get(storageKey) ?? 'null')).toEqual([
      'Current',
      'Earlier',
    ]);
    clearRecentSearches(localStorage);
    expect(loadRecentSearches(localStorage)).toEqual([]);
  });
});
