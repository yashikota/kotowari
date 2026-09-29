import { isSubmitShortcut } from '../keymap.ts';
import { useNavigate, useRouter, useRouterState } from '@tanstack/react-router';
import type * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.ts';
import { parseIssueSearch } from '../issue-search.ts';
import { queryCache } from '../application/cache.ts';
import { resetIssueProjection } from '../application/issues.ts';
import { mediator, signals } from '../application/mediator.ts';
import {
  useIntent,
  useIntentHandler,
  useKeyboard,
  useMachineFlag,
  useOverlay,
} from '../application/Root.tsx';
import { Palette } from '../components/Palette.tsx';
import { actionFromKeyboard } from '../keymap.ts';
import { navTargetForAction, type NavShortcutAction } from '../nav.ts';
import { sidebarSettingsGroups, visibleSidebarNavigation } from '../sidebar.ts';
import {
  usePersonalPreferences,
  type FavoriteIssueView,
  type SidebarBadgeStyle,
  type SidebarItemId,
  type SidebarLocation,
} from '../preferences.ts';
import type { Project } from '../types.ts';
import { autoAssignOnStartedTransition } from '../application/issue-assignment.ts';
import { useShellWorkspace } from './useShellWorkspace.ts';
import { useShellPalette } from './useShellPalette.ts';
import { useShellCycleNavigation } from './useShellCycleNavigation.ts';
import { useShellIssueComposer } from './useShellIssueComposer.ts';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

function issueNumberFromIdent(id: string | null): number | undefined {
  if (!id) {
    return undefined;
  }
  const m = id.match(/-(\d+)$/);
  if (!m?.[1]) {
    return undefined;
  }
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function useShellPresenter() {
  const { t } = useTranslation();
  const send = useIntent();
  const navigate = useNavigate();
  const router = useRouter();
  const { preferences, update: updatePreferences } = usePersonalPreferences();
  const defaultIssueAssignee: '' | 'self' = preferences.autoAssignToSelf ? 'self' : '';
  useEffect(() => {
    let revision = '';
    let active = true;
    let pending = false;
    async function refresh() {
      if (
        pending ||
        document.hidden ||
        document.activeElement?.matches('input,textarea,select,[contenteditable="true"]')
      )
        return;
      pending = true;
      try {
        const response = await fetch('/api/revision');
        if (!response.ok) return;
        const data = (await response.json()) as { revision: string };
        if (!active) return;
        if (revision && revision !== data.revision) {
          queryCache.invalidate();
          resetIssueProjection();
          await router.invalidate();
          signals.dispatchEvent(new Event('kotowari:refresh'));
        }
        revision = data.revision;
      } catch {
        /* Existing views retain their last data during a disconnect. */
      } finally {
        pending = false;
      }
    }
    void refresh();
    const timer = setInterval(() => void refresh(), 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [router]);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const routeSearch = useRouterState({ select: (s) => s.location.search });
  const isMyIssues =
    pathname === '/issues' &&
    (routeSearch.myIssuesTab !== undefined || routeSearch.assignee === 'self');
  const issueView: FavoriteIssueView | undefined =
    pathname !== '/issues' || routeSearch.myIssuesTab || routeSearch.assignee === 'self'
      ? undefined
      : routeSearch.archived
        ? 'archived'
        : routeSearch.view === 'active' || routeSearch.view === 'backlog'
          ? routeSearch.view
          : 'all';
  const issueViewFavorite = issueView ? preferences.favoriteIssueViews.includes(issueView) : false;
  const isIssueDetail = pathname.startsWith('/issues/');
  const isCycleDetail = pathname.startsWith('/cycles/');
  const isPageOwnedHeader =
    pathname === '/inbox' ||
    pathname === '/drafts' ||
    pathname === '/projects' ||
    pathname === '/cycles' ||
    pathname === '/initiatives' ||
    pathname === '/views';
  const [sidebarCustomizationOpen, setSidebarCustomizationOpen] =
    useMachineFlag('sidebar-customization');
  const { overlay, set: setOverlay } = useOverlay();
  const paletteOpen = overlay === 'palette';
  const setPaletteOpen = setOverlay('palette');
  const createIssue = overlay === 'issue';
  const setCreateIssue = setOverlay('issue');
  const createADR = overlay === 'adr';
  const setCreateADR = setOverlay('adr');
  const createPage = overlay === 'page';
  const setCreatePage = setOverlay('page');
  const helpOpen = overlay === 'help';
  const setHelpOpen = setOverlay('help');
  const [projects, setProjects] = useState<Project[]>([]);
  const [pageTitle, setPageTitle] = useState('');
  const [adrTitle, setAdrTitle] = useState('');
  const [adrLinkIssue, setAdrLinkIssue] = useState<number | undefined>(undefined);
  const [error, setError] = useState('');
  const [focusedIssue, setFocusedIssue] = useState<string | null>(null);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [workspaceNavigationOpen, setWorkspaceNavigationOpen] = useState(true);
  const [moreLinksOpen, setMoreLinksOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(true);
  const [teamsOpen, setTeamsOpen] = useState(true);
  const [teamNavigationOpen, setTeamNavigationOpen] = useState(true);
  const { cycles, initiatives, views, favoriteIssues, workspaceName, sidebarBadgeCounts } =
    useShellWorkspace({ setError, setProjects });
  const issueComposerState = useShellIssueComposer({
    open: createIssue,
    setOpen: setCreateIssue,
    defaultIssueAssignee,
    setProjects,
    setError,
  });
  const {
    data: issueComposerData,
    handlers: issueComposerHandlers,
    openCreateIssue,
    closeCreateIssue,
  } = issueComposerState;
  const { issueWorkflowStatuses } = issueComposerData;
  useIntentHandler('issue.focus', (value) => setFocusedIssue(value as string | null));
  useIntentHandler('adr.create', (value) => {
    const detail = (value ?? {}) as { issueNumber?: number };
    setAdrLinkIssue(detail.issueNumber);
    setCreateADR(true);
  });
  const currentIdentifier =
    pathname.startsWith('/issues/') && pathname.slice('/issues/'.length).length > 0
      ? pathname.slice('/issues/'.length)
      : focusedIssue;
  const paletteState = useShellPalette({
    paletteOpen,
    currentIdentifier,
    cycles,
    projects,
    favoriteIssues,
    views,
    initiatives,
  });
  const { data: paletteData, setQuery } = paletteState;
  const routeTitle = (() => {
    if (pathname === '/') return 'Home';
    if (pathname === '/inbox') return t('nav.inbox');
    if (pathname === '/drafts') return t('nav.drafts');
    if (pathname === '/reviews') return t('nav.reviews');
    if (pathname === '/search') return t('nav.search');
    if (pathname === '/reminders') return 'Reminders';
    if (pathname === '/templates') return 'Templates';
    if (pathname === '/recurring') return 'Recurring issues';
    if (pathname === '/issues' && routeSearch.archived) return t('issueViews.archived');
    if (pathname === '/issues')
      return routeSearch.assignee === 'self' ? t('nav.myIssues') : t('nav.issues');
    if (pathname.startsWith('/issues/'))
      return pathname.slice('/issues/'.length).split('/')[0] ?? 'Issue';
    if (pathname === '/board') return 'Board';
    if (pathname === '/adrs') return 'ADRs';
    if (pathname.startsWith('/adrs/'))
      return pathname.slice('/adrs/'.length).split('/')[0] ?? 'ADR';
    if (pathname === '/projects') return 'Projects';
    if (pathname.startsWith('/projects/'))
      return (
        projects.find((project) => project.slug === pathname.slice('/projects/'.length))?.name ??
        'Project'
      );
    if (pathname === '/cycles') return 'Cycles';
    if (pathname.startsWith('/cycles/')) {
      const number = Number(pathname.slice('/cycles/'.length));
      const cycle = cycles.find((candidate) => candidate.number === number);
      return cycle?.name || t('field.cycleN', { number });
    }
    if (pathname === '/initiatives') return t('nav.initiatives');
    if (pathname.startsWith('/initiatives/'))
      return (
        initiatives.find((initiative) => initiative.slug === pathname.slice('/initiatives/'.length))
          ?.name ?? t('initiatives.title')
      );
    if (pathname === '/views') return t('nav.views');
    if (pathname === '/views/new') return t('viewBuilder.issueParent');
    if (pathname === '/views/projects/new') return t('viewBuilder.projectParent');
    if (pathname === '/pages') return 'Pages';
    if (pathname.startsWith('/pages/'))
      return pathname.slice('/pages/'.length).replaceAll('-', ' ');
    if (pathname.startsWith('/views/'))
      return views.find((view) => view.slug === pathname.slice('/views/'.length))?.name ?? 'View';
    if (pathname === '/config') return 'Settings';
    return workspaceName || 'Workspace';
  })();

  const runCommand = useCallback(
    async (id: string) => {
      setPaletteOpen(false);
      mediator.setQuickOpenTarget(null);
      setQuery('');
      switch (id) {
        case 'new-issue':
          openCreateIssue();
          return;
        case 'new-adr':
          setAdrLinkIssue(
            pathname.startsWith('/issues/') ? issueNumberFromIdent(currentIdentifier) : undefined,
          );
          setCreateADR(true);
          return;
        case 'new-page':
          setCreatePage(true);
          return;
        case 'new-view':
          await navigate({
            to: '/views/new',
            search: parseIssueSearch(routeSearch as Record<string, unknown>),
            state: { autofocus: 'name' },
          });
          return;
        case 'goto-issues':
          await navigate({ to: '/issues', search: {} });
          return;
        case 'goto-search':
          await navigate({ to: '/search', search: {} });
          return;
        case 'goto-inbox':
          await navigate({ to: '/inbox' });
          return;
        case 'goto-board':
          await navigate({ to: '/board', search: {} });
          return;
        case 'goto-adrs':
          await navigate({ to: '/adrs' });
          return;
        case 'goto-projects':
          await navigate({ to: '/projects' });
          return;
        case 'goto-cycles':
          await navigate({ to: '/cycles', search: { scope: 'all' } });
          return;
        case 'goto-pages':
          await navigate({ to: '/pages' });
          return;
        case 'goto-config':
          await navigate({ to: '/config' });
          return;
        case 'goto-agent':
          await navigate({ to: '/agent' });
          return;
        case 'goto-active-cycle': {
          const active = cycles.find((c) => c.status === 'active');
          if (active) {
            await navigate({
              to: '/cycles/$number',
              params: { number: String(active.number) },
            });
          } else {
            await navigate({ to: '/cycles', search: { scope: 'all' } });
          }
          return;
        }
        case 'copy-identifier':
          if (currentIdentifier) {
            await navigator.clipboard.writeText(currentIdentifier).catch(() => undefined);
          }
          return;
        case 'keyboard-help':
          setHelpOpen(true);
          return;
        default:
          break;
      }
      if (id.startsWith('set-status-') && currentIdentifier) {
        const status = id.replace('set-status-', '');
        const issue = await api.issue(currentIdentifier);
        const patch = autoAssignOnStartedTransition(
          issue,
          { workflowStatus: status },
          issueWorkflowStatuses,
          preferences.autoAssignOnStart,
        );
        await api.patchIssue(currentIdentifier, patch);
        signals.dispatchEvent(new Event('kotowari:refresh'));
        await router.invalidate();
        await navigate({
          to: '/issues/$identifier',
          params: { identifier: currentIdentifier },
        });
      }
      if (id.startsWith('assign-cycle:') && currentIdentifier) {
        const raw = id.slice('assign-cycle:'.length);
        const cycleId = raw === 'none' ? null : Number(raw);
        await api.patchIssue(currentIdentifier, { cycleId });
        signals.dispatchEvent(new Event('kotowari:refresh'));
        await router.invalidate();
      }
      if (id.startsWith('assign-project:') && currentIdentifier) {
        const raw = id.slice('assign-project:'.length);
        const projectId = raw === 'none' ? null : Number(raw);
        await api.patchIssue(currentIdentifier, { projectId });
        signals.dispatchEvent(new Event('kotowari:refresh'));
        await router.invalidate();
      }
      if (id.startsWith('open-issue:')) {
        await navigate({
          to: '/issues/$identifier',
          params: { identifier: id.slice('open-issue:'.length) },
        });
      }
      if (id.startsWith('open-project:')) {
        await navigate({
          to: '/projects/$slug',
          params: { slug: id.slice('open-project:'.length) },
        });
      }
      if (id.startsWith('open-adr:')) {
        await navigate({
          to: '/adrs/$identifier',
          params: { identifier: id.slice('open-adr:'.length) },
        });
      }
      if (id.startsWith('open-page:')) {
        await navigate({
          to: '/pages/$slug',
          params: { slug: id.slice('open-page:'.length) },
        });
      }
      if (id.startsWith('open-view:')) {
        await navigate({
          to: '/views/$slug',
          params: { slug: id.slice('open-view:'.length) },
        });
      }
      if (id.startsWith('open-cycle:')) {
        await navigate({
          to: '/cycles/$number',
          params: { number: id.slice('open-cycle:'.length) },
        });
      }
      if (id.startsWith('open-initiative:')) {
        await navigate({
          to: '/initiatives/$slug',
          params: { slug: id.slice('open-initiative:'.length) },
        });
      }
    },
    [
      currentIdentifier,
      cycles,
      navigate,
      router,
      pathname,
      defaultIssueAssignee,
      issueWorkflowStatuses,
      openCreateIssue,
    ],
  );

  useIntentHandler('navigation.sidebar.toggle', () =>
    updatePreferences({ sidebarCollapsed: !preferences.sidebarCollapsed }),
  );

  useKeyboard((e) => {
    const action = actionFromKeyboard(e);
    if (!action) {
      return false;
    }
    if (action === 'palette') {
      e.preventDefault();
      setQuery('');
      mediator.setQuickOpenTarget(null);
      setPaletteOpen((v) => !v);
      return true;
    }
    if (action === 'escape') {
      setPaletteOpen(false);
      mediator.setQuickOpenTarget(null);
      closeCreateIssue();
      setCreateADR(false);
      setCreatePage(false);
      setHelpOpen(false);
      return true;
    }
    if (action === 'help') {
      e.preventDefault();
      setHelpOpen((v) => !v);
      return true;
    }
    if (action === 'find') {
      e.preventDefault();
      send('issues.find.open');
      return true;
    }
    if (action === 'toggle-sidebar') {
      e.preventDefault();
      send('navigation.sidebar.toggle');
      return true;
    }
    if (action.startsWith('nav-')) {
      const dest = navTargetForAction(action as NavShortcutAction);
      if (dest) {
        e.preventDefault();
        void navigate({
          to: dest.to,
          search: dest.search,
          params: dest.params,
        });
        return true;
      }
    }
    if (paletteOpen || createIssue || createADR || createPage || helpOpen) {
      return true;
    }
    if (action === 'new-issue') {
      e.preventDefault();
      openCreateIssue();
    }
    if (action === 'new-adr') {
      e.preventDefault();
      setAdrLinkIssue(
        pathname.startsWith('/issues/') ? issueNumberFromIdent(currentIdentifier) : undefined,
      );
      setCreateADR(true);
    }
    if (action === 'status' && currentIdentifier) {
      e.preventDefault();
      mediator.setQuickOpenTarget(null);
      setPaletteOpen(true);
      setQuery('status');
    }
    if (action.startsWith('priority-') && currentIdentifier) {
      const n = Number(action.slice(-1));
      void api.patchIssue(currentIdentifier, { priority: n }).then(() => {
        signals.dispatchEvent(new Event('kotowari:refresh'));
        return router.invalidate();
      });
    }

    return e.defaultPrevented;
  });

  useIntentHandler('submit:ADR', submitADR);
  useIntentHandler('submit:Page', submitPage);

  async function submitADR() {
    const title = adrTitle.trim();
    if (!title) {
      return;
    }
    const adr = await api.createADR({
      title,
      issueNumbers: adrLinkIssue ? [adrLinkIssue] : [],
    });
    setAdrTitle('');
    setAdrLinkIssue(undefined);
    setCreateADR(false);
    await router.invalidate();
    await navigate({
      to: '/adrs/$identifier',
      params: { identifier: adr.identifier },
      state: { autofocus: 'title' },
    });
  }

  async function submitPage() {
    const title = pageTitle.trim();
    if (!title) {
      return;
    }
    const slug = slugify(title) || `page-${Date.now()}`;
    const page = await api.createPage({ title, slug });
    setPageTitle('');
    setCreatePage(false);
    await router.invalidate();
    await navigate({
      to: '/pages/$slug',
      params: { slug: page.slug },
      state: { autofocus: 'title' },
    });
  }

  const cycleNavigationState = useShellCycleNavigation({
    pathname,
    scope:
      routeSearch.scope === 'current' || routeSearch.scope === 'upcoming'
        ? routeSearch.scope
        : undefined,
    cycles,
  });
  const { data: cycleNavigationData, handlers: cycleNavigationHandlers } = cycleNavigationState;

  return {
    _view: 0 as const,
    workspaceName,
    routeTitle,
    isMyIssues,
    isIssueDetail,
    showIssueViewFavorite: issueView !== undefined,
    issueViewFavorite,
    isCycleDetail,
    isCycleList: pathname === '/cycles',
    ...cycleNavigationData,
    isPageOwnedHeader,
    mobileNavigationOpen,
    sidebarCollapsed: preferences.sidebarCollapsed,
    workspaceNavigationOpen,
    moreLinksOpen,
    favoritesOpen,
    teamsOpen,
    teamNavigationOpen,
    sidebarNavigation: visibleSidebarNavigation(preferences, sidebarBadgeCounts),
    sidebarBadgeCounts,
    sidebarBadgeStyle: preferences.sidebarBadgeStyle,
    sidebarGroups: sidebarSettingsGroups(preferences).map(({ group, items }) => ({
      group,
      label: t(`config.sidebarGroup.${group}`),
      items: items.map((item) => ({ ...item, label: t(item.labelKey) })),
    })),
    sidebarCustomizationOpen,
    cycles,
    views,
    favoriteIssues,
    favoriteIssueViews: preferences.favoriteIssueViews,
    overlay,
    paletteOpen,
    ...paletteData,
    createIssue,
    createADR,
    createPage,
    ...issueComposerData,
    helpOpen,
    projects,
    pageTitle,
    adrTitle,
    adrLinkIssue,
    error,
    handlers: {
      ...cycleNavigationHandlers,
      onToggleIssueViewFavorite: () => {
        if (!issueView) return;
        const favorites = preferences.favoriteIssueViews;
        updatePreferences({
          favoriteIssueViews: favorites.includes(issueView)
            ? favorites.filter((view) => view !== issueView)
            : [...favorites, issueView],
        });
      },
      submitADR: () => send('submit:ADR'),
      submitPage: () => send('submit:Page'),
      onClick0: () =>
        navigate({
          to: '/views/new',
          search: parseIssueSearch(routeSearch as Record<string, unknown>),
          state: { autofocus: 'name' },
        }),
      onOpenPalette: () => {
        setQuery('');
        mediator.setQuickOpenTarget(null);
        setPaletteOpen(true);
      },
      onOpenSearch: () => navigate({ to: '/search', search: {} }),
      ...issueComposerHandlers,
      onDismissError: () => setError(''),
      onToggleMobileNavigation: () => setMobileNavigationOpen((open) => !open),
      onToggleSidebar: () => send('navigation.sidebar.toggle'),
      onToggleWorkspaceNavigation: () => setWorkspaceNavigationOpen((open) => !open),
      onToggleMoreLinks: () => setMoreLinksOpen((open) => !open),
      onOpenSidebarCustomization: () => setSidebarCustomizationOpen(true),
      onCloseSidebarCustomization: () => setSidebarCustomizationOpen(false),
      onSidebarLocationChange: (id: SidebarItemId, location: SidebarLocation) =>
        updatePreferences({
          sidebarLocations: { ...preferences.sidebarLocations, [id]: location },
        }),
      onSidebarBadgeStyleChange: (style: SidebarBadgeStyle) =>
        updatePreferences({ sidebarBadgeStyle: style }),
      onMoveSidebarItem: (id: SidebarItemId, direction: number) => {
        const group = sidebarSettingsGroups(preferences).find((candidate) =>
          candidate.items.some((item) => item.id === id),
        );
        if (!group) return;
        const index = group.items.findIndex((item) => item.id === id);
        const neighbor = group.items[index + direction];
        if (!neighbor) return;
        const sidebarOrder = [...preferences.sidebarOrder];
        const from = sidebarOrder.indexOf(id);
        const to = sidebarOrder.indexOf(neighbor.id);
        if (from < 0 || to < 0) return;
        [sidebarOrder[from], sidebarOrder[to]] = [sidebarOrder[to]!, sidebarOrder[from]!];
        updatePreferences({ sidebarOrder });
      },
      onToggleFavorites: () => setFavoritesOpen((open) => !open),
      onToggleTeams: () => setTeamsOpen((open) => !open),
      onToggleTeamNavigation: () => setTeamNavigationOpen((open) => !open),
      onCloseMobileNavigation: () => setMobileNavigationOpen(false),
      onNavbarClick: (event: React.MouseEvent<HTMLElement>) => {
        if (event.target instanceof Element && event.target.closest('a'))
          setMobileNavigationOpen(false);
      },
      onQuery6: (
        ...args: Parameters<NonNullable<React.ComponentProps<typeof Palette>['onQuery']>>
      ) => {
        const handle: NonNullable<React.ComponentProps<typeof Palette>['onQuery']> = setQuery;
        return handle(...args);
      },
      onPick7: (id: Parameters<NonNullable<React.ComponentProps<typeof Palette>['onPick']>>[0]) =>
        runCommand(id),
      onClose8: () => {
        setPaletteOpen(false);
        mediator.setQuickOpenTarget(null);
      },
      onClose9: () => setHelpOpen(false),
      onClick18: () => setCreateADR(false),
      Create_ADR_onClick19: (
        e: Parameters<NonNullable<React.ComponentProps<'div'>['onClick']>>[0],
      ) => e.stopPropagation(),
      ADR_title_onChange20: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => setAdrTitle(e.target.value),
      ADR_title_onKeyDown21: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onKeyDown']>>[0],
      ) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return;

        if (isSubmitShortcut(e)) {
          e.preventDefault();
          return send('submit:ADR');
        }
      },
      onClick22: () => setCreatePage(false),
      Create_page_onClick23: (
        e: Parameters<NonNullable<React.ComponentProps<'div'>['onClick']>>[0],
      ) => e.stopPropagation(),
      Page_title_onChange24: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => setPageTitle(e.target.value),
      Page_title_onKeyDown25: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onKeyDown']>>[0],
      ) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return;

        if (isSubmitShortcut(e)) {
          e.preventDefault();
          return send('submit:Page');
        }
      },
    },
  };
}
