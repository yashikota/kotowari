export type InboxState = {
  readIds: number[];
  archivedIds: number[];
  snoozedUntil: Record<number, number>;
  density: 'comfortable' | 'compact';
  groupByDate: boolean;
};

export const INBOX_STATE_KEY = 'kotowari.inbox.v1';

export const DEFAULT_INBOX_STATE: InboxState = {
  readIds: [],
  archivedIds: [],
  snoozedUntil: {},
  density: 'comfortable',
  groupByDate: true,
};

export type InboxSnoozePreset = 'one-hour' | 'later-today' | 'tomorrow' | 'next-week';

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
  });
}
