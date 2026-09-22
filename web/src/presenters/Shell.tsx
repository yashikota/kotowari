import { isSubmitShortcut } from '../keymap.ts';
import { useNavigate, useRouter, useRouterState } from '@tanstack/react-router';
import type * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.ts';
import { queryCache } from '../application/cache.ts';
import { resetIssueProjection } from '../application/issues.ts';
import { signals } from '../application/mediator.ts';
import { useIntent, useIntentHandler, useKeyboard, useOverlay } from '../application/Root.tsx';
import { STATIC_COMMANDS, cycleCommands, filterCommands, projectCommands } from '../commands.ts';
import { Palette } from '../components/Palette.tsx';
import { actionFromKeyboard } from '../keymap.ts';
import { navTargetForAction, type NavShortcutAction } from '../nav.ts';
import type { Cycle, Issue, IssueStatus, Project, SearchHit, View } from '../types.ts';

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
  const send = useIntent();
  const navigate = useNavigate();
  const router = useRouter();
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
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [views, setViews] = useState<View[]>([]);
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
  const createView = overlay === 'view';
  const setCreateView = setOverlay('view');
  const [issueTitle, setIssueTitle] = useState('');
  const [issueStatus, setIssueStatus] = useState<IssueStatus>('todo');
  const [issuePriority, setIssuePriority] = useState(0);
  const [issueProjectId, setIssueProjectId] = useState('');
  const [issueCycleId, setIssueCycleId] = useState('');
  const helpOpen = overlay === 'help';
  const setHelpOpen = setOverlay('help');
  const [projects, setProjects] = useState<Project[]>([]);
  const [pageTitle, setPageTitle] = useState('');
  const [adrTitle, setAdrTitle] = useState('');
  const [adrLinkIssue, setAdrLinkIssue] = useState<number | undefined>(undefined);
  const [viewName, setViewName] = useState('');
  const [error, setError] = useState('');
  const [focusedIssue, setFocusedIssue] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    try {
      const [ws, cyc, vs, proj] = await Promise.all([
        api.workspace(),
        api.cycles(),
        api.views(),
        api.projects(),
      ]);
      setWorkspaceName(ws.name);
      setCycles(cyc);
      setViews(vs);
      setProjects(proj);
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
    void api
      .projects()
      .then(setProjects)
      .catch(() => setProjects([]));
  }, [createIssue]);

  useIntentHandler('issue.focus', (value) => setFocusedIssue(value as string | null));
  useIntentHandler('issue.create', (value) => {
    const detail = (value ?? {}) as { projectId?: number; cycleId?: number };
    setIssueProjectId(detail.projectId ? String(detail.projectId) : '');
    setIssueCycleId(detail.cycleId ? String(detail.cycleId) : '');
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
          setCreateView(true);
          return;
        case 'goto-issues':
          await navigate({ to: '/issues', search: {} });
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
          await navigate({ to: '/cycles' });
          return;
        case 'goto-pages':
          await navigate({ to: '/pages' });
          return;
        case 'goto-config':
          await navigate({ to: '/config' });
          return;
        case 'goto-active-cycle': {
          const active = cycles.find((c) => c.status === 'active');
          if (active) {
            await navigate({
              to: '/cycles/$number',
              params: { number: String(active.number) },
            });
          } else {
            await navigate({ to: '/cycles' });
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
        const status = id.replace('set-status-', '') as IssueStatus;
        await api.patchIssue(currentIdentifier, { status });
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
      setCreateView(false);
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
      document.querySelector<HTMLInputElement>('[aria-label="Find issues"]')?.focus();
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
    if (paletteOpen || createIssue || createADR || createPage || createView || helpOpen) {
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
    ...filterCommands(STATIC_COMMANDS, query),
    ...(currentIdentifier ? filterCommands(cycleCommands(cycles), query) : []),
    ...(currentIdentifier ? filterCommands(projectCommands(projects), query) : []),
  ];

  useIntentHandler('submit:Issue', submitIssue);
  useIntentHandler('submit:ADR', submitADR);
  useIntentHandler('submit:Page', submitPage);
  useIntentHandler('submit:View', submitView);

  async function submitIssue() {
    const title = issueTitle.trim();
    if (!title) {
      return;
    }
    const issue: Issue = await api.createIssue({
      title,
      status: issueStatus,
      priority: issuePriority,
      projectId: issueProjectId ? Number(issueProjectId) : undefined,
      cycleId: issueCycleId ? Number(issueCycleId) : undefined,
    });
    setIssueTitle('');
    setIssueStatus('todo');
    setIssuePriority(0);
    setIssueProjectId('');
    setIssueCycleId('');
    setCreateIssue(false);
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

  async function submitView() {
    const name = viewName.trim();
    if (!name) {
      return;
    }
    const slug = slugify(name) || `view-${Date.now()}`;
    const view = await api.createView({ name, slug, display: 'list' });
    setViewName('');
    setCreateView(false);
    await loadWorkspace();
    await router.invalidate();
    await navigate({
      to: '/views/$slug',
      params: { slug: view.slug },
      state: { autofocus: 'name' },
    });
  }

  return {
    _view: 0 as const,
    workspaceName,
    cycles,
    views,
    overlay,
    paletteOpen,
    query,
    createIssue,
    createADR,
    createPage,
    createView,
    issueTitle,
    issueStatus,
    issuePriority,
    issueProjectId,
    issueCycleId,
    helpOpen,
    projects,
    pageTitle,
    adrTitle,
    adrLinkIssue,
    viewName,
    error,
    commands,
    handlers: {
      submitIssue: () => send('submit:Issue'),
      submitADR: () => send('submit:ADR'),
      submitPage: () => send('submit:Page'),
      submitView: () => send('submit:View'),
      onClick0: () => setCreateView(true),
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
      ) => setIssueStatus(e.target.value as IssueStatus),
      Issue_priority_onChange15: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => setIssuePriority(Number(e.target.value)),
      Issue_project_onChange16: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => setIssueProjectId(e.target.value),
      Issue_cycle_onChange17: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => setIssueCycleId(e.target.value),
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
      onClick26: () => setCreateView(false),
      Create_view_onClick27: (
        e: Parameters<NonNullable<React.ComponentProps<'div'>['onClick']>>[0],
      ) => e.stopPropagation(),
      View_name_onChange28: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => setViewName(e.target.value),
      View_name_onKeyDown29: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onKeyDown']>>[0],
      ) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return;

        if (isSubmitShortcut(e)) {
          e.preventDefault();
          return send('submit:View');
        }
      },
    },
  };
}
