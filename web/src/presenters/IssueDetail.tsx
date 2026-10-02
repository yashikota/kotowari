import { useNavigate, useRouter } from '@tanstack/react-router';
import { useRef, useState, useSyncExternalStore } from 'react';
import { api } from '../api.ts';
import { patchIssueOptimistically } from '../application/issues.ts';
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
import { usePersonalPreferences } from '../preferences.ts';
import { useIssueWorkflow } from '../workflow.tsx';
import { autoAssignOnStartedTransition } from '../application/issue-assignment.ts';
import { issueSubscriptions } from '../issue-subscriptions.ts';
import { useIssueDetailData } from './useIssueDetailData.ts';
import { useIssueDetailDueDate } from './useIssueDetailDueDate.ts';
import { useIssueDetailConversions } from './useIssueDetailConversions.ts';
import { useIssueDetailLabels } from './useIssueDetailLabels.ts';
import { useIssueDetailProperties } from './useIssueDetailProperties.ts';
import { useIssueDetailRelations } from './useIssueDetailRelations.ts';
import { useIssueDetailReminders } from './useIssueDetailReminders.ts';
import { useIssueDetailResources } from './useIssueDetailResources.ts';
import { useIssueDetailTimeline } from './useIssueDetailTimeline.ts';
import { useIssueDetailTemplateApply } from './useIssueDetailTemplateApply.ts';

export type { IssueOptionalProperty, IssuePropertyMenu } from '../issue-property-model.ts';

type Props = {
  identifier: string;
  navigationIds?: string[];
  issueReturnTo?: string;
  issueListFind?: string;
  issueListSelectedId?: string | null;
  issueListScrollTop?: number;
  issueListLayout?: 'list' | 'board';
};

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
  const currentIdentifier = useRef(identifier);
  const titleDraft = useRef<{ identifier: string; title: string } | null>(null);
  currentIdentifier.current = identifier;
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
  const [copied, setCopied] = useState(false);
  const [historyRequest, setHistoryRequest] = useState(0);
  const [descriptionFocus, setDescriptionFocus] = useState({ identifier, request: 0 });
  const descriptionFocusRequest =
    descriptionFocus.identifier === identifier ? descriptionFocus.request : 0;
  const [issueOptionsOpen, setIssueOptionsOpen] = useState(false);

  const relationsState = useIssueDetailRelations({
    identifier,
    issue,
    issues,
    reload,
    onCloseIssueOptions: () => setIssueOptionsOpen(false),
  });
  const { data: relationsData, handlers: relationsHandlers } = relationsState;
  const resourcesState = useIssueDetailResources({
    identifier,
    issue,
    adrs: issueData.adrs,
    reload,
    onCloseIssueOptions: () => setIssueOptionsOpen(false),
  });
  const { data: resourcesData, handlers: resourcesHandlers } = resourcesState;

  async function patch(body: Record<string, unknown>) {
    const adjustedBody = issue
      ? autoAssignOnStartedTransition(
          issue,
          body,
          issueWorkflowStatuses,
          preferences.autoAssignOnStart,
        )
      : body;
    const next = await patchIssueOptimistically(identifier, adjustedBody);
    if (currentIdentifier.current !== identifier) return;
    const draft = titleDraft.current;
    if (draft?.identifier === identifier && body.title === draft.title) titleDraft.current = null;
    setIssue(
      titleDraft.current?.identifier === identifier
        ? { ...next, title: titleDraft.current.title }
        : next,
    );
    // The write is confirmed even if refreshing its activity feed fails.
    await refreshActivities().catch(() => undefined);
  }

  const labelsState = useIssueDetailLabels({ issue, labels, setLabels, patch });
  const { data: labelsData, handlers: labelsHandlers } = labelsState;
  const propertiesState = useIssueDetailProperties({
    identifier,
    issue,
    setIssue,
    patch,
    onTitleDraftChange: (title) => {
      titleDraft.current = { identifier, title };
    },
  });
  const { data: propertiesData, handlers: propertiesHandlers } = propertiesState;

  const dueDateState = useIssueDetailDueDate({
    issue,
    cycles,
    patch,
    onCloseIssueOptions: () => setIssueOptionsOpen(false),
  });
  const { data: dueDateData, handlers: dueDateHandlers } = dueDateState;
  const remindersState = useIssueDetailReminders({
    issue,
    cycles,
    patch,
    setIssueOptionsOpen,
  });
  const { data: remindersData, handlers: remindersHandlers } = remindersState;
  const conversionsState = useIssueDetailConversions({
    identifier,
    issue,
    setError,
    onCloseIssueOptions: () => setIssueOptionsOpen(false),
  });
  const { data: conversionsData, handlers: conversionsHandlers } = conversionsState;
  const templateApplyState = useIssueDetailTemplateApply({
    issue,
    labels,
    patch,
    setError,
    onCloseIssueOptions: () => setIssueOptionsOpen(false),
  });
  const { data: templateApplyData, handlers: templateApplyHandlers } = templateApplyState;

  if (error) {
    return { _view: 0 as const, error, handlers: {} };
  }
  if (!issue) {
    return { _view: 1 as const, handlers: {} };
  }

  const milestones = projects.find((project) => project.id === issue.projectId)?.milestones ?? [];
  const issueURL =
    typeof window === 'undefined'
      ? `/issues/${encodeURIComponent(identifier)}`
      : new URL(`/issues/${encodeURIComponent(identifier)}`, window.location.origin).href;
  const codingToolURL = buildCodingToolURL(issue, codingToolPreferences, issueURL);
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

  function makeCopy() {
    void sendIntent('issue.create', {
      title: `${issue.title} (${i18n.t('issueActions.copySuffix')})`,
      body: issue.body.trimEnd(),
      skipDefaultTemplate: true,
      status:
        issueWorkflowStatuses.find((status) => status.category === 'backlog')?.id ?? 'backlog',
      type: issue.type,
      priority: issue.priority,
      assignee: issue.assignee ?? '',
      estimate: issue.estimate,
      projectId: issue.projectId ?? undefined,
      labelNames: issue.labels.map((label) => label.name),
    });
  }
  return {
    _view: 2 as const,
    identifier,
    navigationPosition: navigationIndex >= 0 ? navigationIndex + 1 : 1,
    navigationTotal: navigationIds.length,
    issueReturnTo,
    issue,
    isSubscribed,
    issues,
    ...timelineData,
    ...relationsData,
    ...resourcesData,
    ...dueDateData,
    ...remindersData,
    ...conversionsData,
    ...templateApplyData,
    ...labelsData,
    ...propertiesData,
    projects,
    milestones,
    cycles,
    pages,
    labels,
    codingToolName: codingToolPreferences.customLinkName,
    codingToolURL,
    timeZone,
    copied,
    historyRequest,
    descriptionFocusRequest,
    issueOptionsOpen,
    hasUpcomingCycle: cycles.some((cycle) => new Date(cycle.startsAt) > new Date()),
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
      onDeleteIssue: () => remove(),
      onArchiveIssue: () => toggleArchive(),
      onFocusDescription: () =>
        setDescriptionFocus((current) => ({
          identifier,
          request: current.identifier === identifier ? current.request + 1 : 1,
        })),
      onClick17: () => sendIntent('adr.create', { issueNumber: issue.number }),
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
      ...relationsHandlers,
      ...resourcesHandlers,
      ...dueDateHandlers,
      ...remindersHandlers,
      ...conversionsHandlers,
      ...templateApplyHandlers,
      ...labelsHandlers,
      ...propertiesHandlers,
      ...timelineHandlers,
    },
  };
}
