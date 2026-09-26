import { describe, expect, it } from 'vite-plus/test';
import {
  EMPTY_INBOX_FILTERS,
  matchesInboxFilters,
  toggleInboxFilterValue,
  type InboxFilters,
} from './inbox-filter.ts';
import type { InboxActivity } from './types.ts';

const issueActivity: InboxActivity = {
  id: 8,
  entityType: 'issue',
  entityId: 3,
  action: 'commented',
  payload: {},
  createdAt: '2026-09-26T08:00:00Z',
  identifier: 'KOT-3',
  title: 'Inbox filters',
  status: 'in_progress',
  priority: 2,
  projectId: 5,
  projectName: 'Inbox refresh',
};

describe('inbox filters', () => {
  it('matches every selected facet and allows alternatives within a facet', () => {
    const filters: InboxFilters = {
      ...EMPTY_INBOX_FILTERS,
      activityTypes: ['comments', 'attachments'],
      projectIds: [5],
      priorities: [2, 3],
      statuses: ['in_progress'],
    };

    expect(matchesInboxFilters(issueActivity, filters)).toBe(true);
    expect(matchesInboxFilters(issueActivity, { ...filters, projectIds: [null] })).toBe(false);
    expect(matchesInboxFilters(issueActivity, { ...filters, statuses: ['done'] })).toBe(false);
  });

  it('treats empty facets as unrestricted and toggles values idempotently', () => {
    expect(matchesInboxFilters(issueActivity, EMPTY_INBOX_FILTERS)).toBe(true);
    expect(toggleInboxFilterValue(['comments'], 'comments')).toEqual([]);
    expect(toggleInboxFilterValue(['comments'], 'changes')).toEqual(['comments', 'changes']);
  });

  it('does not treat non-issue activity as backlog or unprioritized issues', () => {
    const nonIssueActivity: InboxActivity = {
      ...issueActivity,
      entityType: 'document',
      identifier: '',
      status: null,
      priority: null,
      projectId: null,
      projectName: null,
    };

    expect(
      matchesInboxFilters(nonIssueActivity, {
        ...EMPTY_INBOX_FILTERS,
        statuses: ['backlog'],
      }),
    ).toBe(false);
    expect(
      matchesInboxFilters(nonIssueActivity, {
        ...EMPTY_INBOX_FILTERS,
        priorities: [0],
      }),
    ).toBe(false);
    expect(
      matchesInboxFilters(nonIssueActivity, {
        ...EMPTY_INBOX_FILTERS,
        projectIds: [null],
      }),
    ).toBe(true);
  });
});
