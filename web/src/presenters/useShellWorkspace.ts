import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.ts';
import { signals } from '../application/mediator.ts';
import {
  INBOX_STATE_EVENT,
  INBOX_STATE_KEY,
  parseInboxState,
  unreadInboxBadgeCount,
} from '../inbox-state.ts';
import { listLinkedPullRequests } from '../reviews.ts';
import type { SidebarItemId } from '../preferences.ts';
import { ISSUE_DRAFTS_EVENT, listIssueDrafts } from '../issue-drafts.ts';
import type { Cycle, Initiative, Issue, Project, View } from '../types.ts';

type Props = {
  setError: (message: string) => void;
  setProjects: (projects: Project[]) => void;
};

export function useShellWorkspace({ setError, setProjects }: Props) {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [views, setViews] = useState<View[]>([]);
  const [favoriteIssues, setFavoriteIssues] = useState<Issue[]>([]);
  const [workspaceName, setWorkspaceName] = useState('');
  const [sidebarBadgeCounts, setSidebarBadgeCounts] = useState<
    Partial<Record<SidebarItemId, number>>
  >({});

  const loadWorkspace = useCallback(async () => {
    try {
      const [workspace, nextCycles, nextViews, nextProjects, favorites, nextInitiatives] =
        await Promise.all([
          api.workspace(),
          api.cycles(),
          api.views(),
          api.projects(),
          api.issues('?favorite=true'),
          api.initiatives(),
        ]);
      setWorkspaceName(workspace.name);
      setCycles(nextCycles);
      setViews(nextViews);
      setProjects(nextProjects);
      setFavoriteIssues(favorites);
      setInitiatives(nextInitiatives);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'failed to load workspace');
    }
  }, [setError, setProjects]);

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

  return {
    cycles,
    initiatives,
    views,
    favoriteIssues,
    workspaceName,
    sidebarBadgeCounts,
  };
}
