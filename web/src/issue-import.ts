import type { Cycle, Issue, IssueStatus, IssueWorkflowStatus, Label, Project } from './types.ts';

export type IssueImportWarning = {
  field:
    | 'status'
    | 'priority'
    | 'estimate'
    | 'type'
    | 'assignee'
    | 'project'
    | 'cycle'
    | 'labels'
    | 'milestone'
    | 'dueDate'
    | 'parent';
  value: string;
};

export type IssueImportPlanRow = {
  rowNumber: number;
  title: string;
  issue: {
    title: string;
    body: string;
    skipDefaultTemplate: true;
    status: IssueStatus;
    workflowStatus: string;
    assignee?: 'self' | 'agent';
    type?: 'bug' | 'feature' | 'improvement' | 'task';
    priority: number;
    estimate?: number;
    projectId?: number;
    milestoneId?: number;
    cycleId?: number;
    parentId?: number;
    labelIds: number[];
    dueDate?: string;
  };
  warnings: IssueImportWarning[];
  error?: 'missingTitle';
};

export type IssueImportContext = {
  statuses: IssueWorkflowStatus[];
  projects: Project[];
  cycles: Cycle[];
  labels: Label[];
  issues: Issue[];
};

function parseCSV(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let afterQuote = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
          afterQuote = true;
        }
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"') {
      if (cell !== '' || afterQuote) throw new Error('INVALID_CSV');
      quoted = true;
    } else if (character === ',') {
      row.push(cell);
      cell = '';
      afterQuote = false;
    } else if (character === '\r' || character === '\n') {
      row.push(cell);
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
      afterQuote = false;
      if (character === '\r' && source[index + 1] === '\n') index += 1;
    } else {
      if (afterQuote && character.trim() !== '') throw new Error('INVALID_CSV');
      if (!afterQuote) cell += character;
    }
  }

  if (quoted) throw new Error('INVALID_CSV');
  row.push(cell);
  if (row.some((value) => value.trim() !== '')) rows.push(row);
  return rows;
}

function headerKey(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[\s_-]+/g, ' ');
}

function column(headers: Map<string, number>, ...names: string[]): number | undefined {
  for (const name of names) {
    const index = headers.get(headerKey(name));
    if (index !== undefined) return index;
  }
  return undefined;
}

function valueAt(row: string[], index: number | undefined, trim = true): string {
  const value = index === undefined ? '' : (row[index] ?? '');
  return trim ? value.trim() : value;
}

function matchName<T>(values: T[], name: string, getName: (value: T) => string): T | undefined {
  const normalized = name.trim().toLocaleLowerCase();
  return normalized
    ? values.find((value) => getName(value).trim().toLocaleLowerCase() === normalized)
    : undefined;
}

function normalizeStatus(
  value: string,
  statuses: IssueWorkflowStatus[],
): IssueWorkflowStatus | undefined {
  const exact =
    matchName(statuses, value, (status) => status.name) ??
    statuses.find((status) => status.id.toLocaleLowerCase() === value.toLocaleLowerCase());
  if (exact) return exact;

  const normalized = value.toLocaleLowerCase().replace(/[_-]+/g, ' ').trim();
  const category: IssueStatus | undefined =
    normalized === 'backlog' ||
    normalized === 'open' ||
    normalized === 'unstarted' ||
    normalized === 'triage' ||
    normalized === 'バックログ'
      ? 'backlog'
      : normalized === 'todo' || normalized === 'to do' || normalized === 'ready'
        ? 'todo'
        : normalized === 'started' ||
            normalized === 'in progress' ||
            normalized === 'inprogress' ||
            normalized === '進行中'
          ? 'in_progress'
          : normalized === 'done' ||
              normalized === 'complete' ||
              normalized === 'completed' ||
              normalized === '完了'
            ? 'done'
            : normalized === 'canceled' ||
                normalized === 'cancelled' ||
                normalized === 'duplicate' ||
                normalized === 'キャンセル' ||
                normalized === '重複'
              ? 'canceled'
              : undefined;
  return category ? statuses.find((status) => status.category === category) : undefined;
}

function priorityNumber(value: string): number | undefined {
  if (!value) return 0;
  const numeric = Number(value);
  if (Number.isInteger(numeric) && numeric >= 0 && numeric <= 4) return numeric;
  switch (value.toLocaleLowerCase()) {
    case 'urgent':
    case '緊急':
      return 1;
    case 'high':
    case '高':
      return 2;
    case 'normal':
    case 'medium':
    case '中':
      return 3;
    case 'low':
    case '低':
      return 4;
    case 'no priority':
    case 'none':
    case '優先度なし':
      return 0;
    default:
      return undefined;
  }
}

function dateOnly(value: string): string | undefined {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value
      ? undefined
      : value;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : new Date(parsed).toISOString().slice(0, 10);
}

export function planIssueCSVImport(
  text: string,
  context: IssueImportContext,
): IssueImportPlanRow[] {
  const records = parseCSV(text);
  if (records.length === 0) throw new Error('EMPTY_CSV');
  if (records.length > 5001) throw new Error('TOO_MANY_ROWS');
  const headerRow = records[0];
  const headers = new Map<string, number>();
  for (const [index, header] of headerRow.entries()) {
    const key = headerKey(header);
    if (!key || headers.has(key)) throw new Error('INVALID_CSV');
    headers.set(key, index);
  }
  if (records.slice(1).some((record) => record.length !== headerRow.length)) {
    throw new Error('INVALID_CSV');
  }
  const titleColumn = column(headers, 'Title');
  if (titleColumn === undefined) throw new Error('MISSING_TITLE_COLUMN');

  const descriptionColumn = column(headers, 'Description', 'Body');
  const statusColumn = column(headers, 'Status');
  const priorityColumn = column(headers, 'Priority');
  const estimateColumn = column(headers, 'Estimate');
  const assigneeColumn = column(headers, 'Assignee');
  const typeColumn = column(headers, 'Type');
  const projectColumn = column(headers, 'Project');
  const cycleNameColumn = column(headers, 'Cycle Name');
  const cycleNumberColumn = column(headers, 'Cycle Number');
  const labelsColumn = column(headers, 'Labels');
  const dueDateColumn = column(headers, 'Due Date');
  const parentColumn = column(headers, 'Parent issue', 'Parent Issue ID');
  const milestoneColumn = column(headers, 'Project Milestone', 'Milestone');

  return records.slice(1, 5001).map((record, index) => {
    const title = valueAt(record, titleColumn);
    const warnings: IssueImportWarning[] = [];
    const rawStatus = valueAt(record, statusColumn);
    const status = normalizeStatus(rawStatus, context.statuses);
    if (rawStatus && !status) warnings.push({ field: 'status', value: rawStatus });
    const resolvedStatus =
      status ??
      context.statuses.find((entry) => entry.category === 'backlog') ??
      context.statuses[0];

    const rawPriority = valueAt(record, priorityColumn);
    const priority = priorityNumber(rawPriority);
    if (rawPriority && priority === undefined)
      warnings.push({ field: 'priority', value: rawPriority });

    const rawEstimate = valueAt(record, estimateColumn);
    const parsedEstimate = rawEstimate ? Number(rawEstimate) : undefined;
    const estimate =
      Number.isInteger(parsedEstimate) && parsedEstimate! >= 0 && parsedEstimate! <= 999
        ? parsedEstimate
        : undefined;
    if (rawEstimate && estimate === undefined)
      warnings.push({ field: 'estimate', value: rawEstimate });

    const rawAssignee = valueAt(record, assigneeColumn);
    const assigneeKey = rawAssignee.toLocaleLowerCase();
    const assignee = ['me', 'self', 'you'].includes(assigneeKey)
      ? 'self'
      : assigneeKey === 'agent'
        ? 'agent'
        : undefined;
    if (rawAssignee && !assignee) warnings.push({ field: 'assignee', value: rawAssignee });

    const rawType = valueAt(record, typeColumn).toLocaleLowerCase();
    const type = ['bug', 'feature', 'improvement', 'task'].includes(rawType)
      ? (rawType as 'bug' | 'feature' | 'improvement' | 'task')
      : undefined;
    if (rawType && !type) warnings.push({ field: 'type', value: rawType });

    const rawProject = valueAt(record, projectColumn);
    const project = matchName(context.projects, rawProject, (item) => item.name);
    if (rawProject && !project) warnings.push({ field: 'project', value: rawProject });

    const rawCycleName = valueAt(record, cycleNameColumn);
    const rawCycleNumber = valueAt(record, cycleNumberColumn);
    const cycle = rawCycleNumber
      ? context.cycles.find((item) => String(item.number) === rawCycleNumber)
      : (matchName(context.cycles, rawCycleName, (item) => item.name ?? `Cycle ${item.number}`) ??
        context.cycles.find((item) => `cycle ${item.number}` === rawCycleName.toLocaleLowerCase()));
    if ((rawCycleName || rawCycleNumber) && !cycle)
      warnings.push({ field: 'cycle', value: rawCycleName || rawCycleNumber });

    const labelNames = valueAt(record, labelsColumn)
      .split(',')
      .map((label) => label.trim())
      .filter(Boolean);
    const labelIds: number[] = [];
    const unknownLabels: string[] = [];
    for (const name of labelNames) {
      const label = matchName(context.labels, name, (item) => item.name);
      if (label) labelIds.push(label.id);
      else unknownLabels.push(name);
    }
    if (unknownLabels.length) warnings.push({ field: 'labels', value: unknownLabels.join(', ') });

    const rawMilestone = valueAt(record, milestoneColumn);
    const milestone =
      project && rawMilestone
        ? project.milestones.find(
            (item) => item.name.toLocaleLowerCase() === rawMilestone.toLocaleLowerCase(),
          )
        : undefined;
    if (rawMilestone && !milestone) warnings.push({ field: 'milestone', value: rawMilestone });

    const rawDueDate = valueAt(record, dueDateColumn);
    const dueDate = dateOnly(rawDueDate);
    if (rawDueDate && !dueDate) warnings.push({ field: 'dueDate', value: rawDueDate });

    const rawParent = valueAt(record, parentColumn);
    const parent = context.issues.find(
      (item) => item.identifier.toLocaleLowerCase() === rawParent.toLocaleLowerCase(),
    );
    if (rawParent && !parent) warnings.push({ field: 'parent', value: rawParent });

    return {
      rowNumber: index + 2,
      title,
      issue: {
        title,
        body: valueAt(record, descriptionColumn, false),
        skipDefaultTemplate: true,
        status: resolvedStatus?.category ?? 'backlog',
        workflowStatus: resolvedStatus?.id ?? 'backlog',
        assignee,
        type,
        priority: priority ?? 0,
        estimate,
        projectId: project?.id,
        milestoneId: milestone?.id,
        cycleId: cycle?.id,
        parentId: parent?.id,
        labelIds,
        dueDate,
      },
      warnings,
      error: title ? undefined : 'missingTitle',
    };
  });
}
