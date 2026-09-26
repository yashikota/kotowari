const STORAGE_KEY = 'kotowari.issue-subscriptions.v1';
const listeners = new Set<() => void>();
let memorySubscriptions: string[] = [];

function readIssueSubscriptions(): Set<string> {
  if (typeof localStorage === 'undefined') return new Set(memorySubscriptions);
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? JSON.stringify(memorySubscriptions),
    );
    return new Set(
      Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [],
    );
  } catch {
    return new Set(memorySubscriptions);
  }
}

function publishIssueSubscriptions() {
  listeners.forEach((listener) => listener());
}

export const issueSubscriptions = {
  has: (identifier: string): boolean => {
    return readIssueSubscriptions().has(identifier);
  },
  list: (): string[] => {
    return [...readIssueSubscriptions()];
  },
  toggle: (identifier: string): boolean => {
    const subscriptions = readIssueSubscriptions();
    if (subscriptions.has(identifier)) subscriptions.delete(identifier);
    else subscriptions.add(identifier);
    memorySubscriptions = [...subscriptions].sort();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memorySubscriptions));
    } catch {
      // The in-memory view remains usable when browser storage is unavailable.
    }
    publishIssueSubscriptions();
    return subscriptions.has(identifier);
  },
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    if (typeof window !== 'undefined') window.addEventListener('storage', listener);
    return () => {
      listeners.delete(listener);
      if (typeof window !== 'undefined') window.removeEventListener('storage', listener);
    };
  },
};
