import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  redirect,
} from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Alert, Stack, Text } from '@mantine/core';
import { Shell } from './components/Shell.tsx';
import { api, issuesQuery, parseIssueSearch, searchToFilter, type IssueSearch } from './api.ts';
import { EmptyState } from './mantine-ui.tsx';
import { PresenterScope } from './application/Root.tsx';
import { defaultHomeHref, getPersonalPreferences } from './preferences.ts';

function NotFoundPage() {
  return (
    <PresenterScope name="NotFoundPage">
      <NotFoundBinding />
    </PresenterScope>
  );
}

function NotFoundBinding() {
  const { t } = useTranslation();
  return <NotFoundView message={t('common.notFound')} />;
}

function NotFoundView({ message }: { message: string }) {
  return (
    <EmptyState>
      <Text>{message}</Text>
    </EmptyState>
  );
}

function ErrorPage({ error }: { error: Error }) {
  return (
    <PresenterScope name="ErrorPage">
      <ErrorBinding error={error} />
    </PresenterScope>
  );
}

function ErrorBinding({ error }: { error: Error }) {
  const { t } = useTranslation();
  return <ErrorView title={t('common.error')} message={error.message} />;
}

function ErrorView({ title, message }: { title: string; message: string }) {
  return (
    <Stack p="md">
      <Alert color="red" title={title}>
        {message}
      </Alert>
    </Stack>
  );
}

async function loadFilteredIssues(search: IssueSearch) {
  const [issues, projects, cycles, labels] = await Promise.all([
    api.issues(issuesQuery(searchToFilter(search))),
    api.projects(),
    api.cycles(),
    api.labels(),
  ]);
  return { issues: issues ?? [], projects, cycles, labels };
}

const rootRoute = createRootRoute({
  component: Shell,
  notFoundComponent: NotFoundPage,
  errorComponent: ErrorPage,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    const href = defaultHomeHref(getPersonalPreferences().defaultHome);
    if (href !== '/') throw redirect({ href });
  },
  loader: async () => {
    const [workspace, issues, projects, adrs] = await Promise.all([
      api.workspace(),
      api.issues(),
      api.projects(),
      api.adrs(),
    ]);
    const list = issues ?? [];
    const openIssues = list.filter(
      (issue) => issue.status !== 'done' && issue.status !== 'canceled',
    ).length;
    return {
      workspace,
      counts: {
        issues: list.length,
        openIssues,
        projects: projects.length,
        adrs: adrs.length,
      },
    };
  },
  component: lazyRouteComponent(() => import('./pages/HomePages.tsx'), 'HomePage'),
});

const issuesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/issues',
  validateSearch: (raw: Record<string, unknown>) => parseIssueSearch(raw),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => loadFilteredIssues(deps),
  component: lazyRouteComponent(() => import('./pages/IssuesPages.tsx'), 'IssuesPage'),
});

const remindersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reminders',
  component: lazyRouteComponent(() => import('./pages/RemindersPages.tsx'), 'RemindersPage'),
});

const agentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/agent',
  component: lazyRouteComponent(() => import('./pages/AgentPages.tsx'), 'AgentPage'),
});

const templatesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/templates',
  loader: () => api.issueTemplates(),
  component: lazyRouteComponent(() => import('./pages/TemplatesRecurring.tsx'), 'TemplatesPage'),
});

const recurringIssuesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/recurring',
  loader: () => api.recurringIssues(),
  component: lazyRouteComponent(
    () => import('./pages/TemplatesRecurring.tsx'),
    'RecurringIssuesPage',
  ),
});

const issueRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/issues/$identifier',
  loader: () => api.issues(),
  component: lazyRouteComponent(() => import('./pages/IssuesPages.tsx'), 'IssueRoutePage'),
});

const boardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/board',
  validateSearch: (raw: Record<string, unknown>) => parseIssueSearch(raw),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => loadFilteredIssues(deps),
  component: lazyRouteComponent(() => import('./pages/IssuesPages.tsx'), 'BoardPage'),
});

const adrsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/adrs',
  loader: () => api.adrs(),
  component: lazyRouteComponent(() => import('./pages/ADRsPages.tsx'), 'ADRsPage'),
});

const adrRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/adrs/$identifier',
  loader: ({ params }) => api.adr(params.identifier),
  component: lazyRouteComponent(() => import('./pages/ADRsPages.tsx'), 'ADRDetailPage'),
});

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects',
  validateSearch: (raw: Record<string, unknown>) => parseProjectListSearch(raw),
  loader: async () => {
    const [projects, labels] = await Promise.all([api.projects(), api.labels()]);
    return { projects, labels };
  },
  component: lazyRouteComponent(() => import('./pages/ProjectsCycles.tsx'), 'ProjectsPage'),
});

type ProjectListSearch = {
  q?: string;
  status?: string[];
  priority?: string[];
  labels?: string[];
  groupBy?: 'none' | 'status' | 'priority';
  orderBy?:
    | 'manual'
    | 'name'
    | 'status'
    | 'priority'
    | 'startDate'
    | 'targetDate'
    | 'created'
    | 'updated';
  direction?: 'asc' | 'desc';
  closed?: 'all' | 'open' | 'closed';
};

function searchStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value === 'string' && value) {
    if (value.startsWith('[')) {
      try {
        const parsed: unknown = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.filter((item): item is string => typeof item === 'string');
        }
      } catch {
        // Fall back to the comma-separated form used by older shared project links.
      }
    }
    return value.split(',').filter(Boolean);
  }
  return [];
}

function parseProjectListSearch(raw: Record<string, unknown>): ProjectListSearch {
  const result: ProjectListSearch = {};
  if (typeof raw.q === 'string' && raw.q.trim()) result.q = raw.q;
  const status = searchStringList(raw.status).filter((value) =>
    ['backlog', 'planned', 'started', 'completed', 'canceled'].includes(value),
  );
  if (status.length) result.status = status;
  const priority = searchStringList(raw.priority).filter((value) => /^[0-4]$/.test(value));
  if (priority.length) result.priority = priority;
  const labels = searchStringList(raw.labels).filter((value) => value.length <= 100);
  if (labels.length) result.labels = labels;
  if (raw.groupBy === 'status' || raw.groupBy === 'priority') result.groupBy = raw.groupBy;
  if (
    raw.orderBy === 'manual' ||
    raw.orderBy === 'name' ||
    raw.orderBy === 'status' ||
    raw.orderBy === 'priority' ||
    raw.orderBy === 'startDate' ||
    raw.orderBy === 'targetDate' ||
    raw.orderBy === 'created' ||
    raw.orderBy === 'updated'
  ) {
    result.orderBy = raw.orderBy;
  }
  if (raw.direction === 'asc' || raw.direction === 'desc') result.direction = raw.direction;
  if (raw.closed === 'open' || raw.closed === 'closed') result.closed = raw.closed;
  return result;
}

const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$slug',
  loader: async ({ params }) => {
    const [project, adrs, pages, issues, labels, projects] = await Promise.all([
      api.project(params.slug),
      api.adrs(),
      api.pages(),
      api.issues(`?project=${encodeURIComponent(params.slug)}`),
      api.labels(),
      api.projects(),
    ]);
    return { project, adrs, pages, issues, labels, projects };
  },
  component: lazyRouteComponent(() => import('./pages/ProjectsCycles.tsx'), 'ProjectDetailPage'),
});

const cyclesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cycles',
  validateSearch: (raw: Record<string, unknown>) => ({
    scope:
      raw.scope === 'current' || raw.scope === 'upcoming' || raw.scope === 'all'
        ? raw.scope
        : undefined,
  }),
  loader: async () => {
    const [cycles, issues] = await Promise.all([api.cycles(), api.issues()]);
    return { cycles, issues };
  },
  component: lazyRouteComponent(() => import('./pages/ProjectsCycles.tsx'), 'CyclesPage'),
});

const cycleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cycles/$number',
  loader: async ({ params }) => {
    const number = Number(params.number);
    const [cycle, issues, pages] = await Promise.all([
      api.cycle(number),
      api.issues(`?cycle=${number}`),
      api.pages(),
    ]);
    return { cycle, issues, pages };
  },
  component: lazyRouteComponent(() => import('./pages/ProjectsCycles.tsx'), 'CycleDetailPage'),
});

const viewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/views/$slug',
  loader: async ({ params }) => {
    const view = await api.view(params.slug);
    const [issues, projects, cycles, labels] = await Promise.all([
      api.issues(issuesQuery(view)),
      api.projects(),
      api.cycles(),
      api.labels(),
    ]);
    return { view, issues, projects, cycles, labels };
  },
  component: lazyRouteComponent(() => import('./pages/ViewsPages.tsx'), 'ViewPage'),
});

const pagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pages',
  loader: () => api.pages(),
  component: lazyRouteComponent(() => import('./pages/PagesPages.tsx'), 'PagesPage'),
});

const pageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pages/$slug',
  loader: ({ params }) => api.page(params.slug),
  component: lazyRouteComponent(() => import('./pages/PagesPages.tsx'), 'PageDetailPage'),
});

const configRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/config',
  loader: async () => {
    const [workspace, diagnostics] = await Promise.all([api.workspace(), api.diagnostics()]);
    return { workspace, diagnostics };
  },
  component: lazyRouteComponent(() => import('./pages/ConfigPages.tsx'), 'ConfigPage'),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  issuesRoute,
  remindersRoute,
  agentRoute,
  templatesRoute,
  recurringIssuesRoute,
  issueRoute,
  boardRoute,
  adrsRoute,
  adrRoute,
  projectsRoute,
  projectRoute,
  cyclesRoute,
  cycleRoute,
  viewRoute,
  pagesRoute,
  pageRoute,
  configRoute,
]);

export const router = createRouter({
  routeTree,
  basepath: import.meta.env.BASE_URL,
  defaultPreload: 'intent',
  // QueryCache owns freshness and mutation invalidation; route matches must re-read it.
  defaultStaleTime: 0,
  defaultPendingMs: 150,
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
