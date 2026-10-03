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
import { ISSUE_DRAFTS_EVENT, readIssueDrafts } from '../issue-drafts.ts';
import type { Cycle, Initiative, Issue, Project, View } from '../types.ts';

type Props = {
  setProjects: (projects: Project[]) => void;
};

export function useShellWorkspace({ setProjects }: Props) {
  const [workspaceError, setWorkspaceError] = useState('');
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
        await Promise.allSettled([
          api.workspace(),
          api.cycles(),
          api.views(),
          api.projects(),
          api.issues('?favorite=true'),
          api.initiatives(),
        ]);
      if (workspace.status === 'fulfilled') setWorkspaceName(workspace.value.name);
      if (nextCycles.status === 'fulfilled') setCycles(nextCycles.value);
      if (nextViews.status === 'fulfilled') setViews(nextViews.value);
      if (nextProjects.status === 'fulfilled') setProjects(nextProjects.value);
      if (favorites.status === 'fulfilled') setFavoriteIssues(favorites.value);
      if (nextInitiatives.status === 'fulfilled') setInitiatives(nextInitiatives.value);
      const failure = [
        workspace,
        nextCycles,
        nextViews,
        nextProjects,
        favorites,
        nextInitiatives,
      ].find((result) => result.status === 'rejected');
      setWorkspaceError(
        failure?.status === 'rejected'
          ? failure.reason instanceof Error
            ? failure.reason.message
            : 'failed to load workspace'
          : '',
      );
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : 'failed to load workspace');
    }
  }, [setProjects]);

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
        const draftState = readIssueDrafts();
        setSidebarBadgeCounts((current) => ({
          ...current,
          '/inbox': unreadInboxBadgeCount(activities, inboxState),
          '/reviews': listLinkedPullRequests(issues).length,
          ...(draftState.error ? {} : { '/drafts': draftState.drafts.length }),
        }));
      } catch {
        const draftState = readIssueDrafts();
        if (active && !draftState.error)
          setSidebarBadgeCounts((current) => ({ ...current, '/drafts': draftState.drafts.length }));
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
      const draftState = readIssueDrafts();
      if (!draftState.error)
        setSidebarBadgeCounts((current) => ({ ...current, '/drafts': draftState.drafts.length }));
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
    workspaceError,
    dismissWorkspaceError: () => setWorkspaceError(''),
    cycles,
    initiatives,
    views,
    favoriteIssues,
    workspaceName,
    sidebarBadgeCounts,
  };
}
