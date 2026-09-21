import i18n from './i18n/index.ts';
import { issueStatusLabel } from './i18n/labels.ts';
import type { IssueStatus } from './types.ts';

export function formatActivity(action: string, payload: Record<string, unknown>): string {
  if (action === 'created') {
    const id = typeof payload.identifier === 'string' ? payload.identifier : '';
    return id ? i18n.t('activity.createdWithId', { id }) : i18n.t('activity.created');
  }
  if (action === 'status_changed') {
    const from = typeof payload.from === 'string' ? payload.from : '';
    const to = typeof payload.to === 'string' ? payload.to : '';
    const fromLabel = issueStatusLabel(from as IssueStatus);
    const toLabel = issueStatusLabel(to as IssueStatus);
    return i18n.t('activity.statusChanged', { from: fromLabel, to: toLabel });
  }
  if (action === 'commented') {
    return i18n.t('activity.commented');
  }
  return action;
}
