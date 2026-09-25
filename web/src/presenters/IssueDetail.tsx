import { isCommentSubmitShortcut, isSubmitShortcut } from '../keymap.ts';
import { useNavigate, useRouter } from '@tanstack/react-router';
import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { api } from '../api.ts';
import { issueBranchName, issueMarkdown, renderIssuePrompt } from '../issue-actions.ts';
import { buildCodingToolURL, useCodingToolPreferences } from '../coding-tools.ts';
import { cachedIssue, useIssueProjection } from '../application/issues.ts';
import { signals } from '../application/mediator.ts';
import { useIntent } from '../application/Root.tsx';
import i18n from '../i18n/index.ts';
import type {
  ADR,
  Activity,
  Comment,
  Cycle,
  Issue,
  IssueLink,
  IssueRelation,
  Label,
  Page,
  Project,
} from '../types.ts';
import { useProjectWorkflow, projectWorkflowStatusCategory } from '../project-workflow.tsx';
import { convertTextEmoticons, usePersonalPreferences } from '../preferences.ts';

const LABEL_COLORS = ['#d4725a', '#6b9bd1', '#c4a574', '#7a9e7e', '#d4a05a'];
const ISSUE_PROPERTY_VISIBILITY_KEY = 'kotowari.issue-property-visibility.v1';

type RelatedIssueKind = 'issue' | 'subIssue' | 'parent' | 'blocked' | 'blocking';
export type IssueOptionalProperty = 'dueDate' | 'milestone' | 'parent' | 'type';
type OptionalPropertyOverrides = Record<string, Partial<Record<IssueOptionalProperty, boolean>>>;
type MarkAsKind =
  | 'parentOf'
  | 'subIssueOf'
  | 'relatedTo'
  | 'blockedBy'
  | 'blocking'
  | 'duplicateOf';

type Props = {
  identifier: string;
  navigationIds?: string[];
  issueReturnTo?: string;
  issueListFind?: string;
  issueListSelectedId?: string | null;
  issueListScrollTop?: number;
  issueListLayout?: 'list' | 'board';
};

function readOptionalPropertyOverrides(): OptionalPropertyOverrides {
  if (typeof window === 'undefined') return {};
  try {
    const stored: unknown = JSON.parse(
      window.localStorage.getItem(ISSUE_PROPERTY_VISIBILITY_KEY) ?? '{}',
    );
    if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) return {};
    return stored as OptionalPropertyOverrides;
  } catch {
    return {};
  }
}

export function useIssueDetailPresenter({
  identifier,
  navigationIds = [],
  issueReturnTo = '/issues',
  issueListFind = '',
  issueListSelectedId = null,
  issueListScrollTop = 0,
  issueListLayout = 'list',
}: Props) {
  const sendIntent = useIntent();
  const { statuses: projectWorkflowStatuses } = useProjectWorkflow();
  const { preferences } = usePersonalPreferences();
  const { preferences: codingToolPreferences } = useCodingToolPreferences();
  const navigate = useNavigate();
  const router = useRouter();
  const navigationIndex = navigationIds.indexOf(identifier);
  const [storedIssue, setIssue] = useState<Issue | null>(() => cachedIssue(identifier));
  const issue = useIssueProjection(storedIssue ? [storedIssue] : [])[0] ?? null;
  const generation = useRef(0);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentDraft, setEditingCommentDraft] = useState('');
  const [reactionPickerTarget, setReactionPickerTarget] = useState<string | null>(null);
  const [reactionError, setReactionError] = useState('');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [adrs, setAdrs] = useState<ADR[]>([]);
  const [draft, setDraft] = useState('');
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const [commentError, setCommentError] = useState('');
  const commentFilesInputRef = useRef<HTMLInputElement>(null);
  const [issueAttachmentError, setIssueAttachmentError] = useState('');
  const [issueAttachmentBusy, setIssueAttachmentBusy] = useState(false);
  const issueFilesInputRef = useRef<HTMLInputElement>(null);
  const [subTitle, setSubTitle] = useState('');
  const [subIssueEditorOpen, setSubIssueEditorOpen] = useState(false);
  const [labelName, setLabelName] = useState('');
  const [focusSub, setFocusSub] = useState(0);
  const [focusLabel, setFocusLabel] = useState(0);
  const [focusNote, setFocusNote] = useState(0);
  const [adrPick, setAdrPick] = useState('');
  const [externalLinkURL, setExternalLinkURL] = useState('');
  const [externalLinkTitle, setExternalLinkTitle] = useState('');
  const [externalLinkKind, setExternalLinkKind] = useState<IssueLink['kind']>('link');
  const [externalLinkOpen, setExternalLinkOpen] = useState(false);
  const [resourcesCollapsed, setResourcesCollapsed] = useState(false);
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [dueDateValue, setDueDateValue] = useState('');
  const [relationTarget, setRelationTarget] = useState('');
  const [relationKind, setRelationKind] = useState<IssueRelation['kind']>('related');
  const [relationsEditorOpen, setRelationsEditorOpen] = useState(false);
  const [timeZone, setTimeZone] = useState('UTC');
  const [copied, setCopied] = useState(false);
  const [historyRequest, setHistoryRequest] = useState(0);
  const [optionalPropertyOverrides, setOptionalPropertyOverrides] =
    useState<OptionalPropertyOverrides>(readOptionalPropertyOverrides);
  const [customReminderOpen, setCustomReminderOpen] = useState(false);
  const [customReminderValue, setCustomReminderValue] = useState('');
  const [issueOptionsOpen, setIssueOptionsOpen] = useState(false);
  const [relatedIssueKind, setRelatedIssueKind] = useState<RelatedIssueKind | null>(null);
  const [relatedIssueTitle, setRelatedIssueTitle] = useState('');
  const [markAsKind, setMarkAsKind] = useState<MarkAsKind | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [projectConversionOpen, setProjectConversionOpen] = useState(false);
  const [projectConversionName, setProjectConversionName] = useState('');
  const [projectConversionDescription, setProjectConversionDescription] = useState('');
  const [projectConversionStatus, setProjectConversionStatus] = useState('planned');
  const [projectConversionPriority, setProjectConversionPriority] = useState(0);
  const [projectConversionStartDate, setProjectConversionStartDate] = useState('');
  const [projectConversionTargetDate, setProjectConversionTargetDate] = useState('');
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [recurringName, setRecurringName] = useState('');
  const [recurringFirstDueDate, setRecurringFirstDueDate] = useState('');
  const [recurringInterval, setRecurringInterval] = useState('1');
  const [recurringUnit, setRecurringUnit] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [error, setError] = useState('');

  async function reload() {
    const token = ++generation.current;
    const [iss, all, com, act, proj, cyc, labs, allAdrs, allPages, ws] = await Promise.all([
      api.issue(identifier),
      api.issues(),
      api.comments(identifier),
      api.activities(identifier),
      api.projects(),
      api.cycles(),
      api.labels(),
      api.adrs(),
      api.pages(),
      api.workspace(),
    ]);
    if (token !== generation.current) return;
    setIssue(iss);
    setIssues(all);
    setComments(com);
    setActivities(act);
    setProjects(proj);
    setCycles(cyc);
    setLabels(labs);
    setAdrs(allAdrs);
    setPages(allPages);
    setTimeZone(ws.timezone || 'UTC');
  }

  useEffect(() => {
    void reload().catch((e: unknown) => setError(e instanceof Error ? e.message : 'load failed'));
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
    setSubTitle('');
    setSubIssueEditorOpen(false);
    setRelationTarget('');
    setRelationsEditorOpen(false);
  }, [identifier]);

  async function patch(body: Record<string, unknown>) {
    const next = await api.patchIssue(identifier, body);
    setIssue(next);
    setActivities(await api.activities(identifier));
  }

  function reminderPreset(kind: 'hour' | 'tomorrow' | 'week' | 'month' | 'cycle') {
    const now = new Date();
    const next = new Date(now);
    if (kind === 'hour') {
      next.setHours(next.getHours() + 1);
      next.setSeconds(0, 0);
    }
    if (kind === 'tomorrow') next.setDate(next.getDate() + 1);
    if (kind === 'week') {
      const daysToMonday = (8 - next.getDay()) % 7 || 7;
      next.setDate(next.getDate() + daysToMonday);
    }
    if (kind === 'month') next.setMonth(next.getMonth() + 1);
    if (kind === 'cycle') {
      const upcoming = cycles
        .filter((cycle) => new Date(cycle.startsAt) > now)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
      if (!upcoming) return;
      next.setTime(new Date(upcoming.startsAt).getTime());
    }
    if (kind !== 'hour') next.setHours(9, 0, 0, 0);
    return next;
  }

  async function setReminder(value: Date | null) {
    await patch({ reminderAt: value ? value.toISOString() : null });
    setCustomReminderOpen(false);
    setIssueOptionsOpen(false);
  }

  function formatLocalDateTime(value: string | null) {
    if (!value) return '';
    const date = new Date(value);
    const parts = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ];
    return `${parts[0]}-${parts[1]}-${parts[2]}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  if (error) {
    return { _view: 0 as const, error, handlers: {} };
  }
  if (!issue) {
    return { _view: 1 as const, handlers: {} };
  }

  const due = issue.dueDate?.slice(0, 10) ?? '';
  const propertyOverrides = optionalPropertyOverrides[identifier] ?? {};
  const optionalIssuePropertyVisibility: Record<IssueOptionalProperty, boolean> = {
    dueDate: propertyOverrides.dueDate ?? Boolean(due),
    milestone: propertyOverrides.milestone ?? issue.milestoneId != null,
    parent: propertyOverrides.parent ?? issue.parentId != null,
    type: propertyOverrides.type ?? Boolean(issue.type),
  };
  const selectedLabelIds = new Set(issue.labels.map((l) => l.id));
  const milestones = projects.find((project) => project.id === issue.projectId)?.milestones ?? [];
  const children = issues.filter((i) => i.parentId === issue.id);
  const relationIssues = issue.relations.flatMap((relation) => {
    const target = issues.find((candidate) => candidate.identifier === relation.targetIdentifier);
    return target ? [{ relation, target }] : [];
  });
  const relationTargetOptions = issues.filter(
    (candidate) =>
      candidate.id !== issue.id &&
      !issue.relations.some((relation) => relation.targetIdentifier === candidate.identifier),
  );
  const issueURL =
    typeof window === 'undefined'
      ? `/issues/${encodeURIComponent(identifier)}`
      : new URL(`/issues/${encodeURIComponent(identifier)}`, window.location.origin).href;
  const codingToolURL = buildCodingToolURL(issue, codingToolPreferences, issueURL);
  const markAsForbiddenIds = new Set<number>();
  if (markAsKind === 'parentOf') {
    let ancestorId = issue.parentId;
    while (ancestorId != null && !markAsForbiddenIds.has(ancestorId)) {
      markAsForbiddenIds.add(ancestorId);
      ancestorId = issues.find((candidate) => candidate.id === ancestorId)?.parentId ?? null;
    }
  } else if (markAsKind === 'subIssueOf') {
    const pending = [issue.id];
    while (pending.length > 0) {
      const parentId = pending.pop()!;
      for (const child of issues.filter((candidate) => candidate.parentId === parentId)) {
        if (!markAsForbiddenIds.has(child.id)) {
          markAsForbiddenIds.add(child.id);
          pending.push(child.id);
        }
      }
    }
  }
  const markAsIssueOptions = issues.filter(
    (candidate) => candidate.id !== issue.id && !markAsForbiddenIds.has(candidate.id),
  );
  const parentOptions = issues.filter((i) => i.id !== issue.id);
  const parentId = issue.id;
  const linkedAdrs = adrs.filter((a) => (issue.adrNumbers ?? []).includes(a.number));
  const unlinkedAdrs = adrs.filter((a) => !(issue.adrNumbers ?? []).includes(a.number));

  async function addSubIssue() {
    const title = subTitle.trim();
    if (!title) {
      return;
    }
    await api.createIssue({ title, parentId });
    setSubTitle('');
    setSubIssueEditorOpen(false);
    await router.invalidate();
    signals.dispatchEvent(new Event('kotowari:refresh'));
    await reload();
  }

  async function addLabel() {
    const name = labelName.trim();
    if (!name) {
      return;
    }
    const created = await api.createLabel({
      name,
      color: LABEL_COLORS[labels.length % LABEL_COLORS.length] ?? '#c4a574',
    });
    setLabelName('');
    setFocusLabel((n) => n + 1);
    setLabels(await api.labels());
    await patch({ labelIds: [...(issue?.labels ?? []).map((l) => l.id), created.id] });
  }

  async function addExternalLink() {
    const url = externalLinkURL.trim();
    if (!url) return;
    await api.addIssueLink(identifier, {
      url,
      title: externalLinkTitle.trim() || undefined,
      kind: externalLinkKind,
    });
    setExternalLinkURL('');
    setExternalLinkTitle('');
    setExternalLinkKind('link');
    setExternalLinkOpen(false);
    await reload();
  }

  async function createIssueDocument() {
    if (!issue) return;
    setIssueOptionsOpen(false);
    const title = i18n.t('issueActions.newDocumentTitle');
    const page = await api.createPage({ title, slug: `document-${Date.now()}` });
    const href = new URL(
      `${import.meta.env.BASE_URL}pages/${encodeURIComponent(page.slug)}`,
      window.location.origin,
    ).toString();
    await api.addIssueLink(identifier, { url: href, title, kind: 'document' });
    await reload();
    await router.invalidate();
    await navigate({ to: '/pages/$slug', params: { slug: page.slug } });
  }

  function localDateValue(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function dueDatePreset(kind: 'tomorrow' | 'week' | 'cycle') {
    const date = new Date();
    if (kind === 'cycle') {
      const nextCycle = cycles
        .filter((cycle) => new Date(cycle.startsAt) > date)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
      return nextCycle?.endsAt.slice(0, 10) ?? null;
    }
    date.setDate(date.getDate() + (kind === 'tomorrow' ? 1 : 7));
    return localDateValue(date);
  }

  function openExternalLink(kind: IssueLink['kind']) {
    setIssueOptionsOpen(false);
    setExternalLinkKind(kind);
    setExternalLinkURL('');
    setExternalLinkTitle('');
    setExternalLinkOpen(true);
  }

  function openDueDate() {
    setIssueOptionsOpen(false);
    setDueDateValue(issue?.dueDate ?? '');
    setDueDateOpen(true);
  }

  async function saveDueDate(value: string | null) {
    await patch({ dueDate: value });
    setDueDateOpen(false);
    setIssueOptionsOpen(false);
  }

  async function removeExternalLink(link: IssueLink) {
    await api.removeIssueLink(identifier, link.id);
    await reload();
  }

  async function addRelation() {
    if (!relationTarget) return;
    await api.addIssueRelation(identifier, {
      targetIdentifier: relationTarget,
      kind: relationKind,
    });
    setRelationTarget('');
    setRelationsEditorOpen(false);
    await reload();
    signals.dispatchEvent(new Event('kotowari:refresh'));
  }

  async function removeRelation(relation: IssueRelation) {
    await api.removeIssueRelation(identifier, relation.id);
    await reload();
    signals.dispatchEvent(new Event('kotowari:refresh'));
  }

  async function remove() {
    if (!window.confirm(i18n.t('issueActions.deleteConfirmation', { identifier }))) {
      return;
    }
    await api.deleteIssue(identifier);
    await router.invalidate();
    await navigate({ to: '/issues', search: {} });
  }

  async function toggleArchive() {
    await patch({ archived: !issue.archivedAt });
    await router.invalidate();
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard permission can be unavailable in an embedded or non-secure context.
    }
  }

  async function makeCopy() {
    const copy = await api.createIssue({
      title: `${issue.title} (${i18n.t('issueActions.copySuffix')})`,
      body: issue.body.trimEnd(),
      status: issue.status,
      type: issue.type,
      priority: issue.priority,
      estimate: issue.estimate ?? null,
      projectId: issue.projectId ?? undefined,
      milestoneId: issue.milestoneId ?? undefined,
      cycleId: issue.cycleId ?? undefined,
      parentId: issue.parentId ?? undefined,
      dueDate: issue.dueDate ?? undefined,
      labelIds: issue.labels.map((label) => label.id),
    });
    await router.invalidate();
    signals.dispatchEvent(new Event('kotowari:refresh'));
    await navigate({
      to: '/issues/$identifier',
      params: { identifier: copy.identifier },
      state: { autofocus: 'title' },
    });
  }

  async function createRelatedIssue() {
    const title = relatedIssueTitle.trim();
    if (!title || !relatedIssueKind) return;

    const related = await api.createIssue({
      title,
      status: 'todo',
      projectId: issue.projectId ?? undefined,
      cycleId: issue.cycleId ?? undefined,
      parentId: relatedIssueKind === 'subIssue' ? issue.id : undefined,
    });

    if (relatedIssueKind === 'parent') {
      await api.patchIssue(identifier, { parentId: related.id });
    } else if (relatedIssueKind !== 'subIssue') {
      const kind: IssueRelation['kind'] =
        relatedIssueKind === 'blocked'
          ? 'blocks'
          : relatedIssueKind === 'blocking'
            ? 'blockedBy'
            : 'related';
      await api.addIssueRelation(identifier, {
        targetIdentifier: related.identifier,
        kind,
      });
    }

    setRelatedIssueKind(null);
    setRelatedIssueTitle('');
    await router.invalidate();
    signals.dispatchEvent(new Event('kotowari:refresh'));
    await reload();
  }

  async function markAs(targetIdentifier: string | null) {
    if (!targetIdentifier || !markAsKind) return;
    const target = issues.find((candidate) => candidate.identifier === targetIdentifier);
    if (!target) return;

    if (markAsKind === 'parentOf') {
      await api.patchIssue(target.identifier, { parentId: issue.id });
    } else if (markAsKind === 'subIssueOf') {
      await api.patchIssue(identifier, { parentId: target.id });
    } else {
      const kind: IssueRelation['kind'] =
        markAsKind === 'relatedTo'
          ? 'related'
          : markAsKind === 'blockedBy'
            ? 'blockedBy'
            : markAsKind === 'blocking'
              ? 'blocks'
              : 'duplicateOf';
      await api.addIssueRelation(identifier, { targetIdentifier, kind });
    }

    setMarkAsKind(null);
    await router.invalidate();
    signals.dispatchEvent(new Event('kotowari:refresh'));
    await reload();
  }

  async function createIssueTemplate() {
    const name = templateName.trim();
    if (!name) return;
    await api.createIssueTemplate(identifier, name);
    setTemplateOpen(false);
    setTemplateName('');
  }

  async function createProjectFromIssue() {
    const name = projectConversionName.trim();
    if (!name) return;
    try {
      const result = await api.convertIssueToProject(identifier, {
        name,
        description: projectConversionDescription,
        status: projectWorkflowStatusCategory(projectConversionStatus, projectWorkflowStatuses),
        workflowStatus: projectConversionStatus,
        priority: projectConversionPriority,
        ...(projectConversionStartDate ? { startDate: projectConversionStartDate } : {}),
        ...(projectConversionTargetDate ? { targetDate: projectConversionTargetDate } : {}),
      });
      setProjectConversionOpen(false);
      await router.invalidate();
      signals.dispatchEvent(new Event('kotowari:refresh'));
      await navigate({ to: '/projects/$slug', params: { slug: result.project.slug } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to convert issue to project');
    }
  }

  async function createRecurringIssue() {
    const name = recurringName.trim();
    const interval = Number(recurringInterval);
    if (!name || !recurringFirstDueDate || !Number.isInteger(interval) || interval < 1) return;
    try {
      const recurring = await api.createRecurringIssue(identifier, {
        name,
        firstDueDate: recurringFirstDueDate,
        interval,
        unit: recurringUnit,
      });
      setRecurringOpen(false);
      await router.invalidate();
      signals.dispatchEvent(new Event('kotowari:refresh'));
      if (recurring.lastIssueIdentifier) {
        await navigate({
          to: '/issues/$identifier',
          params: { identifier: recurring.lastIssueIdentifier },
          state: { autofocus: 'title' },
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to create recurring issue');
    }
  }

  async function submitComment() {
    const body = (preferences.convertEmoticons ? convertTextEmoticons(draft) : draft).trim();
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
      const [nextComments, nextActivities] = await Promise.all([
        api.comments(identifier),
        api.activities(identifier),
      ]);
      setComments(nextComments);
      setActivities(nextActivities);
    } catch {
      setCommentError(i18n.t('issueAttachments.uploadFailed'));
    }
  }

  async function saveCommentEdit(commentId: number) {
    const body = (
      preferences.convertEmoticons ? convertTextEmoticons(editingCommentDraft) : editingCommentDraft
    ).trim();
    setCommentError('');
    try {
      const updated = await api.updateComment(identifier, commentId, body);
      setComments((current) =>
        current.map((comment) => (comment.id === commentId ? updated : comment)),
      );
      setEditingCommentId(null);
      setEditingCommentDraft('');
      setActivities(await api.activities(identifier));
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
      setActivities(await api.activities(identifier));
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
      setActivities(await api.activities(identifier));
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
      setActivities(await api.activities(identifier));
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
      setActivities(await api.activities(identifier));
    } catch {
      setIssueAttachmentError(i18n.t('issueAttachments.deleteFailed'));
    }
  }

  const timeline = [
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

  return {
    _view: 2 as const,
    identifier,
    navigationPosition: navigationIndex >= 0 ? navigationIndex + 1 : 1,
    navigationTotal: navigationIds.length,
    issueReturnTo,
    issue,
    optionalIssuePropertyVisibility,
    issues,
    timeline,
    editingCommentId,
    editingCommentDraft,
    reactionPickerTarget,
    reactionError,
    commentFiles,
    commentError,
    commentFilesInputRef,
    issueAttachmentError,
    issueAttachmentBusy,
    issueFilesInputRef,
    commentSubmitShortcut: preferences.commentSubmitShortcut,
    projects,
    milestones,
    cycles,
    pages,
    labels,
    adrs,
    draft,
    subTitle,
    subIssueEditorOpen,
    labelName,
    focusSub,
    focusLabel,
    focusNote,
    adrPick,
    externalLinkURL,
    externalLinkTitle,
    externalLinkKind,
    externalLinkOpen,
    resourcesCollapsed,
    dueDateOpen,
    dueDateValue,
    relationTarget,
    relationKind,
    relationsEditorOpen,
    relationIssues,
    relationTargetOptions,
    codingToolName: codingToolPreferences.customLinkName,
    codingToolURL,
    timeZone,
    copied,
    historyRequest,
    customReminderOpen,
    customReminderValue,
    issueOptionsOpen,
    relatedIssueKind,
    relatedIssueTitle,
    markAsKind,
    markAsIssueOptions,
    templateOpen,
    templateName,
    projectConversionOpen,
    projectConversionName,
    projectConversionDescription,
    projectConversionStatus,
    projectWorkflowStatuses,
    projectConversionPriority,
    projectConversionStartDate,
    projectConversionTargetDate,
    recurringOpen,
    recurringName,
    recurringFirstDueDate,
    recurringInterval,
    recurringUnit,
    due,
    hasUpcomingCycle: cycles.some((cycle) => new Date(cycle.startsAt) > new Date()),
    selectedLabelIds,
    children,
    parentOptions,
    parentId,
    linkedAdrs,
    unlinkedAdrs,
    handlers: {
      onReturnToList: () => {
        return router.history.push(issueReturnTo, {
          issueListFind,
          issueListSelectedId: issueListSelectedId ?? undefined,
          issueListScrollTop,
          issueListLayout,
        });
      },
      onNavigatePrevious: () => {
        const previousId = navigationIds[navigationIndex - 1];
        if (previousId) {
          return navigate({
            to: '/issues/$identifier',
            params: { identifier: previousId },
            state: {
              issueIds: navigationIds,
              issueReturnTo,
              issueListFind,
              issueListSelectedId: issueListSelectedId ?? undefined,
              issueListScrollTop,
              issueListLayout,
            },
          });
        }
      },
      onNavigateNext: () => {
        const nextId = navigationIds[navigationIndex + 1];
        if (nextId) {
          return navigate({
            to: '/issues/$identifier',
            params: { identifier: nextId },
            state: {
              issueIds: navigationIds,
              issueReturnTo,
              issueListFind,
              issueListSelectedId: issueListSelectedId ?? undefined,
              issueListScrollTop,
              issueListLayout,
            },
          });
        }
      },
      Copy_identifier_onClick0: () => {
        return copyText(issue.identifier);
      },
      onClick1: () =>
        navigate({
          to: '/issues/$identifier',
          params: { identifier: issue.parentIdentifier ?? '' },
        }),
      onClick2: () => remove(),
      onArchiveIssue: () => toggleArchive(),
      Issue_title_onChange3: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setIssue({ ...issue, title: e.target.value }),
      Issue_title_onBlur4: () => patch({ title: issue.title }),
      Status_onChange5: (value: string | null) =>
        value ? patch({ workflowStatus: value }) : undefined,
      Assignee_onChange: (value: string | null) =>
        patch({ assignee: value === 'self' || value === 'agent' ? value : null }),
      Type_onChange14: (value: string | null) =>
        patch({ type: value && value !== 'none' ? value : '' }),
      Priority_onChange6: (value: string | null) =>
        value ? patch({ priority: Number(value) }) : undefined,
      Estimate_onChange15: (value: string | null) =>
        patch({ estimate: value && value !== 'none' ? Number(value) : null }),
      Project_onChange7: (value: string | null) =>
        patch({ projectId: value && value !== 'none' ? Number(value) : null }),
      Milestone_onChange43: (value: string | null) =>
        patch({ milestoneId: value && value !== 'none' ? Number(value) : null }),
      Cycle_onChange8: (value: string | null) =>
        patch({ cycleId: value && value !== 'none' ? Number(value) : null }),
      Parent_onChange9: (value: string | null) =>
        patch({ parentId: value && value !== 'none' ? Number(value) : null }),
      Due_date_onChange10: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => patch({ dueDate: e.target.value ? e.target.value : null }),
      onToggleIssueOptionalProperty: (property: IssueOptionalProperty) => {
        const nextOverrides = {
          ...optionalPropertyOverrides,
          [identifier]: {
            ...propertyOverrides,
            [property]: !optionalIssuePropertyVisibility[property],
          },
        };
        setOptionalPropertyOverrides(nextOverrides);
        window.localStorage.setItem(ISSUE_PROPERTY_VISIBILITY_KEY, JSON.stringify(nextOverrides));
      },
      onClick11: (on: boolean, l: Label) => {
        const next = on
          ? issue.labels.filter((x) => x.id !== l.id).map((x) => x.id)
          : [...issue.labels.map((x) => x.id), l.id];
        return patch({ labelIds: next });
      },
      New_label_onChange12: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setLabelName(e.target.value),
      New_label_onKeyDown13: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onKeyDown']>>[0],
      ) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return;

        if (isSubmitShortcut(e)) {
          e.preventDefault();
          return addLabel();
        }
      },
      New_label_onClick23: () => addLabel(),
      onClick14: (a: ADR) => {
        return api.unlinkIssueADR(identifier, a.number).then(() => reload());
      },
      Link_ADR_onChange15: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => setAdrPick(e.target.value),
      onClick16: () => {
        const n = Number(adrPick);
        if (!n) {
          return;
        }
        return api.linkIssueADR(identifier, n).then(async () => {
          setAdrPick('');
          await reload();
          await router.invalidate();
        });
      },
      onClick17: () => sendIntent('adr.create', { issueNumber: issue.number }),
      External_link_URL_onChange24: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setExternalLinkURL(e.target.value),
      External_link_title_onChange25: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setExternalLinkTitle(e.target.value),
      External_link_kind_onChange26: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => setExternalLinkKind(e.target.value as IssueLink['kind']),
      onOpenExternalLink: (kind: IssueLink['kind']) => openExternalLink(kind),
      onCloseExternalLink: () => setExternalLinkOpen(false),
      onToggleResources: () => setResourcesCollapsed((current) => !current),
      External_link_onSubmit27: (
        e: Parameters<NonNullable<React.ComponentProps<'form'>['onSubmit']>>[0],
      ) => {
        e.preventDefault();
        return addExternalLink();
      },
      onRemoveExternalLink28: (link: IssueLink) => removeExternalLink(link),
      Create_document_onClick44: () => createIssueDocument(),
      onOpenDueDate: () => openDueDate(),
      onSetDueDatePreset: (kind: 'tomorrow' | 'week' | 'cycle') => {
        const value = dueDatePreset(kind);
        return value ? saveDueDate(value) : undefined;
      },
      onDueDateChange: (e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0]) =>
        setDueDateValue(e.target.value),
      onCloseDueDate: () => setDueDateOpen(false),
      onSaveDueDate: () => saveDueDate(dueDateValue || null),
      onClearDueDate: () => saveDueDate(null),
      Favorite_onClick29: async () => {
        await patch({ isFavorite: !issue.isFavorite });
        signals.dispatchEvent(new Event('kotowari:refresh'));
      },
      Relation_target_onChange30: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => setRelationTarget(e.target.value),
      Relation_kind_onChange31: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => setRelationKind(e.target.value as IssueRelation['kind']),
      onOpenRelationsEditor: () => setRelationsEditorOpen(true),
      onCloseRelationsEditor: () => setRelationsEditorOpen(false),
      Relation_onSubmit32: (
        e: Parameters<NonNullable<React.ComponentProps<'form'>['onSubmit']>>[0],
      ) => {
        e.preventDefault();
        return addRelation();
      },
      onRemoveRelation33: (relation: IssueRelation) => removeRelation(relation),
      Copy_id_onClick34: () => copyText(issue.identifier),
      Copy_url_onClick35: () => copyText(window.location.href),
      Copy_title_onClick36: () => copyText(issue.title),
      Copy_title_link_onClick37: () => {
        const title = issue.title
          .replaceAll('\\', '\\\\')
          .replaceAll('[', '\\[')
          .replaceAll(']', '\\]');
        return copyText(`[${title}](${window.location.href})`);
      },
      Copy_issue_markdown_onClick38: () => copyText(issueMarkdown(issue, window.location.href)),
      Copy_everything_onClick39: () => copyText(issueMarkdown(issue, window.location.href, true)),
      Copy_branch_onClick40: () => copyText(issueBranchName(issue)),
      Copy_prompt_onClick41: () =>
        copyText(renderIssuePrompt(issue, codingToolPreferences.promptTemplate, issueURL)),
      onOpenCodingTool: () => {
        if (codingToolURL) window.open(codingToolURL, '_blank', 'noopener,noreferrer');
      },
      onOpenCodingToolSettings: () => navigate({ to: '/config' }),
      Make_copy_onClick42: () => makeCopy(),
      onOpenCreateRelated: (kind: RelatedIssueKind) => {
        setIssueOptionsOpen(false);
        setRelatedIssueTitle('');
        setRelatedIssueKind(kind);
      },
      onCloseCreateRelated: () => setRelatedIssueKind(null),
      onRelatedIssueTitleChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setRelatedIssueTitle(e.target.value),
      onCreateRelatedSubmit: (
        e: Parameters<NonNullable<React.ComponentProps<'form'>['onSubmit']>>[0],
      ) => {
        e.preventDefault();
        return createRelatedIssue();
      },
      onOpenMarkAs: (kind: MarkAsKind) => {
        setIssueOptionsOpen(false);
        setMarkAsKind(kind);
      },
      onCloseMarkAs: () => setMarkAsKind(null),
      onSelectMarkAs: (value: string | null) => markAs(value),
      onOpenConvertToTemplate: () => {
        setIssueOptionsOpen(false);
        setTemplateName(issue.title);
        setTemplateOpen(true);
      },
      onCloseConvertToTemplate: () => setTemplateOpen(false),
      onOpenConvertToProject: () => {
        setIssueOptionsOpen(false);
        setProjectConversionName(issue.title);
        setProjectConversionDescription(issue.body);
        setProjectConversionStatus(
          issue.status === 'in_progress'
            ? 'started'
            : issue.status === 'done'
              ? 'completed'
              : issue.status === 'canceled'
                ? 'canceled'
                : 'planned',
        );
        setProjectConversionPriority(issue.priority);
        setProjectConversionStartDate('');
        setProjectConversionTargetDate(issue.dueDate?.slice(0, 10) ?? '');
        setProjectConversionOpen(true);
      },
      onCloseConvertToProject: () => setProjectConversionOpen(false),
      Project_conversion_name_onChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setProjectConversionName(e.target.value),
      Project_conversion_description_onChange: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => setProjectConversionDescription(e.target.value),
      Project_conversion_status_onChange: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => setProjectConversionStatus(e.target.value),
      Project_conversion_priority_onChange: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => setProjectConversionPriority(Number(e.target.value)),
      Project_conversion_start_onChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setProjectConversionStartDate(e.target.value),
      Project_conversion_target_onChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setProjectConversionTargetDate(e.target.value),
      onCreateProjectFromIssue: (
        e: Parameters<NonNullable<React.ComponentProps<'form'>['onSubmit']>>[0],
      ) => {
        e.preventDefault();
        return createProjectFromIssue();
      },
      onTemplateNameChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setTemplateName(e.target.value),
      onCreateIssueTemplate: (
        e: Parameters<NonNullable<React.ComponentProps<'form'>['onSubmit']>>[0],
      ) => {
        e.preventDefault();
        return createIssueTemplate();
      },
      onOpenRecurringIssue: () => {
        setIssueOptionsOpen(false);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setRecurringName(issue.title);
        setRecurringFirstDueDate(localDateValue(tomorrow));
        setRecurringInterval('1');
        setRecurringUnit('week');
        setRecurringOpen(true);
      },
      onCloseRecurringIssue: () => setRecurringOpen(false),
      onRecurringNameChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setRecurringName(e.target.value),
      onRecurringFirstDueDateChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setRecurringFirstDueDate(e.target.value),
      onRecurringIntervalChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setRecurringInterval(e.target.value),
      onRecurringUnitChange: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => setRecurringUnit(e.target.value as 'day' | 'week' | 'month' | 'year'),
      onCreateRecurringIssue: (
        e: Parameters<NonNullable<React.ComponentProps<'form'>['onSubmit']>>[0],
      ) => {
        e.preventDefault();
        return createRecurringIssue();
      },
      Show_description_history_onClick50: () => setHistoryRequest((current) => current + 1),
      onSetReminder: (kind: 'hour' | 'tomorrow' | 'week' | 'month' | 'cycle') => {
        const date = reminderPreset(kind);
        return date ? setReminder(date) : undefined;
      },
      onOpenCustomReminder: () => {
        setCustomReminderValue(
          formatLocalDateTime(issue.reminderAt) ||
            formatLocalDateTime(new Date(Date.now() + 60 * 60 * 1000).toISOString()),
        );
        setCustomReminderOpen(true);
        setIssueOptionsOpen(false);
      },
      onCloseCustomReminder: () => setCustomReminderOpen(false),
      onIssueOptionsChange: (opened: boolean) => setIssueOptionsOpen(opened),
      onCustomReminderChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setCustomReminderValue(e.target.value),
      onCustomReminderSave: () => {
        const value = new Date(customReminderValue);
        return Number.isNaN(value.getTime()) ? undefined : setReminder(value);
      },
      onClearReminder: () => setReminder(null),
      onClick18: (c: Issue) =>
        navigate({
          to: '/issues/$identifier',
          params: { identifier: c.identifier },
        }),
      onOpenSubIssueEditor: () => {
        setSubIssueEditorOpen(true);
        setFocusSub((n) => n + 1);
      },
      onCloseSubIssueEditor: () => {
        setSubIssueEditorOpen(false);
        setSubTitle('');
      },
      onCreateSubIssue: () => addSubIssue(),
      New_sub_issue_onChange19: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => setSubTitle(e.target.value),
      New_sub_issue_onKeyDown20: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onKeyDown']>>[0],
      ) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return;

        if (isSubmitShortcut(e)) {
          e.preventDefault();
          return addSubIssue();
        }
      },
      New_note_onChange21: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => setDraft(e.target.value),
      New_note_onKeyDown22: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onKeyDown']>>[0],
      ) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return;

        if (isCommentSubmitShortcut(e, preferences.commentSubmitShortcut)) {
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
