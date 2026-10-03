import type { IssueLink, IssueType, RecurringIssue } from './types.ts';

export const ISSUE_DRAFTS_KEY = 'kotowari.issue-drafts.v1';
export const ISSUE_DRAFTS_EVENT = 'kotowari:issue-drafts-changed';

export type IssueDraft = {
  id: string;
  publishedIssue?: string;
  title: string;
  body: string;
  skipDefaultTemplate?: boolean;
  status: string;
  priority: number;
  assignee: 'self' | 'agent' | '';
  type: IssueType | '';
  estimate: string;
  projectId: string;
  cycleId: string;
  dueDate: string;
  labelNames: string[];
  templateSlug: string;
  parentId: number | undefined;
  parentIdentifier: string;
  externalLinks: Pick<IssueLink, 'url' | 'title' | 'kind'>[];
  recurringOpen: boolean;
  recurringFirstDueDate: string;
  recurringInterval: string;
  recurringUnit: RecurringIssue['unit'];
  createdAt: string;
  updatedAt: string;
};

const ISSUE_TYPES: readonly IssueType[] = ['bug', 'feature', 'improvement', 'task'];
const LINK_KINDS: readonly IssueLink['kind'][] = ['link', 'pullRequest', 'document'];
const RECURRING_UNITS: readonly RecurringIssue['unit'][] = ['day', 'week', 'month', 'year'];
const EPOCH = new Date(0).toISOString();

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function parseIssueDraft(value: unknown): IssueDraft | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = asString(record.id);
  const title = asString(record.title).trim();
  if (!id || !title) return null;
  const createdAt = asString(record.createdAt, EPOCH);
  const updatedAt = asString(record.updatedAt, createdAt);
  const assignee = record.assignee === 'self' || record.assignee === 'agent' ? record.assignee : '';
  const type = ISSUE_TYPES.includes(record.type as IssueType) ? (record.type as IssueType) : '';
  const recurringUnit = RECURRING_UNITS.includes(record.recurringUnit as RecurringIssue['unit'])
    ? (record.recurringUnit as RecurringIssue['unit'])
    : 'week';
  const externalLinks = Array.isArray(record.externalLinks)
    ? record.externalLinks.flatMap((value) => {
        const link = asRecord(value);
        if (typeof link?.url !== 'string' || !LINK_KINDS.includes(link.kind as IssueLink['kind']))
          return [];
        return [
          {
            url: link.url,
            title: typeof link.title === 'string' ? link.title : undefined,
            kind: link.kind as IssueLink['kind'],
          },
        ];
      })
    : [];
  return {
    id,
    title,
    body: asString(record.body),
    skipDefaultTemplate: record.skipDefaultTemplate === true,
    status: asString(record.status, 'todo'),
    priority:
      typeof record.priority === 'number' && Number.isFinite(record.priority) ? record.priority : 0,
    assignee,
    type,
    estimate: asString(record.estimate),
    projectId: asString(record.projectId),
    cycleId: asString(record.cycleId),
    dueDate: asString(record.dueDate),
    labelNames: Array.isArray(record.labelNames)
      ? record.labelNames.filter((name): name is string => typeof name === 'string')
      : [],
    templateSlug: asString(record.templateSlug),
    parentId: typeof record.parentId === 'number' ? record.parentId : undefined,
    parentIdentifier: asString(record.parentIdentifier),
    externalLinks,
    recurringOpen: record.recurringOpen === true,
    recurringFirstDueDate: asString(record.recurringFirstDueDate),
    recurringInterval: asString(record.recurringInterval, '1'),
    recurringUnit,
    createdAt,
    updatedAt,
  };
}

export function parseIssueDrafts(value: string | null): IssueDraft[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(parseIssueDraft)
      .filter((draft): draft is IssueDraft => draft !== null)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  } catch {
    return [];
  }
}

const publishedDrafts = new Map<string, string>();
const PUBLISHED_DRAFTS_KEY = 'kotowari.published-drafts.v1';
export function publishedDraftIssue(id: string): string | undefined {
  if (publishedDrafts.has(id)) return publishedDrafts.get(id);
  try {
    const stored: unknown = JSON.parse(window.sessionStorage.getItem(PUBLISHED_DRAFTS_KEY) ?? '{}');
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      for (const [key, value] of Object.entries(stored)) {
        if (typeof value === 'string') publishedDrafts.set(key, value);
      }
      return publishedDrafts.get(id);
    }
  } catch {
    /* Keep the confirmed outcome in memory when browser storage is unavailable. */
  }
  return undefined;
}
function persistPublishedDrafts() {
  try {
    window.sessionStorage.setItem(
      PUBLISHED_DRAFTS_KEY,
      JSON.stringify(Object.fromEntries(publishedDrafts)),
    );
  } catch {
    /* The in-memory outcome still prevents resubmitting this draft. */
  }
}
export function rememberPublishedDraft(id: string, identifier: string) {
  publishedDrafts.set(id, identifier);
  persistPublishedDrafts();
  window.dispatchEvent(new Event(ISSUE_DRAFTS_EVENT));
}
function forgetPublishedDraft(id: string) {
  publishedDrafts.delete(id);
  persistPublishedDrafts();
}

export function listIssueDrafts(): IssueDraft[] {
  if (typeof window === 'undefined') return [];
  return parseIssueDrafts(window.localStorage.getItem(ISSUE_DRAFTS_KEY)).map((draft) => ({
    ...draft,
    publishedIssue: publishedDraftIssue(draft.id),
  }));
}

export function readIssueDrafts(): { drafts: IssueDraft[]; error: string } {
  try {
    return { drafts: listIssueDrafts(), error: '' };
  } catch (error) {
    return { drafts: [], error: error instanceof Error ? error.message : String(error) };
  }
}

function writeIssueDrafts(drafts: IssueDraft[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ISSUE_DRAFTS_KEY, JSON.stringify(drafts));
  window.dispatchEvent(new Event(ISSUE_DRAFTS_EVENT));
}

export function saveIssueDraft(draft: IssueDraft) {
  const current = listIssueDrafts();
  const existing = current.find((item) => item.id === draft.id);
  writeIssueDrafts([
    { ...draft, createdAt: existing?.createdAt ?? draft.createdAt },
    ...current.filter((item) => item.id !== draft.id),
  ]);
}

export function deleteIssueDraft(id: string) {
  const current = listIssueDrafts();
  if (!current.some((draft) => draft.id === id)) {
    forgetPublishedDraft(id);
    return;
  }
  writeIssueDrafts(current.filter((draft) => draft.id !== id));
  forgetPublishedDraft(id);
}

export function deleteAllIssueDrafts() {
  if (listIssueDrafts().length === 0) return;
  writeIssueDrafts([]);
  publishedDrafts.clear();
  persistPublishedDrafts();
}
