import { isSubmitShortcut } from '../keymap.ts';
import { useNavigate, useRouter } from '@tanstack/react-router';
import type * as React from 'react';
import { useState, useSyncExternalStore } from 'react';
import { api } from '../api.ts';
import {
  issueBranchName,
  issueMarkdown,
  renderIssuePrompt,
  selectedIssuesAgentPrompt,
} from '../issue-actions.ts';
import { setPendingAgentPrompt } from '../agent-prompt.ts';
import { buildCodingToolURL, useCodingToolPreferences } from '../coding-tools.ts';
import { signals } from '../application/mediator.ts';
import { useIntent } from '../application/Root.tsx';
import i18n from '../i18n/index.ts';
import type { ADR, IssueLink, Label } from '../types.ts';
import { useProjectWorkflow, projectWorkflowStatusCategory } from '../project-workflow.tsx';
import { usePersonalPreferences } from '../preferences.ts';
import { useIssueWorkflow } from '../workflow.tsx';
import { autoAssignOnStartedTransition } from '../application/issue-assignment.ts';
import { issueSubscriptions } from '../issue-subscriptions.ts';
import { LABEL_COLORS } from '../label-colors.ts';
import { useIssueDetailData } from './useIssueDetailData.ts';
import { useIssueDetailRelations } from './useIssueDetailRelations.ts';
import { useIssueDetailTimeline } from './useIssueDetailTimeline.ts';

const ISSUE_PROPERTY_VISIBILITY_KEY = 'kotowari.issue-property-visibility.v1';

export type IssueOptionalProperty = 'dueDate' | 'milestone' | 'parent' | 'type';
export type IssuePropertyMenu = 'status' | 'priority' | 'labels' | 'estimate' | null;
type OptionalPropertyOverrides = Record<string, Partial<Record<IssueOptionalProperty, boolean>>>;

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
  const { statuses: issueWorkflowStatuses } = useIssueWorkflow();
  const { preferences } = usePersonalPreferences();
  const { preferences: codingToolPreferences } = useCodingToolPreferences();
  const navigate = useNavigate();
  const router = useRouter();
  const navigationIndex = navigationIds.indexOf(identifier);
  const [error, setError] = useState('');
  const issueData = useIssueDetailData(identifier, (loadError) =>
    setError(loadError instanceof Error ? loadError.message : 'load failed'),
  );
  const timelineState = useIssueDetailTimeline({
    identifier,
    commentSubmitShortcut: preferences.commentSubmitShortcut,
    convertEmoticons: preferences.convertEmoticons,
    setIssue: issueData.setIssue,
    setLoadError: setError,
  });
  const {
    issue,
    setIssue,
    issues,
    projects,
    cycles,
    pages,
    labels,
    setLabels,
    adrs,
    timeZone,
    reload: reloadData,
  } = issueData;
  const {
    data: timelineData,
    reload: reloadTimeline,
    refreshActivities,
    handlers: timelineHandlers,
  } = timelineState;
  async function reload() {
    await Promise.all([reloadData(), reloadTimeline()]);
  }
  const isSubscribed = useSyncExternalStore(
    issueSubscriptions.subscribe,
    () => issueSubscriptions.has(identifier),
    () => false,
  );
  const [labelName, setLabelName] = useState('');
  const [focusLabel, setFocusLabel] = useState(0);
  const [adrPick, setAdrPick] = useState('');
  const [externalLinkURL, setExternalLinkURL] = useState('');
  const [externalLinkTitle, setExternalLinkTitle] = useState('');
  const [externalLinkKind, setExternalLinkKind] = useState<IssueLink['kind']>('link');
  const [externalLinkOpen, setExternalLinkOpen] = useState(false);
  const [resourcesCollapsed, setResourcesCollapsed] = useState(false);
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [dueDateValue, setDueDateValue] = useState('');
  const [copied, setCopied] = useState(false);
  const [historyRequest, setHistoryRequest] = useState(0);
  const [descriptionFocus, setDescriptionFocus] = useState({ identifier, request: 0 });
  const descriptionFocusRequest =
    descriptionFocus.identifier === identifier ? descriptionFocus.request : 0;
  const [optionalPropertyOverrides, setOptionalPropertyOverrides] =
    useState<OptionalPropertyOverrides>(readOptionalPropertyOverrides);
  const [customReminderOpen, setCustomReminderOpen] = useState(false);
  const [customReminderValue, setCustomReminderValue] = useState('');
  const [issueOptionsOpen, setIssueOptionsOpen] = useState(false);
  const [reminderMenuOpen, setReminderMenuOpen] = useState(false);
  const [issuePropertyMenu, setIssuePropertyMenu] = useState<IssuePropertyMenu>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [projectConversionOpen, setProjectConversionOpen] = useState(false);
  const [projectConversionName, setProjectConversionName] = useState('');
  const [projectConversionDescription, setProjectConversionDescription] = useState('');
  const [projectConversionStatus, setProjectConversionStatus] = useState('planned');
  const [projectConversionPriority, setProjectConversionPriority] = useState(0);
  const [projectConversionStartDate, setProjectConversionStartDate] = useState('');
  const [projectConversionTargetDate, setProjectConversionTargetDate] = useState('');

  const relationsState = useIssueDetailRelations({
    identifier,
    issue,
    issues,
    reload,
    onCloseIssueOptions: () => setIssueOptionsOpen(false),
  });
  const { data: relationsData, handlers: relationsHandlers } = relationsState;

  async function patch(body: Record<string, unknown>) {
    const adjustedBody = issue
      ? autoAssignOnStartedTransition(
          issue,
          body,
          issueWorkflowStatuses,
          preferences.autoAssignOnStart,
        )
      : body;
    const next = await api.patchIssue(identifier, adjustedBody);
    setIssue(next);
    await refreshActivities();
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
  const issueURL =
    typeof window === 'undefined'
      ? `/issues/${encodeURIComponent(identifier)}`
      : new URL(`/issues/${encodeURIComponent(identifier)}`, window.location.origin).href;
  const codingToolURL = buildCodingToolURL(issue, codingToolPreferences, issueURL);
  const linkedAdrs = adrs.filter((a) => (issue.adrNumbers ?? []).includes(a.number));
  const unlinkedAdrs = adrs.filter((a) => !(issue.adrNumbers ?? []).includes(a.number));

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

  function openLinkedCode() {
    if (!issue) return;
    const pullRequest = issue.externalLinks.find((link) => link.kind === 'pullRequest');
    const githubIssue = issue.externalLinks.find((link) => {
      if (link.kind !== 'link') return false;
      try {
        const url = new URL(link.url);
        return (
          url.protocol === 'https:' &&
          url.hostname.toLowerCase() === 'github.com' &&
          /^\/[^/]+\/[^/]+\/issues\/\d+(?:\/|$)/i.test(url.pathname)
        );
      } catch {
        return false;
      }
    });
    const candidate = pullRequest ?? githubIssue;
    if (!candidate) return;
    try {
      const url = new URL(candidate.url);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
      window.open(url.href, '_blank', 'noopener,noreferrer');
    } catch {
      // Ignore malformed links rather than turning a keyboard shortcut into navigation.
    }
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

  return {
    _view: 2 as const,
    identifier,
    navigationPosition: navigationIndex >= 0 ? navigationIndex + 1 : 1,
    navigationTotal: navigationIds.length,
    issueReturnTo,
    issue,
    isSubscribed,
    issuePropertyMenu,
    optionalIssuePropertyVisibility,
    issues,
    ...timelineData,
    ...relationsData,
    projects,
    milestones,
    cycles,
    pages,
    labels,
    adrs,
    labelName,
    focusLabel,
    adrPick,
    externalLinkURL,
    externalLinkTitle,
    externalLinkKind,
    externalLinkOpen,
    resourcesCollapsed,
    dueDateOpen,
    dueDateValue,
    codingToolName: codingToolPreferences.customLinkName,
    codingToolURL,
    timeZone,
    copied,
    historyRequest,
    descriptionFocusRequest,
    customReminderOpen,
    customReminderValue,
    issueOptionsOpen,
    reminderMenuOpen,
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
    due,
    hasUpcomingCycle: cycles.some((cycle) => new Date(cycle.startsAt) > new Date()),
    selectedLabelIds,
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
      onOpenIssuePropertyMenu: (property: IssuePropertyMenu) => setIssuePropertyMenu(property),
      onCloseIssuePropertyMenu: () => setIssuePropertyMenu(null),
      onToggleIssuePropertyMenu: (property: Exclude<IssuePropertyMenu, null>) =>
        setIssuePropertyMenu((current) => (current === property ? null : property)),
      onFocusDescription: () =>
        setDescriptionFocus((current) => ({
          identifier,
          request: current.identifier === identifier ? current.request + 1 : 1,
        })),
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
      onToggleIssueLabel: (label: Label) => {
        const isSelected = issue.labels.some((current) => current.id === label.id);
        const next = isSelected
          ? issue.labels.filter((current) => current.id !== label.id).map((current) => current.id)
          : [...issue.labels.map((current) => current.id), label.id];
        return patch({ labelIds: next });
      },
      onLabelQueryChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setLabelName(e.target.value),
      onLabelQueryKeyDown: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onKeyDown']>>[0],
      ) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return;

        if (isSubmitShortcut(e)) {
          e.preventDefault();
          return addLabel();
        }
      },
      onCreateLabel: () => addLabel(),
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
      Open_linked_code_onClick: () => openLinkedCode(),
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
      onToggleFavorite: async () => {
        await patch({ isFavorite: !issue.isFavorite });
        signals.dispatchEvent(new Event('kotowari:refresh'));
      },
      Subscription_onClick: () => issueSubscriptions.toggle(identifier),
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
      onOpenIssueAgentPage: () => {
        setPendingAgentPrompt(selectedIssuesAgentPrompt([issue], window.location.origin));
        return navigate({ to: '/agent' });
      },
      onOpenCodingTool: () => {
        if (codingToolURL) window.open(codingToolURL, '_blank', 'noopener,noreferrer');
      },
      onOpenCodingToolSettings: () => navigate({ to: '/config' }),
      Make_copy_onClick42: () => makeCopy(),
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
        return sendIntent('issue.createRecurring', {
          title: issue.title,
          body: issue.body,
          priority: issue.priority,
          assignee: issue.assignee,
          links: issue.externalLinks.map(({ url, title, kind }) => ({ url, title, kind })),
        });
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
      onOpenIssueReminderMenu: () => {
        setIssueOptionsOpen(true);
        setReminderMenuOpen(true);
      },
      onReminderMenuChange: (opened: boolean) => setReminderMenuOpen(opened),
      onIssueOptionsChange: (opened: boolean) => {
        setIssueOptionsOpen(opened);
        if (!opened) setReminderMenuOpen(false);
      },
      onCustomReminderChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setCustomReminderValue(e.target.value),
      onCustomReminderSave: () => {
        const value = new Date(customReminderValue);
        return Number.isNaN(value.getTime()) ? undefined : setReminder(value);
      },
      onClearReminder: () => setReminder(null),
      ...relationsHandlers,
      ...timelineHandlers,
    },
  };
}
