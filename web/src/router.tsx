import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  redirect,
} from '@tanstack/react-router';
import { Shell } from './components/Shell.tsx';
import { api, issuesQuery, parseIssueSearch, searchToFilter, type IssueSearch } from './api.ts';

function NotFoundPage() {
  return <div className="empty">Not found</div>;
}

function ErrorPage({ error }: { error: Error }) {
  return <div className="error">{error.message}</div>;
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
    throw redirect({ to: '/issues', search: {} });
  },
  component: () => <Outlet />,
});

const issuesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/issues',
  validateSearch: (raw: Record<string, unknown>) => parseIssueSearch(raw),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => loadFilteredIssues(deps),
  component: lazyRouteComponent(() => import('./pages/IssuesPages.tsx'), 'IssuesPage'),
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
  loader: () => api.projects(),
  component: lazyRouteComponent(() => import('./pages/ProjectsCycles.tsx'), 'ProjectsPage'),
});

const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$slug',
  loader: async ({ params }) => {
    const [project, adrs, pages, issues] = await Promise.all([
      api.project(params.slug),
      api.adrs(),
      api.pages(),
      api.issues(`?project=${encodeURIComponent(params.slug)}`),
    ]);
    return { project, adrs, pages, issues };
  },
  component: lazyRouteComponent(() => import('./pages/ProjectsCycles.tsx'), 'ProjectDetailPage'),
});

const cyclesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cycles',
  loader: () => api.cycles(),
  component: lazyRouteComponent(() => import('./pages/ProjectsCycles.tsx'), 'CyclesPage'),
});

const cycleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cycles/$number',
  loader: async ({ params }) => {
    const number = Number(params.number);
    const [cycle, issues] = await Promise.all([api.cycle(number), api.issues(`?cycle=${number}`)]);
    return { cycle, issues };
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

const routeTree = rootRoute.addChildren([
  indexRoute,
  issuesRoute,
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
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultStaleTime: 30_000,
  defaultPendingMs: 150,
  defaultPreloadStaleTime: 30_000,
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
