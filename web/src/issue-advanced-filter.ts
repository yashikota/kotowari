import type { Issue } from './types.ts';

export type IssueFilterField =
  | 'status'
  | 'creator'
  | 'assignee'
  | 'priority'
  | 'type'
  | 'estimate'
  | 'project'
  | 'cycle'
  | 'label'
  | 'dueDate'
  | 'createdAt'
  | 'updatedAt'
  | 'startedAt'
  | 'completedAt'
  | 'cycleAddedAt'
  | 'milestone'
  | 'relation'
  | 'content'
  | 'links'
  | 'recurring'
  | 'title'
  | 'identifier';

export type IssueFilterOperator =
  | 'is'
  | 'isNot'
  | 'contains'
  | 'doesNotContain'
  | 'before'
  | 'after'
  | 'onOrBefore'
  | 'onOrAfter'
  | 'isEmpty'
  | 'isNotEmpty';

export type IssueFilterCondition = {
  kind: 'condition';
  field?: IssueFilterField;
  operator?: IssueFilterOperator;
  value?: string;
};

export type IssueFilterGroup = {
  kind: 'group';
  operator: 'and' | 'or';
  children: IssueFilterNode[];
};

export type IssueFilterNode = IssueFilterCondition | IssueFilterGroup;
export type IssueFilterChoice = { value: string; label: string };
export type IssueFilterChoices = Partial<Record<IssueFilterField, IssueFilterChoice[]>>;

const ISSUE_FILTER_FIELDS = new Set<IssueFilterField>([
  'status',
  'creator',
  'assignee',
  'priority',
  'type',
  'estimate',
  'project',
  'cycle',
  'label',
  'dueDate',
  'createdAt',
  'updatedAt',
  'startedAt',
  'completedAt',
  'cycleAddedAt',
  'milestone',
  'relation',
  'content',
  'links',
  'recurring',
  'title',
  'identifier',
]);

const DATE_FIELDS = new Set<IssueFilterField>([
  'dueDate',
  'createdAt',
  'updatedAt',
  'startedAt',
  'completedAt',
  'cycleAddedAt',
]);

const TEXT_FIELDS = new Set<IssueFilterField>(['title', 'identifier', 'content', 'milestone']);

export function parseIssueFilterGroup(value: unknown): IssueFilterGroup | undefined {
  let parsed = value;
  if (typeof parsed === 'string') {
    if (parsed.length > 12_000) return undefined;
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return undefined;
    }
  }

  let visited = 0;
  function parseNode(node: unknown, depth: number): IssueFilterNode | undefined {
    visited += 1;
    if (visited > 80 || depth > 6 || !node || typeof node !== 'object') return undefined;
    const candidate = node as Record<string, unknown>;
    if (candidate.kind === 'group') {
      if (candidate.operator !== 'and' && candidate.operator !== 'or') return undefined;
      if (
        candidate.children !== undefined &&
        candidate.children !== null &&
        !Array.isArray(candidate.children)
      ) {
        return undefined;
      }
      if (Array.isArray(candidate.children) && candidate.children.length > 40) return undefined;
      return {
        kind: 'group',
        operator: candidate.operator,
        children: (Array.isArray(candidate.children) ? candidate.children : [])
          .map((child) => parseNode(child, depth + 1))
          .filter((child): child is IssueFilterNode => child !== undefined),
      };
    }
    if (candidate.kind !== 'condition') return undefined;
    const field = ISSUE_FILTER_FIELDS.has(candidate.field as IssueFilterField)
      ? (candidate.field as IssueFilterField)
      : undefined;
    const operator =
      candidate.operator === 'is' ||
      candidate.operator === 'isNot' ||
      candidate.operator === 'contains' ||
      candidate.operator === 'doesNotContain' ||
      candidate.operator === 'before' ||
      candidate.operator === 'after' ||
      candidate.operator === 'onOrBefore' ||
      candidate.operator === 'onOrAfter' ||
      candidate.operator === 'isEmpty' ||
      candidate.operator === 'isNotEmpty'
        ? candidate.operator
        : undefined;
    if (field && operator) {
      const validOperator =
        operator === 'isEmpty' ||
        operator === 'isNotEmpty' ||
        (DATE_FIELDS.has(field)
          ? ['is', 'isNot', 'before', 'after', 'onOrBefore', 'onOrAfter'].includes(operator)
          : TEXT_FIELDS.has(field)
            ? ['contains', 'doesNotContain'].includes(operator)
            : operator === 'is' || operator === 'isNot');
      if (!validOperator) return undefined;
    }
    return {
      kind: 'condition',
      field,
      operator,
      value:
        typeof candidate.value === 'string' && candidate.value.length <= 240
          ? candidate.value
          : undefined,
    };
  }

  const result = parseNode(parsed, 0);
  return result?.kind === 'group' ? result : undefined;
}

function fieldValue(
  issue: Issue,
  field: IssueFilterField,
  issues: readonly Issue[],
): string | undefined {
  switch (field) {
    case 'status':
      return issue.workflowStatus ?? issue.status;
    case 'creator':
      return issue.creator ?? 'self';
    case 'assignee':
      return issue.assignee ?? 'none';
    case 'priority':
      return String(issue.priority);
    case 'type':
      return issue.type;
    case 'estimate':
      return issue.estimate == null ? 'none' : String(issue.estimate);
    case 'project':
      return issue.projectSlug ?? (issue.projectId === null ? 'none' : String(issue.projectId));
    case 'cycle':
      return issue.cycleId === null ? 'none' : String(issue.cycleId);
    case 'label':
      return issue.labels.length ? issue.labels.map((label) => label.name).join('\0') : 'none';
    case 'dueDate':
      return issue.dueDate?.slice(0, 10) ?? 'none';
    case 'createdAt':
      return issue.createdAt.slice(0, 10);
    case 'updatedAt':
      return issue.updatedAt.slice(0, 10);
    case 'startedAt':
      return issue.startedAt?.slice(0, 10) ?? 'none';
    case 'completedAt':
      return issue.completedAt?.slice(0, 10) ?? 'none';
    case 'cycleAddedAt':
      return issue.cycleAddedAt?.slice(0, 10) ?? 'none';
    case 'milestone':
      return issue.milestoneName ?? 'none';
    case 'relation': {
      const relations = new Set<string>();
      if (issues.some((candidate) => candidate.parentId === issue.id)) relations.add('parent');
      if (issue.parentId !== null) relations.add('subissue');
      if (issue.relations.some((relation) => relation.kind === 'blockedBy')) {
        relations.add('blocked');
      }
      if (issue.relations.some((relation) => relation.kind === 'blocks')) relations.add('blocking');
      if (
        issue.relations.some(
          (relation) => relation.kind === 'duplicateOf' || relation.kind === 'duplicateBy',
        )
      ) {
        relations.add('duplicate');
      }
      if (issue.relations.length > 0) relations.add('related');
      if (issue.recurringSlug) relations.add('recurring');
      return relations.size ? [...relations].join('\0') : 'none';
    }
    case 'content':
      return `${issue.title}\0${issue.identifier}\0${issue.body}`;
    case 'links':
      return issue.externalLinks.length > 0 ? 'yes' : 'no';
    case 'recurring':
      return issue.recurringSlug ? 'yes' : 'no';
    case 'title':
      return issue.title;
    case 'identifier':
      return issue.identifier;
  }
}

function matchesCondition(
  issue: Issue,
  condition: IssueFilterCondition,
  issues: readonly Issue[],
): boolean {
  if (!condition.field || !condition.operator) return true;
  const actual = fieldValue(issue, condition.field, issues);
  if (condition.operator === 'isEmpty')
    return actual === undefined || actual === 'none' || actual === '';
  if (condition.operator === 'isNotEmpty') {
    return actual !== undefined && actual !== 'none' && actual !== '';
  }
  if (condition.value === undefined) return true;
  if (actual === undefined) return condition.operator === 'isNot';
  if (condition.field === 'label' || condition.field === 'relation') {
    const matches =
      actual === 'none' ? condition.value === 'none' : actual.split('\0').includes(condition.value);
    return condition.operator === 'isNot' ? !matches : matches;
  }
  const actualValue = actual.toLocaleLowerCase();
  const expectedValue = condition.value.toLocaleLowerCase();
  if (condition.operator === 'contains') return actualValue.includes(expectedValue);
  if (condition.operator === 'doesNotContain') return !actualValue.includes(expectedValue);
  if (DATE_FIELDS.has(condition.field)) {
    const actualDate = actual.slice(0, 10);
    switch (condition.operator) {
      case 'before':
        return actual !== 'none' && actualDate < condition.value;
      case 'after':
        return actual !== 'none' && actualDate > condition.value;
      case 'onOrBefore':
        return actual !== 'none' && actualDate <= condition.value;
      case 'onOrAfter':
        return actual !== 'none' && actualDate >= condition.value;
    }
  }
  const matches = actualValue === expectedValue;
  return condition.operator === 'isNot' ? !matches : matches;
}

export function matchesIssueFilterGroup(
  issue: Issue,
  group: IssueFilterGroup,
  issues: readonly Issue[] = [issue],
): boolean {
  const matches = (group.children ?? []).map((child) =>
    child.kind === 'group'
      ? matchesIssueFilterGroup(issue, child, issues)
      : matchesCondition(issue, child, issues),
  );
  return group.operator === 'or' ? matches.some(Boolean) : matches.every(Boolean);
}
