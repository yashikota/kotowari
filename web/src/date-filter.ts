export function dateBeforePeriod(now: Date, period: string): Date | undefined {
  const match = /^last:(\d+)([dwmy])$/.exec(period);
  if (!match) return undefined;
  const amount = Number(match[1]);
  const result = new Date(now);
  if (match[2] === 'd') result.setDate(result.getDate() - amount);
  if (match[2] === 'w') result.setDate(result.getDate() - amount * 7);
  if (match[2] === 'm') {
    const day = result.getDate();
    result.setDate(1);
    result.setMonth(result.getMonth() - amount);
    const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
    result.setDate(Math.min(day, lastDay));
  }
  if (match[2] === 'y') {
    const month = result.getMonth();
    const day = result.getDate();
    result.setFullYear(result.getFullYear() - amount);
    if (result.getMonth() !== month) {
      result.setDate(0);
      result.setMonth(month);
    } else if (result.getDate() !== day) {
      result.setDate(0);
    }
  }
  return result;
}

export type DocumentDateFilter = {
  field: 'createdAt' | 'updatedAt';
  range: string;
  from: string;
  to: string;
};
export function matchesDocumentDate(
  value: string,
  filter: DocumentDateFilter,
  now = new Date(),
): boolean {
  if (filter.range === 'all') return true;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return false;
  if (filter.range === 'custom') {
    const date = new Date(timestamp);
    const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return (!filter.from || day >= filter.from) && (!filter.to || day <= filter.to);
  }
  const threshold = dateBeforePeriod(now, filter.range);
  return !!threshold && timestamp >= threshold.getTime();
}
