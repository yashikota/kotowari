import type { Project } from './types.ts';

const DAY_MS = 86_400_000;

export type ProjectTimelineModel = {
  startMonth: string;
  totalDays: number;
  todayPosition: number | null;
  months: { key: string; label: string; year: string; left: number; width: number }[];
  weeks: { key: string; label: string; left: number; width: number }[];
  groups: { key: string; label: string; projects: Project[] }[];
};

function monthKey(year: number, month: number) {
  const value = new Date(Date.UTC(year, month, 1));
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function shiftProjectTimelineMonth(key: string, offset: number) {
  const [year, month] = key.split('-').map(Number);
  return monthKey(year!, month! - 1 + offset);
}

function monthOrdinal(key: string) {
  const [year, month] = key.split('-').map(Number);
  return Date.UTC(year!, month! - 1, 1) / DAY_MS;
}

function dateOrdinal(value: Date) {
  return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / DAY_MS;
}

export function defaultProjectTimelineStart(now = new Date()) {
  const currentMonth = monthKey(now.getFullYear(), now.getMonth());
  return shiftProjectTimelineMonth(currentMonth, -8);
}

export function buildProjectTimelineModel({
  startMonth,
  language,
  groups,
  now = new Date(),
}: {
  startMonth: string;
  language: string;
  groups: ProjectTimelineModel['groups'];
  now?: Date;
}): ProjectTimelineModel {
  const startOrdinal = monthOrdinal(startMonth);
  const endOrdinal = monthOrdinal(shiftProjectTimelineMonth(startMonth, 16));
  const totalDays = endOrdinal - startOrdinal;
  const months = Array.from({ length: 16 }, (_, index) => {
    const key = shiftProjectTimelineMonth(startMonth, index);
    const monthStart = monthOrdinal(key);
    const nextMonth = monthOrdinal(shiftProjectTimelineMonth(key, 1));
    const [year, month] = key.split('-').map(Number);
    return {
      key,
      label: new Intl.DateTimeFormat(language, { month: 'short', timeZone: 'UTC' }).format(
        new Date(Date.UTC(year, month - 1, 1)),
      ),
      year: String(year),
      left: ((monthStart - startOrdinal) / totalDays) * 100,
      width: ((nextMonth - monthStart) / totalDays) * 100,
    };
  });
  const firstDayOfWeek = new Date(startOrdinal * DAY_MS).getUTCDay();
  const firstWeekStart = startOrdinal - ((firstDayOfWeek + 6) % 7);
  const weeks: ProjectTimelineModel['weeks'] = [];
  for (let weekStart = firstWeekStart; weekStart < endOrdinal; weekStart += 7) {
    const visibleStart = Math.max(weekStart, startOrdinal);
    const visibleEnd = Math.min(weekStart + 7, endOrdinal);
    const thursday = new Date(weekStart * DAY_MS);
    thursday.setUTCDate(thursday.getUTCDate() + 3);
    const januaryFourth = Date.UTC(thursday.getUTCFullYear(), 0, 4) / DAY_MS;
    const weekOneMonday = januaryFourth - ((new Date(januaryFourth * DAY_MS).getUTCDay() + 6) % 7);
    const weekNumber = Math.floor((weekStart - weekOneMonday) / 7) + 1;
    weeks.push({
      key: String(weekStart),
      label: `W${String(weekNumber).padStart(2, '0')}`,
      left: ((visibleStart - startOrdinal) / totalDays) * 100,
      width: ((visibleEnd - visibleStart) / totalDays) * 100,
    });
  }
  const todayOrdinal = dateOrdinal(now);
  return {
    startMonth,
    totalDays,
    months,
    weeks,
    todayPosition:
      todayOrdinal >= startOrdinal && todayOrdinal < endOrdinal
        ? ((todayOrdinal - startOrdinal) / totalDays) * 100
        : null,
    groups,
  };
}
