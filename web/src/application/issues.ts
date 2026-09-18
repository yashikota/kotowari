import { useMemo, useSyncExternalStore } from 'react';
import type { Issue } from '../types.ts';
import { queryCache } from './cache.ts';

const patches = new Map<string, { patch: Partial<Issue>; confirmed?: string }>();
const listeners = new Set<() => void>();
let revision = 0;
function notify() {
  revision++;
  listeners.forEach((fn) => fn());
}
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const snapshot = () => revision;

export function useIssueProjection(issues: Issue[]) {
  const version = useSyncExternalStore(subscribe, snapshot);
  return useMemo(
    () =>
      issues.map((issue) => {
        const patch = patches.get(issue.identifier);
        return patch && (!patch.confirmed || issue.updatedAt < patch.confirmed)
          ? { ...issue, ...patch.patch }
          : issue;
      }),
    [issues, version],
  );
}

/** Optimistic display only. The disk and server revision remain authoritative. */
export async function updateIssue(
  id: string,
  patch: Record<string, unknown>,
  commit: () => Promise<Issue>,
) {
  const previous = patches.get(id);
  const overlay = { patch: { ...previous?.patch, ...patch } as Partial<Issue> };
  patches.set(id, overlay);
  notify();
  try {
    const issue = await commit();
    if (patches.get(id) === overlay) {
      patches.set(id, { patch: issue, confirmed: issue.updatedAt });
      notify();
    }
    return issue;
  } catch (error) {
    if (patches.get(id) === overlay) {
      if (previous) patches.set(id, previous);
      else patches.delete(id);
      notify();
    }
    throw error;
  }
}

export function resetIssueProjection() {
  patches.clear();
  notify();
}
export function cachedIssue(id: string): Issue | null {
  return (
    queryCache.peek<Issue>(`/api/issues/${id}`) ??
    queryCache.peek<Issue[]>('/api/issues')?.find((i) => i.identifier === id) ??
    null
  );
}
