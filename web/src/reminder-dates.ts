import type { Cycle } from './types.ts';
export type ReminderPreset = 'hour' | 'tomorrow' | 'week' | 'month' | 'cycle';

export function reminderPreset(kind: ReminderPreset, cycles: Pick<Cycle, 'startsAt'>[] = []) {
  const now = new Date();
  const next = new Date(now);
  if (kind === 'hour') {
    next.setHours(next.getHours() + 1);
    next.setSeconds(0, 0);
  }
  if (kind === 'tomorrow') next.setDate(next.getDate() + 1);
  if (kind === 'week') {
    const daysToMonday = (8 - next.getDay()) % 7 || 7;
    next.setDate(next.getDate() + daysToMonday);
  }
  if (kind === 'month') next.setMonth(next.getMonth() + 1);
  if (kind === 'cycle') {
    const upcoming = cycles
      .filter((cycle) => new Date(cycle.startsAt) > now)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
    if (!upcoming) return;
    next.setTime(new Date(upcoming.startsAt).getTime());
  }
  if (kind !== 'hour') next.setHours(9, 0, 0, 0);
  return next;
}
