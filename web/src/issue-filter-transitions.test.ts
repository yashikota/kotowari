import { describe, expect, it } from 'vite-plus/test';
import type { IssueSearch } from './issue-search.ts';
import { lastIssueSearchFilterKey, removeIssueFilter } from './issue-filter-transitions.ts';

describe('issue filter shortcut transitions', () => {
  it('identifies and removes the final active filter chip', () => {
    const search: IssueSearch = { status: 'backlog', priority: 1 };
    const key = lastIssueSearchFilterKey(search);

    expect(key).toBe('priorities');
    expect(removeIssueFilter(search, key!)).toEqual({
      priority: undefined,
      priorities: undefined,
    });
  });

  it('removes both date fields when clearing a date filter chip', () => {
    expect(removeIssueFilter({ dateField: 'createdAt', dateRange: 'weekAgo' }, 'date')).toEqual({
      dateField: undefined,
      dateRange: undefined,
    });
  });
});
