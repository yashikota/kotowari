import type { Dispatch, SetStateAction } from 'react';
import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { isCommentSubmitShortcut } from '../keymap.ts';
import { api } from '../api.ts';
import { signals } from '../application/mediator.ts';
import { convertTextEmoticons } from '../preferences.ts';
import i18n from '../i18n/index.ts';
import type { Activity, Comment, Issue } from '../types.ts';
import { groupPriorityActivityHistory, type IssueTimelineEntry } from '../activity-history.ts';

type CommentSubmitShortcut = Parameters<typeof isCommentSubmitShortcut>[1];

type Props = {
  identifier: string;
  commentSubmitShortcut: CommentSubmitShortcut;
  convertEmoticons: boolean;
  setIssue: Dispatch<SetStateAction<Issue | null>>;
  setLoadError: Dispatch<SetStateAction<string>>;
};

export function useIssueDetailTimeline({
  identifier,
  commentSubmitShortcut,
  convertEmoticons: shouldConvertEmoticons,
  setIssue,
  setLoadError,
}: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentDraft, setEditingCommentDraft] = useState('');
  const [reactionPickerTarget, setReactionPickerTarget] = useState<string | null>(null);
  const [reactionError, setReactionError] = useState('');
  const [draft, setDraft] = useState('');
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const [commentError, setCommentError] = useState('');
  const commentFilesInputRef = useRef<HTMLInputElement>(null);
  const [issueAttachmentError, setIssueAttachmentError] = useState('');
  const [issueAttachmentBusy, setIssueAttachmentBusy] = useState(false);
  const issueFilesInputRef = useRef<HTMLInputElement>(null);
  const [focusNote, setFocusNote] = useState(0);
  const generation = useRef(0);

  async function reload() {
    const token = ++generation.current;
    const [nextComments, nextActivities] = await Promise.all([
      api.comments(identifier),
      api.activities(identifier),
    ]);
    if (token !== generation.current) return;
    setComments(nextComments);
    setActivities(nextActivities);
  }

  async function refreshActivities() {
    setActivities(await api.activities(identifier));
  }

  useEffect(() => {
    void reload().catch((error: unknown) =>
      setLoadError(error instanceof Error ? error.message : 'load failed'),
    );
    function onRefresh() {
      void reload().catch(() => undefined);
    }
    signals.addEventListener('kotowari:refresh', onRefresh);
    return () => {
      generation.current++;
      signals.removeEventListener('kotowari:refresh', onRefresh);
    };
  }, [identifier]);

  useEffect(() => {
    setDraft('');
    setCommentFiles([]);
    setCommentError('');
    setEditingCommentId(null);
    setEditingCommentDraft('');
    setReactionPickerTarget(null);
    setReactionError('');
    setIssueAttachmentError('');
    setIssueAttachmentBusy(false);
  }, [identifier]);

  async function submitComment() {
    const body = (shouldConvertEmoticons ? convertTextEmoticons(draft) : draft).trim();
    const files = commentFiles;
    if (!body && files.length === 0) return;
    setCommentError('');
    try {
      if (files.length) await api.addCommentWithAttachments(identifier, body, files);
      else await api.addComment(identifier, body);
      setDraft('');
      setCommentFiles([]);
      if (commentFilesInputRef.current) commentFilesInputRef.current.value = '';
      setFocusNote((current) => current + 1);
      await reload();
    } catch {
      setCommentError(i18n.t('issueAttachments.uploadFailed'));
    }
  }

  async function saveCommentEdit(commentId: number) {
    const body = (
      shouldConvertEmoticons ? convertTextEmoticons(editingCommentDraft) : editingCommentDraft
    ).trim();
    setCommentError('');
    try {
      const updated = await api.updateComment(identifier, commentId, body);
      setComments((current) =>
        current.map((comment) => (comment.id === commentId ? updated : comment)),
      );
      setEditingCommentId(null);
      setEditingCommentDraft('');
      await refreshActivities();
    } catch {
      setCommentError(i18n.t('issueComments.updateFailed'));
    }
  }

  async function deleteComment(commentId: number) {
    if (!window.confirm(i18n.t('issueComments.confirmDelete'))) return;
    setCommentError('');
    try {
      await api.deleteComment(identifier, commentId);
      setComments((current) => current.filter((comment) => comment.id !== commentId));
      await refreshActivities();
    } catch {
      setCommentError(i18n.t('issueComments.deleteFailed'));
    }
  }

  async function toggleReaction(target: string, emoji: string) {
    setReactionError('');
    try {
      if (target === 'issue') {
        setIssue(await api.toggleIssueReaction(identifier, emoji));
      } else {
        const commentId = Number(target.slice('comment:'.length));
        const updated = await api.toggleCommentReaction(identifier, commentId, emoji);
        setComments((current) =>
          current.map((comment) => (comment.id === commentId ? updated : comment)),
        );
      }
      setReactionPickerTarget(null);
      await refreshActivities();
    } catch {
      setReactionError(i18n.t('reactions.updateFailed'));
    }
  }

  async function uploadIssueAttachments(files: File[]) {
    if (files.length === 0 || issueAttachmentBusy) return;
    setIssueAttachmentError('');
    if (files.some((file) => file.size > 20 * 1024 * 1024)) {
      setIssueAttachmentError(i18n.t('issueAttachments.tooLarge'));
      return;
    }
    if (files.length > 10) {
      setIssueAttachmentError(i18n.t('issueAttachments.tooMany'));
      return;
    }
    setIssueAttachmentBusy(true);
    try {
      await api.addIssueAttachments(identifier, files);
      setIssue(await api.issue(identifier));
      await refreshActivities();
    } catch {
      setIssueAttachmentError(i18n.t('issueAttachments.uploadFailed'));
    } finally {
      setIssueAttachmentBusy(false);
    }
  }

  async function removeIssueAttachment(attachmentId: string) {
    setIssueAttachmentError('');
    try {
      await api.deleteIssueAttachment(identifier, attachmentId);
      setIssue(await api.issue(identifier));
      await refreshActivities();
    } catch {
      setIssueAttachmentError(i18n.t('issueAttachments.deleteFailed'));
    }
  }

  const timelineEntries = [
    ...activities
      .filter((activity) => activity.action !== 'commented')
      .map((activity) => ({
        kind: 'activity' as const,
        id: activity.id,
        createdAt: activity.createdAt,
        activity,
      })),
    ...comments.map((comment) => ({
      kind: 'comment' as const,
      id: comment.id,
      createdAt: comment.createdAt,
      comment,
    })),
  ].sort(
    (left, right) =>
      left.createdAt.localeCompare(right.createdAt) ||
      Number(left.kind === 'comment') - Number(right.kind === 'comment') ||
      left.id - right.id,
  );
  const timeline: IssueTimelineEntry[] = groupPriorityActivityHistory(timelineEntries);

  return {
    data: {
      activities,
      commentError,
      commentFiles,
      commentFilesInputRef,
      commentSubmitShortcut,
      comments,
      draft,
      editingCommentDraft,
      editingCommentId,
      focusNote,
      issueAttachmentBusy,
      issueAttachmentError,
      issueFilesInputRef,
      reactionError,
      reactionPickerTarget,
      timeline,
    },
    reload,
    refreshActivities,
    handlers: {
      New_note_onChange21: (e: React.ChangeEvent<HTMLTextAreaElement>) => setDraft(e.target.value),
      New_note_onKeyDown22: (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return;
        if (isCommentSubmitShortcut(e, commentSubmitShortcut)) {
          e.preventDefault();
          return submitComment();
        }
      },
      onChooseCommentFiles: () => commentFilesInputRef.current?.click(),
      onCommentFilesChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = Array.from(e.currentTarget.files ?? []);
        e.currentTarget.value = '';
        if (selected.some((file) => file.size > 20 * 1024 * 1024)) {
          setCommentError(i18n.t('issueAttachments.tooLarge'));
          return;
        }
        if (commentFiles.length + selected.length > 10) {
          setCommentError(i18n.t('issueAttachments.tooMany'));
          return;
        }
        setCommentError('');
        setCommentFiles((current) => [...current, ...selected]);
      },
      onRemoveCommentFile: (index: number) => {
        setCommentError('');
        setCommentFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
      },
      onSubmitComment: () => submitComment(),
      onFocusComment: () => setFocusNote((current) => current + 1),
      onEditComment: (commentId: number, body: string) => {
        setEditingCommentId(commentId);
        setEditingCommentDraft(body);
        setCommentError('');
      },
      onChangeCommentEdit: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
        setEditingCommentDraft(e.currentTarget.value),
      onCancelCommentEdit: () => {
        setEditingCommentId(null);
        setEditingCommentDraft('');
      },
      onSaveCommentEdit: (commentId: number) => saveCommentEdit(commentId),
      onDeleteComment: (commentId: number) => deleteComment(commentId),
      onReactionPickerChange: (target: string, opened: boolean) => {
        setReactionPickerTarget((current) => {
          if (opened) return target;
          return current === target ? null : current;
        });
      },
      onSelectReaction: (target: string, emoji: string) => toggleReaction(target, emoji),
      onToggleReaction: (target: string, emoji: string) => toggleReaction(target, emoji),
      onChooseIssueFiles: () => issueFilesInputRef.current?.click(),
      onIssueFilesChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = Array.from(e.currentTarget.files ?? []);
        e.currentTarget.value = '';
        return uploadIssueAttachments(selected);
      },
      onRemoveIssueAttachment: (attachmentId: string) => removeIssueAttachment(attachmentId),
    },
  };
}
