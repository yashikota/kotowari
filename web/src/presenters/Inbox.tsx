import { useLoaderData } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api.ts';
import { useActions, useKeyboard } from '../application/Root.tsx';
import {
  DEFAULT_INBOX_STATE,
  inboxSnoozeUntil,
  INBOX_STATE_KEY,
  parseInboxState,
  splitPriorityInboxActivities,
  sortInboxActivities,
  serializeInboxState,
  type InboxPriorityType,
  type InboxSnoozePreset,
  type InboxState,
} from '../inbox-state.ts';
import { inboxShortcutFromKeyboard } from '../keymap.ts';
import type { InboxActivity } from '../types.ts';

export type InboxFilter = 'all' | 'changes' | 'comments' | 'reactions' | 'attachments';

function readInboxState(): InboxState {
  if (typeof window === 'undefined') return { ...DEFAULT_INBOX_STATE };
  return parseInboxState(window.localStorage.getItem(INBOX_STATE_KEY));
}

function actionMatchesFilter(action: string, filter: InboxFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'comments') return action.startsWith('comment') || action === 'commented';
  if (filter === 'reactions') return action.includes('reaction');
  if (filter === 'attachments') return action.startsWith('attachment_');
  return (
    !action.startsWith('comment') &&
    !action.includes('reaction') &&
    !action.startsWith('attachment_')
  );
}

export function useInboxPresenter() {
  const activities = useLoaderData({ from: '/inbox' }) as InboxActivity[];
  const [inboxState, setInboxState] = useState(readInboxState);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [focusUnreadCollapsed, setFocusUnreadCollapsed] = useState(false);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [commentPreview, setCommentPreview] = useState('');
  const [snoozeMenuOpen, setSnoozeMenuOpen] = useState(false);
  const { t } = useTranslation();

  function updateInboxState(update: (current: InboxState) => InboxState) {
    setInboxState((current) => {
      const next = update(current);
      window.localStorage.setItem(INBOX_STATE_KEY, serializeInboxState(next));
      return next;
    });
  }

  const filteredActivities = useMemo(
    () =>
      sortInboxActivities(
        activities.filter(
          (activity) =>
            !inboxState.archivedIds.includes(activity.id) &&
            (inboxState.showSnoozed || !(inboxState.snoozedUntil[activity.id] > Date.now())) &&
            (!onlyUnread || !inboxState.readIds.includes(activity.id)) &&
            actionMatchesFilter(activity.action, filter),
        ),
        inboxState,
      ),
    [
      activities,
      filter,
      inboxState.archivedIds,
      inboxState.readIds,
      inboxState.snoozedUntil,
      inboxState.showSnoozed,
      inboxState.showUnreadFirst,
      inboxState.ordering,
      onlyUnread,
    ],
  );
  const priorityActivities = useMemo(
    () => splitPriorityInboxActivities(filteredActivities, inboxState.priorityTypes),
    [filteredActivities, inboxState.priorityTypes],
  );
  const visibleActivities = inboxState.priorityInboxEnabled
    ? priorityActivities[inboxState.priorityView]
    : filteredActivities;
  const unreadActivities = activities.filter(
    (activity) =>
      !inboxState.readIds.includes(activity.id) &&
      !inboxState.archivedIds.includes(activity.id) &&
      !(inboxState.snoozedUntil[activity.id] > Date.now()),
  );
  const unreadBuckets = splitPriorityInboxActivities(unreadActivities, inboxState.priorityTypes);
  const selectedActivity = activities.find((activity) => activity.id === selectedId) ?? null;
  useEffect(() => {
    let active = true;
    setCommentPreview('');
    const commentId = selectedActivity?.payload.commentId;
    if (
      !selectedActivity ||
      typeof commentId !== 'number' ||
      !selectedActivity.action.startsWith('comment') ||
      selectedActivity.action === 'comment_deleted'
    ) {
      return () => {
        active = false;
      };
    }
    void api
      .comments(selectedActivity.identifier)
      .then((comments) => {
        if (active)
          setCommentPreview(comments.find((comment) => comment.id === commentId)?.body ?? '');
      })
      .catch(() => {
        if (active) setCommentPreview('');
      });
    return () => {
      active = false;
    };
  }, [selectedActivity]);
  const unreadCount = unreadActivities.length;

  useEffect(() => {
    const deadlines = Object.values(inboxState.snoozedUntil);
    if (deadlines.length === 0) return;
    const wakeAt = Math.min(...deadlines);
    const timer = window.setTimeout(
      () => {
        setInboxState((current) => {
          const now = Date.now();
          const snoozedUntil = Object.fromEntries(
            Object.entries(current.snoozedUntil).filter(([, until]) => until > now),
          );
          if (Object.keys(snoozedUntil).length === Object.keys(current.snoozedUntil).length)
            return current;
          const next = { ...current, snoozedUntil };
          window.localStorage.setItem(INBOX_STATE_KEY, serializeInboxState(next));
          return next;
        });
      },
      Math.max(0, wakeAt - Date.now() + 1),
    );
    return () => window.clearTimeout(timer);
  }, [inboxState.snoozedUntil]);

  function markRead(ids: number[], read: boolean) {
    const uniqueIds = new Set(ids);
    updateInboxState((current) => ({
      ...current,
      readIds: read
        ? [...new Set([...current.readIds, ...ids])]
        : current.readIds.filter((id) => !uniqueIds.has(id)),
    }));
  }

  function archive(ids: number[]) {
    updateInboxState((current) => ({
      ...current,
      archivedIds: [...new Set([...current.archivedIds, ...ids])],
    }));
    if (selectedId !== null && ids.includes(selectedId)) setSelectedId(null);
  }

  function archiveReadNotifications() {
    archive(
      activities
        .filter(
          (activity) =>
            inboxState.readIds.includes(activity.id) &&
            !inboxState.archivedIds.includes(activity.id),
        )
        .map((activity) => activity.id),
    );
  }

  function markAllNotificationsRead() {
    markRead(
      activities
        .filter((activity) => !inboxState.archivedIds.includes(activity.id))
        .map((activity) => activity.id),
      true,
    );
  }

  const handlers = useActions({
    onSelect: (id: number) => {
      setSelectedId(id);
      markRead([id], true);
    },
    onCloseSelected: () => setSelectedId(null),
    onToggleUnread: () => setOnlyUnread((current) => !current),
    onSetFilter: (value: InboxFilter) => setFilter(value),
    onSetDensity: (density: InboxState['density']) =>
      updateInboxState((current) => ({ ...current, density })),
    onToggleShowSnoozed: () =>
      updateInboxState((current) => ({ ...current, showSnoozed: !current.showSnoozed })),
    onToggleShowUnreadFirst: () =>
      updateInboxState((current) => ({ ...current, showUnreadFirst: !current.showUnreadFirst })),
    onSetOrdering: (ordering: InboxState['ordering']) =>
      updateInboxState((current) => ({ ...current, ordering })),
    onToggleGrouping: () =>
      updateInboxState((current) => ({ ...current, groupByDate: !current.groupByDate })),
    onSetUnreadGrouping: (unreadGrouping: InboxState['unreadGrouping']) =>
      updateInboxState((current) => ({ ...current, unreadGrouping })),
    onToggleFocusUnreadGroup: () => setFocusUnreadCollapsed((collapsed) => !collapsed),
    onTogglePriorityInbox: () =>
      updateInboxState((current) => ({
        ...current,
        priorityInboxEnabled: !current.priorityInboxEnabled,
      })),
    onSetPriorityView: (priorityView: InboxState['priorityView']) => {
      setSelectedId(null);
      updateInboxState((current) => ({ ...current, priorityView }));
    },
    onTogglePriorityType: (priorityType: InboxPriorityType) =>
      updateInboxState((current) => ({
        ...current,
        priorityTypes: current.priorityTypes.includes(priorityType)
          ? current.priorityTypes.filter((type) => type !== priorityType)
          : [...current.priorityTypes, priorityType],
      })),
    onSetAllPriorityTypes: (included: boolean) =>
      updateInboxState((current) => ({
        ...current,
        priorityTypes: included ? [...DEFAULT_INBOX_STATE.priorityTypes] : [],
      })),
    onSetBadgeCount: (badgeCount: InboxState['badgeCount']) =>
      updateInboxState((current) => ({ ...current, badgeCount })),
    onMarkSelectedRead: () => {
      if (selectedId !== null) markRead([selectedId], !inboxState.readIds.includes(selectedId));
    },
    onArchiveSelected: () => {
      if (selectedId !== null) archive([selectedId]);
    },
    onSetSnoozeMenuOpen: (opened: boolean) => setSnoozeMenuOpen(opened),
    onSnoozeSelected: (preset: InboxSnoozePreset) => {
      if (selectedId === null) return;
      const until = inboxSnoozeUntil(preset);
      updateInboxState((current) => ({
        ...current,
        snoozedUntil: { ...current.snoozedUntil, [selectedId]: until },
      }));
      setSelectedId(null);
      setSnoozeMenuOpen(false);
    },
    onMarkAllRead: () => markAllNotificationsRead(),
    onArchiveReadActivities: () => archiveReadNotifications(),
  });

  useKeyboard((event) => {
    const shortcut = inboxShortcutFromKeyboard(event);
    if (shortcut === 'archive-read-notifications') {
      event.preventDefault();
      archiveReadNotifications();
      return true;
    }
    if (shortcut !== 'snooze-notification') return false;
    const focusedRow =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-inbox-activity-id]')
        : null;
    const focusedId = Number(focusedRow?.dataset.inboxActivityId);
    const activityId =
      selectedId ?? (Number.isSafeInteger(focusedId) && focusedId > 0 ? focusedId : null);
    if (
      activityId === null ||
      !activities.some((activity) => activity.id === activityId) ||
      inboxState.archivedIds.includes(activityId)
    )
      return false;
    event.preventDefault();
    if (activityId !== selectedId) {
      setSelectedId(activityId);
      markRead([activityId], true);
    }
    setSnoozeMenuOpen(true);
    return true;
  });

  return {
    activities: visibleActivities.map((activity) => ({
      ...activity,
      isRead: inboxState.readIds.includes(activity.id),
      snoozedUntil: inboxState.snoozedUntil[activity.id] ?? null,
    })),
    selectedActivity,
    selectedIsRead: selectedId === null || inboxState.readIds.includes(selectedId),
    commentPreview,
    selectedId,
    onlyUnread,
    filter,
    density: inboxState.density,
    showSnoozed: inboxState.showSnoozed,
    showUnreadFirst: inboxState.showUnreadFirst,
    ordering: inboxState.ordering,
    groupByDate: inboxState.groupByDate,
    unreadGrouping: inboxState.unreadGrouping,
    focusUnreadCollapsed,
    priorityInboxEnabled: inboxState.priorityInboxEnabled,
    priorityTypes: inboxState.priorityTypes,
    priorityView: inboxState.priorityView,
    badgeCount: inboxState.badgeCount,
    priorityUnreadCount: unreadBuckets.priority.length,
    otherUnreadCount: unreadBuckets.other.length,
    snoozeMenuOpen,
    unreadCount,
    handlers,
    t,
  };
}
