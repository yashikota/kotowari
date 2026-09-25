import { ISSUE_STATUSES, type IssueStatus, type SearchHit } from './types.ts';

export type SearchTab = 'all' | 'issues' | 'projects' | 'documents';
export type SearchOrder = 'relevance' | 'updatedAt' | 'createdAt';
export type SearchDateWindow = 'P1D' | 'P3D' | 'P1W' | 'P1M' | 'P3M' | 'P6M' | 'P1Y';
export type SearchDateField = 'created' | 'updated';
export type SearchDateOperator = 'after' | 'before' | 'in';
export type SearchDateGranularity = 'day' | 'month' | 'quarter' | 'halfYear' | 'year';
export type SearchDateRange = { start: string; end: string };
export type SearchDateFilter = {
  operator: SearchDateOperator;
  value: { kind: 'relative'; window: SearchDateWindow } | ({ kind: 'range' } & SearchDateRange);
};
export type SearchDateFilters = Partial<Record<SearchDateField, SearchDateFilter>>;
export const SEARCH_DATE_WINDOWS: SearchDateWindow[] = [
  'P1D',
  'P3D',
  'P1W',
  'P1M',
  'P3M',
  'P6M',
  'P1Y',
];
export type SearchPageSearch = {
  q?: string;
  tab?: SearchTab;
  ordering?: SearchOrder;
  status?: string;
  created?: string;
  updated?: string;
  includeArchived?: boolean;
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
  const created = parseSearchDateFilter(raw.created);
  const updated = parseSearchDateFilter(raw.updated);
  const ordering =
    raw.ordering === 'updatedAt' || raw.ordering === 'createdAt' ? raw.ordering : undefined;
  const includeArchived = raw.includeArchived === true || raw.includeArchived === 'true';
  return {
    ...(q ? { q } : {}),
    ...(raw.tab === 'issues' || raw.tab === 'projects' || raw.tab === 'documents'
      ? { tab: raw.tab }
      : {}),
    ...(ordering ? { ordering } : {}),
    ...(statuses.length ? { status: statuses.join(',') } : {}),
    ...(created ? { created: serializeSearchDateFilter(created) } : {}),
    ...(updated ? { updated: serializeSearchDateFilter(updated) } : {}),
    ...(includeArchived ? { includeArchived: true } : {}),
  };
}

export function isSearchDateWindow(value: string): value is SearchDateWindow {
  return SEARCH_DATE_WINDOWS.includes(value as SearchDateWindow);
}

export function parseSearchDateFilter(value: unknown): SearchDateFilter | undefined {
  if (typeof value !== 'string') return undefined;
  if (isSearchDateWindow(value)) {
    return { operator: 'after', value: { kind: 'relative', window: value } };
  }
  const separator = value.indexOf(':');
  if (separator < 0) return undefined;
  const operator = value.slice(0, separator);
  const operand = value.slice(separator + 1);
  if (operator === 'after' || operator === 'before') {
    if (isSearchDateWindow(operand)) {
      return { operator, value: { kind: 'relative', window: operand } };
    }
    return undefined;
  }
  if (operator !== 'in') return undefined;
  const range = parseDateRangeToken(operand);
  return range ? { operator, value: { kind: 'range', ...range } } : undefined;
}

export function serializeSearchDateFilter(filter: SearchDateFilter): string {
  if (filter.value.kind === 'relative') {
    return filter.operator === 'after'
      ? filter.value.window
      : `${filter.operator}:${filter.value.window}`;
  }
  return `${filter.operator}:${filter.value.start}..${filter.value.end}`;
}

function parseDateRangeToken(value: string): SearchDateRange | undefined {
  const [start, end, extra] = value.split('..');
  if (
    !start ||
    !end ||
    extra !== undefined ||
    !isISODate(start) ||
    !isISODate(end) ||
    start > end
  ) {
    return undefined;
  }
  return { start, end };
}

function isISODate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return date.toISOString().slice(0, 10) === value;
}

export function parseCustomDateTimeframe(
  input: string,
  now = new Date(),
): SearchDateRange | undefined {
  const value = input.trim();
  if (!value) return undefined;
  const customRange =
    /^(\d{4}[-/]\d{1,2}[-/]\d{1,2})\s*(?:\.\.|–|—|\bto\b)\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})$/i.exec(
      value,
    );
  if (customRange) {
    const start = parseDay(customRange[1]!);
    const end = parseDay(customRange[2]!);
    return start && end && start <= end ? { start, end } : undefined;
  }
  const day = parseDay(value);
  if (day) return { start: day, end: day };

  const numericMonth = /^(\d{4})-(\d{1,2})$/.exec(value);
  const japaneseMonth = /^(\d{4})年\s*(\d{1,2})月$/.exec(value);
  const namedMonth = /^([a-z]+)\s+(\d{4})$/i.exec(value);
  if (numericMonth || japaneseMonth || namedMonth) {
    const year = Number((numericMonth ?? japaneseMonth)?.[1] ?? namedMonth?.[2]);
    const month = Number(
      (numericMonth ?? japaneseMonth)?.[2] ?? monthNumber(namedMonth?.[1] ?? ''),
    );
    return monthRange(year, month);
  }

  const quarter = /^(?:(\d{4})\s*年?\s*)?(?:Q|第\s*)([1-4])(?:\s*四半期)?(?:\s*(\d{4})年?)?$/i.exec(
    value,
  );
  if (quarter) {
    const year = Number(quarter[1] ?? quarter[3] ?? now.getUTCFullYear());
    const firstMonth = (Number(quarter[2]) - 1) * 3 + 1;
    return {
      start: dateString(year, firstMonth, 1),
      end: dateString(year, firstMonth + 2, daysInMonth(year, firstMonth + 2)),
    };
  }

  const halfYear =
    /^(?:(\d{4})\s*年?\s*)?(?:H([1-2])|([1-2])H|([上下])期)(?:\s*(\d{4})年?)?$/i.exec(value);
  if (halfYear) {
    const year = Number(halfYear[1] ?? halfYear[5] ?? now.getUTCFullYear());
    const half = Number(halfYear[2] ?? halfYear[3] ?? (halfYear[4] === '上' ? 1 : 2));
    const firstMonth = half === 1 ? 1 : 7;
    return {
      start: dateString(year, firstMonth, 1),
      end: dateString(year, firstMonth + 5, daysInMonth(year, firstMonth + 5)),
    };
  }

  const year = /^(\d{4})年?$/.exec(value);
  if (year)
    return { start: dateString(Number(year[1]), 1, 1), end: dateString(Number(year[1]), 12, 31) };
  return undefined;
}

function parseDay(value: string): string | undefined {
  const match = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(value.trim());
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return undefined;
  return dateString(year, month, day);
}

function monthNumber(value: string): number {
  const normalized = value.toLowerCase();
  const index = [
    'jan',
    'feb',
    'mar',
    'apr',
    'may',
    'jun',
    'jul',
    'aug',
    'sep',
    'oct',
    'nov',
    'dec',
  ].findIndex((month) => month === normalized.slice(0, 3));
  return index + 1;
}

function monthRange(year: number, month: number): SearchDateRange | undefined {
  if (!Number.isInteger(year) || year < 1 || year > 9999 || month < 1 || month > 12)
    return undefined;
  return {
    start: dateString(year, month, 1),
    end: dateString(year, month, daysInMonth(year, month)),
  };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function dateString(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function filterSearchHits(
  hits: SearchHit[],
  tab: SearchTab,
  statuses: IssueStatus[] = [],
  dates: SearchDateFilters = {},
  now = Date.now(),
  includeArchived = false,
): SearchHit[] {
  let filtered: SearchHit[];
  const visibleHits = includeArchived ? hits : hits.filter((hit) => !hit.archived);
  switch (tab) {
    case 'issues':
      filtered = visibleHits.filter((hit) => hit.kind === 'issue');
      break;
    case 'projects':
      filtered = visibleHits.filter((hit) => hit.kind === 'project');
      break;
    case 'documents':
      filtered = visibleHits.filter((hit) => hit.kind === 'page' || hit.kind === 'adr');
      break;
    case 'all':
      filtered = visibleHits;
      break;
  }
  if (!statuses.length && !dates.created && !dates.updated) return filtered;
  return filtered.filter(
    (hit) =>
      hit.kind === 'issue' &&
      (!statuses.length || (hit.status !== undefined && statuses.includes(hit.status))) &&
      (!dates.created || matchesSearchDateFilter(hit.createdAt, dates.created, now)) &&
      (!dates.updated || matchesSearchDateFilter(hit.updatedAt, dates.updated, now)),
  );
}

function matchesSearchDateFilter(
  timestamp: string | undefined,
  filter: SearchDateFilter,
  now: number,
): boolean {
  const value = timestamp ? Date.parse(timestamp) : Number.NaN;
  if (!Number.isFinite(value)) return false;
  const date = new Date(value).toISOString().slice(0, 10);
  if (filter.value.kind === 'range') {
    return filter.operator === 'in'
      ? date >= filter.value.start && date <= filter.value.end
      : filter.operator === 'after'
        ? date >= filter.value.start
        : date < filter.value.start;
  }
  const cutoff = relativeDateCutoff(filter.value.window, now);
  return filter.operator === 'before' ? date < cutoff : date >= cutoff;
}

function relativeDateCutoff(window: SearchDateWindow, now: number): string {
  const date = new Date(now);
  const amount = Number(window.slice(1, -1));
  switch (window.slice(-1)) {
    case 'D':
      date.setUTCDate(date.getUTCDate() - amount);
      break;
    case 'W':
      date.setUTCDate(date.getUTCDate() - amount * 7);
      break;
    case 'M': {
      const day = date.getUTCDate();
      date.setUTCDate(1);
      date.setUTCMonth(date.getUTCMonth() - amount);
      const finalDay = daysInMonth(date.getUTCFullYear(), date.getUTCMonth() + 1);
      date.setUTCDate(Math.min(day, finalDay));
      break;
    }
    case 'Y': {
      const day = date.getUTCDate();
      date.setUTCDate(1);
      date.setUTCFullYear(date.getUTCFullYear() - amount);
      const finalDay = daysInMonth(date.getUTCFullYear(), date.getUTCMonth() + 1);
      date.setUTCDate(Math.min(day, finalDay));
      break;
    }
  }
  return date.toISOString().slice(0, 10);
}

export function orderSearchHits(hits: SearchHit[], order: SearchOrder, query = ''): SearchHit[] {
  if (order !== 'relevance') {
    return hits
      .map((hit, index) => ({ hit, index, timestamp: Date.parse(hit[order] ?? '') }))
      .sort((left, right) => {
        const leftTime = Number.isFinite(left.timestamp)
          ? left.timestamp
          : Number.NEGATIVE_INFINITY;
        const rightTime = Number.isFinite(right.timestamp)
          ? right.timestamp
          : Number.NEGATIVE_INFINITY;
        return rightTime - leftTime || left.index - right.index;
      })
      .map(({ hit }) => hit);
  }
  const needle = query.trim().toLowerCase();
  if (!needle) return hits;
  return hits
    .map((hit, index) => ({ hit, index, score: relevanceScore(hit, needle) }))
    .sort((left, right) => left.score - right.score || left.index - right.index)
    .map(({ hit }) => hit);
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
