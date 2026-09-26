import { describe, expect, it } from 'vite-plus/test';
import {
  DEFAULT_INBOX_STATE,
  inboxSnoozeUntil,
  parseInboxState,
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
      }),
    );
    expect(parsed).toEqual({
      readIds: [8],
      archivedIds: [5],
      snoozedUntil: { 8: 1_800_000_000_000 },
      density: 'compact',
      groupByDate: false,
    });
    expect(parseInboxState(serializeInboxState(parsed))).toEqual(parsed);
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
});
