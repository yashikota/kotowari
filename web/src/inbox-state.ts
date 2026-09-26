export type InboxState = {
  readIds: number[];
  archivedIds: number[];
  snoozedUntil: Record<number, number>;
  density: 'comfortable' | 'compact';
  groupByDate: boolean;
  unreadGrouping: 'none' | 'focus';
  showSnoozed: boolean;
  showUnreadFirst: boolean;
  ordering: 'newest' | 'oldest';
  priorityInboxEnabled: boolean;
  priorityTypes: InboxPriorityType[];
  badgeCount: 'all' | 'priority' | 'none';
  priorityView: 'priority' | 'other';
};

export const INBOX_PRIORITY_TYPES = [
  'assignedToYou',
  'documentActivity',
  'issueActivity',
  'mentions',
  'projectActivity',
  'projectUpdates',
  'replies',
  'resolvedThreads',
  'reviews',
  'updateReminders',
] as const;

export type InboxPriorityType = (typeof INBOX_PRIORITY_TYPES)[number];

export const INBOX_STATE_KEY = 'kotowari.inbox.v1';

export const DEFAULT_INBOX_STATE: InboxState = {
  readIds: [],
  archivedIds: [],
  snoozedUntil: {},
  density: 'comfortable',
  groupByDate: true,
  unreadGrouping: 'none',
  showSnoozed: false,
  showUnreadFirst: false,
  ordering: 'newest',
  priorityInboxEnabled: false,
  priorityTypes: [...INBOX_PRIORITY_TYPES],
  badgeCount: 'all',
  priorityView: 'priority',
};

export type InboxSnoozePreset = 'one-hour' | 'later-today' | 'tomorrow' | 'next-week';

export type InboxPriorityActivity = {
  entityType: string;
  action: string;
  payload: Record<string, unknown>;
};

export function inboxPriorityType(activity: InboxPriorityActivity): InboxPriorityType {
  if (activity.entityType === 'page') return 'documentActivity';
  if (activity.entityType === 'project')
    return activity.action === 'status_update_posted' ? 'projectUpdates' : 'projectActivity';
  if (activity.entityType === 'issue') {
    if (activity.action === 'assignee_changed' && activity.payload.to === 'self')
      return 'assignedToYou';
    if (activity.action === 'reminder_changed') return 'updateReminders';
    if (activity.action.startsWith('comment')) return 'replies';
  }
  return 'issueActivity';
}

export function splitPriorityInboxActivities<T extends InboxPriorityActivity>(
  activities: T[],
  includedTypes: InboxPriorityType[],
): { priority: T[]; other: T[] } {
  const included = new Set(includedTypes);
  const priority: T[] = [];
  const other: T[] = [];
  for (const activity of activities) {
    (included.has(inboxPriorityType(activity)) ? priority : other).push(activity);
  }
  return { priority, other };
}

function validPriorityTypes(value: unknown): InboxPriorityType[] {
  if (!Array.isArray(value)) return [...DEFAULT_INBOX_STATE.priorityTypes];
  return [
    ...new Set(
      value.filter((item): item is InboxPriorityType =>
        INBOX_PRIORITY_TYPES.includes(item as InboxPriorityType),
      ),
    ),
  ];
}

export function sortInboxActivities<T extends { id: number; createdAt: string }>(
  activities: T[],
  options: Pick<InboxState, 'readIds' | 'showUnreadFirst' | 'ordering'>,
): T[] {
  const readIds = new Set(options.readIds);
  return [...activities].sort((left, right) => {
    if (options.showUnreadFirst) {
      const readOrder = Number(readIds.has(left.id)) - Number(readIds.has(right.id));
      if (readOrder !== 0) return readOrder;
    }
    const timeOrder = left.createdAt.localeCompare(right.createdAt);
    return options.ordering === 'newest'
      ? timeOrder === 0
        ? right.id - left.id
        : -timeOrder
      : timeOrder === 0
        ? left.id - right.id
        : timeOrder;
  });
}

export function inboxSnoozeUntil(preset: InboxSnoozePreset, now = Date.now()): number {
  if (preset === 'one-hour') return now + 60 * 60 * 1000;

  const date = new Date(now);
  if (preset === 'later-today') {
    date.setHours(17, 0, 0, 0);
    if (date.getTime() > now) return date.getTime();
    date.setDate(date.getDate() + 1);
  } else if (preset === 'tomorrow') {
    date.setDate(date.getDate() + 1);
  } else {
    const daysUntilMonday = (8 - date.getDay()) % 7 || 7;
    date.setDate(date.getDate() + daysUntilMonday);
  }
  date.setHours(9, 0, 0, 0);
  return date.getTime();
}

function validIds(value: unknown): number[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((id): id is number => Number.isSafeInteger(id) && id > 0))]
    : [];
}

function validSnoozes(value: unknown): Record<number, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([id, until]) => {
      const numericId = Number(id);
      return Number.isSafeInteger(numericId) && numericId > 0 && Number.isSafeInteger(until)
        ? [[numericId, until as number]]
        : [];
    }),
  );
}

export function parseInboxState(value: string | null): InboxState {
  if (!value) return { ...DEFAULT_INBOX_STATE };
  try {
    const parsed = JSON.parse(value) as Partial<InboxState>;
    return {
      readIds: validIds(parsed.readIds),
      archivedIds: validIds(parsed.archivedIds),
      snoozedUntil: validSnoozes(parsed.snoozedUntil),
      density: parsed.density === 'compact' ? 'compact' : 'comfortable',
      groupByDate:
        typeof parsed.groupByDate === 'boolean'
          ? parsed.groupByDate
          : DEFAULT_INBOX_STATE.groupByDate,
      unreadGrouping: parsed.unreadGrouping === 'focus' ? 'focus' : 'none',
      showSnoozed:
        typeof parsed.showSnoozed === 'boolean'
          ? parsed.showSnoozed
          : DEFAULT_INBOX_STATE.showSnoozed,
      showUnreadFirst:
        typeof parsed.showUnreadFirst === 'boolean'
          ? parsed.showUnreadFirst
          : DEFAULT_INBOX_STATE.showUnreadFirst,
      ordering: parsed.ordering === 'oldest' ? 'oldest' : DEFAULT_INBOX_STATE.ordering,
      priorityInboxEnabled:
        typeof parsed.priorityInboxEnabled === 'boolean'
          ? parsed.priorityInboxEnabled
          : DEFAULT_INBOX_STATE.priorityInboxEnabled,
      priorityTypes: validPriorityTypes(parsed.priorityTypes),
      badgeCount:
        parsed.badgeCount === 'priority' || parsed.badgeCount === 'none'
          ? parsed.badgeCount
          : DEFAULT_INBOX_STATE.badgeCount,
      priorityView: parsed.priorityView === 'other' ? 'other' : 'priority',
    };
  } catch {
    return { ...DEFAULT_INBOX_STATE };
  }
}

export function serializeInboxState(value: InboxState): string {
  return JSON.stringify({
    readIds: validIds(value.readIds),
    archivedIds: validIds(value.archivedIds),
    snoozedUntil: validSnoozes(value.snoozedUntil),
    density: value.density === 'compact' ? 'compact' : 'comfortable',
    groupByDate: value.groupByDate,
    unreadGrouping: value.unreadGrouping === 'focus' ? 'focus' : 'none',
    showSnoozed: value.showSnoozed,
    showUnreadFirst: value.showUnreadFirst,
    ordering: value.ordering,
    priorityInboxEnabled: value.priorityInboxEnabled,
    priorityTypes: validPriorityTypes(value.priorityTypes),
    badgeCount: value.badgeCount,
    priorityView: value.priorityView,
  });
}
