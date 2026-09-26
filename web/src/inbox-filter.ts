import type { InboxActivity, IssueStatus } from './types.ts';

export const INBOX_ACTIVITY_FILTERS = ['changes', 'comments', 'reactions', 'attachments'] as const;

export type InboxActivityFilter = (typeof INBOX_ACTIVITY_FILTERS)[number];

export type InboxFilters = {
  activityTypes: InboxActivityFilter[];
  projectIds: Array<number | null>;
  priorities: number[];
  statuses: IssueStatus[];
};

export type InboxFilterFacet = 'activityTypes' | 'projectIds' | 'priorities' | 'statuses';

export type InboxFilterMenuState = {
  open: boolean;
  query: string;
  facet: InboxFilterFacet | null;
};

export const CLOSED_INBOX_FILTER_MENU: InboxFilterMenuState = {
  open: false,
  query: '',
  facet: null,
};

export const EMPTY_INBOX_FILTERS: InboxFilters = {
  activityTypes: [],
  projectIds: [],
  priorities: [],
  statuses: [],
};

export function actionMatchesFilter(action: string, filter: InboxActivityFilter): boolean {
  if (filter === 'comments') return action.startsWith('comment') || action === 'commented';
  if (filter === 'reactions') return action.includes('reaction');
  if (filter === 'attachments') return action.startsWith('attachment_');
  return (
    !action.startsWith('comment') &&
    !action.includes('reaction') &&
    !action.startsWith('attachment_')
  );
}

export function matchesInboxFilters(activity: InboxActivity, filters: InboxFilters): boolean {
  if (
    filters.activityTypes.length > 0 &&
    !filters.activityTypes.some((filter) => actionMatchesFilter(activity.action, filter))
  ) {
    return false;
  }
  if (filters.projectIds.length > 0 && !filters.projectIds.includes(activity.projectId)) {
    return false;
  }
  if (
    filters.priorities.length > 0 &&
    (activity.priority === null || !filters.priorities.includes(activity.priority))
  ) {
    return false;
  }
  if (
    filters.statuses.length > 0 &&
    (activity.status === null || !filters.statuses.includes(activity.status))
  ) {
    return false;
  }
  return true;
}

export function toggleInboxFilterValue<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}
