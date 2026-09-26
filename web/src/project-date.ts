const DATE_PATTERN = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/;
const MONTH_PATTERN = /^(\d{4})[-/](\d{1,2})$/;
const JAPANESE_DATE_PATTERN = /^(\d{4})年\s*(\d{1,2})月(?:\s*(\d{1,2})日?)?$/;
const QUARTER_PATTERN =
  /^(?:q([1-4])\s*(\d{4})?|第([1-4])四半期(?:\s*(\d{4}))?|\s*(\d{4})\s*q([1-4]))$/i;
const HALF_YEAR_PATTERN =
  /^(?:h([12])\s*(\d{4})?|([12])半期(?:\s*(\d{4}))?|\s*(\d{4})\s*h([12]))$/i;

function dateString(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function projectDateString(date: Date): string {
  return `${String(date.getUTCFullYear()).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function parseStoredProjectDate(value: string): Date | null {
  const match = DATE_PATTERN.exec(value.trim());
  if (!match || !dateString(Number(match[1]), Number(match[2]), Number(match[3]))) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

export function parseProjectDate(input: string, now = new Date()): string | null {
  const value = input.trim().replace(/,/g, ' ');
  if (!value) return null;

  const date = DATE_PATTERN.exec(value);
  if (date) return dateString(Number(date[1]), Number(date[2]), Number(date[3]));

  const japanese = JAPANESE_DATE_PATTERN.exec(value);
  if (japanese) {
    const [, year, month, day] = japanese;
    return dateString(Number(year), Number(month), Number(day || '1'));
  }

  const month = MONTH_PATTERN.exec(value);
  if (month) return dateString(Number(month[1]), Number(month[2]), 1);

  const quarter = QUARTER_PATTERN.exec(value);
  if (quarter) {
    const number = Number(quarter[1] || quarter[3] || quarter[6]);
    const year = Number(quarter[2] || quarter[4] || quarter[5] || now.getFullYear());
    return dateString(year, (number - 1) * 3 + 1, 1);
  }

  const halfYear = HALF_YEAR_PATTERN.exec(value);
  if (halfYear) {
    const number = Number(halfYear[1] || halfYear[2] || halfYear[5]);
    const year = Number(halfYear[2] || halfYear[4] || halfYear[5] || now.getFullYear());
    return dateString(year, number === 1 ? 1 : 7, 1);
  }

  const year = /^(\d{4})年?$/.exec(value);
  if (year) return dateString(Number(year[1]), 1, 1);

  const englishMonth = /^([a-z]+)\s+(\d{4})$/i.exec(value);
  if (englishMonth) {
    const parsed = new Date(`${englishMonth[1]} 1, ${englishMonth[2]} UTC`);
    if (!Number.isNaN(parsed.getTime()) && parsed.getUTCDate() === 1)
      return dateString(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, 1);
  }

  const bareMonth = /^[a-z]+$/i.test(value) ? value : '';
  if (bareMonth) {
    const parsed = new Date(`${bareMonth} 1, ${now.getFullYear()} UTC`);
    if (!Number.isNaN(parsed.getTime()) && parsed.getUTCDate() === 1)
      return dateString(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, 1);
  }

  return null;
}

export function projectDateMonthGrid(year: number, monthIndex: number): Date[] {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const start = new Date(Date.UTC(year, monthIndex, 1 - first.getUTCDay()));
  return Array.from(
    { length: 42 },
    (_, index) =>
      new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + index)),
  );
}
