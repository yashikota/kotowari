import type { IssueSearch } from './issue-search.ts';

export function toggleIssueLinkSource(search: IssueSearch, value: string): IssueSearch {
  const current = search.linkSources ?? [];
  const next = current.includes(value)
    ? current.filter((source) => source !== value)
    : [...current, value];
  return { linkSources: next.length > 0 ? next : undefined };
}

export function toggleIssueTemplate(search: IssueSearch, value: string): IssueSearch {
  const current = search.templateSlugs ?? [];
  const next = current.includes(value)
    ? current.filter((slug) => slug !== value)
    : [...current, value];
  return { templateSlugs: next.length > 0 ? next : undefined };
}

export function toggleIssueLabel(search: IssueSearch, name: string): IssueSearch {
  const currentLabels = (search.labels ?? '')
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean);
  const next = currentLabels.includes(name)
    ? currentLabels.filter((label) => label !== name)
    : [...currentLabels, name];
  const currentOperator =
    search.labelOperator ?? (currentLabels.length > 1 ? 'includeAll' : 'includeAny');
  const nextOperator =
    next.length === 0
      ? undefined
      : next.length > 1 && currentLabels.length < 2 && currentOperator === 'includeAny'
        ? 'includeAll'
        : next.length === 1 && currentOperator === 'includeAll'
          ? 'includeAny'
          : currentOperator;
  return { labels: next.length ? next.join(',') : undefined, labelOperator: nextOperator };
}

export function setIssueLabelOperator(value: string): IssueSearch | null {
  if (!['includeAny', 'includeAll', 'excludeAny', 'excludeAll'].includes(value)) return null;
  return { labelOperator: value as NonNullable<IssueSearch['labelOperator']> };
}

export function toggleIssueProjectLabel(search: IssueSearch, name: string): IssueSearch {
  const current = search.projectLabels ?? [];
  const next =
    name === '__none__'
      ? current.includes('__none__')
        ? []
        : ['__none__']
      : current.includes(name)
        ? current.filter((label) => label !== name && label !== '__none__')
        : [...current.filter((label) => label !== '__none__'), name];
  return { projectLabels: next.length ? next : undefined };
}

export function toggleIssueAddedToCycle(
  search: IssueSearch,
  phase: NonNullable<IssueSearch['addedToCycle']>[number],
): IssueSearch {
  const current = search.addedToCycle ?? [];
  const next = current.includes(phase)
    ? current.filter((value) => value !== phase)
    : [...current, phase];
  return { addedToCycle: next.length ? next : undefined };
}

export function clearIssueSearchFilters(): IssueSearch {
  return {
    status: undefined,
    statuses: undefined,
    priority: undefined,
    priorities: undefined,
    assignee: undefined,
    subscribers: undefined,
    project: undefined,
    cycle: undefined,
    type: undefined,
    estimate: undefined,
    estimates: undefined,
    noEstimate: undefined,
    dueDate: undefined,
    relation: undefined,
    linkSources: undefined,
    templateSlugs: undefined,
    content: undefined,
    milestoneName: undefined,
    dateField: undefined,
    dateRange: undefined,
    projectStatus: undefined,
    projectPriority: undefined,
    projectLabels: undefined,
    addedToCycle: undefined,
    advancedFilter: undefined,
    advancedFilterGroup: undefined,
    labels: undefined,
    labelOperator: undefined,
  };
}

export function lastIssueSearchFilterKey(search: IssueSearch): string | null {
  const selectedStatuses = search.statuses ?? (search.status ? [search.status] : []);
  const selectedPriorities =
    search.priorities ?? (search.priority === undefined ? [] : [search.priority]);
  const selectedEstimates =
    search.estimates ?? (search.estimate === undefined ? [] : [search.estimate]);
  const candidates = [
    ...(selectedStatuses.length ? ['statuses'] : []),
    ...(search.assignee ? ['assignee'] : []),
    ...(search.subscribers ? ['subscribers'] : []),
    ...(search.project ? ['project'] : []),
    ...(search.cycle ? ['cycle'] : []),
    ...(selectedPriorities.length ? ['priorities'] : []),
    ...(search.type ? ['type'] : []),
    ...(selectedEstimates.length || search.noEstimate ? ['estimates'] : []),
    ...(search.dueDate ? ['dueDate'] : []),
    ...(search.relation ? ['relation'] : []),
    ...(search.linkSources ?? []).map((source) => `linkSource:${source}`),
    ...(search.templateSlugs ?? []).map((slug) => `template:${slug}`),
    ...(search.content ? ['content'] : []),
    ...(search.milestoneName ? ['milestoneName'] : []),
    ...(search.projectStatus ? ['projectStatus'] : []),
    ...(search.projectPriority !== undefined ? ['projectPriority'] : []),
    ...(search.dateField && search.dateRange && search.dateRange !== 'custom' ? ['date'] : []),
    ...(search.advancedFilter && search.advancedFilterGroup?.children.length
      ? ['advancedFilter']
      : []),
    ...(search.labels ?? '')
      .split(',')
      .map((label) => label.trim())
      .filter(Boolean)
      .map((label) => `label:${label}`),
    ...(search.projectLabels ?? []).map((label) => `projectLabel:${label}`),
    ...(search.addedToCycle ?? []).map((phase) => `addedToCycle:${phase}`),
  ];
  return candidates.at(-1) ?? null;
}

export function removeIssueFilter(search: IssueSearch, key: string): IssueSearch | null {
  if (key.startsWith('linkSource:')) {
    const current = search.linkSources ?? [];
    const next = current.filter((source) => source !== key.slice('linkSource:'.length));
    return { linkSources: next.length > 0 ? next : undefined };
  }
  if (key.startsWith('template:')) {
    const current = search.templateSlugs ?? [];
    const next = current.filter((slug) => slug !== key.slice('template:'.length));
    return { templateSlugs: next.length > 0 ? next : undefined };
  }
  if (key.startsWith('label:')) {
    const currentLabels = (search.labels ?? '')
      .split(',')
      .map((label) => label.trim())
      .filter(Boolean);
    const next = currentLabels.filter((label) => label !== key.slice(6));
    const nextOperator =
      next.length === 0
        ? undefined
        : next.length === 1 && search.labelOperator === 'includeAll'
          ? 'includeAny'
          : search.labelOperator;
    return {
      labels: next.length > 0 ? next.join(',') : undefined,
      labelOperator: nextOperator,
    };
  }
  if (key.startsWith('projectLabel:')) {
    const current = search.projectLabels ?? [];
    const next = current.filter((label) => label !== key.slice(13));
    return { projectLabels: next.length > 0 ? next : undefined };
  }
  if (key.startsWith('addedToCycle:')) {
    const current = search.addedToCycle ?? [];
    const next = current.filter((phase) => phase !== key.slice('addedToCycle:'.length));
    return { addedToCycle: next.length ? next : undefined };
  }

  const supportedKeys = [
    'status',
    'statuses',
    'priority',
    'priorities',
    'assignee',
    'subscribers',
    'project',
    'cycle',
    'type',
    'estimate',
    'estimates',
    'noEstimate',
    'dueDate',
    'relation',
    'content',
    'milestoneName',
    'date',
    'projectStatus',
    'projectPriority',
    'advancedFilter',
  ];
  if (!supportedKeys.includes(key)) return null;
  if (key === 'advancedFilter')
    return { advancedFilter: undefined, advancedFilterGroup: undefined };
  if (key === 'date') return { dateField: undefined, dateRange: undefined };
  if (key === 'status' || key === 'statuses') return { status: undefined, statuses: undefined };
  if (key === 'priority' || key === 'priorities')
    return { priority: undefined, priorities: undefined };
  if (key === 'estimate' || key === 'estimates' || key === 'noEstimate') {
    return { estimate: undefined, estimates: undefined, noEstimate: undefined };
  }
  return { [key]: undefined } as IssueSearch;
}
