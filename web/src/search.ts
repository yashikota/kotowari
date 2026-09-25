import { ISSUE_STATUSES, type IssueStatus, type SearchHit } from './types.ts';

export type SearchTab = 'all' | 'issues' | 'projects' | 'documents';
export type SearchOrder = 'relevance' | 'title';
export type SearchPageSearch = {
  q?: string;
  tab?: SearchTab;
  order?: SearchOrder;
  status?: string;
};

export function parseSearchPageSearch(raw: Record<string, unknown>): SearchPageSearch {
  const q = typeof raw.q === 'string' ? raw.q.trim().slice(0, 200) : '';
  const statuses =
    typeof raw.status === 'string'
      ? [
          ...new Set(
            raw.status
              .split(',')
              .filter((status): status is IssueStatus =>
                ISSUE_STATUSES.includes(status as IssueStatus),
              ),
          ),
        ]
      : [];
  return {
    ...(q ? { q } : {}),
    ...(raw.tab === 'issues' || raw.tab === 'projects' || raw.tab === 'documents'
      ? { tab: raw.tab }
      : {}),
    ...(raw.order === 'title' ? { order: raw.order } : {}),
    ...(statuses.length ? { status: statuses.join(',') } : {}),
  };
}

export function filterSearchHits(
  hits: SearchHit[],
  tab: SearchTab,
  statuses: IssueStatus[] = [],
): SearchHit[] {
  let filtered: SearchHit[];
  switch (tab) {
    case 'issues':
      filtered = hits.filter((hit) => hit.kind === 'issue');
      break;
    case 'projects':
      filtered = hits.filter((hit) => hit.kind === 'project');
      break;
    case 'documents':
      filtered = hits.filter((hit) => hit.kind === 'page' || hit.kind === 'adr');
      break;
    case 'all':
      filtered = hits;
      break;
  }
  if (!statuses.length) return filtered;
  return filtered.filter(
    (hit) => hit.kind === 'issue' && hit.status && statuses.includes(hit.status),
  );
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
