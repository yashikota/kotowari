const CYCLE_PROGRESS_OPEN_KEY = 'kotowari.cycle-progress-open.v1';

export function readCycleProgressOpen(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(CYCLE_PROGRESS_OPEN_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function writeCycleProgressOpen(open: boolean) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CYCLE_PROGRESS_OPEN_KEY, String(open));
  } catch {
    // Keep the view usable when browser storage is unavailable.
  }
}

export function cycleURL(number: number) {
  return new URL(`${import.meta.env.BASE_URL}cycles/${number}`, window.location.origin).toString();
}

export function cycleCalendarFeedURL(number: number) {
  return new URL(
    `${import.meta.env.BASE_URL}api/cycles/${number}/calendar.ics`,
    window.location.origin,
  ).toString();
}
