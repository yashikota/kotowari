import i18n from './i18n/index.ts';
import type { IssueWorkflowStatus } from './types.ts';
import { workflowStatusLabel } from './workflow.tsx';

export function formatActivity(
  action: string,
  payload: Record<string, unknown>,
  workflowStatuses?: IssueWorkflowStatus[],
): string {
  if (action === 'created') {
    const id = typeof payload.identifier === 'string' ? payload.identifier : '';
    return id ? i18n.t('activity.createdWithId', { id }) : i18n.t('activity.created');
  }
  if (action === 'archived') return i18n.t('activity.archived');
  if (action === 'unarchived') return i18n.t('activity.unarchived');
  if (action === 'status_changed') {
    const from = typeof payload.from === 'string' ? payload.from : '';
    const to = typeof payload.to === 'string' ? payload.to : '';
    const fromLabel = workflowStatusLabel(from, workflowStatuses);
    const toLabel = workflowStatusLabel(to, workflowStatuses);
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
  if (action === 'assignee_changed') {
    const from =
      payload.from === 'self'
        ? i18n.t('issueAssignment.you')
        : i18n.t('issueAssignment.unassigned');
    const to =
      payload.to === 'self' ? i18n.t('issueAssignment.you') : i18n.t('issueAssignment.unassigned');
    return i18n.t('activity.assigneeChanged', { from, to });
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
  if (action === 'comment_edited') {
    return i18n.t('activity.commentEdited');
  }
  if (action === 'comment_deleted') {
    return i18n.t('activity.commentDeleted');
  }
  if (
    action === 'reaction_added' ||
    action === 'reaction_removed' ||
    action === 'comment_reaction_added' ||
    action === 'comment_reaction_removed'
  ) {
    const emoji = typeof payload.emoji === 'string' ? payload.emoji : '';
    const key = {
      reaction_added: 'activity.reactionAdded',
      reaction_removed: 'activity.reactionRemoved',
      comment_reaction_added: 'activity.commentReactionAdded',
      comment_reaction_removed: 'activity.commentReactionRemoved',
    }[action];
    return i18n.t(key, { emoji });
  }
  if (action === 'attachment_added') {
    const count = typeof payload.count === 'number' ? payload.count : 1;
    return i18n.t('activity.attachmentsAdded', { count });
  }
  if (action === 'attachment_removed') {
    const name = typeof payload.name === 'string' ? payload.name : '';
    return i18n.t('activity.attachmentRemoved', { name });
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
