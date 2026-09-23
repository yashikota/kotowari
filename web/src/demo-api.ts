import type {
  ADR,
  Activity,
  Comment,
  Cycle,
  Issue,
  Label,
  Page,
  Project,
  View,
  Workspace,
} from './types.ts';

const now = '2026-09-23T09:00:00Z';
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
  updatedAt: now,
};
let projects: Project[] = [
  {
    id: 1,
    name: 'Launch',
    slug: 'launch',
    description: '公開に向けたプロダクト改善',
    status: 'started',
    startDate: '2026-09-01',
    targetDate: '2026-10-15',
    progress: 55,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 2,
    name: 'Documentation',
    slug: 'docs',
    description: '利用ガイドと設計資料',
    status: 'planned',
    startDate: null,
    targetDate: null,
    progress: 20,
    createdAt: now,
    updatedAt: now,
  },
];
let cycles: Cycle[] = [
  {
    id: 1,
    number: 1,
    startsAt: '2026-09-14',
    endsAt: '2026-09-27',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 2,
    number: 2,
    startsAt: '2026-09-28',
    endsAt: '2026-10-11',
    status: 'upcoming',
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
    orderBy: 'manual',
    status: null,
    project: 'launch',
    cycle: null,
    labels: [],
    priority: null,
    createdAt: now,
    updatedAt: now,
  },
];
let comments: Comment[] = [
  { id: 1, issueId: 1, body: 'GitHub Pagesで公開する方針。', createdAt: now },
];
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
    priority,
    projectId,
    projectSlug: projects.find((p) => p.id === projectId)?.slug,
    cycleId,
    cycleNumber: cycles.find((c) => c.id === cycleId)?.number,
    parentId: null,
    depth: 0,
    dueDate: null,
    sortOrder: number,
    labels: issueLabels,
    adrNumbers: number === 1 ? [1] : [],
    createdAt: now,
    updatedAt: now,
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
  if (path === '/api/revision') return json({ revision: String(revision) });
  if (path === '/api/workspace') {
    if (method === 'PATCH') workspace = patch(workspace, body(init));
    return json(workspace);
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
    let result = [...issues];
    const status = url.searchParams.get('status');
    const project = url.searchParams.get('project');
    const cycle = url.searchParams.get('cycle');
    const priority = url.searchParams.get('priority');
    const wantedLabels = url.searchParams.get('labels')?.split(',');
    if (status) result = result.filter((i) => i.status === status);
    if (project) result = result.filter((i) => i.projectSlug === project);
    if (cycle) result = result.filter((i) => i.cycleNumber === Number(cycle));
    if (priority) result = result.filter((i) => i.priority === Number(priority));
    if (wantedLabels?.length)
      result = result.filter((i) =>
        wantedLabels.every((name) => i.labels.some((label) => label.name === name)),
      );
    return json(result);
  }
  if (path === '/api/issues' && method === 'POST') {
    const value = body(init);
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
    issues.push(item);
    revision += 1;
    return json(item, 201);
  }
  let match = path.match(/^\/api\/issues\/([^/]+)$/);
  if (match) {
    const item = findIssue(decodeURIComponent(match[1]!));
    if (!item) return notFound();
    if (method === 'DELETE') {
      issues = issues.filter((i) => i !== item);
      revision += 1;
      return json(null, 204);
    }
    if (method === 'PATCH') patch(item, body(init));
    return json(item);
  }
  match = path.match(/^\/api\/issues\/([^/]+)\/(comments|activities)$/);
  if (match) {
    const item = findIssue(decodeURIComponent(match[1]!));
    if (!item) return notFound();
    if (match[2] === 'activities') return json([] satisfies Activity[]);
    if (method === 'POST') {
      const value = body(init);
      const comment = {
        id: comments.length + 1,
        issueId: item.id,
        body: String(value.body),
        createdAt: new Date().toISOString(),
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
        orderBy: value.orderBy ?? 'manual',
        status: value.status ?? null,
        project: value.project ?? null,
        cycle: value.cycle ?? null,
        labels: value.labels ?? [],
        priority: value.priority ?? null,
      });
    (collection as unknown[]).push(created);
    revision += 1;
    return json(created, 201);
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
    if (method === 'PATCH') patch(item, body(init));
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
