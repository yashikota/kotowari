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
import type { ProjectViewSearch } from './project-views.ts';

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
    const [projects, labels, issues] = await Promise.all([
      api.projects(),
      api.labels(),
      api.issues(),
    ]);
    return { projects, labels, issues: issues ?? [] };
  },
  component: lazyRouteComponent(() => import('./pages/ProjectsCycles.tsx'), 'ProjectsPage'),
});

type ProjectListSearch = ProjectViewSearch & { projectView?: string };

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
  if (typeof raw.projectView === 'string' && raw.projectView.length <= 120) {
    result.projectView = raw.projectView;
  }
  const status = searchStringList(raw.status).filter((value) => /^[a-z0-9_-]{1,48}$/.test(value));
  if (status.length) result.status = status;
  const priority = searchStringList(raw.priority).filter((value) => /^[0-4]$/.test(value));
  if (priority.length) result.priority = priority;
  const health = searchStringList(raw.health).filter((value) =>
    ['none', 'on_track', 'at_risk', 'off_track'].includes(value),
  );
  if (health.length) result.health = health as NonNullable<ProjectListSearch['health']>;
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
    raw.orderBy === 'updated' ||
    raw.orderBy === 'completed'
  ) {
    result.orderBy = raw.orderBy;
  }
  if (raw.direction === 'asc' || raw.direction === 'desc') result.direction = raw.direction;
  if (raw.closed === 'open' || raw.closed === 'closed') result.closed = raw.closed;
  if (raw.view === 'board') result.view = 'board';
  if (raw.view === 'timeline') result.view = 'timeline';
  if (raw.columnsBy === 'status' || raw.columnsBy === 'priority') result.columnsBy = raw.columnsBy;
  if (raw.rowsBy === 'status' || raw.rowsBy === 'priority') result.rowsBy = raw.rowsBy;
  if (raw.showEmptyColumns === false || raw.showEmptyColumns === 'false') {
    result.showEmptyColumns = false;
  } else if (raw.showEmptyColumns === true || raw.showEmptyColumns === 'true') {
    result.showEmptyColumns = true;
  }
  if (raw.showProjectList === false || raw.showProjectList === 'false') {
    result.showProjectList = false;
  }
  if (raw.showWeekNumbers === true || raw.showWeekNumbers === 'true') {
    result.showWeekNumbers = true;
  }
  if (typeof raw.timelineStart === 'string' && /^\d{4}-\d{2}$/.test(raw.timelineStart)) {
    result.timelineStart = raw.timelineStart;
  }
  const displayProperties = searchStringList(raw.displayProperties).filter((value) =>
    [
      'id',
      'milestones',
      'summary',
      'priority',
      'status',
      'health',
      'dependencies',
      'startDate',
      'targetDate',
      'issues',
      'progress',
      'created',
      'updated',
      'completed',
      'labels',
    ].includes(value),
  );
  if (
    displayProperties.length ||
    (typeof raw.displayProperties === 'string' && raw.displayProperties.startsWith('[')) ||
    Array.isArray(raw.displayProperties)
  ) {
    result.displayProperties = displayProperties;
  }
  if (
    raw.dateField === 'startDate' ||
    raw.dateField === 'targetDate' ||
    raw.dateField === 'created' ||
    raw.dateField === 'updated' ||
    raw.dateField === 'completed'
  ) {
    result.dateField = raw.dateField;
  }
  if (typeof raw.dateFrom === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.dateFrom)) {
    result.dateFrom = raw.dateFrom;
  }
  if (typeof raw.dateTo === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.dateTo)) {
    result.dateTo = raw.dateTo;
  }
  const milestones = searchStringList(raw.milestones).filter((value) => value.length <= 120);
  if (milestones.length) result.milestones = milestones;
  const relations = searchStringList(raw.relations).filter((value) =>
    ['blocks', 'blocked_by', 'related'].includes(value),
  );
  if (relations.length) result.relations = relations as NonNullable<ProjectListSearch['relations']>;
  return result;
}

const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$slug',
  loader: async ({ params }) => {
    const [project, adrs, pages, issues, labels, projects, activities] = await Promise.all([
      api.project(params.slug),
      api.adrs(),
      api.pages(),
      api.issues(`?project=${encodeURIComponent(params.slug)}`),
      api.labels(),
      api.projects(),
      api.projectActivities(params.slug),
    ]);
    return { project, adrs, pages, issues, labels, projects, activities };
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
  validateSearch: (raw: Record<string, unknown>) => parseIssueSearch(raw),
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => {
    const number = Number(params.number);
    const [cycle, issues, cycleIssues, activities, pages, projects, cycles, labels] =
      await Promise.all([
        api.cycle(number),
        api.issues(issuesQuery(searchToFilter({ ...deps, cycle: number }))),
        api.issues(`?cycle=${number}`),
        api.cycleActivities(number),
        api.pages(),
        api.projects(),
        api.cycles(),
        api.labels(),
      ]);
    return { cycle, issues, cycleIssues, activities, pages, projects, cycles, labels };
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

const viewBuilderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/views/new',
  validateSearch: (raw: Record<string, unknown>) => parseIssueSearch(raw),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [issues, views] = await Promise.all([loadFilteredIssues(deps), api.views()]);
    return { ...issues, views };
  },
  component: lazyRouteComponent(() => import('./pages/ViewBuilderPages.tsx'), 'ViewBuilderPage'),
});

const viewsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/views',
  loader: () => api.views(),
  component: lazyRouteComponent(() => import('./pages/ViewsIndexPages.tsx'), 'ViewsIndexPage'),
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
  viewsRoute,
  viewBuilderRoute,
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
