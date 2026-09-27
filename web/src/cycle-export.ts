import { issueStatusLabel, priorityLabel } from './i18n/labels.ts';
import type { Cycle, Initiative, Issue, Project } from './types.ts';

const columns = [
  'ID',
  'Team',
  'Title',
  'Description',
  'Status',
  'Estimate',
  'Priority',
  'Project ID',
  'Project',
  'Creator',
  'Assignee',
  'Labels',
  'Cycle Number',
  'Cycle Name',
  'Cycle Start',
  'Cycle End',
  'Created',
  'Updated',
  'Started',
  'Triaged',
  'Completed',
  'Canceled',
  'Archived',
  'Due Date',
  'Parent issue',
  'Initiatives',
  'Project Milestone ID',
  'Project Milestone',
  'SLA Status',
  'UUID',
  'Time in status (minutes)',
  'Related to',
  'Blocked by',
  'Duplicate of',
] as const;

export type CycleIssuesCSVContext = {
  cycle?: Cycle;
  cycles?: Cycle[];
  projects?: Project[];
  initiatives?: Initiative[];
  exportedAt?: Date;
};

function csvCell(value: string | number | null | undefined): string {
  let text = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function issueTeam(identifier: string): string {
  return identifier.match(/^([a-z\d_-]+)-\d+$/i)?.[1]?.toLowerCase() ?? '';
}

function relationTargets(issue: Issue, kinds: Issue['relations'][number]['kind'][]): string {
  return issue.relations
    .filter((relation) => kinds.includes(relation.kind))
    .map((relation) => relation.targetIdentifier)
    .sort((left, right) => left.localeCompare(right))
    .join(', ');
}

function minutesInCurrentStatus(issue: Issue, exportedAt: Date): number | '' {
  const changedAt = Date.parse(issue.statusChangedAt ?? '');
  if (!Number.isFinite(changedAt)) return '';
  return Math.max(0, Math.floor((exportedAt.getTime() - changedAt) / 60_000));
}

export function cycleIssuesCSV(issues: Issue[], context: CycleIssuesCSVContext = {}): string {
  const cycleById = new Map((context.cycles ?? []).map((cycle) => [cycle.id, cycle]));
  if (context.cycle) cycleById.set(context.cycle.id, context.cycle);
  const projectById = new Map((context.projects ?? []).map((project) => [project.id, project]));
  const initiativeBySlug = new Map(
    (context.initiatives ?? []).map((initiative) => [initiative.slug, initiative.name]),
  );
  const exportedAt = context.exportedAt ?? new Date();
  const rows = [columns.map(csvCell).join(',')];

  for (const issue of issues) {
    const project = issue.projectId == null ? undefined : projectById.get(issue.projectId);
    const cycle =
      (issue.cycleId == null ? undefined : cycleById.get(issue.cycleId)) ??
      (issue.cycleNumber === context.cycle?.number ? context.cycle : undefined);
    const initiatives = (project?.initiativeSlugs ?? [])
      .map((slug) => initiativeBySlug.get(slug) ?? slug)
      .join(', ');
    const values = [
      issue.identifier,
      issueTeam(issue.identifier),
      issue.title,
      issue.body,
      issue.workflowStatus && issue.workflowStatus !== issue.status
        ? issue.workflowStatus
        : issueStatusLabel(issue.status),
      issue.estimate,
      priorityLabel(issue.priority),
      issue.projectId,
      project?.name ?? '',
      '', // The local, single-user issue model does not record a separate creator identity.
      issue.assignee === 'self' ? 'Me' : issue.assignee === 'agent' ? 'Agent' : '',
      issue.labels.map((label) => label.name).join(', '),
      issue.cycleNumber ?? cycle?.number ?? '',
      cycle?.name || (cycle ? `Cycle ${cycle.number}` : ''),
      cycle?.startsAt ?? '',
      cycle?.endsAt ?? '',
      issue.createdAt,
      issue.updatedAt,
      issue.startedAt ?? '',
      '', // Triage timestamps are not tracked by Kotowari yet.
      issue.status === 'done' ? (issue.completedAt ?? '') : '',
      issue.status === 'canceled' ? (issue.completedAt ?? '') : '',
      issue.archivedAt ?? '',
      issue.dueDate ?? '',
      issue.parentIdentifier ?? '',
      initiatives,
      issue.milestoneId,
      issue.milestoneName ?? '',
      '', // SLA tracking is not part of the local issue model.
      '', // Kotowari uses numeric local IDs rather than UUIDs.
      minutesInCurrentStatus(issue, exportedAt),
      relationTargets(issue, ['related']),
      relationTargets(issue, ['blockedBy']),
      relationTargets(issue, ['duplicateOf']),
    ];
    rows.push(values.map(csvCell).join(','));
  }

  return `${rows.join('\r\n')}\r\n`;
}

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
