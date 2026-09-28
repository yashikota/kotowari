import { describe, expect, it } from 'vite-plus/test';
import {
  formatCalendarDate,
  formatRelativeTime,
  formatStamp,
  formatTimeZoneLabel,
  listTimeZones,
  timeZoneChoices,
} from './time.ts';

describe('formatCalendarDate', () => {
  it('formats a date-only value in the requested language regardless of local timezone', () => {
    expect(formatCalendarDate('2026-09-21T00:00:00Z', 'ja')).toContain('9月21日');
    expect(formatCalendarDate('2026-09-21T00:00:00Z', 'en-US')).toBe('Sep 21');
  });

  it('preserves an invalid date value for recovery', () => {
    expect(formatCalendarDate('not-a-date', 'ja')).toBe('not-a-date');
  });
});

describe('formatStamp', () => {
  it('renders UTC instants in the workspace timezone', () => {
    const out = formatStamp('2026-09-01T00:00:00Z', 'Asia/Tokyo');
    expect(out).toContain('2026-09-01');
    expect(out).toContain('09:00');
  });

  it('falls back to the raw value when the instant is unusable', () => {
    expect(formatStamp('not-a-date', 'Asia/Tokyo')).toBe('not-a-date');
  });

  it('falls back to UTC when the timezone is unknown', () => {
    const out = formatStamp('2026-09-01T00:00:00Z', 'Not/A_Zone');
    expect(out).toContain('2026-09-01');
    expect(out).toContain('00:00');
  });

  it('renders a New York evening for a UTC midnight instant', () => {
    const out = formatStamp('2026-09-01T00:00:00Z', 'America/New_York');
    expect(out).toContain('2026-08-31');
    expect(out).toContain('20:00');
  });
});

describe('formatRelativeTime', () => {
  const now = Date.parse('2026-09-28T12:00:00Z');

  it('formats compact issue activity time in English and Japanese', () => {
    const value = '2026-09-28T10:00:00Z';
    expect(formatRelativeTime(value, 'en', { now, numeric: 'always', style: 'narrow' })).toBe(
      '2h ago',
    );
    expect(formatRelativeTime(value, 'ja', { now, numeric: 'always', style: 'narrow' })).toMatch(
      /2.*前$/,
    );
  });

  it('uses the localized immediate label for recent events', () => {
    const value = '2026-09-28T12:00:02Z';
    expect(formatRelativeTime(value, 'en', { now, numeric: 'always', style: 'narrow' })).toBe(
      'now',
    );
    expect(formatRelativeTime(value, 'ja', { now, numeric: 'always', style: 'narrow' })).toBe('今');
  });

  it('keeps invalid timestamps readable', () => {
    expect(formatRelativeTime('not-a-date', 'en', { now })).toBe('not-a-date');
  });
});

describe('time zones', () => {
  it('lists zones from Intl when available', () => {
    const zones = listTimeZones();
    expect(zones.length).toBeGreaterThan(50);
  });

  it('keeps the current workspace zone in the choice list', () => {
    const zones = timeZoneChoices('Not/A_Zone');
    expect(zones[0]).toBe('Not/A_Zone');
  });

  it('builds labels with runtime offset metadata', () => {
    const label = formatTimeZoneLabel('Asia/Tokyo');
    expect(label).toContain('Asia/Tokyo');
    expect(label).toMatch(/GMT|UTC|[+-]\d/);
  });
});
