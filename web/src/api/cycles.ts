import { req } from './request.ts';
import type { Activity, Cycle, IssueLink } from '../types.ts';
export const cycleApi = {
  cycles: (archived = false) => req<Cycle[]>(`/api/cycles${archived ? '?archived=true' : ''}`),
  ensureCycleSchedule: () => req<Cycle[]>('/api/cycles/ensure', { method: 'POST' }),
  cycle: (n: number) => req<Cycle>(`/api/cycles/${n}`),
  cycleActivities: (n: number) => req<Activity[]>(`/api/cycles/${n}/activities`),
  createCycle: (body: { startsAt: string; endsAt: string; status?: string }) =>
    req<Cycle>('/api/cycles', { method: 'POST', body: JSON.stringify(body) }),
  patchCycle: (n: number, body: Record<string, unknown>) =>
    req<Cycle>(`/api/cycles/${n}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  addCycleResource: (
    n: number,
    body: { url: string; title?: string; kind?: 'link' | 'document' },
  ) => req<IssueLink>(`/api/cycles/${n}/links`, { method: 'POST', body: JSON.stringify(body) }),
  removeCycleResource: (n: number, resourceId: number) =>
    req<void>(`/api/cycles/${n}/links/${resourceId}`, { method: 'DELETE' }),
};
