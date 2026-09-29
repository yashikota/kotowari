import { useNavigate, useRouter } from '@tanstack/react-router';
import type * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api.ts';
import { useIntent, useIntentHandler } from '../application/Root.tsx';
import { isSubmitShortcut } from '../keymap.ts';
import { workflowStatusCategory, useIssueWorkflow } from '../workflow.tsx';
import type {
  Issue,
  IssueLink,
  IssueTemplate,
  Label,
  Project,
  RecurringIssue,
  RecurringIssueDraft,
} from '../types.ts';
import type { IssueCreateContext } from '../issue-list.ts';
import {
  deleteAllIssueDrafts,
  deleteIssueDraft,
  listIssueDrafts,
  saveIssueDraft,
  type IssueDraft,
} from '../issue-drafts.ts';
import { useIssueComposerParent } from './useIssueComposerParent.ts';

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
  const [issueAttachments, setIssueAttachments] = useState<File[]>([]);
  const [issueAttachmentError, setIssueAttachmentError] = useState('');
  const [issueDueDate, setIssueDueDate] = useState('');
  const [issueDueDateOpen, setIssueDueDateOpen] = useState(false);
  const [issueRecurringOpen, setIssueRecurringOpen] = useState(false);
  const [issueRecurringFirstDueDate, setIssueRecurringFirstDueDate] = useState('');
  const [issueRecurringInterval, setIssueRecurringInterval] = useState('1');
  const [issueRecurringUnit, setIssueRecurringUnit] = useState<RecurringIssue['unit']>('week');
  const [issueExternalLinks, setIssueExternalLinks] = useState<
    Pick<IssueLink, 'url' | 'title' | 'kind'>[]
  >([]);
  const [issueLinkOpen, setIssueLinkOpen] = useState(false);
  const [issueLinkURL, setIssueLinkURL] = useState('');
  const [issueLinkTitle, setIssueLinkTitle] = useState('');
  const [issueLabelNames, setIssueLabelNames] = useState<string[]>([]);
  const issueParent = useIssueComposerParent(open);
  const [issueTemplates, setIssueTemplates] = useState<IssueTemplate[]>([]);
  const [issueTemplateSlug, setIssueTemplateSlug] = useState('');
  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);
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
      externalLinks: issueExternalLinks.map((link) => ({ ...link })),
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
    issueCycleId,
    issueDraftId,
    issueDueDate,
    issueEstimate,
    issueExternalLinks,
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
  ]);

  function closeCreateIssue() {
    saveCurrentIssueDraft();
    setOpen(false);
  }

  function saveIssueDraftAndClose() {
    const draft = saveCurrentIssueDraft();
    if (!draft) return;
    setIssueDraftSaved(true);
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

  useEffect(() => {
    if (!open) return;
    void Promise.all([api.projects(), api.issueTemplates(), api.labels()])
      .then(([nextProjects, templates, nextLabels]) => {
        setProjects(nextProjects);
        setIssueTemplates(templates);
        setAvailableLabels(nextLabels);
      })
      .catch(() => {
        setProjects([]);
        setIssueTemplates([]);
        setAvailableLabels([]);
      });
  }, [open, setProjects]);

  function openCreateIssue(prefill: IssueCreateContext = {}) {
    issueDraftIdRef.current = '';
    setIssueDraftId('');
    setIssueDraftSaved(false);
    setIssueCreateMore(false);
    setIssueTitle('');
    setIssueBody('');
    setIssueStatus(prefill.status ?? 'todo');
    setIssuePriority(prefill.priority ?? 0);
    setIssueType(prefill.type ?? '');
    setIssueEstimate(prefill.estimate == null ? '' : String(prefill.estimate));
    setIssueAttachments([]);
    setIssueAttachmentError('');
    setIssueDueDate('');
    setIssueDueDateOpen(false);
    setIssueRecurringOpen(false);
    setIssueRecurringFirstDueDate('');
    setIssueRecurringInterval('1');
    setIssueRecurringUnit('week');
    setIssueExternalLinks([]);
    setIssueLinkOpen(false);
    setIssueLinkURL('');
    setIssueLinkTitle('');
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

  useIntentHandler('issue.create', (value) => {
    openCreateIssue((value ?? {}) as IssueCreateContext);
  });
  useIntentHandler('issue.openDraft', (value) => {
    const draft = value as IssueDraft;
    issueDraftIdRef.current = draft.id;
    setIssueDraftId(draft.id);
    setIssueDraftSaved(true);
    setIssueTitle(draft.title);
    setIssueBody(draft.body);
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
    setIssueExternalLinks(draft.externalLinks.map((link) => ({ ...link })));
    setIssueRecurringOpen(draft.recurringOpen);
    setIssueRecurringFirstDueDate(draft.recurringFirstDueDate);
    setIssueRecurringInterval(draft.recurringInterval);
    setIssueRecurringUnit(draft.recurringUnit);
    setIssueAttachments([]);
    setIssueAttachmentError('');
    setIssueCreateMore(false);
    setOpen(true);
  });
  useIntentHandler('issue.requestDiscardDraft', (value) => {
    const request = value as IssueDraftDiscardRequest;
    if (request.kind === 'all' || request.kind === 'draft') setIssueDraftDiscardRequest(request);
  });
  useIntentHandler('issue.createRecurring', (value) => {
    const draft = value as RecurringIssueDraft;
    const firstDueDate = localDateValue(new Date());
    issueDraftIdRef.current = '';
    setIssueDraftId('');
    setIssueDraftSaved(false);
    setIssueCreateMore(false);
    setIssueTitle(draft.title);
    setIssueBody(draft.body);
    setIssueStatus(
      issueWorkflowStatuses.find((status) => status.category === 'backlog')?.id ?? 'backlog',
    );
    setIssuePriority(draft.priority);
    setIssueAssignee(draft.assignee ?? '');
    setIssueType('');
    setIssueEstimate('');
    setIssueAttachments([]);
    setIssueAttachmentError('');
    setIssueDueDate('');
    setIssueDueDateOpen(false);
    setIssueRecurringOpen(true);
    setIssueRecurringFirstDueDate(firstDueDate);
    setIssueRecurringInterval('1');
    setIssueRecurringUnit('week');
    setIssueExternalLinks(draft.links);
    setIssueLinkOpen(false);
    setIssueLinkURL('');
    setIssueLinkTitle('');
    setIssueLabelNames([]);
    issueParent.reset();
    setIssueTemplateSlug('');
    setIssueProjectId('');
    setIssueCycleId('');
    setOpen(true);
  });

  async function submitIssue() {
    const title = issueTitle.trim();
    if (!title || issueParent.loading || issueLinkOpen || issueAttachmentError) return;
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
    const createMore = issueCreateMore && !issueRecurringOpen;
    const issue: Issue = await api.createIssue({
      title,
      body: issueBody,
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
      links: issueExternalLinks,
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
    let attachmentUploadFailed = false;
    if (issueAttachments.length > 0) {
      try {
        await api.addIssueAttachments(issue.identifier, issueAttachments);
      } catch {
        attachmentUploadFailed = true;
      }
    }
    setIssueTitle('');
    setIssueBody('');
    setIssueAttachments([]);
    setIssueAttachmentError('');
    setIssueDueDate('');
    setIssueDueDateOpen(false);
    setIssueRecurringOpen(false);
    setIssueRecurringFirstDueDate('');
    setIssueRecurringInterval('1');
    setIssueRecurringUnit('week');
    setIssueExternalLinks([]);
    setIssueLinkOpen(false);
    setIssueLinkURL('');
    setIssueLinkTitle('');
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
  }
  useIntentHandler('submit:Issue', submitIssue);

  return {
    openCreateIssue,
    closeCreateIssue,
    data: {
      issueTitle,
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
      issueAttachments,
      issueAttachmentError,
      issueDueDate,
      issueDueDateOpen,
      issueRecurringOpen,
      issueRecurringFirstDueDate,
      issueRecurringInterval,
      issueRecurringUnit,
      issueSubmitDisabled:
        issueParent.loading ||
        issueLinkOpen ||
        Boolean(issueAttachmentError) ||
        (issueRecurringOpen &&
          (!issueRecurringFirstDueDate ||
            !Number.isInteger(Number(issueRecurringInterval)) ||
            Number(issueRecurringInterval) < 1 ||
            Number(issueRecurringInterval) > 365)),
      issueExternalLinks,
      issueLinkOpen,
      issueLinkURL,
      issueLinkTitle,
      issueParentIdentifier: issueParent.identifier,
      issueParentOpen: issueParent.isOpen,
      issueParentQuery: issueParent.query,
      issueParentLoading: issueParent.loading,
      issueParentOptions: issueParent.options,
      issueLabelNames,
      issueTemplates,
      issueTemplateSlug,
      availableLabels,
      issueProjectId,
      issueCycleId,
    },
    handlers: {
      submitIssue: () => send('submit:Issue'),
      Issue_createMore_onChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setIssueCreateMore(e.target.checked),
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
      onClick10: closeCreateIssue,
      Create_issue_onClick11: (
        e: Parameters<NonNullable<React.ComponentProps<'div'>['onClick']>>[0],
      ) => e.stopPropagation(),
      Issue_title_onChange12: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => setIssueTitle(e.target.value),
      Issue_title_onKeyDown13: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onKeyDown']>>[0],
      ) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return;
        if (isSubmitShortcut(e)) {
          e.preventDefault();
          return send('submit:Issue');
        }
      },
      Issue_status_onChange14: (value: string | null) => setIssueStatus(value ?? 'todo'),
      Issue_priority_onChange15: (value: string | null) => setIssuePriority(Number(value ?? '0')),
      Issue_template_onChange30: (slug: string | null) => {
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
      Issue_body_onChange31: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => setIssueBody(e.target.value),
      Issue_dueDate_onChange35: (
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
      onOpenIssueLink: () => {
        setIssueLinkURL('');
        setIssueLinkTitle('');
        setIssueLinkOpen(true);
      },
      onCloseIssueLink: () => setIssueLinkOpen(false),
      onIssueLinkURLChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setIssueLinkURL(e.target.value),
      onIssueLinkTitleChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setIssueLinkTitle(e.target.value),
      onAddIssueLink: (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const url = issueLinkURL.trim();
        if (!url || issueExternalLinks.some((link) => link.url === url)) return;
        setIssueExternalLinks((current) => [
          ...current,
          {
            url,
            ...(issueLinkTitle.trim() ? { title: issueLinkTitle.trim() } : {}),
            kind: 'link' as const,
          },
        ]);
        setIssueLinkOpen(false);
        setIssueLinkURL('');
        setIssueLinkTitle('');
      },
      onRemoveIssueLink: (url: string) =>
        setIssueExternalLinks((current) => current.filter((link) => link.url !== url)),
      Issue_parentSearch_onChange36: issueParent.onQueryChange,
      Issue_parent_onChange37: issueParent.onChange,
      Issue_type_onChange32: (value: string | null) =>
        setIssueType(value && value !== 'none' ? (value as Issue['type']) : ''),
      Issue_estimate_onChange33: (value: string | null) =>
        setIssueEstimate(value && value !== 'none' ? value : ''),
      Issue_labels_onChange34: (values: string[]) => setIssueLabelNames(values),
      Issue_attachments_onChange: (files: File[]) => {
        if (files.length > 10) {
          setIssueAttachments([]);
          setIssueAttachmentError(t('issueAttachments.tooMany'));
          return;
        }
        if (files.some((file) => file.size === 0)) {
          setIssueAttachments([]);
          setIssueAttachmentError(t('issueAttachments.emptyFile'));
          return;
        }
        if (files.some((file) => file.size > 20 * 1024 * 1024)) {
          setIssueAttachments([]);
          setIssueAttachmentError(t('issueAttachments.tooLarge'));
          return;
        }
        setIssueAttachments(files);
        setIssueAttachmentError('');
      },
      Issue_project_onChange16: (value: string | null) =>
        setIssueProjectId(value && value !== 'none' ? value : ''),
      Issue_assignee_onChange: (value: string | null) =>
        setIssueAssignee(value === 'self' || value === 'agent' ? value : ''),
      Issue_cycle_onChange17: (value: string | null) =>
        setIssueCycleId(value && value !== 'none' ? value : ''),
    },
  };
}
