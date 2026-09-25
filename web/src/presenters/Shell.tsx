import { isSubmitShortcut } from '../keymap.ts';
import { useNavigate, useRouter, useRouterState } from '@tanstack/react-router';
import type * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, parseIssueSearch } from '../api.ts';
import { queryCache } from '../application/cache.ts';
import { resetIssueProjection } from '../application/issues.ts';
import { signals } from '../application/mediator.ts';
import { useIntent, useIntentHandler, useKeyboard, useOverlay } from '../application/Root.tsx';
import { cycleCommands, filterCommands, projectCommands, staticCommands } from '../commands.ts';
import { Palette } from '../components/Palette.tsx';
import { actionFromKeyboard } from '../keymap.ts';
import { navTargetForAction, type NavShortcutAction } from '../nav.ts';
import { sidebarNavigation } from '../sidebar.ts';
import { usePersonalPreferences } from '../preferences.ts';
import type {
  Cycle,
  Issue,
  IssueLink,
  IssueTemplate,
  Initiative,
  Label,
  Project,
  RecurringIssue,
  SearchHit,
  View,
} from '../types.ts';
import { useIssueWorkflow, workflowStatusCategory } from '../workflow.tsx';

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

function localDateValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function useShellPresenter() {
  const { t, i18n } = useTranslation();
  const send = useIntent();
  const navigate = useNavigate();
  const router = useRouter();
  const { preferences } = usePersonalPreferences();
  const { statuses: issueWorkflowStatuses } = useIssueWorkflow();
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
  const isIssueDetail = pathname.startsWith('/issues/');
  const isCycleDetail = pathname.startsWith('/cycles/');
  const isPageOwnedHeader =
    pathname === '/projects' || pathname === '/cycles' || pathname === '/initiatives';
  const [cycleNavigationOpen, setCycleNavigationOpen] = useState(false);
  const [cycleNavigationQuery, setCycleNavigationQuery] = useState('');
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [views, setViews] = useState<View[]>([]);
  const [favoriteIssues, setFavoriteIssues] = useState<Issue[]>([]);
  const [workspaceName, setWorkspaceName] = useState('');
  const { overlay, set: setOverlay } = useOverlay();
  const paletteOpen = overlay === 'palette';
  const setPaletteOpen = setOverlay('palette');
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const createIssue = overlay === 'issue';
  const setCreateIssue = setOverlay('issue');
  const createADR = overlay === 'adr';
  const setCreateADR = setOverlay('adr');
  const createPage = overlay === 'page';
  const setCreatePage = setOverlay('page');
  const [issueTitle, setIssueTitle] = useState('');
  const [issueStatus, setIssueStatus] = useState('todo');
  const [issuePriority, setIssuePriority] = useState(0);
  const [issueType, setIssueType] = useState<Issue['type'] | ''>('');
  const [issueEstimate, setIssueEstimate] = useState('');
  const [issueBody, setIssueBody] = useState('');
  const [issueAttachments, setIssueAttachments] = useState<File[]>([]);
  const [issueAttachmentError, setIssueAttachmentError] = useState('');
  const [issueDueDate, setIssueDueDate] = useState('');
  const [issueDueDateOpen, setIssueDueDateOpen] = useState(false);
  const [issueRecurringOpen, setIssueRecurringOpen] = useState(false);
  const [issueRecurringFirstDueDate, setIssueRecurringFirstDueDate] = useState('');
  const [issueRecurringInterval, setIssueRecurringInterval] = useState('1');
  const [issueRecurringUnit, setIssueRecurringUnit] = useState<RecurringIssue['unit']>('week');
  const [issueExternalLinks, setIssueExternalLinks] = useState<
    Pick<IssueLink, 'url' | 'title' | 'kind'>[]
  >([]);
  const [issueLinkOpen, setIssueLinkOpen] = useState(false);
  const [issueLinkURL, setIssueLinkURL] = useState('');
  const [issueLinkTitle, setIssueLinkTitle] = useState('');
  const [issueLabelNames, setIssueLabelNames] = useState<string[]>([]);
  const [issueParentId, setIssueParentId] = useState<number | undefined>();
  const [issueParentOpen, setIssueParentOpen] = useState(false);
  const [issueParentIdentifier, setIssueParentIdentifier] = useState('');
  const [issueParentQuery, setIssueParentQuery] = useState('');
  const [issueParentResults, setIssueParentResults] = useState<SearchHit[]>([]);
  const [selectedParentIssue, setSelectedParentIssue] = useState<SearchHit | null>(null);
  const [issueParentLoading, setIssueParentLoading] = useState(false);
  const parentLookupVersion = useRef(0);
  const [issueTemplates, setIssueTemplates] = useState<IssueTemplate[]>([]);
  const [issueTemplateSlug, setIssueTemplateSlug] = useState('');
  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);
  const [issueProjectId, setIssueProjectId] = useState('');
  const [issueCycleId, setIssueCycleId] = useState('');
  const [issueAssignee, setIssueAssignee] = useState<'self' | 'agent' | ''>('self');
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

  const loadWorkspace = useCallback(async () => {
    try {
      const [ws, cyc, vs, proj, favorites, initiativeList] = await Promise.all([
        api.workspace(),
        api.cycles(),
        api.views(),
        api.projects(),
        api.issues('?favorite=true'),
        api.initiatives(),
      ]);
      setWorkspaceName(ws.name);
      setCycles(cyc);
      setViews(vs);
      setProjects(proj);
      setFavoriteIssues(favorites);
      setInitiatives(initiativeList);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to load workspace');
    }
  }, []);

  useEffect(() => {
    void loadWorkspace();
    signals.addEventListener('kotowari:refresh', loadWorkspace);
    return () => signals.removeEventListener('kotowari:refresh', loadWorkspace);
  }, [loadWorkspace]);

  useEffect(() => {
    if (!createIssue) {
      return;
    }
    void Promise.all([api.projects(), api.issueTemplates(), api.labels()])
      .then(([nextProjects, templates, nextLabels]) => {
        setProjects(nextProjects);
        setIssueTemplates(templates);
        setAvailableLabels(nextLabels);
      })
      .catch(() => {
        setProjects([]);
        setIssueTemplates([]);
        setAvailableLabels([]);
      });
  }, [createIssue]);

  useEffect(() => {
    const query = issueParentQuery.trim();
    if (!createIssue || !query) {
      setIssueParentResults([]);
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      void api
        .search(query)
        .then((hits) => {
          if (active)
            setIssueParentResults(hits.filter((hit) => hit.kind === 'issue').slice(0, 20));
        })
        .catch(() => {
          if (active) setIssueParentResults([]);
        });
    }, 100);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [createIssue, issueParentQuery]);

  useIntentHandler('issue.focus', (value) => setFocusedIssue(value as string | null));
  useIntentHandler('issue.create', (value) => {
    const detail = (value ?? {}) as { projectId?: number; cycleId?: number; priority?: number };
    setIssueProjectId(detail.projectId ? String(detail.projectId) : '');
    setIssueCycleId(detail.cycleId ? String(detail.cycleId) : '');
    setIssuePriority(detail.priority ?? 0);
    setCreateIssue(true);
  });
  useIntentHandler('adr.create', (value) => {
    const detail = (value ?? {}) as { issueNumber?: number };
    setAdrLinkIssue(detail.issueNumber);
    setCreateADR(true);
  });

  useEffect(() => {
    if (!paletteOpen || !query.trim()) {
      setHits([]);
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      void api
        .search(query)
        .then((value) => {
          if (active) setHits(value);
        })
        .catch(() => {
          if (active) setHits([]);
        });
    }, 80);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, paletteOpen]);

  const currentIdentifier =
    pathname.startsWith('/issues/') && pathname.slice('/issues/'.length).length > 0
      ? pathname.slice('/issues/'.length)
      : focusedIssue;
  const routeTitle = (() => {
    if (pathname === '/') return 'Home';
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
  const currentCycleNumber = isCycleDetail ? Number(pathname.slice('/cycles/'.length)) : 0;
  const currentCycle = cycles.find((cycle) => cycle.number === currentCycleNumber);
  const currentCycleName = currentCycle?.name || t('field.cycleN', { number: currentCycleNumber });
  const cycleNavigationOptions = (() => {
    const query = cycleNavigationQuery.trim().toLocaleLowerCase(i18n.language);
    const matches = cycles.filter((candidate) => {
      if (candidate.number === currentCycleNumber) return false;
      if (!query) return true;
      const name = candidate.name || t('field.cycleN', { number: candidate.number });
      return `${name} ${candidate.number}`.toLocaleLowerCase(i18n.language).includes(query);
    });
    const next = matches
      .filter(
        (candidate) => candidate.status === 'upcoming' && candidate.number > currentCycleNumber,
      )
      .sort((a, b) => a.number - b.number);
    const previous = matches
      .filter(
        (candidate) => candidate.status === 'completed' && candidate.number < currentCycleNumber,
      )
      .sort((a, b) => b.number - a.number);
    return {
      next: query ? next : next.slice(0, 1),
      previous: query ? previous : previous.slice(0, 1),
    };
  })();

  function navigateToCycle(number: number) {
    setCycleNavigationOpen(false);
    setCycleNavigationQuery('');
    void navigate({ to: '/cycles/$number', params: { number: String(number) } });
  }

  const runCommand = useCallback(
    async (id: string) => {
      setPaletteOpen(false);
      setQuery('');
      switch (id) {
        case 'new-issue':
          setCreateIssue(true);
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
        await api.patchIssue(currentIdentifier, { workflowStatus: status });
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
    },
    [currentIdentifier, cycles, navigate, router, pathname],
  );

  useKeyboard((e) => {
    const action = actionFromKeyboard(e);
    if (!action) {
      return false;
    }
    if (action === 'palette') {
      e.preventDefault();
      setPaletteOpen((v) => !v);
      return true;
    }
    if (action === 'escape') {
      setPaletteOpen(false);
      setCreateIssue(false);
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
      setCreateIssue(true);
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

  const commands = [
    ...hits.map((h) => ({
      id: `open-${h.kind}:${h.id}`,
      title: `${h.kind} ${h.id}  ${h.title}${h.snippet ? ` — ${h.snippet}` : ''}`,
    })),
    ...filterCommands(
      staticCommands((key, values) => t(key, values as Record<string, string | number>)),
      query,
    ),
    ...(currentIdentifier
      ? filterCommands(
          cycleCommands(cycles, (key, values) => t(key, values as Record<string, string | number>)),
          query,
        )
      : []),
    ...(currentIdentifier
      ? filterCommands(
          projectCommands(projects, (key, values) =>
            t(key, values as Record<string, string | number>),
          ),
          query,
        )
      : []),
  ];

  useIntentHandler('submit:Issue', submitIssue);
  useIntentHandler('submit:ADR', submitADR);
  useIntentHandler('submit:Page', submitPage);
  async function submitIssue() {
    const title = issueTitle.trim();
    if (!title || issueParentLoading || issueLinkOpen || issueAttachmentError) {
      return;
    }
    const recurrenceInterval = Number(issueRecurringInterval);
    if (
      issueRecurringOpen &&
      (!issueRecurringFirstDueDate ||
        !Number.isInteger(recurrenceInterval) ||
        recurrenceInterval < 1 ||
        recurrenceInterval > 365)
    ) {
      return;
    }
    const issue: Issue = await api.createIssue({
      title,
      body: issueBody,
      status: workflowStatusCategory(issueStatus, issueWorkflowStatuses),
      workflowStatus: issueStatus,
      assignee: issueAssignee || undefined,
      priority: issuePriority,
      type: issueType || undefined,
      estimate: issueEstimate ? Number(issueEstimate) : null,
      projectId: issueProjectId ? Number(issueProjectId) : undefined,
      cycleId: issueCycleId ? Number(issueCycleId) : undefined,
      labelIds: availableLabels
        .filter((label) => issueLabelNames.includes(label.name))
        .map((label) => label.id),
      dueDate: issueRecurringOpen ? undefined : issueDueDate || undefined,
      parentId: issueParentId,
      links: issueExternalLinks,
      recurring: issueRecurringOpen
        ? {
            name: title,
            firstDueDate: issueRecurringFirstDueDate,
            interval: recurrenceInterval,
            unit: issueRecurringUnit,
          }
        : undefined,
    });
    let attachmentUploadFailed = false;
    if (issueAttachments.length > 0) {
      try {
        await api.addIssueAttachments(issue.identifier, issueAttachments);
      } catch {
        attachmentUploadFailed = true;
      }
    }
    setIssueTitle('');
    setIssueBody('');
    setIssueAttachments([]);
    setIssueAttachmentError('');
    setIssueDueDate('');
    setIssueDueDateOpen(false);
    setIssueRecurringOpen(false);
    setIssueRecurringFirstDueDate('');
    setIssueRecurringInterval('1');
    setIssueRecurringUnit('week');
    setIssueExternalLinks([]);
    setIssueLinkOpen(false);
    setIssueLinkURL('');
    setIssueLinkTitle('');
    setIssueParentId(undefined);
    setIssueParentOpen(false);
    setIssueParentIdentifier('');
    setIssueParentQuery('');
    setSelectedParentIssue(null);
    setIssueParentLoading(false);
    setIssueStatus('todo');
    setIssuePriority(0);
    setIssueType('');
    setIssueEstimate('');
    setIssueLabelNames([]);
    setIssueTemplateSlug('');
    setIssueProjectId('');
    setIssueCycleId('');
    setIssueAssignee('self');
    setCreateIssue(false);
    if (attachmentUploadFailed) setError(t('issueAttachments.issueUploadFailed'));
    await router.invalidate();
    await navigate({
      to: '/issues/$identifier',
      params: { identifier: issue.identifier },
      state: { autofocus: 'title' },
    });
  }

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

  return {
    _view: 0 as const,
    workspaceName,
    routeTitle,
    isIssueDetail,
    isCycleDetail,
    currentCycleName,
    cycleNavigationOpen,
    cycleNavigationQuery,
    nextCycles: cycleNavigationOptions.next,
    previousCycles: cycleNavigationOptions.previous,
    isPageOwnedHeader,
    mobileNavigationOpen,
    workspaceNavigationOpen,
    moreLinksOpen,
    favoritesOpen,
    teamsOpen,
    teamNavigationOpen,
    sidebarNavigation: sidebarNavigation(preferences),
    cycles,
    views,
    favoriteIssues,
    overlay,
    paletteOpen,
    query,
    createIssue,
    createADR,
    createPage,
    issueTitle,
    issueStatus,
    issueWorkflowStatuses,
    issuePriority,
    issueAssignee,
    issueType,
    issueEstimate,
    issueBody,
    issueAttachments,
    issueAttachmentError,
    issueDueDate,
    issueDueDateOpen,
    issueRecurringOpen,
    issueRecurringFirstDueDate,
    issueRecurringInterval,
    issueRecurringUnit,
    issueSubmitDisabled:
      issueParentLoading ||
      issueLinkOpen ||
      Boolean(issueAttachmentError) ||
      (issueRecurringOpen &&
        (!issueRecurringFirstDueDate ||
          !Number.isInteger(Number(issueRecurringInterval)) ||
          Number(issueRecurringInterval) < 1 ||
          Number(issueRecurringInterval) > 365)),
    issueExternalLinks,
    issueLinkOpen,
    issueLinkURL,
    issueLinkTitle,
    issueParentIdentifier,
    issueParentOpen,
    issueParentQuery,
    issueParentLoading,
    issueParentOptions: [
      ...(selectedParentIssue ? [selectedParentIssue] : []),
      ...issueParentResults.filter((hit) => hit.id !== selectedParentIssue?.id),
    ].map((hit) => ({ value: hit.id, label: `${hit.id} ${hit.title}` })),
    issueLabelNames,
    issueTemplates,
    issueTemplateSlug,
    availableLabels,
    issueProjectId,
    issueCycleId,
    helpOpen,
    projects,
    pageTitle,
    adrTitle,
    adrLinkIssue,
    error,
    commands,
    handlers: {
      onCycleNavigationOpenChange: (opened: boolean) => {
        setCycleNavigationOpen(opened);
        if (!opened) setCycleNavigationQuery('');
      },
      onCycleNavigationQueryChange: (query: string) => setCycleNavigationQuery(query),
      onNavigateCycle: navigateToCycle,
      submitIssue: () => send('submit:Issue'),
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
        setPaletteOpen(true);
      },
      onOpenSearch: () => navigate({ to: '/search', search: {} }),
      onCreateIssue: () => setCreateIssue(true),
      onDismissError: () => setError(''),
      onToggleMobileNavigation: () => setMobileNavigationOpen((open) => !open),
      onToggleWorkspaceNavigation: () => setWorkspaceNavigationOpen((open) => !open),
      onToggleMoreLinks: () => setMoreLinksOpen((open) => !open),
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
      onClose8: () => setPaletteOpen(false),
      onClose9: () => setHelpOpen(false),
      onClick10: () => setCreateIssue(false),
      Create_issue_onClick11: (
        e: Parameters<NonNullable<React.ComponentProps<'div'>['onClick']>>[0],
      ) => e.stopPropagation(),
      Issue_title_onChange12: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => setIssueTitle(e.target.value),
      Issue_title_onKeyDown13: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onKeyDown']>>[0],
      ) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return;

        if (isSubmitShortcut(e)) {
          e.preventDefault();
          return send('submit:Issue');
        }
      },
      Issue_status_onChange14: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => setIssueStatus(e.target.value),
      Issue_priority_onChange15: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => setIssuePriority(Number(e.target.value)),
      Issue_template_onChange30: (slug: string | null) => {
        const template = issueTemplates.find((candidate) => candidate.slug === slug);
        setIssueTemplateSlug(template?.slug ?? '');
        if (!template) {
          setIssueTitle('');
          setIssueBody('');
          setIssueStatus('todo');
          setIssuePriority(0);
          setIssueAssignee('self');
          setIssueType('');
          setIssueEstimate('');
          setIssueLabelNames([]);
          return;
        }
        setIssueTitle(template.title);
        setIssueBody(template.body);
        setIssueStatus(template.status);
        setIssuePriority(template.priority);
        setIssueAssignee(template.assignee ?? '');
        setIssueType(template.type ?? '');
        setIssueEstimate(template.estimate == null ? '' : String(template.estimate));
        const available = new Set(availableLabels.map((label) => label.name));
        setIssueLabelNames(template.labels.filter((name) => available.has(name)));
      },
      Issue_body_onChange31: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => setIssueBody(e.target.value),
      Issue_dueDate_onChange35: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setIssueDueDate(e.target.value),
      onOpenIssueDueDate: () => setIssueDueDateOpen(true),
      onOpenIssueParent: () => setIssueParentOpen(true),
      onEnableIssueRecurring: () => {
        const firstDueDate = new Date();
        firstDueDate.setDate(firstDueDate.getDate() + 6);
        setIssueRecurringFirstDueDate(localDateValue(firstDueDate));
        setIssueRecurringInterval('1');
        setIssueRecurringUnit('week');
        setIssueRecurringOpen(true);
      },
      onClearIssueRecurring: () => setIssueRecurringOpen(false),
      onIssueRecurringFirstDueDateChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setIssueRecurringFirstDueDate(e.target.value),
      onIssueRecurringIntervalChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setIssueRecurringInterval(e.target.value),
      onIssueRecurringUnitChange: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => setIssueRecurringUnit(e.target.value as RecurringIssue['unit']),
      onOpenIssueLink: () => {
        setIssueLinkURL('');
        setIssueLinkTitle('');
        setIssueLinkOpen(true);
      },
      onCloseIssueLink: () => setIssueLinkOpen(false),
      onIssueLinkURLChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setIssueLinkURL(e.target.value),
      onIssueLinkTitleChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setIssueLinkTitle(e.target.value),
      onAddIssueLink: (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const url = issueLinkURL.trim();
        if (!url || issueExternalLinks.some((link) => link.url === url)) return;
        setIssueExternalLinks((current) => [
          ...current,
          {
            url,
            ...(issueLinkTitle.trim() ? { title: issueLinkTitle.trim() } : {}),
            kind: 'link' as const,
          },
        ]);
        setIssueLinkOpen(false);
        setIssueLinkURL('');
        setIssueLinkTitle('');
      },
      onRemoveIssueLink: (url: string) =>
        setIssueExternalLinks((current) => current.filter((link) => link.url !== url)),
      Issue_parentSearch_onChange36: (value: string) => setIssueParentQuery(value),
      Issue_parent_onChange37: (identifier: string | null) => {
        const lookupVersion = ++parentLookupVersion.current;
        setIssueParentIdentifier(identifier ?? '');
        setIssueParentQuery('');
        if (!identifier) {
          setIssueParentId(undefined);
          setIssueParentOpen(false);
          setSelectedParentIssue(null);
          setIssueParentLoading(false);
          return;
        }
        const parent = issueParentResults.find((hit) => hit.id === identifier) ?? null;
        setSelectedParentIssue(parent);
        setIssueParentLoading(true);
        void api
          .issue(identifier)
          .then((issue) => {
            if (lookupVersion !== parentLookupVersion.current) return;
            setIssueParentId(issue.id);
            setIssueParentLoading(false);
          })
          .catch(() => {
            if (lookupVersion !== parentLookupVersion.current) return;
            setIssueParentId(undefined);
            setIssueParentIdentifier('');
            setSelectedParentIssue(null);
            setIssueParentLoading(false);
          });
      },
      Issue_type_onChange32: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => setIssueType(e.target.value as Issue['type'] | ''),
      Issue_estimate_onChange33: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => setIssueEstimate(e.target.value),
      Issue_labels_onChange34: (values: string[]) => setIssueLabelNames(values),
      Issue_attachments_onChange: (files: File[]) => {
        if (files.length > 10) {
          setIssueAttachments([]);
          setIssueAttachmentError(t('issueAttachments.tooMany'));
          return;
        }
        if (files.some((file) => file.size === 0)) {
          setIssueAttachments([]);
          setIssueAttachmentError(t('issueAttachments.emptyFile'));
          return;
        }
        if (files.some((file) => file.size > 20 * 1024 * 1024)) {
          setIssueAttachments([]);
          setIssueAttachmentError(t('issueAttachments.tooLarge'));
          return;
        }
        setIssueAttachments(files);
        setIssueAttachmentError('');
      },
      Issue_project_onChange16: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => setIssueProjectId(e.target.value),
      Issue_assignee_onChange: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) =>
        setIssueAssignee(
          e.target.value === 'self' || e.target.value === 'agent' ? e.target.value : '',
        ),
      Issue_cycle_onChange17: (value: string | null) => setIssueCycleId(value ?? ''),
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
