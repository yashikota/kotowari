import type { Issue } from './types.ts';

export type IssueFilterField =
  | 'status'
  | 'assignee'
  | 'priority'
  | 'type'
  | 'estimate'
  | 'project'
  | 'cycle'
  | 'label'
  | 'title'
  | 'identifier';

export type IssueFilterOperator = 'is' | 'isNot' | 'contains' | 'doesNotContain';

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
  'assignee',
  'priority',
  'type',
  'estimate',
  'project',
  'cycle',
  'label',
  'title',
  'identifier',
]);

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
      candidate.operator === 'doesNotContain'
        ? candidate.operator
        : undefined;
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

function fieldValue(issue: Issue, field: IssueFilterField): string | undefined {
  switch (field) {
    case 'status':
      return issue.workflowStatus ?? issue.status;
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
    case 'title':
      return issue.title;
    case 'identifier':
      return issue.identifier;
  }
}

function matchesCondition(issue: Issue, condition: IssueFilterCondition): boolean {
  if (!condition.field || !condition.operator || condition.value === undefined) return true;
  const actual = fieldValue(issue, condition.field);
  if (actual === undefined) return condition.operator === 'isNot';
  if (condition.field === 'label') {
    const matches =
      actual === 'none' ? condition.value === 'none' : actual.split('\0').includes(condition.value);
    return condition.operator === 'isNot' ? !matches : matches;
  }
  const actualValue = actual.toLocaleLowerCase();
  const expectedValue = condition.value.toLocaleLowerCase();
  if (condition.operator === 'contains') return actualValue.includes(expectedValue);
  if (condition.operator === 'doesNotContain') return !actualValue.includes(expectedValue);
  const matches = actualValue === expectedValue;
  return condition.operator === 'isNot' ? !matches : matches;
}

export function matchesIssueFilterGroup(issue: Issue, group: IssueFilterGroup): boolean {
  const matches = (group.children ?? []).map((child) =>
    child.kind === 'group' ? matchesIssueFilterGroup(issue, child) : matchesCondition(issue, child),
  );
  return group.operator === 'or' ? matches.some(Boolean) : matches.every(Boolean);
}
