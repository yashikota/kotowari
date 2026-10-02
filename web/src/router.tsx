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
import { api } from './api.ts';
import { issuesQuery, parseIssueSearch, searchToFilter } from './issue-search.ts';
import type { IssueSearch } from './issue-search.ts';
import { EmptyState } from './mantine-ui.tsx';
import { PresenterScope } from './application/Root.tsx';
import { defaultHomeHref, getPersonalPreferences } from './preferences.ts';
import { parseInitiativeListSearch } from './initiative-list.ts';
import { parseProjectListSearch } from './project-route-search.ts';
import { parseSearchPageSearch } from './search.ts';

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
  const personalTab = search.myIssuesTab;
  if (personalTab === 'activity') {
    const activities = await api.inboxActivities();
    return {
      issues: [],
      projects: [],
      cycles: [],
      labels: [],
      linkSources: [],
      templateOptions: [],
      activityItems: activities.map(({ identifier, title, ...activity }) => ({
        identifier,
        title,
        activity,
      })),
    };
  }
  const issueSearch =
    personalTab && personalTab !== 'assigned'
      ? { ...search, assignee: undefined, view: undefined, archived: false }
      : search;
  const [issues, projects, cycles, labels, linkSources, templateOptions] = await Promise.all([
    api.issues(issuesQuery(searchToFilter(issueSearch))),
    api.projects(),
    api.cycles(),
    api.labels(),
    api.issueLinkSources(),
    api.issueTemplateFilterOptions(),
  ]);
  return { issues: issues ?? [], projects, cycles, labels, linkSources, templateOptions };
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

const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/search',
  validateSearch: (raw: Record<string, unknown>) => parseSearchPageSearch(raw),
  loaderDeps: ({ search }) => ({ q: search.q }),
  loader: async ({ deps }) => {
    try {
      return { hits: deps.q ? await api.search(deps.q) : [], searchFailed: false };
    } catch {
      return { hits: [], searchFailed: true };
    }
  },
  component: lazyRouteComponent(() => import('./pages/SearchPages.tsx'), 'SearchPage'),
});

const remindersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reminders',
  component: lazyRouteComponent(() => import('./pages/RemindersPages.tsx'), 'RemindersPage'),
});

const inboxRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/inbox',
  loader: () => api.inboxActivities(),
  component: lazyRouteComponent(() => import('./pages/InboxPages.tsx'), 'InboxPage'),
});

const reviewsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reviews',
  loader: () => api.issues(),
  component: lazyRouteComponent(() => import('./pages/ReviewsPages.tsx'), 'ReviewsPage'),
});

const agentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/agent',
  component: lazyRouteComponent(() => import('./pages/AgentPages.tsx'), 'AgentPage'),
});

const draftsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/drafts',
  component: lazyRouteComponent(() => import('./pages/DraftsPages.tsx'), 'DraftsPage'),
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
  loaderDeps: ({ search }) => ({ archived: search.archived ?? false }),
  loader: async ({ deps }) => {
    const [projects, labels, issues, projectTemplates, initiatives, workspace] = await Promise.all([
      api.projects(deps.archived),
      api.labels(),
      api.issues(),
      api.projectTemplates(),
      api.initiatives(),
      api.workspace(),
    ]);
    return { projects, labels, issues: issues ?? [], projectTemplates, initiatives, workspace };
  },
  component: lazyRouteComponent(() => import('./pages/Projects.tsx'), 'ProjectsPage'),
});

const initiativesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/initiatives',
  validateSearch: parseInitiativeListSearch,
  loader: async () => {
    const [initiatives, projects, labels] = await Promise.all([
      api.initiatives(),
      api.projects(),
      api.labels(),
    ]);
    return { initiatives, projects, labels };
  },
  component: lazyRouteComponent(() => import('./pages/InitiativesPages.tsx'), 'InitiativesPage'),
});

const initiativeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/initiatives/$slug',
  loader: async ({ params }) => {
    const [initiative, projects, labels, activities] = await Promise.all([
      api.initiative(params.slug),
      api.projects(),
      api.labels(),
      api.initiativeActivities(params.slug),
    ]);
    return { initiative, projects, labels, activities };
  },
  component: lazyRouteComponent(
    () => import('./pages/InitiativeDetailPages.tsx'),
    'InitiativeDetailPage',
  ),
});

const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$slug',
  loader: async ({ params }) => {
    const [project, adrs, pages, issues, labels, projects, cycles, activities, initiatives] =
      await Promise.all([
        api.project(params.slug),
        api.adrs(),
        api.pages(),
        api.issues(`?project=${encodeURIComponent(params.slug)}`),
        api.labels(),
        api.projects(),
        api.cycles(),
        api.projectActivities(params.slug),
        api.initiatives(),
      ]);
    return { project, adrs, pages, issues, labels, projects, cycles, activities, initiatives };
  },
  component: lazyRouteComponent(() => import('./pages/ProjectDetail.tsx'), 'ProjectDetailPage'),
});

const cyclesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cycles',
  validateSearch: (raw: Record<string, unknown>) => ({
    scope:
      raw.scope === 'current' ||
      raw.scope === 'upcoming' ||
      raw.scope === 'all' ||
      raw.scope === 'archived'
        ? raw.scope
        : undefined,
  }),
  loaderDeps: ({ search }) => ({ scope: search.scope }),
  loader: async ({ deps }) => {
    if (deps.scope !== 'archived') await api.ensureCycleSchedule();
    const [cycles, issues, workspace] = await Promise.all([
      api.cycles(deps.scope === 'archived'),
      api.issues(),
      api.workspace(),
    ]);
    const activeCycle = cycles.find((cycle) => cycle.status === 'active');
    const activeCycleActivities = activeCycle ? await api.cycleActivities(activeCycle.number) : [];
    return { cycles, issues, activeCycleActivities, workspace };
  },
  component: lazyRouteComponent(() => import('./pages/Cycles.tsx'), 'CyclesPage'),
});

const cycleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cycles/$number',
  validateSearch: (raw: Record<string, unknown>) => parseIssueSearch(raw),
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => {
    let number = Number(params.number);
    if (params.number === 'active' || params.number === 'upcoming') {
      await api.ensureCycleSchedule();
      const status = params.number;
      const candidates = (await api.cycles())
        .filter((cycle) => cycle.status === status)
        .sort((left, right) =>
          status === 'active'
            ? right.startsAt.localeCompare(left.startsAt)
            : left.startsAt.localeCompare(right.startsAt),
        );
      const cycle = candidates[0];
      if (cycle) {
        throw redirect({
          to: '/cycles/$number',
          params: { number: String(cycle.number) },
          search: deps,
          replace: true,
        });
      }
      throw redirect({
        to: '/cycles',
        search: { scope: status === 'active' ? 'current' : 'upcoming' },
        replace: true,
      });
    }
    const [
      cycle,
      issues,
      cycleIssues,
      activities,
      pages,
      projects,
      cycles,
      labels,
      linkSources,
      templateOptions,
      initiatives,
    ] = await Promise.all([
      api.cycle(number),
      api.issues(issuesQuery(searchToFilter({ ...deps, cycle: number }))),
      api.issues(`?cycle=${number}`),
      api.cycleActivities(number),
      api.pages(),
      api.projects(),
      api.cycles(),
      api.labels(),
      api.issueLinkSources(),
      api.issueTemplateFilterOptions(),
      api.initiatives(),
    ]);
    return {
      cycle,
      issues,
      cycleIssues,
      activities,
      pages,
      projects,
      cycles,
      labels,
      linkSources,
      templateOptions,
      initiatives,
    };
  },
  component: lazyRouteComponent(() => import('./pages/CycleDetail.tsx'), 'CycleDetailPage'),
});

const viewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/views/$slug',
  loader: async ({ params }) => {
    const view = await api.view(params.slug);
    const [issues, projects, cycles, labels, linkSources, templateOptions] = await Promise.all([
      api.issues(issuesQuery(view)),
      api.projects(),
      api.cycles(),
      api.labels(),
      api.issueLinkSources(),
      api.issueTemplateFilterOptions(),
    ]);
    return { view, issues, projects, cycles, labels, linkSources, templateOptions };
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

const projectViewBuilderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/views/projects/new',
  validateSearch: (raw: Record<string, unknown>) => parseProjectListSearch(raw),
  loader: async () => {
    const [projects, labels, issues, projectTemplates, initiatives] = await Promise.all([
      api.projects(),
      api.labels(),
      api.issues(),
      api.projectTemplates(),
      api.initiatives(),
    ]);
    return { projects, labels, issues, projectTemplates, initiatives };
  },
  component: lazyRouteComponent(
    () => import('./pages/ProjectViewBuilderPages.tsx'),
    'ProjectViewBuilderPage',
  ),
});

const viewsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/views',
  validateSearch: (raw: Record<string, unknown>) =>
    raw.entity === 'projects' ? { entity: 'projects' as const } : {},
  loader: () => api.views(),
  component: lazyRouteComponent(() => import('./pages/ViewsIndexPages.tsx'), 'ViewsIndexPage'),
});

const pagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pages',
  loader: async () => {
    const [pages, projects] = await Promise.all([api.pages(), api.projects()]);
    return { pages, projects };
  },
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
  searchRoute,
  issuesRoute,
  remindersRoute,
  inboxRoute,
  reviewsRoute,
  agentRoute,
  draftsRoute,
  templatesRoute,
  recurringIssuesRoute,
  issueRoute,
  boardRoute,
  adrsRoute,
  adrRoute,
  projectsRoute,
  initiativesRoute,
  initiativeRoute,
  projectRoute,
  cyclesRoute,
  cycleRoute,
  viewsRoute,
  viewBuilderRoute,
  projectViewBuilderRoute,
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
