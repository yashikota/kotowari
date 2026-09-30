import { describe, expect, it } from 'vite-plus/test';
import type { Cycle, Initiative, Issue, Project } from './types.ts';
import { cycleCalendarICS, cycleGoogleCalendarURL, cycleIssuesCSV } from './cycle-export.ts';
import i18n from './i18n/index.ts';

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

describe('cycleGoogleCalendarURL', () => {
  it('creates a Google Calendar all-day template with the cycle context', () => {
    const url = new URL(
      cycleGoogleCalendarURL(
        {
          number: 7,
          name: 'Release planning',
          description: 'Review the release checklist.',
          startsAt: '2026-09-21T00:00:00Z',
          endsAt: '2026-09-27T00:00:00Z',
        } as Cycle,
        'http://localhost:5108/cycles/7',
      ),
    );

    expect(url.origin).toBe('https://calendar.google.com');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('text')).toBe('Release planning');
    expect(url.searchParams.get('dates')).toBe('20260921/20260928');
    expect(url.searchParams.get('details')).toBe(
      'Cycle 7\nReview the release checklist.\nhttp://localhost:5108/cycles/7',
    );
  });
});

describe('cycleIssuesCSV', () => {
  it('matches Linear’s cycle export schema and includes the full issue record', async () => {
    const issue = {
      id: 42,
      identifier: 'ENBU-42',
      title: '=HYPERLINK("https://example.com","open")',
      body: 'Plan, carefully.',
      status: 'in_progress',
      priority: 3,
      estimate: 2,
      projectId: 7,
      milestoneId: 9,
      milestoneName: 'Beta',
      cycleId: 11,
      cycleNumber: 11,
      parentId: 8,
      parentIdentifier: 'ENBU-8',
      assignee: 'self',
      creator: 'agent',
      labels: [
        { id: 1, name: 'Bug' },
        { id: 2, name: 'Feature' },
      ],
      relations: [
        { id: 1, kind: 'related', targetIdentifier: 'ENBU-12' },
        { id: 2, kind: 'blockedBy', targetIdentifier: 'ENBU-9' },
        { id: 3, kind: 'duplicateOf', targetIdentifier: 'ENBU-5' },
      ],
      dueDate: '2026-09-25',
      createdAt: '2026-09-24T00:00:00Z',
      updatedAt: '2026-09-24T00:00:00Z',
      startedAt: '2026-09-20T12:00:00Z',
      statusChangedAt: '2026-09-24T00:00:00Z',
      completedAt: null,
    } as Issue;
    const cycle = {
      id: 11,
      number: 11,
      name: 'Sprint 11',
      startsAt: '2026-09-20T15:00:00.000Z',
      endsAt: '2026-09-27T15:00:00.000Z',
    } as Cycle;

    const previousLanguage = i18n.language;
    await i18n.changeLanguage('ja');
    const csv = cycleIssuesCSV([issue], {
      cycle,
      projects: [
        {
          id: 7,
          name: 'Release',
          slug: 'release',
          initiativeSlugs: ['quality'],
        } as Project,
      ],
      initiatives: [{ slug: 'quality', name: 'Quality' } as Initiative],
      exportedAt: new Date('2026-09-24T01:00:00Z'),
    });
    await i18n.changeLanguage(previousLanguage);

    expect(csv.split('\r\n')[0]).toBe(
      '"ID","Team","Title","Description","Status","Estimate","Priority","Project ID","Project","Creator","Assignee","Labels","Cycle Number","Cycle Name","Cycle Start","Cycle End","Created","Updated","Started","Triaged","Completed","Canceled","Archived","Due Date","Parent issue","Initiatives","Project Milestone ID","Project Milestone","SLA Status","UUID","Time in status (minutes)","Related to","Blocked by","Duplicate of"',
    );
    expect(csv).toContain(
      '"ENBU-42","enbu","\'=HYPERLINK(""https://example.com"",""open"")","Plan, carefully.","進行中","2","中","7","Release","Agent","Me","Bug, Feature","11","Sprint 11","2026-09-20T15:00:00.000Z","2026-09-27T15:00:00.000Z"',
    );
    expect(csv).toContain(
      '"2026-09-24T00:00:00Z","2026-09-24T00:00:00Z","2026-09-20T12:00:00Z","","","","","2026-09-25","ENBU-8","Quality","9","Beta","","","60","ENBU-12","ENBU-9","ENBU-5"',
    );
  });

  it('exports a header row for cycles without issues', () => {
    expect(cycleIssuesCSV([])).toBe(
      '"ID","Team","Title","Description","Status","Estimate","Priority","Project ID","Project","Creator","Assignee","Labels","Cycle Number","Cycle Name","Cycle Start","Cycle End","Created","Updated","Started","Triaged","Completed","Canceled","Archived","Due Date","Parent issue","Initiatives","Project Milestone ID","Project Milestone","SLA Status","UUID","Time in status (minutes)","Related to","Blocked by","Duplicate of"\r\n',
    );
  });
});
