import type { Cycle } from './types.ts';

export { issuesCSV as cycleIssuesCSV } from './issue-export.ts';
export type { IssueCSVContext as CycleIssuesCSVContext } from './issue-export.ts';

function icalText(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .replaceAll('\n', '\\n')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,');
}

function foldCalendarLine(value: string): string {
  const encoder = new TextEncoder();
  const lines: string[] = [];
  let line = '';
  let bytes = 0;
  for (const character of value) {
    const size = encoder.encode(character).length;
    if (bytes + size > 75) {
      lines.push(line);
      line = ` ${character}`;
      bytes = 1 + size;
    } else {
      line += character;
      bytes += size;
    }
  }
  lines.push(line);
  return lines.join('\r\n');
}

export function cycleCalendarICS(cycle: Cycle, url: string): string {
  const startDate = cycle.startsAt.slice(0, 10);
  const end = new Date(`${cycle.endsAt.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(end.getTime())) throw new RangeError('invalid cycle end date');
  end.setUTCDate(end.getUTCDate() + 1);
  const endDate = end.toISOString().slice(0, 10).replaceAll('-', '');
  const name = cycle.name || `Cycle ${cycle.number}`;
  const description = cycle.description ? `\n${cycle.description}` : '';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kotowari//Cycle calendar//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:cycle-${cycle.number}@kotowari.local`,
    `DTSTAMP:${new Date()
      .toISOString()
      .replaceAll(/[-:]/g, '')
      .replaceAll(/\.\d{3}/g, '')}`,
    `DTSTART;VALUE=DATE:${startDate.replaceAll('-', '')}`,
    `DTEND;VALUE=DATE:${endDate}`,
    `SUMMARY:${icalText(name)}`,
    `DESCRIPTION:${icalText(`Cycle ${cycle.number}${description}`)}`,
    `URL:${icalText(url)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(foldCalendarLine).join('\r\n')}\r\n`;
}

export function cycleGoogleCalendarURL(cycle: Cycle, url: string): string {
  const end = new Date(`${cycle.endsAt.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(end.getTime())) throw new RangeError('invalid cycle end date');
  end.setUTCDate(end.getUTCDate() + 1);

  const dates = `${cycle.startsAt.slice(0, 10).replaceAll('-', '')}/${end
    .toISOString()
    .slice(0, 10)
    .replaceAll('-', '')}`;
  const details = [`Cycle ${cycle.number}`, cycle.description?.trim(), url]
    .filter(Boolean)
    .join('\n');
  const query = new URLSearchParams({
    action: 'TEMPLATE',
    text: cycle.name || `Cycle ${cycle.number}`,
    dates,
    details,
  });
  return `https://calendar.google.com/calendar/render?${query.toString()}`;
}
