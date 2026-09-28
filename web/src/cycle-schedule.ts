import type { Cycle, CycleSettings } from './types.ts';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_CYCLE_DAYS = 7;

function utcDay(value: string): number | null {
  const day = Date.parse(`${value.slice(0, 10)}T00:00:00.000Z`);
  return Number.isFinite(day) ? day : null;
}

function isoDay(value: number): string {
  return new Date(value).toISOString();
}

export function nextCycleRange(
  cycles: readonly Pick<Cycle, 'startsAt' | 'endsAt'>[],
  now = new Date(),
  settings?: CycleSettings,
): { startsAt: string; endsAt: string } {
  const today = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
  const validCycles = cycles.flatMap((cycle) => {
    const startsAt = utcDay(cycle.startsAt);
    const endsAt = utcDay(cycle.endsAt);
    return startsAt !== null && endsAt !== null && endsAt > startsAt ? [{ startsAt, endsAt }] : [];
  });
  const latest = validCycles.sort(
    (left, right) => right.endsAt - left.endsAt || right.startsAt - left.startsAt,
  )[0];
  const duration =
    settings?.durationDays ??
    (latest ? (latest.endsAt - latest.startsAt) / DAY_MS : DEFAULT_CYCLE_DAYS);
  let startsAt = Math.max(
    today,
    (latest?.endsAt ?? today) + (settings?.cooldownDays ?? 0) * DAY_MS,
  );
  if (settings) {
    const weekday = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ].indexOf(settings.startDay);
    if (weekday >= 0) startsAt += ((weekday - new Date(startsAt).getUTCDay() + 7) % 7) * DAY_MS;
  }
  const endsAt = startsAt + duration * DAY_MS;

  return { startsAt: isoDay(startsAt), endsAt: isoDay(endsAt) };
}
