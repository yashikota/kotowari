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

export function orderSearchHits(hits: SearchHit[], order: SearchOrder, query = ''): SearchHit[] {
  if (order === 'relevance') {
    const needle = query.trim().toLowerCase();
    if (!needle) return hits;
    return hits
      .map((hit, index) => ({ hit, index, score: relevanceScore(hit, needle) }))
      .sort((left, right) => left.score - right.score || left.index - right.index)
      .map(({ hit }) => hit);
  }
  return [...hits].sort((left, right) => {
    const a = left.title.toLowerCase();
    const b = right.title.toLowerCase();
    return a < b ? -1 : a > b ? 1 : 0;
  });
}

function relevanceScore(hit: SearchHit, query: string): number {
  const title = hit.title.toLowerCase();
  const identifier = hit.id.toLowerCase();
  const snippet = hit.snippet?.toLowerCase() ?? '';
  if (title === query) return 0;
  if (identifier === query) return 1;
  if (title.startsWith(query)) return 2;
  if (identifier.startsWith(query)) return 3;
  if (title.includes(query)) return 4;
  if (identifier.includes(query)) return 5;
  if (snippet.includes(query)) return 6;
  return 7;
}
