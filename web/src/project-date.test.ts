import { describe, expect, it } from 'vite-plus/test';
import { parseProjectDate, parseStoredProjectDate, projectDateMonthGrid } from './project-date.ts';

const now = new Date('2026-09-26T12:00:00Z');

describe('project date input', () => {
  it('parses exact dates and common natural-language periods', () => {
    expect(parseProjectDate('2027/05/20', now)).toBe('2027-05-20');
    expect(parseProjectDate('May 2027', now)).toBe('2027-05-01');
    expect(parseProjectDate('Q4', now)).toBe('2026-10-01');
    expect(parseProjectDate('Q4 2027', now)).toBe('2027-10-01');
    expect(parseProjectDate('2027 H2', now)).toBe('2027-07-01');
    expect(parseProjectDate('2027年5月', now)).toBe('2027-05-01');
    expect(parseProjectDate('2027', now)).toBe('2027-01-01');
  });

  it('rejects ambiguous or invalid dates rather than silently changing them', () => {
    expect(parseProjectDate('2027-02-29', now)).toBeNull();
    expect(parseProjectDate('2027-13-01', now)).toBeNull();
    expect(parseProjectDate('not a date', now)).toBeNull();
  });

  it('parses persisted dates and produces a Sunday-first six-week calendar', () => {
    expect(parseStoredProjectDate('2026-09-26')?.toISOString()).toBe('2026-09-26T00:00:00.000Z');
    const dates = projectDateMonthGrid(2026, 8);
    expect(dates).toHaveLength(42);
    expect(dates[0]?.toISOString()).toBe('2026-08-30T00:00:00.000Z');
    expect(dates[27]?.toISOString()).toBe('2026-09-26T00:00:00.000Z');
  });
});
