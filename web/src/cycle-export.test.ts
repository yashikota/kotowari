import { describe, expect, it } from 'vite-plus/test';
import type { Cycle, Issue } from './types.ts';
import { cycleCalendarICS, cycleIssuesCSV } from './cycle-export.ts';

describe('cycleCalendarICS', () => {
  it('exports a cycle as an all-day event with an exclusive end date', () => {
    expect(
      cycleCalendarICS(
        {
          number: 7,
          name: 'Release, planning',
          description: 'Design; review\\approve',
          startsAt: '2026-09-21T00:00:00Z',
          endsAt: '2026-09-27T00:00:00Z',
        } as Cycle,
        'https://example.test/cycles/7',
      ),
    ).toContain(
      'DTSTART;VALUE=DATE:20260921\r\nDTEND;VALUE=DATE:20260928\r\nSUMMARY:Release\\, planning\r\nDESCRIPTION:Cycle 7\\nDesign\\; review\\\\approve',
    );
  });

  it('folds long UTF-8 content lines at the calendar octet limit', () => {
    const calendar = cycleCalendarICS(
      {
        number: 8,
        name: '予定'.repeat(30),
        startsAt: '2026-09-21T00:00:00Z',
        endsAt: '2026-09-27T00:00:00Z',
      } as Cycle,
      'https://example.test/cycles/8',
    );
    for (const line of calendar.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });
});

describe('cycleIssuesCSV', () => {
  it('quotes CSV values and prevents spreadsheet formula execution', () => {
    const issue = {
      identifier: 'KOT-1',
      title: '=HYPERLINK("https://example.com","open")',
      status: 'todo',
      priority: 2,
      estimate: 3,
      dueDate: null,
      createdAt: '2026-09-24T00:00:00Z',
      updatedAt: '2026-09-24T00:00:00Z',
    } as Issue;

    expect(cycleIssuesCSV([issue])).toBe(
      '"Identifier","Title","Status","Priority","Estimate","Due date","Created at","Updated at"\r\n' +
        '"KOT-1","\'=HYPERLINK(""https://example.com"",""open"")","todo","2","3","","2026-09-24T00:00:00Z","2026-09-24T00:00:00Z"\r\n',
    );
  });

  it('exports a header row for cycles without issues', () => {
    expect(cycleIssuesCSV([])).toBe(
      '"Identifier","Title","Status","Priority","Estimate","Due date","Created at","Updated at"\r\n',
    );
  });
});
