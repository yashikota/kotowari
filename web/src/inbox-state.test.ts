import { describe, expect, it } from 'vite-plus/test';
import {
  DEFAULT_INBOX_STATE,
  INBOX_PRIORITY_TYPES,
  inboxPriorityType,
  inboxSnoozeUntil,
  parseInboxState,
  sortInboxActivities,
  serializeInboxState,
} from './inbox-state.ts';

describe('personal inbox state', () => {
  it('uses safe defaults for absent, malformed, and outdated preferences', () => {
    expect(parseInboxState(null)).toEqual(DEFAULT_INBOX_STATE);
    expect(parseInboxState('{')).toEqual(DEFAULT_INBOX_STATE);
    expect(parseInboxState(JSON.stringify({ readIds: ['2'], density: 'spacious' }))).toEqual({
      ...DEFAULT_INBOX_STATE,
      readIds: [],
    });
  });

  it('normalizes persisted ids and keeps valid display preferences', () => {
    const parsed = parseInboxState(
      JSON.stringify({
        readIds: [8, 8, -1, '3'],
        archivedIds: [5, Number.MAX_SAFE_INTEGER + 1],
        snoozedUntil: { 8: 1_800_000_000_000, 0: 1_800_000_000_000, bad: 'later' },
        density: 'compact',
        groupByDate: false,
        showSnoozed: true,
        showUnreadFirst: true,
        ordering: 'oldest',
      }),
    );
    expect(parsed).toEqual({
      readIds: [8],
      archivedIds: [5],
      snoozedUntil: { 8: 1_800_000_000_000 },
      density: 'compact',
      groupByDate: false,
      unreadGrouping: 'none',
      showSnoozed: true,
      showUnreadFirst: true,
      ordering: 'oldest',
      priorityInboxEnabled: false,
      priorityTypes: [...INBOX_PRIORITY_TYPES],
      badgeCount: 'all',
      priorityView: 'priority',
    });
    expect(parseInboxState(serializeInboxState(parsed))).toEqual(parsed);
  });

  it('normalizes priority inbox settings without accepting unknown categories', () => {
    const parsed = parseInboxState(
      JSON.stringify({
        priorityInboxEnabled: true,
        priorityTypes: ['replies', 'replies', 'unknown', 'issueActivity'],
        badgeCount: 'priority',
        priorityView: 'other',
        unreadGrouping: 'focus',
      }),
    );
    expect(parsed).toMatchObject({
      priorityInboxEnabled: true,
      priorityTypes: ['replies', 'issueActivity'],
      badgeCount: 'priority',
      priorityView: 'other',
      unreadGrouping: 'focus',
    });
    expect(parseInboxState(serializeInboxState(parsed))).toEqual(parsed);
  });

  it('classifies personal issue activity into the supported priority inbox categories', () => {
    expect(
      inboxPriorityType({
        entityType: 'issue',
        action: 'assignee_changed',
        payload: { to: 'self' },
      }),
    ).toBe('assignedToYou');
    expect(inboxPriorityType({ entityType: 'issue', action: 'commented', payload: {} })).toBe(
      'replies',
    );
    expect(inboxPriorityType({ entityType: 'issue', action: 'status_changed', payload: {} })).toBe(
      'issueActivity',
    );
    expect(
      inboxPriorityType({ entityType: 'project', action: 'status_update_posted', payload: {} }),
    ).toBe('projectUpdates');
    expect(inboxPriorityType({ entityType: 'page', action: 'created', payload: {} })).toBe(
      'documentActivity',
    );
  });

  it('calculates one-hour, later-today, tomorrow, and next-week snoozes in local time', () => {
    const now = new Date(2026, 8, 28, 10, 30).getTime(); // Monday
    expect(inboxSnoozeUntil('one-hour', now)).toBe(new Date(2026, 8, 28, 11, 30).getTime());
    expect(inboxSnoozeUntil('later-today', now)).toBe(new Date(2026, 8, 28, 17).getTime());
    expect(inboxSnoozeUntil('tomorrow', now)).toBe(new Date(2026, 8, 29, 9).getTime());
    expect(inboxSnoozeUntil('next-week', now)).toBe(new Date(2026, 9, 5, 9).getTime());
    expect(inboxSnoozeUntil('later-today', new Date(2026, 8, 28, 18).getTime())).toBe(
      new Date(2026, 8, 29, 9).getTime(),
    );
  });

  it('orders inbox activities by read state and then by creation time', () => {
    const activities = [
      { id: 1, createdAt: '2026-09-25T12:00:00Z' },
      { id: 2, createdAt: '2026-09-26T12:00:00Z' },
      { id: 3, createdAt: '2026-09-26T12:00:00Z' },
    ];
    const defaults = { readIds: [], showUnreadFirst: false };
    expect(
      sortInboxActivities(activities, { ...defaults, ordering: 'newest' }).map((item) => item.id),
    ).toEqual([3, 2, 1]);
    expect(
      sortInboxActivities(activities, { ...defaults, ordering: 'oldest' }).map((item) => item.id),
    ).toEqual([1, 2, 3]);
    expect(
      sortInboxActivities(activities, {
        readIds: [3],
        showUnreadFirst: true,
        ordering: 'newest',
      }).map((item) => item.id),
    ).toEqual([2, 1, 3]);
  });
});
