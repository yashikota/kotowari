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

export type IssueCSVContext = {
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

export function issuesCSV(issues: Issue[], context: IssueCSVContext = {}): string {
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
      (issue.creator ?? 'self') === 'agent' ? 'Agent' : 'Me',
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

export function downloadIssuesCSV(
  issues: Issue[],
  filename: string,
  context: IssueCSVContext = {},
) {
  const content = `\uFEFF${issuesCSV(issues, context)}`;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
