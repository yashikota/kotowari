export type InboxState = {
  readIds: number[];
  archivedIds: number[];
  density: 'comfortable' | 'compact';
  groupByDate: boolean;
};

export const INBOX_STATE_KEY = 'kotowari.inbox.v1';

export const DEFAULT_INBOX_STATE: InboxState = {
  readIds: [],
  archivedIds: [],
  density: 'comfortable',
  groupByDate: true,
};

function validIds(value: unknown): number[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((id): id is number => Number.isSafeInteger(id) && id > 0))]
    : [];
}

export function parseInboxState(value: string | null): InboxState {
  if (!value) return { ...DEFAULT_INBOX_STATE };
  try {
    const parsed = JSON.parse(value) as Partial<InboxState>;
    return {
      readIds: validIds(parsed.readIds),
      archivedIds: validIds(parsed.archivedIds),
      density: parsed.density === 'compact' ? 'compact' : 'comfortable',
      groupByDate:
        typeof parsed.groupByDate === 'boolean'
          ? parsed.groupByDate
          : DEFAULT_INBOX_STATE.groupByDate,
    };
  } catch {
    return { ...DEFAULT_INBOX_STATE };
  }
}

export function serializeInboxState(value: InboxState): string {
  return JSON.stringify({
    readIds: validIds(value.readIds),
    archivedIds: validIds(value.archivedIds),
    density: value.density === 'compact' ? 'compact' : 'comfortable',
    groupByDate: value.groupByDate,
  });
}
