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
  if (action === 'type_changed') {
    const from = typeof payload.from === 'string' ? payload.from : '';
    const to = typeof payload.to === 'string' ? payload.to : '';
    const fromLabel = from
      ? i18n.t(`issueType.${from}`, { defaultValue: from })
      : i18n.t('issueProperties.noType');
    const toLabel = to
      ? i18n.t(`issueType.${to}`, { defaultValue: to })
      : i18n.t('issueProperties.noType');
    return i18n.t('activity.typeChanged', { from: fromLabel, to: toLabel });
  }
  if (action === 'estimate_changed') {
    const from = typeof payload.from === 'number' ? payload.from : null;
    const to = typeof payload.to === 'number' ? payload.to : null;
    return i18n.t('activity.estimateChanged', {
      from: from ?? i18n.t('issueProperties.noEstimate'),
      to: to ?? i18n.t('issueProperties.noEstimate'),
    });
  }
  if (action === 'milestone_changed') {
    const from =
      typeof payload.from === 'string' && payload.from
        ? payload.from
        : i18n.t('issueProperties.noMilestone');
    const to =
      typeof payload.to === 'string' && payload.to
        ? payload.to
        : i18n.t('issueProperties.noMilestone');
    return i18n.t('activity.milestoneChanged', { from, to });
  }
  if (action === 'commented') {
    return i18n.t('activity.commented');
  }
  if (action === 'link_added' || action === 'link_removed') {
    const title = typeof payload.title === 'string' && payload.title ? payload.title : payload.url;
    return i18n.t(action === 'link_added' ? 'activity.linkAdded' : 'activity.linkRemoved', {
      title: typeof title === 'string' ? title : '',
    });
  }
  if (action === 'favorite_changed') {
    return i18n.t(
      payload.favorite === true ? 'activity.favoriteAdded' : 'activity.favoriteRemoved',
    );
  }
  if (action === 'reminder_changed') {
    const to = typeof payload.to === 'string' ? payload.to : '';
    return i18n.t(to ? 'activity.reminderSet' : 'activity.reminderCleared', {
      date: to
        ? new Intl.DateTimeFormat(i18n.language, {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(new Date(to))
        : '',
    });
  }
  if (action === 'relation_added' || action === 'relation_removed') {
    const relation = typeof payload.kind === 'string' ? payload.kind : '';
    const identifier = typeof payload.target === 'string' ? payload.target : '';
    return i18n.t(
      action === 'relation_added' ? 'activity.relationAdded' : 'activity.relationRemoved',
      {
        relation: i18n.t(`issueRelations.${relation}`, { defaultValue: relation }),
        identifier,
      },
    );
  }
  return action;
}
