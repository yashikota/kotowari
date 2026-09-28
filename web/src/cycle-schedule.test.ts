import { describe, expect, it } from 'vite-plus/test';
import { nextCycleRange } from './cycle-schedule.ts';

describe('nextCycleRange', () => {
  const now = new Date('2026-09-29T18:30:00Z');

  it('starts a first cycle today and defaults to one week', () => {
    expect(nextCycleRange([], now)).toEqual({
      startsAt: '2026-09-29T00:00:00.000Z',
      endsAt: '2026-10-06T00:00:00.000Z',
    });
  });

  it('continues the latest cycle using its duration', () => {
    expect(
      nextCycleRange(
        [
          { startsAt: '2026-09-07T00:00:00Z', endsAt: '2026-09-21T00:00:00Z' },
          { startsAt: '2026-09-21T00:00:00Z', endsAt: '2026-09-28T00:00:00Z' },
        ],
        now,
      ),
    ).toEqual({
      startsAt: '2026-09-29T00:00:00.000Z',
      endsAt: '2026-10-06T00:00:00.000Z',
    });
  });

  it('keeps a future schedule continuous and inherits its cycle length', () => {
    expect(
      nextCycleRange(
        [
          { startsAt: '2026-09-28T00:00:00Z', endsAt: '2026-10-05T00:00:00Z' },
          { startsAt: '2026-10-05T00:00:00Z', endsAt: '2026-10-12T00:00:00Z' },
        ],
        now,
      ),
    ).toEqual({
      startsAt: '2026-10-12T00:00:00.000Z',
      endsAt: '2026-10-19T00:00:00.000Z',
    });
  });

  it('uses the configured duration, cooldown, and start weekday', () => {
    expect(
      nextCycleRange([{ startsAt: '2026-09-28T00:00:00Z', endsAt: '2026-10-05T00:00:00Z' }], now, {
        durationDays: 14,
        cooldownDays: 2,
        startDay: 'monday',
        autoCreateAhead: 2,
      }),
    ).toEqual({
      startsAt: '2026-10-12T00:00:00.000Z',
      endsAt: '2026-10-26T00:00:00.000Z',
    });
  });
});
