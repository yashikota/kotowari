import type {
  ADR,
  Activity,
  Comment,
  Cycle,
  Issue,
  IssueLink,
  IssueRelation,
  IssueWorkflowStatus,
  ProjectWorkflowStatus,
  IssueTemplate,
  Label,
  Page,
  Project,
  ProjectDependency,
  RecurringIssue,
  View,
  Workspace,
} from './types.ts';

const now = '2026-09-23T09:00:00Z';
const defaultIssueWorkflowStatuses: IssueWorkflowStatus[] = [
  { id: 'backlog', name: 'Backlog', category: 'backlog' },
  { id: 'todo', name: 'Todo', category: 'todo' },
  { id: 'in_progress', name: 'In Progress', category: 'in_progress' },
  { id: 'done', name: 'Done', category: 'done' },
  { id: 'canceled', name: 'Canceled', category: 'canceled' },
  { id: 'duplicate', name: 'Duplicate', category: 'canceled' },
];
let issueWorkflowStatuses = defaultIssueWorkflowStatuses.map((status) => ({ ...status }));
const defaultProjectWorkflowStatuses: ProjectWorkflowStatus[] = [
  { id: 'backlog', name: 'Backlog', category: 'backlog' },
  { id: 'planned', name: 'Planned', category: 'planned' },
  { id: 'started', name: 'In Progress', category: 'started' },
  { id: 'completed', name: 'Completed', category: 'completed' },
  { id: 'canceled', name: 'Canceled', category: 'canceled' },
];
let projectWorkflowStatuses = defaultProjectWorkflowStatuses.map((status) => ({ ...status }));
function localDateValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const labels: Label[] = [
  { id: 1, name: 'frontend', color: '#7950f2' },
  { id: 2, name: 'backend', color: '#228be6' },
  { id: 3, name: 'design', color: '#e64980' },
];
let workspace: Workspace = {
  name: 'Kotowari Demo',
  timezone: 'Asia/Tokyo',
  locale: 'ja',
  url: 'https://yashikota.github.io/kotowari/',
  description: 'Markdownで管理する、軽量なプロジェクトワークスペース',
  githubUrl: 'https://github.com/yashikota/kotowari',
  issueStatuses: issueWorkflowStatuses,
  projectStatuses: projectWorkflowStatuses,
  updatedAt: now,
};
let projects: Project[] = [
  {
    id: 1,
    name: 'Launch',
    slug: 'launch',
    description: '公開に向けたプロダクト改善',
    status: 'started',
    priority: 0,
    startDate: '2026-09-01',
    targetDate: '2026-10-15',
    labels: ['frontend'],
    progress: 55,
    milestones: [],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 2,
    name: 'Documentation',
    slug: 'docs',
    description: '利用ガイドと設計資料',
    status: 'planned',
    priority: 0,
    startDate: null,
    targetDate: null,
    labels: [],
    progress: 20,
    milestones: [],
    createdAt: now,
    updatedAt: now,
  },
];
let cycles: Cycle[] = [
  {
    id: 1,
    number: 1,
    name: 'Cycle 1',
    description: '',
    startsAt: '2026-09-14',
    endsAt: '2026-09-27',
    status: 'active',
    isFavorite: false,
    resources: [],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 2,
    number: 2,
    name: 'Cycle 2',
    description: '',
    startsAt: '2026-09-28',
    endsAt: '2026-10-11',
    status: 'upcoming',
    isFavorite: false,
    resources: [],
    createdAt: now,
    updatedAt: now,
  },
];
let issues: Issue[] = [
  issue(1, 'デモサイトを公開する', 'in_progress', 1, 1, 1, [labels[0]!, labels[1]!]),
  issue(2, 'オンボーディングを改善する', 'todo', 2, 1, 1, [labels[2]!]),
  issue(3, 'READMEにスクリーンショットを追加', 'backlog', 3, 2, 2, [labels[2]!]),
  issue(4, 'APIのエラー表示を整理する', 'done', 1, 1, 1, [labels[1]!]),
];
let pages: Page[] = [
  {
    id: 1,
    title: 'Getting Started',
    slug: 'getting-started',
    body: '# Getting Started\n\nKotowariへようこそ。左のナビゲーションから課題、プロジェクト、ADRを探索できます。\n\nこのデモでの変更はリロードするとリセットされます。',
    parentId: null,
    projectId: null,
    status: 'accepted',
    date: null,
    tags: ['guide'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 2,
    title: 'Launch checklist',
    slug: 'launch-checklist',
    body: '# Launch checklist\n\n- [x] 基本画面\n- [x] キーボード操作\n- [ ] 公開デモ\n- [ ] ドキュメント',
    parentId: null,
    projectId: 1,
    projectSlug: 'launch',
    status: 'proposed',
    date: null,
    tags: ['launch'],
    createdAt: now,
    updatedAt: now,
  },
];
let adrs: ADR[] = [
  {
    id: 1,
    number: 1,
    identifier: 'ADR-1',
    title: 'Markdownを永続化形式にする',
    body: '# Context\n\nデータをGitと通常のエディタから扱える必要があります。\n\n# Decision\n\n人が読めるMarkdownを正本にします。',
    publishBody: '',
    status: 'accepted',
    evaluation: '',
    replay: '',
    workload: '',
    supersedes: null,
    issueNumbers: [1],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 2,
    number: 2,
    identifier: 'ADR-2',
    title: 'SPAをGoバイナリへ埋め込む',
    body: '# Decision\n\n配布を単一バイナリにするため、ビルド済みSPAを埋め込みます。',
    publishBody: '',
    status: 'proposed',
    evaluation: '',
    replay: '',
    workload: '',
    supersedes: null,
    issueNumbers: [],
    createdAt: now,
    updatedAt: now,
  },
];
let views: View[] = [
  {
    id: 1,
    name: 'Launch backlog',
    slug: 'launch-backlog',
    display: 'board',
    groupBy: 'status',
    subGroupBy: 'none',
    orderBy: 'manual',
    direction: 'asc',
    completedIssues: 'all',
    showSubIssues: true,
    nestedSubIssues: 'showMatching',
    showEmptyGroups: false,
    displayProperties: [
      'id',
      'status',
      'priority',
      'project',
      'dueDate',
      'milestone',
      'cycle',
      'estimate',
      'labels',
      'links',
      'pullRequests',
    ],
    status: null,
    project: 'launch',
    cycle: null,
    labels: [],
    priority: null,
    type: null,
    estimate: null,
    createdAt: now,
    updatedAt: now,
  },
];
let comments: Comment[] = [
  { id: 1, issueId: 1, body: 'GitHub Pagesで公開する方針。', createdAt: now },
];
const issueAttachmentFiles = new Map<string, File>();
let issueTemplates: IssueTemplate[] = [];
let recurringIssues: RecurringIssue[] = [];
let revision = 1;

function issue(
  number: number,
  title: string,
  status: Issue['status'],
  priority: number,
  projectId: number | null,
  cycleId: number | null,
  issueLabels: Label[],
): Issue {
  return {
    id: number,
    number,
    identifier: `KOT-${number}`,
    title,
    body: number === 1 ? 'Actionsからデモを公開し、誰でもすぐ試せるようにする。' : '',
    status,
    workflowStatus: status,
    priority,
    projectId,
    projectSlug: projects.find((p) => p.id === projectId)?.slug,
    milestoneId: null,
    milestoneName: null,
    cycleId,
    cycleNumber: cycles.find((c) => c.id === cycleId)?.number,
    cycleAddedAt: cycleId == null ? null : now,
    parentId: null,
    depth: 0,
    dueDate: null,
    reminderAt: null,
    sortOrder: number,
    labels: issueLabels,
    adrNumbers: number === 1 ? [1] : [],
    externalLinks: [],
    relations: [],
    isFavorite: false,
    createdAt: now,
    updatedAt: now,
    statusChangedAt: now,
    startedAt: status === 'in_progress' ? now : null,
    completedAt: status === 'done' ? now : null,
  };
}

function json(value: unknown, status = 200): Response {
  return new Response(status === 204 ? null : JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
function body(init?: RequestInit): Record<string, unknown> {
  return typeof init?.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : {};
}
function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
function findIssue(id: string): Issue | undefined {
  return issues.find(
    (item) => item.identifier === id || String(item.number) === id || String(item.id) === id,
  );
}
function reverseRelation(kind: IssueRelation['kind']): IssueRelation['kind'] {
  if (kind === 'blocks') return 'blockedBy';
  if (kind === 'blockedBy') return 'blocks';
  if (kind === 'duplicateOf') return 'duplicateBy';
  if (kind === 'duplicateBy') return 'duplicateOf';
  return 'related';
}
function nextRecurringDate(value: string, interval: number, unit: RecurringIssue['unit']): string {
  const current = new Date(`${value}T00:00:00Z`);
  if (unit === 'day') current.setUTCDate(current.getUTCDate() + interval);
  if (unit === 'week') current.setUTCDate(current.getUTCDate() + interval * 7);
  if (unit === 'month' || unit === 'year') {
    const originalDay = current.getUTCDate();
    current.setUTCDate(1);
    current.setUTCMonth(current.getUTCMonth() + interval * (unit === 'year' ? 12 : 1));
    const lastDay = new Date(
      Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 0),
    ).getUTCDate();
    current.setUTCDate(Math.min(originalDay, lastDay));
  }
  return current.toISOString().slice(0, 10);
}
function createRecurringDemoInstance(schedule: RecurringIssue, dueDate: string): Issue {
  const number = Math.max(0, ...issues.map((item) => item.number)) + 1;
  const project = projects.find((item) => item.slug === schedule.projectSlug);
  const item = issue(
    number,
    schedule.title,
    'backlog',
    schedule.priority,
    project?.id ?? null,
    null,
    labels.filter((label) => schedule.labels.includes(label.name)),
  );
  item.body = schedule.body;
  item.type = schedule.type;
  item.estimate = schedule.estimate ?? null;
  item.recurringSlug = schedule.slug;
  item.dueDate = dueDate;
  issues.push(item);
  return item;
}
function processDemoRecurringIssues(): void {
  const today = new Date().toISOString().slice(0, 10);
  for (const schedule of recurringIssues) {
    if (!schedule.enabled) continue;
    let instance = findIssue(schedule.lastIssueIdentifier ?? '');
    if (!instance) continue;
    while (instance.dueDate && instance.dueDate < today) {
      const dueDate = nextRecurringDate(instance.dueDate, schedule.interval, schedule.unit);
      instance = createRecurringDemoInstance(schedule, dueDate);
      schedule.lastIssueIdentifier = instance.identifier;
      schedule.nextDueDate = dueDate;
      revision += 1;
    }
  }
}
function patch<T extends object>(item: T, changes: Record<string, unknown>): T {
  Object.assign(item, changes, { updatedAt: new Date().toISOString() });
  revision += 1;
  return item;
}
function notFound(): Response {
  return json({ error: 'not found' }, 404);
}

async function demoFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const url = new URL(raw, location.origin);
  const path = url.pathname.slice(url.pathname.indexOf('/api/'));
  const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
  if (!path.startsWith('/api/')) return nativeFetch(input, init);
  if (path === '/api/revision') {
    processDemoRecurringIssues();
    return json({ revision: String(revision) });
  }
  if (path === '/api/issue-templates' && method === 'GET') return json(issueTemplates);
  let match = path.match(/^\/api\/issue-templates\/([^/]+)$/);
  if (match && method === 'DELETE') {
    const slug = decodeURIComponent(match[1]!);
    const index = issueTemplates.findIndex((template) => template.slug === slug);
    if (index < 0) return notFound();
    issueTemplates = issueTemplates.filter((template) => template.slug !== slug);
    revision += 1;
    return json(null, 204);
  }
  match = path.match(/^\/api\/issues\/([^/]+)\/templates$/);
  if (match && method === 'POST') {
    const source = findIssue(decodeURIComponent(match[1]!));
    if (!source) return notFound();
    const name = text(body(init).name).trim();
    const slug = name
      .toLocaleLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48);
    if (!slug || name.length > 100) return json({ error: 'invalid template name' }, 400);
    if (issueTemplates.some((template) => template.slug === slug))
      return json({ error: 'template name already exists' }, 409);
    const template: IssueTemplate = {
      slug,
      name,
      title: source.title,
      body: source.body,
      status: source.status,
      type: source.type,
      priority: source.priority,
      estimate: source.estimate,
      labels: source.labels.map((label) => label.name),
    };
    issueTemplates.push(template);
    revision += 1;
    return json(template, 201);
  }
  if (path === '/api/recurring-issues' && method === 'GET') {
    processDemoRecurringIssues();
    return json(recurringIssues);
  }
  match = path.match(/^\/api\/recurring-issues\/([^/]+)$/);
  if (match) {
    const slug = decodeURIComponent(match[1]!);
    const schedule = recurringIssues.find((item) => item.slug === slug);
    if (!schedule) return notFound();
    if (method === 'PATCH') {
      schedule.enabled = Boolean(body(init).enabled);
      revision += 1;
      return json(schedule);
    }
    if (method === 'DELETE') {
      recurringIssues = recurringIssues.filter((item) => item !== schedule);
      revision += 1;
      return json(null, 204);
    }
  }
  match = path.match(/^\/api\/issues\/([^/]+)\/recurrences$/);
  if (match && method === 'POST') {
    const source = findIssue(decodeURIComponent(match[1]!));
    if (!source) return notFound();
    const value = body(init);
    const name = text(value.name).trim();
    const slug = name
      .toLocaleLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48);
    const interval = Number(value.interval);
    const unit = text(value.unit) as RecurringIssue['unit'];
    const firstDueDate = text(value.firstDueDate);
    if (
      !slug ||
      name.length > 100 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(firstDueDate) ||
      !Number.isInteger(interval) ||
      interval < 1 ||
      interval > 365 ||
      !['day', 'week', 'month', 'year'].includes(unit)
    )
      return json({ error: 'invalid recurring issue' }, 400);
    if (recurringIssues.some((item) => item.slug === slug))
      return json({ error: 'recurring issue already exists' }, 409);
    const schedule: RecurringIssue = {
      slug,
      name,
      title: source.title,
      body: source.body,
      status: 'backlog',
      type: source.type,
      priority: source.priority,
      estimate: source.estimate,
      projectSlug: source.projectSlug,
      labels: source.labels.map((label) => label.name),
      firstDueDate,
      interval,
      unit,
      nextDueDate: firstDueDate,
      enabled: true,
    };
    const first = createRecurringDemoInstance(schedule, firstDueDate);
    schedule.lastIssueIdentifier = first.identifier;
    recurringIssues.push(schedule);
    revision += 1;
    return json(schedule, 201);
  }
  if (path === '/api/workspace') {
    if (method === 'PATCH') workspace = patch(workspace, body(init));
    return json(workspace);
  }
  if (path === '/api/issue-workflow-statuses') {
    if (method === 'GET') return json(issueWorkflowStatuses);
    if (method !== 'PUT') return notFound();
    const value = body(init);
    const statuses = Array.isArray(value.statuses)
      ? (value.statuses as IssueWorkflowStatus[])
      : null;
    if (!statuses || statuses.length < defaultIssueWorkflowStatuses.length || statuses.length > 50)
      return json({ error: 'invalid workflow statuses' }, 400);
    const seen = new Set<string>();
    for (const status of statuses) {
      if (
        !status ||
        typeof status.id !== 'string' ||
        typeof status.name !== 'string' ||
        typeof status.category !== 'string' ||
        status.name.trim().length < 1 ||
        status.name.trim().length > 48 ||
        (typeof status.description !== 'undefined' &&
          (typeof status.description !== 'string' || status.description.length > 200)) ||
        seen.has(status.id)
      )
        return json({ error: 'invalid workflow status' }, 400);
      seen.add(status.id);
      const defaultStatus = defaultIssueWorkflowStatuses.find((item) => item.id === status.id);
      if (defaultStatus) {
        if (status.category !== defaultStatus.category)
          return json({ error: 'default workflow status category cannot change' }, 400);
      } else if (!/^[a-z][a-z0-9-]{0,47}$/.test(status.id)) {
        return json({ error: 'invalid workflow status id' }, 400);
      }
      if (!['backlog', 'todo', 'in_progress', 'done', 'canceled'].includes(status.category))
        return json({ error: 'invalid workflow status category' }, 400);
    }
    for (const status of defaultIssueWorkflowStatuses)
      if (!seen.has(status.id))
        return json({ error: 'default workflow statuses are required' }, 400);
    const nextIds = new Set(statuses.map((status) => status.id));
    if (issues.some((item) => !nextIds.has(item.workflowStatus ?? item.status)))
      return json({ error: 'workflow status is in use' }, 409);
    issueWorkflowStatuses = statuses.map((status) => ({
      ...status,
      name: status.name.trim(),
      description: status.description?.trim() || undefined,
    }));
    workspace.issueStatuses = issueWorkflowStatuses;
    revision += 1;
    return json(issueWorkflowStatuses);
  }
  if (path === '/api/project-workflow-statuses') {
    if (method === 'GET') return json(projectWorkflowStatuses);
    if (method !== 'PUT') return notFound();
    const value = body(init);
    const statuses = Array.isArray(value.statuses)
      ? (value.statuses as ProjectWorkflowStatus[])
      : null;
    if (
      !statuses ||
      statuses.length < defaultProjectWorkflowStatuses.length ||
      statuses.length > 50
    )
      return json({ error: 'invalid project workflow statuses' }, 400);
    const seen = new Set<string>();
    for (const status of statuses) {
      if (
        !status ||
        typeof status.id !== 'string' ||
        typeof status.name !== 'string' ||
        typeof status.category !== 'string' ||
        !status.name.trim() ||
        status.name.trim().length > 48 ||
        (typeof status.description !== 'undefined' &&
          (typeof status.description !== 'string' || status.description.length > 200)) ||
        seen.has(status.id)
      )
        return json({ error: 'invalid project workflow status' }, 400);
      seen.add(status.id);
      const defaultStatus = defaultProjectWorkflowStatuses.find((item) => item.id === status.id);
      if (defaultStatus && status.category !== defaultStatus.category)
        return json({ error: 'default project status category cannot change' }, 400);
      if (!defaultStatus && !/^[a-z][a-z0-9-]{0,47}$/.test(status.id))
        return json({ error: 'invalid project workflow status id' }, 400);
      if (!['backlog', 'planned', 'started', 'completed', 'canceled'].includes(status.category))
        return json({ error: 'invalid project workflow status category' }, 400);
    }
    if (defaultProjectWorkflowStatuses.some((status) => !seen.has(status.id)))
      return json({ error: 'default project statuses are required' }, 400);
    const nextIds = new Set(statuses.map((status) => status.id));
    if (
      projects.some((project) => !nextIds.has(project.workflowStatus ?? project.status)) ||
      views.some((view) => Boolean(view.projectStatus) && !nextIds.has(view.projectStatus!))
    )
      return json({ error: 'project workflow status is in use' }, 409);
    projectWorkflowStatuses = statuses.map((status) => ({
      ...status,
      name: status.name.trim(),
      description: status.description?.trim() || undefined,
    }));
    workspace.projectStatuses = projectWorkflowStatuses;
    revision += 1;
    return json(projectWorkflowStatuses);
  }
  if (path === '/api/diagnostics') return json([]);
  if (path === '/api/labels') {
    if (method === 'POST') {
      const value = body(init);
      const item = { id: labels.length + 1, name: String(value.name), color: String(value.color) };
      labels.push(item);
      return json(item, 201);
    }
    return json(labels);
  }
  if (path === '/api/issues' && method === 'GET') {
    processDemoRecurringIssues();
    let result = [...issues];
    const archived = url.searchParams.get('archived');
    result = result.filter((item) => Boolean(item.archivedAt) === (archived === 'true'));
    const status = url.searchParams.get('status');
    const project = url.searchParams.get('project');
    const projectStatus = url.searchParams.get('projectStatus');
    const projectPriority = url.searchParams.get('projectPriority');
    const projectLabels = url.searchParams.get('projectLabels')?.split(',').filter(Boolean) ?? [];
    const cycle = url.searchParams.get('cycle');
    const addedToCycle = url.searchParams.get('addedToCycle')?.split(',').filter(Boolean) ?? [];
    const priority = url.searchParams.get('priority');
    const type = url.searchParams.get('type');
    const estimate = url.searchParams.get('estimate');
    const dueDateFilter = url.searchParams.get('dueDate');
    const relationFilter = url.searchParams.get('relation');
    const contentFilter = url.searchParams.get('content')?.trim().toLowerCase();
    const milestoneNameFilter = url.searchParams.get('milestoneName')?.trim().toLowerCase();
    const dateFieldFilter = url.searchParams.get('dateField');
    const dateRangeFilter = url.searchParams.get('dateRange');
    const dateAsOf = url.searchParams.get('dateAsOf') ?? localDateValue(new Date());
    const asOf = url.searchParams.get('asOf') ?? localDateValue(new Date());
    const favorite = url.searchParams.get('favorite');
    const wantedLabels = url.searchParams.get('labels')?.split(',');
    if (status)
      result = result.filter(
        (i) => i.status === status || (i.workflowStatus ?? i.status) === status,
      );
    if (project) result = result.filter((i) => i.projectSlug === project);
    if (projectStatus || projectPriority != null) {
      result = result.filter((item) => {
        const linkedProject = projects.find(
          (candidate) => candidate.id === item.projectId || candidate.slug === item.projectSlug,
        );
        return (
          linkedProject != null &&
          (!projectStatus ||
            (linkedProject.workflowStatus ?? linkedProject.status) === projectStatus ||
            linkedProject.status === projectStatus) &&
          (projectPriority == null || linkedProject.priority === Number(projectPriority))
        );
      });
    }
    if (projectLabels.length > 0) {
      result = result.filter((item) => {
        const linkedProject = projects.find(
          (candidate) => candidate.id === item.projectId || candidate.slug === item.projectSlug,
        );
        if (!linkedProject) return false;
        const labels = linkedProject.labels ?? [];
        return projectLabels.every((label) =>
          label === '__none__' ? labels.length === 0 : labels.includes(label),
        );
      });
    }
    if (cycle) result = result.filter((i) => i.cycleNumber === Number(cycle));
    if (addedToCycle.length > 0) {
      result = result.filter((item) => {
        const linkedCycle = cycles.find(
          (candidate) => candidate.id === item.cycleId || candidate.number === item.cycleNumber,
        );
        if (!linkedCycle) return false;
        const addedAt = Date.parse(item.cycleAddedAt ?? item.createdAt);
        const startValue = /^\d{4}-\d{2}-\d{2}$/.test(linkedCycle.startsAt)
          ? `${linkedCycle.startsAt}T00:00:00Z`
          : linkedCycle.startsAt;
        const endValue = /^\d{4}-\d{2}-\d{2}$/.test(linkedCycle.endsAt)
          ? `${linkedCycle.endsAt}T23:59:59.999Z`
          : linkedCycle.endsAt;
        const start = Date.parse(startValue);
        const end = Date.parse(endValue);
        const phase = addedAt < start ? 'planned' : addedAt > end ? 'after' : 'during';
        return addedToCycle.includes(phase);
      });
    }
    if (priority) result = result.filter((i) => i.priority === Number(priority));
    if (type) result = result.filter((i) => i.type === type);
    if (estimate != null) result = result.filter((i) => i.estimate === Number(estimate));
    if (dueDateFilter) {
      const today = new Date(`${asOf}T00:00:00`);
      const rangeDays: Record<string, number> = {
        tomorrow: 1,
        threeDays: 3,
        week: 7,
        month: 30,
        quarter: 90,
      };
      const rangeEnd = new Date(today);
      rangeEnd.setDate(rangeEnd.getDate() + (rangeDays[dueDateFilter] ?? 0));
      const endValue = localDateValue(rangeEnd);
      result = result.filter((item) => {
        const due = item.dueDate?.slice(0, 10) ?? '';
        if (dueDateFilter === 'none') return due === '';
        if (dueDateFilter === 'overdue')
          return due !== '' && due < asOf && item.status !== 'done' && item.status !== 'canceled';
        if (dueDateFilter === 'today') return due === asOf;
        if (dueDateFilter.startsWith('on:')) return due === dueDateFilter.slice(3);
        if (dueDateFilter === 'custom') return false;
        if (rangeDays[dueDateFilter]) return due > asOf && due <= endValue;
        return false;
      });
    }
    if (relationFilter) {
      result = result.filter((item) => {
        if (relationFilter === 'parent') return issues.some((child) => child.parentId === item.id);
        if (relationFilter === 'subissue') return item.parentId != null;
        if (relationFilter === 'recurring') return item.recurringSlug != null;
        if (relationFilter === 'related') return item.relations.length > 0;
        if (relationFilter === 'blocked')
          return item.relations.some((relation) => relation.kind === 'blockedBy');
        if (relationFilter === 'blocking')
          return item.relations.some((relation) => relation.kind === 'blocks');
        if (relationFilter === 'duplicate')
          return item.relations.some(
            (relation) => relation.kind === 'duplicateOf' || relation.kind === 'duplicateBy',
          );
        return false;
      });
    }
    if (contentFilter) {
      result = result.filter((item) =>
        [item.identifier, item.title, item.body].some((value) =>
          value.toLowerCase().includes(contentFilter),
        ),
      );
    }
    if (milestoneNameFilter) {
      result = result.filter((item) =>
        item.milestoneName?.toLowerCase().includes(milestoneNameFilter),
      );
    }
    if (dateFieldFilter && dateRangeFilter) {
      const rangeDays: Record<string, number> = {
        dayAgo: 1,
        threeDaysAgo: 3,
        weekAgo: 7,
        twoWeeksAgo: 14,
        monthAgo: 30,
        quarterAgo: 90,
        halfYearAgo: 180,
        yearAgo: 365,
      };
      const rangeStart = new Date(`${dateAsOf}T00:00:00`);
      rangeStart.setDate(rangeStart.getDate() - (rangeDays[dateRangeFilter] ?? 0));
      const startValue = localDateValue(rangeStart);
      result = result.filter((item) => {
        const rawDate =
          dateFieldFilter === 'createdAt'
            ? item.createdAt
            : dateFieldFilter === 'updatedAt'
              ? item.updatedAt
              : dateFieldFilter === 'startedAt'
                ? item.startedAt
                : dateFieldFilter === 'completedAt'
                  ? item.completedAt
                  : dateFieldFilter === 'timeInCurrentStatus'
                    ? item.statusChangedAt
                    : null;
        const date = rawDate?.slice(0, 10) ?? '';
        if (dateRangeFilter.startsWith('on:')) return date === dateRangeFilter.slice(3);
        if (dateFieldFilter === 'timeInCurrentStatus') {
          const statusChangedAt = Date.parse(item.statusChangedAt ?? '');
          return (
            rangeDays[dateRangeFilter] != null &&
            !Number.isNaN(statusChangedAt) &&
            statusChangedAt <= Date.now() - rangeDays[dateRangeFilter]! * 24 * 60 * 60 * 1000
          );
        }
        return (
          rangeDays[dateRangeFilter] != null &&
          date !== '' &&
          date >= startValue &&
          date <= dateAsOf
        );
      });
    }
    if (favorite != null) result = result.filter((i) => i.isFavorite === (favorite === 'true'));
    if (wantedLabels?.length)
      result = result.filter((i) =>
        wantedLabels.every((name) => i.labels.some((label) => label.name === name)),
      );
    return json(result);
  }
  if (path === '/api/issues' && method === 'POST') {
    const value = body(init);
    const milestoneId = value.milestoneId == null ? null : Number(value.milestoneId);
    const milestone =
      milestoneId == null
        ? undefined
        : projects.flatMap((project) => project.milestones).find((item) => item.id === milestoneId);
    if (milestoneId != null && !milestone) return json({ error: 'invalid milestone' }, 400);
    const number = Math.max(0, ...issues.map((i) => i.number)) + 1;
    const item = issue(
      number,
      String(value.title),
      (value.status as Issue['status']) || 'todo',
      Number(value.priority ?? 0),
      value.projectId == null ? null : Number(value.projectId),
      value.cycleId == null ? null : Number(value.cycleId),
      [],
    );
    const requestedLinks = Array.isArray(value.links)
      ? (value.links as { url?: unknown; title?: unknown; kind?: unknown }[])
      : [];
    const linkUrls = new Set<string>();
    const externalLinks: IssueLink[] = [];
    for (const [index, requested] of requestedLinks.entries()) {
      const linkURL = text(requested.url).trim();
      let parsedURL: URL;
      try {
        parsedURL = new URL(linkURL);
      } catch {
        return json({ error: 'link URL must be an absolute http or https URL' }, 400);
      }
      const kind = text(requested.kind) || 'link';
      if (
        !['http:', 'https:'].includes(parsedURL.protocol) ||
        !['link', 'pullRequest', 'document'].includes(kind) ||
        linkUrls.has(linkURL)
      )
        return json({ error: 'invalid issue link' }, 400);
      linkUrls.add(linkURL);
      externalLinks.push({
        id: index + 1,
        url: linkURL,
        ...(text(requested.title).trim() ? { title: text(requested.title).trim() } : {}),
        kind: kind as IssueLink['kind'],
        createdAt: item.createdAt,
      });
    }
    item.externalLinks = externalLinks;
    const requestedWorkflowStatus = text(value.workflowStatus).trim();
    const workflowStatus = issueWorkflowStatuses.find(
      (candidate) => candidate.id === requestedWorkflowStatus,
    );
    if (requestedWorkflowStatus && !workflowStatus)
      return json({ error: 'invalid workflow status' }, 400);
    if (workflowStatus) {
      item.workflowStatus = workflowStatus.id;
      item.status = workflowStatus.category as Issue['status'];
    } else {
      item.workflowStatus =
        issueWorkflowStatuses.find((candidate) => candidate.category === item.status)?.id ??
        item.status;
    }
    item.type = ['bug', 'feature', 'improvement', 'task'].includes(String(value.type))
      ? (String(value.type) as Issue['type'])
      : undefined;
    item.estimate = typeof value.estimate === 'number' ? value.estimate : null;
    const labelIds = Array.isArray(value.labelIds) ? value.labelIds.map(Number) : [];
    item.labels = labels.filter((label) => labelIds.includes(label.id));
    if (milestone) {
      const project = projects.find((candidate) =>
        candidate.milestones.some((candidateMilestone) => candidateMilestone.id === milestone.id),
      );
      if (value.projectId != null && Number(value.projectId) !== project?.id)
        return json({ error: 'milestone must belong to the issue project' }, 400);
      item.projectId = project?.id ?? item.projectId;
      item.projectSlug = project?.slug;
      item.milestoneId = milestone.id;
      item.milestoneName = milestone.name;
    }
    item.body = text(value.body);
    issues.push(item);
    revision += 1;
    return json(item, 201);
  }
  match = path.match(/^\/api\/issues\/([^/]+)\/projects$/);
  if (match && method === 'POST') {
    const item = findIssue(decodeURIComponent(match[1]!));
    if (!item) return notFound();
    const value = body(init);
    const name = text(value.name).trim();
    const priority = Number(value.priority ?? 0);
    const workflowStatus = text(value.workflowStatus) || text(value.status) || 'planned';
    const resolvedStatus = projectWorkflowStatuses.find(
      (candidate) => candidate.id === workflowStatus,
    );
    const status = resolvedStatus?.category ?? (text(value.status) || 'planned');
    if (!name) return json({ error: 'project name required' }, 400);
    if (!Number.isInteger(priority) || priority < 0 || priority > 4)
      return json({ error: 'invalid project priority' }, 400);
    if (
      !resolvedStatus ||
      !['backlog', 'planned', 'started', 'completed', 'canceled'].includes(status)
    )
      return json({ error: 'invalid project status' }, 400);
    const base =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || `project-${item.number}`;
    let slug = base;
    for (let suffix = 2; projects.some((project) => project.slug === slug); suffix++)
      slug = `${base}-${suffix}`;
    const timestamp = new Date().toISOString();
    const project: Project = {
      id: Math.max(0, ...projects.map((candidate) => candidate.id)) + 1,
      name,
      slug,
      description: text(value.description),
      status,
      workflowStatus,
      priority,
      startDate: text(value.startDate) || null,
      targetDate: text(value.targetDate) || null,
      progress: 0,
      milestones: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    projects.push(project);
    item.projectId = project.id;
    item.projectSlug = project.slug;
    item.milestoneId = null;
    item.milestoneName = null;
    item.updatedAt = timestamp;
    revision += 1;
    return json({ project, issue: item }, 201);
  }
  match = path.match(/^\/api\/issues\/([^/]+)$/);
  if (match) {
    const item = findIssue(decodeURIComponent(match[1]!));
    if (!item) return notFound();
    if (method === 'DELETE') {
      for (const attachment of item.attachments ?? []) issueAttachmentFiles.delete(attachment.id);
      issues = issues.filter((i) => i !== item);
      revision += 1;
      return json(null, 204);
    }
    if (method === 'PATCH') {
      const previousStatus = item.status;
      const previousWorkflowStatus = item.workflowStatus ?? item.status;
      const changes = body(init);
      const wasArchived = Boolean(item.archivedAt);
      if (wasArchived && changes.archived !== false)
        return json({ error: 'issue is archived' }, 409);
      if (wasArchived && Object.keys(changes).some((key) => key !== 'archived'))
        return json({ error: 'issue is archived' }, 409);
      const previousCycleId = item.cycleId;
      if ('cycleId' in changes && changes.cycleId != null) {
        const cycleId = Number(changes.cycleId);
        if (!cycles.some((cycle) => cycle.id === cycleId))
          return json({ error: 'cycle not found' }, 400);
      }
      if ('workflowStatus' in changes) {
        const requestedWorkflowStatus = text(changes.workflowStatus).trim();
        const workflowStatus = issueWorkflowStatuses.find(
          (candidate) => candidate.id === requestedWorkflowStatus,
        );
        if (!workflowStatus) return json({ error: 'invalid workflow status' }, 400);
        changes.status = workflowStatus.category;
      }
      patch(item, changes);
      if ('workflowStatus' in changes)
        item.workflowStatus = text(changes.workflowStatus) || item.status;
      if ('archived' in changes)
        item.archivedAt = changes.archived ? new Date().toISOString() : null;
      if ('cycleId' in changes && Number(changes.cycleId ?? 0) !== previousCycleId) {
        const cycleId = changes.cycleId == null ? null : Number(changes.cycleId);
        item.cycleId = cycleId;
        item.cycleNumber = cycles.find((cycle) => cycle.id === cycleId)?.number ?? null;
        item.cycleAddedAt = cycleId == null ? null : new Date().toISOString();
      }
      if (
        item.status !== previousStatus ||
        (item.workflowStatus ?? item.status) !== previousWorkflowStatus
      ) {
        const changedAt = new Date().toISOString();
        item.statusChangedAt = changedAt;
        if (item.status === 'in_progress' && previousStatus !== 'in_progress' && !item.startedAt)
          item.startedAt = changedAt;
        if (item.status !== previousStatus)
          item.completedAt =
            item.status === 'done' || item.status === 'canceled' ? changedAt : null;
      }
    }
    if (method === 'PATCH') {
      const value = body(init);
      if ('projectId' in value && Number(value.projectId) !== item.projectId) {
        item.milestoneId = null;
        item.milestoneName = null;
      }
      if ('milestoneId' in value) {
        const milestoneId = value.milestoneId == null ? null : Number(value.milestoneId);
        const match =
          milestoneId == null
            ? undefined
            : projects
                .flatMap((project) =>
                  project.milestones.map((milestone) => ({ project, milestone })),
                )
                .find(({ milestone }) => milestone.id === milestoneId);
        if (milestoneId != null && !match) return json({ error: 'invalid milestone' }, 400);
        if (match && item.projectId != null && item.projectId !== match.project.id)
          return json({ error: 'milestone must belong to the issue project' }, 400);
        item.milestoneId = match?.milestone.id ?? null;
        item.milestoneName = match?.milestone.name ?? null;
        if (match) {
          item.projectId = match.project.id;
          item.projectSlug = match.project.slug;
        }
      }
    }
    return json(item);
  }
  match = path.match(/^\/api\/issues\/([^/]+)\/links(?:\/([^/]+))?$/);
  if (match) {
    const item = findIssue(decodeURIComponent(match[1]!));
    if (!item) return notFound();
    const matchedLinkId = match[2];
    if (matchedLinkId) {
      if (method !== 'DELETE') return notFound();
      const index = item.externalLinks.findIndex((link) => link.id === Number(matchedLinkId));
      if (index < 0) return notFound();
      item.externalLinks.splice(index, 1);
      patch(item, {});
      return json(null, 204);
    }
    if (method !== 'POST') return notFound();
    const value = body(init);
    const url = text(value.url).trim();
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return json({ error: 'invalid URL' }, 400);
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) return json({ error: 'invalid URL' }, 400);
    const kind = text(value.kind) || 'link';
    if (!['link', 'pullRequest', 'document'].includes(kind))
      return json({ error: 'invalid link kind' }, 400);
    if (item.externalLinks.some((link) => link.url === url))
      return json({ error: 'link already exists' }, 409);
    const link = {
      id: Math.max(0, ...item.externalLinks.map((existing) => existing.id)) + 1,
      url,
      title: text(value.title).trim() || undefined,
      kind: kind as IssueLink['kind'],
      createdAt: new Date().toISOString(),
    };
    item.externalLinks.push(link);
    patch(item, {});
    return json(link, 201);
  }
  match = path.match(/^\/api\/issues\/([^/]+)\/relations(?:\/([^/]+))?$/);
  if (match) {
    const item = findIssue(decodeURIComponent(match[1]!));
    if (!item) return notFound();
    const relationId = match[2];
    if (relationId) {
      if (method !== 'DELETE') return notFound();
      const index = item.relations.findIndex((relation) => relation.id === Number(relationId));
      if (index < 0) return notFound();
      const [relation] = item.relations.splice(index, 1);
      const target = findIssue(relation!.targetIdentifier);
      if (target) {
        const inverseIndex = target.relations.findIndex(
          (candidate) =>
            candidate.kind === reverseRelation(relation!.kind) &&
            candidate.targetIdentifier === item.identifier,
        );
        if (inverseIndex >= 0) target.relations.splice(inverseIndex, 1);
        patch(target, {});
      }
      patch(item, {});
      return json(null, 204);
    }
    if (method !== 'POST') return notFound();
    const value = body(init);
    const target = findIssue(text(value.targetIdentifier));
    const kind = text(value.kind) as IssueRelation['kind'];
    if (!target || target === item) return json({ error: 'invalid related issue' }, 400);
    if (!['related', 'blocks', 'blockedBy', 'duplicateOf', 'duplicateBy'].includes(kind))
      return json({ error: 'invalid relation kind' }, 400);
    if (
      item.relations.some(
        (relation) =>
          relation.targetIdentifier === target.identifier &&
          (relation.kind === kind || reverseRelation(relation.kind) === kind),
      )
    )
      return json({ error: 'issue relation already exists' }, 409);
    const relation: IssueRelation = {
      id: Math.max(0, ...item.relations.map((existing) => existing.id)) + 1,
      kind,
      targetIdentifier: target.identifier,
    };
    const inverse: IssueRelation = {
      id: Math.max(0, ...target.relations.map((existing) => existing.id)) + 1,
      kind: reverseRelation(kind),
      targetIdentifier: item.identifier,
    };
    item.relations.push(relation);
    target.relations.push(inverse);
    patch(item, {});
    patch(target, {});
    return json(relation, 201);
  }
  match = path.match(/^\/api\/issues\/([^/]+)\/reactions$/);
  if (match && method === 'POST') {
    const item = findIssue(decodeURIComponent(match[1]!));
    if (!item) return notFound();
    const emoji = text(body(init).emoji);
    if (!emoji || emoji.length > 16) return json({ error: 'invalid reaction' }, 400);
    const current = item.reactions ?? [];
    item.reactions = current.includes(emoji)
      ? current.filter((reaction) => reaction !== emoji)
      : [...current, emoji];
    patch(item, {});
    return json(item);
  }
  match = path.match(/^\/api\/issues\/([^/]+)\/attachments(?:\/([^/]+))?$/);
  if (match) {
    const item = findIssue(decodeURIComponent(match[1]!));
    if (!item) return notFound();
    const attachmentId = match[2] ? decodeURIComponent(match[2]) : null;
    if (attachmentId) {
      const attachment = (item.attachments ?? []).find(
        (candidate) => candidate.id === attachmentId,
      );
      if (!attachment) return notFound();
      if (method === 'GET') {
        const file = issueAttachmentFiles.get(attachmentId);
        if (!file) return notFound();
        return new Response(file, {
          headers: {
            'Content-Type': attachment.mediaType,
            'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(attachment.name)}`,
            'X-Content-Type-Options': 'nosniff',
          },
        });
      }
      if (method === 'DELETE') {
        item.attachments = (item.attachments ?? []).filter(
          (candidate) => candidate.id !== attachmentId,
        );
        issueAttachmentFiles.delete(attachmentId);
        patch(item, {});
        return json(null, 204);
      }
      return notFound();
    }
    if (method !== 'POST' || !(init?.body instanceof FormData)) return notFound();
    const files = init.body.getAll('files').filter((value): value is File => value instanceof File);
    if (files.length === 0 || files.length > 10)
      return json({ error: 'invalid attachment count' }, 400);
    if (files.some((file) => file.size < 1 || file.size > 20 * 1024 * 1024))
      return json({ error: 'invalid attachment size' }, 400);
    const attachments = files.map((file) => {
      const id = crypto.randomUUID().replaceAll('-', '');
      issueAttachmentFiles.set(id, file);
      return {
        id,
        name: file.name,
        mediaType: file.type || 'application/octet-stream',
        size: file.size,
      };
    });
    item.attachments = [...(item.attachments ?? []), ...attachments];
    patch(item, {});
    return json(item.attachments, 201);
  }
  match = path.match(
    /^\/api\/issues\/([^/]+)\/(comments|activities)(?:\/(\d+)(?:\/(reactions))?)?$/,
  );
  if (match) {
    const item = findIssue(decodeURIComponent(match[1]!));
    if (!item) return notFound();
    if (match[2] === 'activities') return json([] satisfies Activity[]);
    if (match[3]) {
      const commentId = Number(match[3]);
      const commentIndex = comments.findIndex(
        (comment) => comment.issueId === item.id && comment.id === commentId,
      );
      if (commentIndex < 0) return notFound();
      if (match[4] === 'reactions' && method === 'POST') {
        const emoji = text(body(init).emoji);
        if (!emoji || emoji.length > 16) return json({ error: 'invalid reaction' }, 400);
        const current = comments[commentIndex]!.reactions ?? [];
        comments[commentIndex]!.reactions = current.includes(emoji)
          ? current.filter((reaction) => reaction !== emoji)
          : [...current, emoji];
        revision += 1;
        return json(comments[commentIndex]);
      }
      if (method === 'PATCH') {
        const nextBody = text(body(init).body).trim();
        if (!nextBody) return json({ error: 'body required' }, 400);
        const updated = {
          ...comments[commentIndex]!,
          body: nextBody,
          updatedAt: new Date().toISOString(),
        };
        comments[commentIndex] = updated;
        revision += 1;
        return json(updated);
      }
      if (method === 'DELETE') {
        comments = comments.filter((comment) => comment.id !== commentId);
        revision += 1;
        return json(null, 204);
      }
    }
    if (method === 'POST') {
      const value = body(init);
      const comment = {
        id: comments.length + 1,
        issueId: item.id,
        body: String(value.body),
        createdAt: new Date().toISOString(),
        reactions: [],
      };
      comments.push(comment);
      return json(comment, 201);
    }
    return json(comments.filter((c) => c.issueId === item.id));
  }
  const collection =
    path === '/api/projects'
      ? projects
      : path === '/api/cycles'
        ? cycles
        : path === '/api/pages'
          ? pages
          : path === '/api/adrs'
            ? adrs
            : path === '/api/views'
              ? views
              : null;
  if (collection && method === 'GET') return json(collection);
  if (collection && method === 'POST') {
    const value = body(init);
    const id = Math.max(0, ...collection.map((x) => x.id)) + 1;
    const created = { ...value, id, createdAt: now, updatedAt: now } as never;
    if (path === '/api/cycles')
      Object.assign(created, {
        number: Math.max(0, ...cycles.map((cycle) => cycle.number)) + 1,
        name: `Cycle ${Math.max(0, ...cycles.map((cycle) => cycle.number)) + 1}`,
        description: '',
        startsAt: value.startsAt,
        endsAt: value.endsAt,
        status: value.status ?? 'upcoming',
        isFavorite: false,
        resources: [],
      });
    if (path === '/api/projects') {
      const dependencies = Array.isArray(value.dependencies)
        ? (value.dependencies as ProjectDependency[])
        : [];
      Object.assign(created, {
        status: value.status ?? 'planned',
        workflowStatus: value.workflowStatus ?? value.status ?? 'planned',
        priority: value.priority ?? 0,
        labels: value.labels ?? [],
        dependencies,
        milestones: (Array.isArray(value.milestones) ? value.milestones : []).map(
          (milestone, index) => ({
            id:
              Math.max(
                0,
                ...projects.flatMap((item) => item.milestones.map((existing) => existing.id)),
              ) +
              index +
              1,
            name: text(milestone.name).trim(),
            description: text(milestone.description).trim(),
            targetDate: text(milestone.targetDate) || null,
            createdAt: now,
            updatedAt: now,
          }),
        ),
      });
      for (const dependency of dependencies) {
        const target = projects.find((project) => project.slug === dependency.projectSlug);
        if (!target) continue;
        const inverseKind =
          dependency.kind === 'blocks'
            ? 'blocked_by'
            : dependency.kind === 'blocked_by'
              ? 'blocks'
              : 'related';
        target.dependencies = [
          ...(target.dependencies ?? []),
          { projectSlug: String(value.slug), kind: inverseKind },
        ];
        patch(target, {});
      }
    }
    if (path === '/api/adrs')
      Object.assign(created, {
        number: id,
        identifier: `ADR-${id}`,
        body: value.body ?? '',
        publishBody: '',
        status: value.status ?? 'proposed',
        evaluation: value.evaluation ?? '',
        replay: '',
        workload: '',
        supersedes: value.supersedes ?? null,
        issueNumbers: value.issueNumbers ?? [],
      });
    if (path === '/api/pages')
      Object.assign(created, {
        body: value.body ?? '',
        parentId: null,
        projectId: null,
        status: value.status ?? 'proposed',
        date: null,
        tags: value.tags ?? [],
      });
    if (path === '/api/views')
      Object.assign(created, {
        display: value.display ?? 'list',
        groupBy: value.groupBy ?? 'status',
        subGroupBy: value.subGroupBy ?? 'none',
        orderBy: value.orderBy ?? 'manual',
        direction: value.direction ?? 'asc',
        completedIssues: value.completedIssues ?? 'all',
        showSubIssues: value.showSubIssues ?? true,
        nestedSubIssues: value.nestedSubIssues ?? 'showMatching',
        showEmptyGroups: value.showEmptyGroups ?? false,
        displayProperties: value.displayProperties ?? [
          'id',
          'status',
          'priority',
          'project',
          'dueDate',
          'milestone',
          'cycle',
          'estimate',
          'labels',
          'links',
          'pullRequests',
        ],
        status: value.status ?? null,
        project: value.project ?? null,
        cycle: value.cycle ?? null,
        labels: value.labels ?? [],
        priority: value.priority ?? null,
        type: value.type ?? null,
        estimate: value.estimate ?? null,
        projectStatus: value.projectStatus ?? null,
        projectPriority: value.projectPriority ?? null,
        projectLabels: value.projectLabels ?? [],
        addedToCycle: value.addedToCycle ?? [],
      });
    (collection as unknown[]).push(created);
    revision += 1;
    return json(created, 201);
  }
  match = path.match(/^\/api\/cycles\/([^/]+)\/links(?:\/([^/]+))?$/);
  if (match) {
    const cycle = cycles.find((item) => item.number === Number(match![1]));
    if (!cycle) return notFound();
    const resourceId = match[2] == null ? null : Number(match[2]);
    if (match[2] != null && !Number.isSafeInteger(resourceId))
      return json({ error: 'invalid resource id' }, 400);
    if (method === 'POST' && resourceId == null) {
      const value = body(init);
      const resourceURL = text(value.url).trim();
      let parsed: URL;
      try {
        parsed = new URL(resourceURL);
      } catch {
        return json({ error: 'link URL must be an absolute http or https URL' }, 400);
      }
      if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || !parsed.host)
        return json({ error: 'link URL must be an absolute http or https URL' }, 400);
      const kind = text(value.kind) || 'link';
      if (kind !== 'link' && kind !== 'document')
        return json({ error: 'invalid cycle resource kind' }, 400);
      const resources = (cycle.resources ??= []);
      if (resources.some((resource) => resource.url === resourceURL))
        return json({ error: 'resource already exists' }, 409);
      const resource: IssueLink = {
        id: Math.max(0, ...resources.map((item) => item.id)) + 1,
        url: resourceURL,
        title: text(value.title).trim(),
        kind,
        createdAt: new Date().toISOString(),
      };
      resources.push(resource);
      patch(cycle, {});
      return json(resource, 201);
    }
    if (method === 'DELETE' && resourceId != null) {
      const resources = (cycle.resources ??= []);
      const index = resources.findIndex((resource) => resource.id === resourceId);
      if (index < 0) return notFound();
      resources.splice(index, 1);
      patch(cycle, {});
      return json(null, 204);
    }
    return notFound();
  }
  match = path.match(/^\/api\/projects\/([^/]+)\/milestones(?:\/([^/]+))?$/);
  if (match) {
    const projectSlug = decodeURIComponent(match[1]!);
    const project = projects.find((item) => item.slug === projectSlug);
    if (!project) return notFound();
    const milestoneId = match[2] == null ? null : Number(match[2]);
    if (milestoneId != null && !Number.isSafeInteger(milestoneId))
      return json({ error: 'invalid milestone id' }, 400);
    if (milestoneId == null && method === 'POST') {
      const value = body(init);
      const name = text(value.name).trim();
      if (!name) return json({ error: 'milestone name required' }, 400);
      const created = {
        id:
          Math.max(
            0,
            ...projects.flatMap((item) => item.milestones.map((milestone) => milestone.id)),
          ) + 1,
        name,
        description: text(value.description).trim(),
        targetDate: text(value.targetDate) || null,
        createdAt: now,
        updatedAt: now,
      };
      project.milestones.push(created);
      patch(project, {});
      return json(created, 201);
    }
    const milestoneIndex = project.milestones.findIndex((item) => item.id === milestoneId);
    if (milestoneIndex < 0) return notFound();
    if (method === 'DELETE') {
      project.milestones.splice(milestoneIndex, 1);
      for (const issue of issues) {
        if (issue.milestoneId === milestoneId) {
          issue.milestoneId = null;
          issue.milestoneName = null;
        }
      }
      patch(project, {});
      return json(null, 204);
    }
    if (method === 'PATCH') {
      const value = body(init);
      const milestone = project.milestones[milestoneIndex]!;
      if ('name' in value) {
        const name = text(value.name).trim();
        if (!name) return json({ error: 'milestone name required' }, 400);
        milestone.name = name;
        for (const issue of issues) {
          if (issue.milestoneId === milestoneId) issue.milestoneName = name;
        }
      }
      if ('targetDate' in value) milestone.targetDate = text(value.targetDate) || null;
      if ('description' in value) milestone.description = text(value.description).trim();
      milestone.updatedAt = new Date().toISOString();
      patch(project, {});
      return json(milestone);
    }
    return notFound();
  }
  match = path.match(/^\/api\/(projects|cycles|pages|adrs|views)\/([^/]+)(?:\/(publish))?$/);
  if (match) {
    const [kind, key, action] = match.slice(1);
    const list =
      kind === 'projects'
        ? projects
        : kind === 'cycles'
          ? cycles
          : kind === 'pages'
            ? pages
            : kind === 'adrs'
              ? adrs
              : views;
    const item = list.find((entry) =>
      kind === 'cycles'
        ? 'number' in entry && entry.number === Number(key)
        : kind === 'adrs'
          ? 'identifier' in entry && (entry.identifier === key || String(entry.id) === key)
          : 'slug' in entry && entry.slug === key,
    );
    if (!item) return notFound();
    if (method === 'DELETE') {
      (list as unknown[]).splice(list.indexOf(item as never), 1);
      revision += 1;
      return json(null, 204);
    }
    if (method === 'PATCH') {
      const value = body(init);
      if (kind === 'projects' && typeof value.workflowStatus === 'string') {
        const state = projectWorkflowStatuses.find((status) => status.id === value.workflowStatus);
        if (!state) return json({ error: 'invalid project workflow status' }, 400);
        patch(item, { ...value, status: state.category });
      } else patch(item, value);
    }
    if (action === 'publish') patch(item, { status: 'accepted' });
    return json(item);
  }
  match = path.match(/^\/api\/documents\/(.+?)(?:\/history)?$/);
  if (match) {
    const history = path.endsWith('/history');
    const parts = match[1]!.split('/');
    const kind = parts[0];
    const key = parts[1];
    const item =
      kind === 'issues'
        ? findIssue(key!)
        : kind === 'pages'
          ? pages.find((p) => p.slug === key)
          : adrs.find((a) => a.identifier === key);
    if (!item || !('body' in item)) return notFound();
    if (history) return json([]);
    if (method === 'PUT') patch(item, { body: text(body(init).body) });
    return json({ body: item.body, revision: String(revision), savedAt: now });
  }
  if (path === '/api/search') {
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    const hits = [
      ...issues.map((i) => ({ kind: 'issue', id: i.identifier, title: i.title })),
      ...projects.map((p) => ({ kind: 'project', id: p.slug, title: p.name })),
      ...pages.map((p) => ({ kind: 'page', id: p.slug, title: p.title })),
      ...adrs.map((a) => ({ kind: 'adr', id: a.identifier, title: a.title })),
    ].filter((x) => x.title.toLowerCase().includes(q));
    return json(hits);
  }
  if (path.startsWith('/api/ai/'))
    return json({ error: 'AI is unavailable in the public demo' }, 503);
  return notFound();
}

const nativeFetch = globalThis.fetch.bind(globalThis);
export function installDemoApi(): void {
  globalThis.fetch = demoFetch;
}
