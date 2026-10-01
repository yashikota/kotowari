import { useNavigate, useRouter } from '@tanstack/react-router';
import type * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api.ts';
import { useIntent, useIntentHandler } from '../application/Root.tsx';
import { isSubmitShortcut } from '../keymap.ts';
import { workflowStatusCategory, useIssueWorkflow } from '../workflow.tsx';
import type { Issue, Project, RecurringIssue, RecurringIssueDraft } from '../types.ts';
import type { IssueCreateContext } from '../issue-list.ts';
import {
  deleteAllIssueDrafts,
  deleteIssueDraft,
  listIssueDrafts,
  saveIssueDraft,
  type IssueDraft,
} from '../issue-drafts.ts';
import { useIssueComposerParent } from './useIssueComposerParent.ts';
import { useIssueComposerAttachments } from './useIssueComposerAttachments.ts';
import { useIssueComposerLinks } from './useIssueComposerLinks.ts';
import { useIssueComposerMetadata } from './useIssueComposerMetadata.ts';

type IssueDraftDiscardRequest = { kind: 'draft'; id: string } | { kind: 'all' };

type Props = {
  open: boolean;
  setOpen: (open: boolean) => void;
  defaultIssueAssignee: '' | 'self';
  setProjects: (projects: Project[]) => void;
  setError: (message: string) => void;
};

function localDateValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function useShellIssueComposer({
  open,
  setOpen,
  defaultIssueAssignee,
  setProjects,
  setError,
}: Props) {
  const { t } = useTranslation();
  const send = useIntent();
  const navigate = useNavigate();
  const router = useRouter();
  const { statuses: issueWorkflowStatuses } = useIssueWorkflow();
  const [issueTitle, setIssueTitle] = useState('');
  const [issueSubmitting, setIssueSubmitting] = useState(false);
  const issueSubmissionInFlight = useRef(false);
  const [issueComposerExpanded, setIssueComposerExpanded] = useState(false);
  const [issueDraftId, setIssueDraftId] = useState('');
  const issueDraftIdRef = useRef('');
  const [issueDraftSaved, setIssueDraftSaved] = useState(false);
  const [issueCreateMore, setIssueCreateMore] = useState(false);
  const [issueCreateMoreFocusRequest, setIssueCreateMoreFocusRequest] = useState(0);
  const [issueStatus, setIssueStatus] = useState('todo');
  const [issuePriority, setIssuePriority] = useState(0);
  const [issueType, setIssueType] = useState<Issue['type'] | ''>('');
  const [issueEstimate, setIssueEstimate] = useState('');
  const [issueBody, setIssueBody] = useState('');
  const [skipDefaultTemplate, setSkipDefaultTemplate] = useState(false);
  const attachments = useIssueComposerAttachments();
  const issueLinks = useIssueComposerLinks();
  const [issueDueDate, setIssueDueDate] = useState('');
  const [issueDueDateOpen, setIssueDueDateOpen] = useState(false);
  const [issueRecurringOpen, setIssueRecurringOpen] = useState(false);
  const [issueRecurringFirstDueDate, setIssueRecurringFirstDueDate] = useState('');
  const [issueRecurringInterval, setIssueRecurringInterval] = useState('1');
  const [issueRecurringUnit, setIssueRecurringUnit] = useState<RecurringIssue['unit']>('week');
  const [issueLabelNames, setIssueLabelNames] = useState<string[]>([]);
  const issueParent = useIssueComposerParent(open);
  const metadata = useIssueComposerMetadata(open, setProjects);
  const issueTemplates = metadata.templates;
  const [issueTemplateSlug, setIssueTemplateSlug] = useState('');
  const [issueTemplatePickerRequested, setIssueTemplatePickerRequested] = useState(false);
  const availableLabels = metadata.labels;
  const [issueProjectId, setIssueProjectId] = useState('');
  const [issueCycleId, setIssueCycleId] = useState('');
  const [issueAssignee, setIssueAssignee] = useState<'self' | 'agent' | ''>(defaultIssueAssignee);
  const [issueDraftDiscardRequest, setIssueDraftDiscardRequest] =
    useState<IssueDraftDiscardRequest | null>(null);
  const [savedIssueDraft, setSavedIssueDraft] = useState<IssueDraft | null>(null);

  const saveCurrentIssueDraft = useCallback(() => {
    const title = issueTitle.trim();
    if (!title) return null;
    const now = new Date().toISOString();
    const currentDraftId = issueDraftIdRef.current || issueDraftId;
    const draft: IssueDraft = {
      id: currentDraftId || crypto.randomUUID(),
      title,
      body: issueBody,
      skipDefaultTemplate,
      status: issueStatus,
      priority: issuePriority,
      assignee: issueAssignee,
      type: issueType ?? '',
      estimate: issueEstimate,
      projectId: issueProjectId,
      cycleId: issueCycleId,
      dueDate: issueDueDate,
      labelNames: [...issueLabelNames],
      templateSlug: issueTemplateSlug,
      parentId: issueParent.id,
      parentIdentifier: issueParent.identifier,
      externalLinks: issueLinks.links.map((link) => ({ ...link })),
      recurringOpen: issueRecurringOpen,
      recurringFirstDueDate: issueRecurringFirstDueDate,
      recurringInterval: issueRecurringInterval,
      recurringUnit: issueRecurringUnit,
      createdAt: now,
      updatedAt: now,
    };
    saveIssueDraft(draft);
    if (!currentDraftId) {
      issueDraftIdRef.current = draft.id;
      setIssueDraftId(draft.id);
    }
    return draft;
  }, [
    issueAssignee,
    issueBody,
    skipDefaultTemplate,
    issueCycleId,
    issueDraftId,
    issueDueDate,
    issueEstimate,
    issueLabelNames,
    issueParent.id,
    issueParent.identifier,
    issuePriority,
    issueProjectId,
    issueRecurringFirstDueDate,
    issueRecurringInterval,
    issueRecurringOpen,
    issueRecurringUnit,
    issueStatus,
    issueTemplateSlug,
    issueTitle,
    issueType,
    issueLinks.links,
  ]);

  function closeCreateIssue() {
    if (issueSubmissionInFlight.current) return;
    saveCurrentIssueDraft();
    setIssueComposerExpanded(false);
    setIssueTemplatePickerRequested(false);
    setOpen(false);
  }

  function saveIssueDraftAndClose() {
    if (issueSubmissionInFlight.current) return;
    const draft = saveCurrentIssueDraft();
    if (!draft) return;
    setIssueDraftSaved(true);
    setIssueComposerExpanded(false);
    setOpen(false);
    setSavedIssueDraft(draft);
  }

  function confirmIssueDraftDiscard() {
    const request = issueDraftDiscardRequest;
    if (!request) return;

    const discardedCurrentDraft = request.kind === 'all' || request.id === issueDraftIdRef.current;
    if (request.kind === 'all') deleteAllIssueDrafts();
    else deleteIssueDraft(request.id);

    if (discardedCurrentDraft && open) {
      issueDraftIdRef.current = '';
      setIssueDraftId('');
      setIssueDraftSaved(false);
      setIssueTitle('');
      setIssueBody('');
      setIssueComposerExpanded(false);
      setOpen(false);
    }
    setSavedIssueDraft(null);
    setIssueDraftDiscardRequest(null);
  }

  useEffect(() => {
    if (!savedIssueDraft) return;
    const timeout = window.setTimeout(() => setSavedIssueDraft(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [savedIssueDraft]);

  useEffect(() => {
    if (open && issueTitle.trim()) saveCurrentIssueDraft();
  }, [open, issueTitle, saveCurrentIssueDraft]);

  function openCreateIssue(prefill: IssueCreateContext = {}) {
    if (issueSubmissionInFlight.current) return;
    metadata.prepare();
    setIssueTemplatePickerRequested(false);
    issueDraftIdRef.current = '';
    setIssueDraftId('');
    setIssueDraftSaved(false);
    setIssueComposerExpanded(false);
    setIssueCreateMore(false);
    setIssueTitle(prefill.title ?? '');
    setIssueBody(prefill.body ?? '');
    setSkipDefaultTemplate(prefill.skipDefaultTemplate === true);
    setIssueStatus(prefill.status ?? 'todo');
    setIssuePriority(prefill.priority ?? 0);
    setIssueType(prefill.type ?? '');
    setIssueEstimate(prefill.estimate == null ? '' : String(prefill.estimate));
    attachments.clear();
    setIssueDueDate('');
    setIssueDueDateOpen(false);
    setIssueRecurringOpen(false);
    setIssueRecurringFirstDueDate('');
    setIssueRecurringInterval('1');
    setIssueRecurringUnit('week');
    issueLinks.reset();
    setIssueLabelNames(prefill.labelNames ?? []);
    issueParent.reset(
      prefill.parent
        ? {
            id: prefill.parent.id,
            identifier: prefill.parent.identifier,
            open: true,
            selected: { kind: 'issue', id: prefill.parent.identifier, title: '' },
          }
        : undefined,
    );
    setIssueTemplateSlug('');
    setIssueProjectId(prefill.projectId ? String(prefill.projectId) : '');
    setIssueCycleId(prefill.cycleId ? String(prefill.cycleId) : '');
    setIssueAssignee(prefill.assignee ?? defaultIssueAssignee);
    setOpen(true);
  }

  function openCreateIssueFromTemplate() {
    openCreateIssue();
    setIssueTemplatePickerRequested(true);
  }

  function openCreateIssueFullscreen() {
    openCreateIssue();
    setIssueComposerExpanded(true);
  }

  useIntentHandler('issue.create', (value) => {
    openCreateIssue((value ?? {}) as IssueCreateContext);
  });
  useIntentHandler('issue.openDraft', (value) => {
    if (issueSubmissionInFlight.current) return;
    metadata.prepare();
    const draft = value as IssueDraft;
    issueDraftIdRef.current = draft.id;
    setIssueDraftId(draft.id);
    setIssueDraftSaved(true);
    setIssueComposerExpanded(false);
    setIssueTitle(draft.title);
    setIssueBody(draft.body);
    setSkipDefaultTemplate(draft.skipDefaultTemplate === true);
    setIssueStatus(draft.status);
    setIssuePriority(draft.priority);
    setIssueAssignee(draft.assignee);
    setIssueType(draft.type);
    setIssueEstimate(draft.estimate);
    setIssueProjectId(draft.projectId);
    setIssueCycleId(draft.cycleId);
    setIssueDueDate(draft.dueDate);
    setIssueDueDateOpen(Boolean(draft.dueDate));
    setIssueLabelNames([...draft.labelNames]);
    setIssueTemplateSlug(draft.templateSlug);
    issueParent.reset({
      id: draft.parentId,
      identifier: draft.parentIdentifier,
      open: Boolean(draft.parentId),
    });
    issueLinks.reset(draft.externalLinks);
    setIssueRecurringOpen(draft.recurringOpen);
    setIssueRecurringFirstDueDate(draft.recurringFirstDueDate);
    setIssueRecurringInterval(draft.recurringInterval);
    setIssueRecurringUnit(draft.recurringUnit);
    attachments.clear();
    setIssueCreateMore(false);
    setOpen(true);
  });
  useIntentHandler('issue.requestDiscardDraft', (value) => {
    const request = value as IssueDraftDiscardRequest;
    if (request.kind === 'all' || request.kind === 'draft') setIssueDraftDiscardRequest(request);
  });
  useIntentHandler('issue.createRecurring', (value) => {
    if (issueSubmissionInFlight.current) return;
    metadata.prepare();
    const draft = value as RecurringIssueDraft;
    const firstDueDate = localDateValue(new Date());
    issueDraftIdRef.current = '';
    setIssueDraftId('');
    setIssueDraftSaved(false);
    setIssueCreateMore(false);
    setIssueTitle(draft.title);
    setIssueBody(draft.body);
    setSkipDefaultTemplate(false);
    setIssueStatus(
      issueWorkflowStatuses.find((status) => status.category === 'backlog')?.id ?? 'backlog',
    );
    setIssuePriority(draft.priority);
    setIssueAssignee(draft.assignee ?? '');
    setIssueType('');
    setIssueEstimate('');
    attachments.clear();
    setIssueDueDate('');
    setIssueDueDateOpen(false);
    setIssueRecurringOpen(true);
    setIssueRecurringFirstDueDate(firstDueDate);
    setIssueRecurringInterval('1');
    setIssueRecurringUnit('week');
    issueLinks.reset(draft.links);
    setIssueLabelNames([]);
    issueParent.reset();
    setIssueTemplateSlug('');
    setIssueProjectId('');
    setIssueCycleId('');
    setOpen(true);
  });

  async function submitIssue() {
    if (issueSubmissionInFlight.current || !metadata.ready.current) return;
    const title = issueTitle.trim();
    if (!title || issueParent.loading || issueLinks.isOpen || attachments.error) return;
    const recurrenceInterval = Number(issueRecurringInterval);
    if (
      issueRecurringOpen &&
      (!issueRecurringFirstDueDate ||
        !Number.isInteger(recurrenceInterval) ||
        recurrenceInterval < 1 ||
        recurrenceInterval > 365)
    ) {
      return;
    }
    issueSubmissionInFlight.current = true;
    setIssueSubmitting(true);
    try {
      const createMore = issueCreateMore && !issueRecurringOpen;
      const issue: Issue = await api.createIssue({
        title,
        body: issueBody,
        skipDefaultTemplate,
        status: workflowStatusCategory(issueStatus, issueWorkflowStatuses),
        workflowStatus: issueStatus,
        assignee: issueAssignee || undefined,
        priority: issuePriority,
        type: issueType || undefined,
        estimate: issueEstimate ? Number(issueEstimate) : null,
        projectId: issueProjectId ? Number(issueProjectId) : undefined,
        cycleId: issueCycleId ? Number(issueCycleId) : undefined,
        labelIds: availableLabels
          .filter((label) => issueLabelNames.includes(label.name))
          .map((label) => label.id),
        dueDate: issueRecurringOpen ? undefined : issueDueDate || undefined,
        parentId: issueParent.id,
        links: issueLinks.links,
        templateSlug: issueTemplateSlug || undefined,
        recurring: issueRecurringOpen
          ? {
              name: title,
              firstDueDate: issueRecurringFirstDueDate,
              interval: recurrenceInterval,
              unit: issueRecurringUnit,
            }
          : undefined,
      });
      const submittedDraftId = issueDraftIdRef.current || issueDraftId;
      if (submittedDraftId) deleteIssueDraft(submittedDraftId);
      issueDraftIdRef.current = '';
      setIssueDraftId('');
      setIssueDraftSaved(false);
      const attachmentUploadFailed = await attachments.upload(issue.identifier);
      setIssueTitle('');
      setIssueBody('');
      attachments.clear();
      setIssueDueDate('');
      setIssueDueDateOpen(false);
      setIssueRecurringOpen(false);
      setIssueRecurringFirstDueDate('');
      setIssueRecurringInterval('1');
      setIssueRecurringUnit('week');
      issueLinks.reset();
      issueParent.reset();
      setIssueStatus('todo');
      setIssuePriority(0);
      setIssueType('');
      setIssueEstimate('');
      setIssueLabelNames([]);
      setIssueTemplateSlug('');
      setIssueProjectId('');
      setIssueCycleId('');
      setIssueAssignee(defaultIssueAssignee);
      if (createMore) setIssueCreateMoreFocusRequest((request) => request + 1);
      else {
        setIssueCreateMore(false);
        setIssueComposerExpanded(false);
        setOpen(false);
      }
      if (attachmentUploadFailed) setError(t('issueAttachments.issueUploadFailed'));
      await router.invalidate();
      if (createMore) return;
      await navigate({
        to: '/issues/$identifier',
        params: { identifier: issue.identifier },
        state: { autofocus: 'title' },
      });
    } finally {
      issueSubmissionInFlight.current = false;
      setIssueSubmitting(false);
    }
  }
  useIntentHandler('submit:Issue', submitIssue);

  return {
    openCreateIssue,
    openCreateIssueFromTemplate,
    openCreateIssueFullscreen,
    closeCreateIssue,
    data: {
      issueTitle,
      issueComposerExpanded,
      issueDraftId,
      issueDraftSaved,
      savedIssueDraft,
      issueDraftDiscardRequest,
      issueCreateMore,
      issueCreateMoreFocusRequest,
      issueStatus,
      issueWorkflowStatuses,
      issuePriority,
      issueAssignee,
      issueType,
      issueEstimate,
      issueBody,
      skipDefaultTemplate,
      issueAttachments: attachments.files,
      issueAttachmentError: attachments.error,
      issueDueDate,
      issueDueDateOpen,
      issueRecurringOpen,
      issueRecurringFirstDueDate,
      issueRecurringInterval,
      issueRecurringUnit,
      issueSubmitting,
      issueMetadataPhase: metadata.phase,
      issueSubmitDisabled:
        issueSubmitting ||
        metadata.phase !== 'ready' ||
        issueParent.loading ||
        issueLinks.isOpen ||
        Boolean(attachments.error) ||
        (issueRecurringOpen &&
          (!issueRecurringFirstDueDate ||
            !Number.isInteger(Number(issueRecurringInterval)) ||
            Number(issueRecurringInterval) < 1 ||
            Number(issueRecurringInterval) > 365)),
      issueExternalLinks: issueLinks.links,
      issueLinkOpen: issueLinks.isOpen,
      issueLinkURL: issueLinks.url,
      issueLinkTitle: issueLinks.title,
      issueParentIdentifier: issueParent.identifier,
      issueParentOpen: issueParent.isOpen,
      issueParentQuery: issueParent.query,
      issueParentLoading: issueParent.loading,
      issueParentOptions: issueParent.options,
      issueLabelNames,
      issueTemplates,
      issueTemplateSlug,
      issueTemplatePickerRequested,
      availableLabels,
      issueProjectId,
      issueCycleId,
    },
    handlers: {
      submitIssue: () => send('submit:Issue'),
      onComposerCreateMoreChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setIssueCreateMore(e.target.checked),
      onRetryIssueMetadata: metadata.prepare,
      onCreateIssue: () => openCreateIssue(),
      onSaveIssueDraft: saveIssueDraftAndClose,
      onRequestDiscardCurrentDraft: () => {
        const id = issueDraftIdRef.current || issueDraftId;
        if (id) send('issue.requestDiscardDraft', { kind: 'draft', id });
      },
      onOpenSavedIssueDraft: () => {
        if (!savedIssueDraft) return;
        const draft = listIssueDrafts().find((candidate) => candidate.id === savedIssueDraft.id);
        setSavedIssueDraft(null);
        if (draft) send('issue.openDraft', draft);
      },
      onDismissSavedIssueDraft: () => setSavedIssueDraft(null),
      onCancelIssueDraftDiscard: () => setIssueDraftDiscardRequest(null),
      onConfirmIssueDraftDiscard: confirmIssueDraftDiscard,
      onCloseCreateIssue: closeCreateIssue,
      onToggleIssueComposerExpanded: () => setIssueComposerExpanded((expanded) => !expanded),
      onComposerTitleChange: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => setIssueTitle(e.target.value),
      onComposerTitleKeyDown: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onKeyDown']>>[0],
      ) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return;
        if (isSubmitShortcut(e)) {
          e.preventDefault();
          return send('submit:Issue');
        }
      },
      onComposerStatusChange: (value: string | null) => setIssueStatus(value ?? 'todo'),
      onComposerPriorityChange: (value: string | null) => setIssuePriority(Number(value ?? '0')),
      onComposerTemplateChange: (slug: string | null) => {
        const template = issueTemplates.find((candidate) => candidate.slug === slug);
        setIssueTemplateSlug(template?.slug ?? '');
        if (!template) {
          setIssueTitle('');
          setIssueBody('');
          setIssueStatus('todo');
          setIssuePriority(0);
          setIssueAssignee(defaultIssueAssignee);
          setIssueType('');
          setIssueEstimate('');
          setIssueLabelNames([]);
          return;
        }
        setIssueTitle(template.title);
        setIssueBody(template.body);
        setIssueStatus(template.status);
        setIssuePriority(template.priority);
        setIssueAssignee(template.assignee ?? '');
        setIssueType(template.type ?? '');
        setIssueEstimate(template.estimate == null ? '' : String(template.estimate));
        const available = new Set(availableLabels.map((label) => label.name));
        setIssueLabelNames(template.labels.filter((name) => available.has(name)));
      },
      onComposerBodyChange: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => setIssueBody(e.target.value),
      onComposerDueDateChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setIssueDueDate(e.target.value),
      onOpenIssueDueDate: () => setIssueDueDateOpen(true),
      onOpenIssueParent: issueParent.onOpen,
      onEnableIssueRecurring: () => {
        const firstDueDate = new Date();
        firstDueDate.setDate(firstDueDate.getDate() + 6);
        setIssueRecurringFirstDueDate(localDateValue(firstDueDate));
        setIssueRecurringInterval('1');
        setIssueRecurringUnit('week');
        setIssueRecurringOpen(true);
      },
      onClearIssueRecurring: () => setIssueRecurringOpen(false),
      onIssueRecurringFirstDueDateChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setIssueRecurringFirstDueDate(e.target.value),
      onIssueRecurringIntervalChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setIssueRecurringInterval(e.target.value),
      onIssueRecurringUnitChange: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => setIssueRecurringUnit(e.target.value as RecurringIssue['unit']),
      onOpenIssueLink: issueLinks.open,
      onCloseIssueLink: issueLinks.close,
      onIssueLinkURLChange: issueLinks.onURLChange,
      onIssueLinkTitleChange: issueLinks.onTitleChange,
      onAddIssueLink: issueLinks.add,
      onRemoveIssueLink: issueLinks.remove,
      onComposerParentSearchChange: issueParent.onQueryChange,
      onComposerParentChange: issueParent.onChange,
      onComposerTypeChange: (value: string | null) =>
        setIssueType(value && value !== 'none' ? (value as Issue['type']) : ''),
      onComposerEstimateChange: (value: string | null) =>
        setIssueEstimate(value && value !== 'none' ? value : ''),
      onComposerLabelsChange: (values: string[]) => setIssueLabelNames(values),
      onComposerAttachmentsChange: attachments.onChange,
      onComposerProjectChange: (value: string | null) =>
        setIssueProjectId(value && value !== 'none' ? value : ''),
      onComposerAssigneeChange: (value: string | null) =>
        setIssueAssignee(value === 'self' || value === 'agent' ? value : ''),
      onComposerCycleChange: (value: string | null) =>
        setIssueCycleId(value && value !== 'none' ? value : ''),
    },
  };
}
