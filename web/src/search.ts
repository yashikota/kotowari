import type { SearchHit } from './types.ts';

export type SearchTab = 'all' | 'issues' | 'projects' | 'documents';
export type SearchOrder = 'relevance' | 'title';
export type SearchPageSearch = { q?: string; tab?: SearchTab; order?: SearchOrder };

export function parseSearchPageSearch(raw: Record<string, unknown>): SearchPageSearch {
  const q = typeof raw.q === 'string' ? raw.q.trim().slice(0, 200) : '';
  return {
    ...(q ? { q } : {}),
    ...(raw.tab === 'issues' || raw.tab === 'projects' || raw.tab === 'documents'
      ? { tab: raw.tab }
      : {}),
    ...(raw.order === 'title' ? { order: raw.order } : {}),
  };
}

export function filterSearchHits(hits: SearchHit[], tab: SearchTab): SearchHit[] {
  switch (tab) {
    case 'issues':
      return hits.filter((hit) => hit.kind === 'issue');
    case 'projects':
      return hits.filter((hit) => hit.kind === 'project');
    case 'documents':
      return hits.filter((hit) => hit.kind === 'page' || hit.kind === 'adr');
    case 'all':
      return hits;
  }
}

export function orderSearchHits(hits: SearchHit[], order: SearchOrder): SearchHit[] {
  if (order === 'relevance') return hits;
  return [...hits].sort((left, right) => {
    const a = left.title.toLocaleLowerCase();
    const b = right.title.toLocaleLowerCase();
    return a < b ? -1 : a > b ? 1 : 0;
  });
}
