const STORAGE_KEY = 'kotowari.recent-searches.v1';
export const RECENT_SEARCH_LIMIT = 8;

type SearchHistoryStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function browserStorage(): SearchHistoryStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function parseRecentSearches(serialized: string | null): string[] {
  if (!serialized) return [];
  try {
    const value: unknown = JSON.parse(serialized);
    if (!Array.isArray(value)) return [];
    return value
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .filter(
        (entry, index, entries) =>
          entries.findIndex(
            (candidate) => candidate.toLocaleLowerCase() === entry.toLocaleLowerCase(),
          ) === index,
      )
      .slice(0, RECENT_SEARCH_LIMIT);
  } catch {
    return [];
  }
}

export function addRecentSearch(searches: string[], query: string): string[] {
  const normalizedQuery = query.trim().slice(0, 200);
  if (!normalizedQuery) return parseRecentSearches(JSON.stringify(searches));
  return parseRecentSearches(JSON.stringify([normalizedQuery, ...searches])).filter(
    (search, index, recent) =>
      recent.findIndex(
        (candidate) => candidate.toLocaleLowerCase() === search.toLocaleLowerCase(),
      ) === index,
  );
}

export function loadRecentSearches(storage = browserStorage()): string[] {
  try {
    return parseRecentSearches(storage?.getItem(STORAGE_KEY) ?? null);
  } catch {
    return [];
  }
}

export function rememberRecentSearch(query: string, storage = browserStorage()): string[] {
  const searches = addRecentSearch(loadRecentSearches(storage), query);
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(searches));
  } catch {
    // Browsers may disable persistent storage for restricted contexts.
  }
  return searches;
}

export function clearRecentSearches(storage = browserStorage()): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // Keep the search page usable when persistent storage is unavailable.
  }
}
