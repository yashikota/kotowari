import { isSubmitShortcut } from '../keymap.ts';
import { useNavigate, useRouter, useRouterState } from '@tanstack/react-router';
import type * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { api, parseIssueSearch } from '../api.ts';
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
import { cycleCommands, filterCommands, projectCommands, staticCommands } from '../commands.ts';
import type { Command } from '../commands.ts';
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
import {
  INBOX_STATE_EVENT,
  INBOX_STATE_KEY,
  parseInboxState,
  unreadInboxBadgeCount,
} from '../inbox-state.ts';
import { listLinkedPullRequests } from '../reviews.ts';
import type {
  Cycle,
  Issue,
  IssueLink,
  IssueTemplate,
  Initiative,
  Label,
  Project,
  RecurringIssue,
  RecurringIssueDraft,
  SearchHit,
  View,
} from '../types.ts';
import { useIssueWorkflow, workflowStatusCategory } from '../workflow.tsx';
import { autoAssignOnStartedTransition } from '../application/issue-assignment.ts';
import {
  deleteAllIssueDrafts,
  deleteIssueDraft,
  ISSUE_DRAFTS_EVENT,
  listIssueDrafts,
  saveIssueDraft,
  type IssueDraft,
} from '../issue-drafts.ts';

type IssueDraftDiscardRequest = { kind: 'draft'; id: string } | { kind: 'all' };

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
  const { preferences, update: updatePreferences } = usePersonalPreferences();
  const defaultIssueAssignee: '' | 'self' = preferences.autoAssignToSelf ? 'self' : '';
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
  const [cycleNavigationOpen, setCycleNavigationOpen] = useState(false);
  const [cycleNavigationQuery, setCycleNavigationQuery] = useState('');
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [views, setViews] = useState<View[]>([]);
  const [favoriteIssues, setFavoriteIssues] = useState<Issue[]>([]);
  const [workspaceName, setWorkspaceName] = useState('');
  const [sidebarBadgeCounts, setSidebarBadgeCounts] = useState<
    Partial<Record<SidebarItemId, number>>
  >({});
  const [sidebarCustomizationOpen, setSidebarCustomizationOpen] =
    useMachineFlag('sidebar-customization');
  const { overlay, set: setOverlay } = useOverlay();
  const quickOpenTarget = useSyncExternalStore(mediator.subscribe, mediator.getQuickOpenTarget);
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
  const [issueDraftId, setIssueDraftId] = useState('');
  const issueDraftIdRef = useRef('');
  const [issueDraftSaved, setIssueDraftSaved] = useState(false);
  const [issueCreateMore, setIssueCreateMore] = useState(false);
  const [issueCreateMoreFocusRequest, setIssueCreateMoreFocusRequest] = useState(0);
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
  const [issueAssignee, setIssueAssignee] = useState<'self' | 'agent' | ''>(defaultIssueAssignee);
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
  const [issueDraftDiscardRequest, setIssueDraftDiscardRequest] =
    useState<IssueDraftDiscardRequest | null>(null);
  const [savedIssueDraft, setSavedIssueDraft] = useState<IssueDraft | null>(null);

  const saveCurrentIssueDraft = useCallback(() => {
    const title = issueTitle.trim();
    if (!title) return null;
    const now = new Date().toISOString();
    const currentDraftId = issueDraftIdRef.current || issueDraftId;
    const draft: IssueDraft = {
      id: currentDraftId || crypto.randomUUID(),
      title,
      body: issueBody,
      status: issueStatus,
      priority: issuePriority,
      assignee: issueAssignee,
      type: issueType ?? '',
      estimate: issueEstimate,
      projectId: issueProjectId,
      cycleId: issueCycleId,
      dueDate: issueDueDate,
      labelNames: [...issueLabelNames],
      templateSlug: issueTemplateSlug,
      parentId: issueParentId,
      parentIdentifier: issueParentIdentifier,
      externalLinks: issueExternalLinks.map((link) => ({ ...link })),
      recurringOpen: issueRecurringOpen,
      recurringFirstDueDate: issueRecurringFirstDueDate,
      recurringInterval: issueRecurringInterval,
      recurringUnit: issueRecurringUnit,
      createdAt: now,
      updatedAt: now,
    };
    saveIssueDraft(draft);
    if (!currentDraftId) {
      issueDraftIdRef.current = draft.id;
      setIssueDraftId(draft.id);
    }
    return draft;
  }, [
    issueAssignee,
    issueBody,
    issueCycleId,
    issueDraftId,
    issueDueDate,
    issueEstimate,
    issueExternalLinks,
    issueLabelNames,
    issueParentId,
    issueParentIdentifier,
    issuePriority,
    issueProjectId,
    issueRecurringFirstDueDate,
    issueRecurringInterval,
    issueRecurringOpen,
    issueRecurringUnit,
    issueStatus,
    issueTemplateSlug,
    issueTitle,
    issueType,
  ]);

  function closeCreateIssue() {
    saveCurrentIssueDraft();
    setCreateIssue(false);
  }

  function saveIssueDraftAndClose() {
    const draft = saveCurrentIssueDraft();
    if (!draft) return;
    setIssueDraftSaved(true);
    setCreateIssue(false);
    setSavedIssueDraft(draft);
  }

  function confirmIssueDraftDiscard() {
    const request = issueDraftDiscardRequest;
    if (!request) return;

    const discardedCurrentDraft = request.kind === 'all' || request.id === issueDraftIdRef.current;
    if (request.kind === 'all') deleteAllIssueDrafts();
    else deleteIssueDraft(request.id);

    if (discardedCurrentDraft && createIssue) {
      issueDraftIdRef.current = '';
      setIssueDraftId('');
      setIssueDraftSaved(false);
      setIssueTitle('');
      setIssueBody('');
      setCreateIssue(false);
    }
    setSavedIssueDraft(null);
    setIssueDraftDiscardRequest(null);
  }

  useEffect(() => {
    if (!savedIssueDraft) return;
    const timeout = window.setTimeout(() => setSavedIssueDraft(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [savedIssueDraft]);

  useEffect(() => {
    if (createIssue && issueTitle.trim()) saveCurrentIssueDraft();
  }, [createIssue, issueTitle, saveCurrentIssueDraft]);

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
    let active = true;
    const refreshBadges = async () => {
      try {
        const [activities, issues] = await Promise.all([api.inboxActivities(), api.issues()]);
        if (!active) return;
        const inboxState = parseInboxState(window.localStorage.getItem(INBOX_STATE_KEY));
        setSidebarBadgeCounts({
          '/inbox': unreadInboxBadgeCount(activities, inboxState),
          '/reviews': listLinkedPullRequests(issues).length,
          '/drafts': listIssueDrafts().length,
        });
      } catch {
        if (active) setSidebarBadgeCounts({ '/drafts': listIssueDrafts().length });
      }
    };
    const onInboxStateChange = () => void refreshBadges();
    void refreshBadges();
    window.addEventListener(INBOX_STATE_EVENT, onInboxStateChange);
    window.addEventListener('storage', onInboxStateChange);
    signals.addEventListener('kotowari:refresh', onInboxStateChange);
    return () => {
      active = false;
      window.removeEventListener(INBOX_STATE_EVENT, onInboxStateChange);
      window.removeEventListener('storage', onInboxStateChange);
      signals.removeEventListener('kotowari:refresh', onInboxStateChange);
    };
  }, []);

  useEffect(() => {
    const refreshDraftBadge = () => {
      setSidebarBadgeCounts((current) => ({ ...current, '/drafts': listIssueDrafts().length }));
    };
    refreshDraftBadge();
    window.addEventListener(ISSUE_DRAFTS_EVENT, refreshDraftBadge);
    window.addEventListener('storage', refreshDraftBadge);
    return () => {
      window.removeEventListener(ISSUE_DRAFTS_EVENT, refreshDraftBadge);
      window.removeEventListener('storage', refreshDraftBadge);
    };
  }, []);

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
    openCreateIssue(detail);
  });
  useIntentHandler('issue.openDraft', (value) => {
    const draft = value as IssueDraft;
    issueDraftIdRef.current = draft.id;
    setIssueDraftId(draft.id);
    setIssueDraftSaved(true);
    setIssueTitle(draft.title);
    setIssueBody(draft.body);
    setIssueStatus(draft.status);
    setIssuePriority(draft.priority);
    setIssueAssignee(draft.assignee);
    setIssueType(draft.type);
    setIssueEstimate(draft.estimate);
    setIssueProjectId(draft.projectId);
    setIssueCycleId(draft.cycleId);
    setIssueDueDate(draft.dueDate);
    setIssueDueDateOpen(Boolean(draft.dueDate));
    setIssueLabelNames([...draft.labelNames]);
    setIssueTemplateSlug(draft.templateSlug);
    setIssueParentId(draft.parentId);
    setIssueParentIdentifier(draft.parentIdentifier);
    setIssueParentQuery('');
    setIssueParentResults([]);
    setIssueParentOpen(Boolean(draft.parentId));
    setIssueParentLoading(false);
    parentLookupVersion.current += 1;
    setSelectedParentIssue(null);
    setIssueExternalLinks(draft.externalLinks.map((link) => ({ ...link })));
    setIssueRecurringOpen(draft.recurringOpen);
    setIssueRecurringFirstDueDate(draft.recurringFirstDueDate);
    setIssueRecurringInterval(draft.recurringInterval);
    setIssueRecurringUnit(draft.recurringUnit);
    setIssueAttachments([]);
    setIssueAttachmentError('');
    setIssueCreateMore(false);
    setCreateIssue(true);
  });
  useIntentHandler('issue.requestDiscardDraft', (value) => {
    const request = value as IssueDraftDiscardRequest;
    if (request.kind === 'all' || request.kind === 'draft') {
      setIssueDraftDiscardRequest(request);
    }
  });
  useIntentHandler('issue.createRecurring', (value) => {
    const draft = value as RecurringIssueDraft;
    const firstDueDate = localDateValue(new Date());
    issueDraftIdRef.current = '';
    setIssueDraftId('');
    setIssueDraftSaved(false);
    setIssueCreateMore(false);
    setIssueTitle(draft.title);
    setIssueBody(draft.body);
    setIssueStatus(
      issueWorkflowStatuses.find((status) => status.category === 'backlog')?.id ?? 'backlog',
    );
    setIssuePriority(draft.priority);
    setIssueAssignee(draft.assignee ?? '');
    setIssueType('');
    setIssueEstimate('');
    setIssueAttachments([]);
    setIssueAttachmentError('');
    setIssueDueDate('');
    setIssueDueDateOpen(false);
    setIssueRecurringOpen(true);
    setIssueRecurringFirstDueDate(firstDueDate);
    setIssueRecurringInterval('1');
    setIssueRecurringUnit('week');
    setIssueExternalLinks(draft.links);
    setIssueLinkOpen(false);
    setIssueLinkURL('');
    setIssueLinkTitle('');
    setIssueLabelNames([]);
    setIssueParentId(undefined);
    setIssueParentOpen(false);
    setIssueParentIdentifier('');
    setIssueParentQuery('');
    setSelectedParentIssue(null);
    setIssueParentLoading(false);
    setIssueTemplateSlug('');
    setIssueProjectId('');
    setIssueCycleId('');
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
  const currentCycleNumber = isCycleDetail ? Number(pathname.slice('/cycles/'.length)) : 0;
  const currentCycle = cycles.find((cycle) => cycle.number === currentCycleNumber);
  const currentCycleName = currentCycle?.name || t('field.cycleN', { number: currentCycleNumber });
  const cycleListScope =
    pathname === '/cycles' && (routeSearch.scope === 'current' || routeSearch.scope === 'upcoming')
      ? routeSearch.scope
      : undefined;
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

  function openCreateIssue(
    prefill: { projectId?: number; cycleId?: number; priority?: number } = {},
  ) {
    issueDraftIdRef.current = '';
    setIssueDraftId('');
    setIssueDraftSaved(false);
    setIssueCreateMore(false);
    setIssueTitle('');
    setIssueBody('');
    setIssueStatus('todo');
    setIssuePriority(prefill.priority ?? 0);
    setIssueType('');
    setIssueEstimate('');
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
    setIssueLabelNames([]);
    setIssueParentId(undefined);
    setIssueParentOpen(false);
    setIssueParentIdentifier('');
    setIssueParentQuery('');
    setIssueParentResults([]);
    setIssueParentLoading(false);
    parentLookupVersion.current += 1;
    setSelectedParentIssue(null);
    setIssueTemplateSlug('');
    setIssueProjectId(prefill.projectId ? String(prefill.projectId) : '');
    setIssueCycleId(prefill.cycleId ? String(prefill.cycleId) : '');
    setIssueAssignee(defaultIssueAssignee);
    setCreateIssue(true);
  }

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
    [currentIdentifier, cycles, navigate, router, pathname, defaultIssueAssignee],
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

  const quickOpenSearchCommands = hits
    .filter((hit) =>
      quickOpenTarget === 'issue'
        ? hit.kind === 'issue'
        : quickOpenTarget === 'document'
          ? hit.kind === 'page'
          : false,
    )
    .map((hit) => ({
      id: `open-${hit.kind}:${hit.id}`,
      title: `${hit.id} — ${hit.title}${hit.snippet ? ` — ${hit.snippet}` : ''}`,
    }));
  const quickOpenFavorites = [
    ...favoriteIssues.map((issue) => ({
      id: `open-issue:${issue.identifier}`,
      title: t('quickOpen.item', {
        type: t('quickOpen.kind.issue'),
        title: `${issue.identifier} — ${issue.title}`,
      }),
    })),
    ...projects
      .filter((project) => project.isFavorite)
      .map((project) => ({
        id: `open-project:${project.slug}`,
        title: t('quickOpen.item', {
          type: t('quickOpen.kind.project'),
          title: project.name,
        }),
      })),
    ...cycles
      .filter((cycle) => cycle.isFavorite)
      .map((cycle) => ({
        id: `open-cycle:${cycle.number}`,
        title: t('quickOpen.item', {
          type: t('quickOpen.kind.cycle'),
          title: cycle.name || t('field.cycleN', { number: cycle.number }),
        }),
      })),
    ...views
      .filter((view) => view.isFavorite)
      .map((view) => ({
        id: `open-view:${view.slug}`,
        title: t('quickOpen.item', {
          type: t('quickOpen.kind.view'),
          title: view.name,
        }),
      })),
  ];
  const quickOpenCollections: Command[] = (() => {
    switch (quickOpenTarget) {
      case 'favorite':
        return quickOpenFavorites;
      case 'project':
        return projects.map((project) => ({
          id: `open-project:${project.slug}`,
          title: t('quickOpen.item', {
            type: t('quickOpen.kind.project'),
            title: project.name,
          }),
        }));
      case 'cycle':
        return cycles.map((cycle) => ({
          id: `open-cycle:${cycle.number}`,
          title: t('quickOpen.item', {
            type: t('quickOpen.kind.cycle'),
            title: cycle.name || t('field.cycleN', { number: cycle.number }),
          }),
        }));
      case 'view':
        return views.map((view) => ({
          id: `open-view:${view.slug}`,
          title: t('quickOpen.item', {
            type: t('quickOpen.kind.view'),
            title: view.name,
          }),
        }));
      case 'initiative':
        return initiatives.map((initiative) => ({
          id: `open-initiative:${initiative.slug}`,
          title: t('quickOpen.item', {
            type: t('quickOpen.kind.initiative'),
            title: initiative.name,
          }),
        }));
      case 'issue':
      case 'document':
      case null:
        return [];
    }
  })();
  const quickOpenTargetKind = quickOpenTarget ?? 'issue';
  const commands = quickOpenTarget
    ? [...filterCommands(quickOpenCollections, query), ...quickOpenSearchCommands]
    : [
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
              cycleCommands(cycles, (key, values) =>
                t(key, values as Record<string, string | number>),
              ),
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
    const createMore = issueCreateMore && !issueRecurringOpen;
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
      templateSlug: issueTemplateSlug || undefined,
      recurring: issueRecurringOpen
        ? {
            name: title,
            firstDueDate: issueRecurringFirstDueDate,
            interval: recurrenceInterval,
            unit: issueRecurringUnit,
          }
        : undefined,
    });
    const submittedDraftId = issueDraftIdRef.current || issueDraftId;
    if (submittedDraftId) deleteIssueDraft(submittedDraftId);
    issueDraftIdRef.current = '';
    setIssueDraftId('');
    setIssueDraftSaved(false);
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
    setIssueAssignee(defaultIssueAssignee);
    if (createMore) {
      setIssueCreateMoreFocusRequest((request) => request + 1);
    } else {
      setIssueCreateMore(false);
      setCreateIssue(false);
    }
    if (attachmentUploadFailed) setError(t('issueAttachments.issueUploadFailed'));
    await router.invalidate();
    if (createMore) return;
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
    isMyIssues,
    isIssueDetail,
    showIssueViewFavorite: issueView !== undefined,
    issueViewFavorite,
    isCycleDetail,
    currentCycleName,
    currentCycleStatus: currentCycle?.status,
    cycleListScope,
    cycleNavigationOpen,
    cycleNavigationQuery,
    nextCycles: cycleNavigationOptions.next,
    previousCycles: cycleNavigationOptions.previous,
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
    quickOpenTarget,
    quickOpenTitle: quickOpenTarget
      ? t('quickOpen.title', { type: t(`quickOpen.kind.${quickOpenTargetKind}`) })
      : undefined,
    quickOpenPlaceholder: quickOpenTarget
      ? t('quickOpen.search', { type: t(`quickOpen.kind.${quickOpenTargetKind}`) })
      : undefined,
    quickOpenEmptyMessage: quickOpenTarget
      ? quickOpenTarget === 'favorite' && !query.trim() && quickOpenFavorites.length === 0
        ? t('quickOpen.noFavorites')
        : query.trim()
          ? t('quickOpen.noResults', { type: t(`quickOpen.kind.${quickOpenTargetKind}`) })
          : quickOpenTarget === 'issue' || quickOpenTarget === 'document'
            ? t('quickOpen.typeToSearch', {
                type: t(`quickOpen.kind.${quickOpenTargetKind}`),
              })
            : undefined
      : undefined,
    query,
    createIssue,
    createADR,
    createPage,
    issueTitle,
    issueDraftId,
    issueDraftSaved,
    savedIssueDraft,
    issueDraftDiscardRequest,
    issueCreateMore,
    issueCreateMoreFocusRequest,
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
      onToggleIssueViewFavorite: () => {
        if (!issueView) return;
        const favorites = preferences.favoriteIssueViews;
        updatePreferences({
          favoriteIssueViews: favorites.includes(issueView)
            ? favorites.filter((view) => view !== issueView)
            : [...favorites, issueView],
        });
      },
      submitIssue: () => send('submit:Issue'),
      Issue_createMore_onChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setIssueCreateMore(e.target.checked),
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
      onCreateIssue: () => openCreateIssue(),
      onSaveIssueDraft: saveIssueDraftAndClose,
      onRequestDiscardCurrentDraft: () => {
        const id = issueDraftIdRef.current || issueDraftId;
        if (id) send('issue.requestDiscardDraft', { kind: 'draft', id });
      },
      onOpenSavedIssueDraft: () => {
        if (!savedIssueDraft) return;
        const draft = listIssueDrafts().find((candidate) => candidate.id === savedIssueDraft.id);
        setSavedIssueDraft(null);
        if (draft) send('issue.openDraft', draft);
      },
      onDismissSavedIssueDraft: () => setSavedIssueDraft(null),
      onCancelIssueDraftDiscard: () => setIssueDraftDiscardRequest(null),
      onConfirmIssueDraftDiscard: confirmIssueDraftDiscard,
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
      onClick10: closeCreateIssue,
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
      Issue_status_onChange14: (value: string | null) => setIssueStatus(value ?? 'todo'),
      Issue_priority_onChange15: (value: string | null) => setIssuePriority(Number(value ?? '0')),
      Issue_template_onChange30: (slug: string | null) => {
        const template = issueTemplates.find((candidate) => candidate.slug === slug);
        setIssueTemplateSlug(template?.slug ?? '');
        if (!template) {
          setIssueTitle('');
          setIssueBody('');
          setIssueStatus('todo');
          setIssuePriority(0);
          setIssueAssignee(defaultIssueAssignee);
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
      Issue_type_onChange32: (value: string | null) =>
        setIssueType(value && value !== 'none' ? (value as Issue['type']) : ''),
      Issue_estimate_onChange33: (value: string | null) =>
        setIssueEstimate(value && value !== 'none' ? value : ''),
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
      Issue_project_onChange16: (value: string | null) =>
        setIssueProjectId(value && value !== 'none' ? value : ''),
      Issue_assignee_onChange: (value: string | null) =>
        setIssueAssignee(value === 'self' || value === 'agent' ? value : ''),
      Issue_cycle_onChange17: (value: string | null) =>
        setIssueCycleId(value && value !== 'none' ? value : ''),
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
