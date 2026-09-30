import { useNavigate, useRouter } from '@tanstack/react-router';
import { api } from '../api.ts';
import { setPendingAgentPrompt } from '../agent-prompt.ts';
import { autoAssignOnStartedTransition } from '../application/issue-assignment.ts';
import { patchIssueOptimistically } from '../application/issues.ts';
import { useCodingToolPreferences } from '../coding-tools.ts';
import {
  issueBranchName,
  issueMarkdown,
  renderIssuePrompt,
  selectedIssuesAgentPrompt,
} from '../issue-actions.ts';
import type { IssueCopyKind } from '../issue-actions.ts';
import { issueSubscriptions } from '../issue-subscriptions.ts';
import type { Issue } from '../types.ts';
import { useIssueWorkflow } from '../workflow.tsx';
import { usePersonalPreferences } from '../preferences.ts';

type Props = {
  selectedIds: string[];
  visibleIssues: Issue[];
  onClear: () => void;
};

export function useIssueBulkActions({ selectedIds, visibleIssues, onClear }: Props) {
  const { preferences: codingToolPreferences } = useCodingToolPreferences();
  const { preferences } = usePersonalPreferences();
  const { statuses: workflowStatuses } = useIssueWorkflow();
  const router = useRouter();
  const navigate = useNavigate();
  const issueById = new Map(visibleIssues.map((issue) => [issue.identifier, issue]));
  const bulkSelectedArchived =
    selectedIds.length > 0 && selectedIds.every((id) => issueById.get(id)?.archivedAt);
  const removableLabels = Array.from(
    new Map(
      selectedIds.flatMap(
        (id) => issueById.get(id)?.labels.map((label) => [label.id, label] as const) ?? [],
      ),
    ).values(),
  );

  async function updateSelectedIssues(patch: Record<string, unknown>) {
    await Promise.all(
      selectedIds.map(async (id) => {
        const issue = await api.issue(id);
        const adjustedPatch = autoAssignOnStartedTransition(
          issue,
          patch,
          workflowStatuses,
          preferences.autoAssignOnStart,
        );
        await patchIssueOptimistically(id, adjustedPatch);
      }),
    );
    await router.invalidate();
    onClear();
  }

  async function updateSelectedLabels(labelId: number, add: boolean) {
    await Promise.all(
      selectedIds.map(async (identifier) => {
        const issue = await api.issue(identifier);
        const labelIds = issue.labels.map((label) => label.id);
        const next = add
          ? labelIds.includes(labelId)
            ? labelIds
            : [...labelIds, labelId]
          : labelIds.filter((id) => id !== labelId);
        if (next.length !== labelIds.length)
          await patchIssueOptimistically(identifier, { labelIds: next });
      }),
    );
    await router.invalidate();
    onClear();
  }

  async function copySelectedIssues(kind: IssueCopyKind) {
    try {
      const selectedIssues = await Promise.all(
        selectedIds.map(async (identifier) => issueById.get(identifier) ?? api.issue(identifier)),
      );
      if (kind === 'pullRequestUrls') {
        const pullRequestUrls = Array.from(
          new Set(
            selectedIssues.flatMap((issue) =>
              issue.externalLinks
                .filter((link) => link.kind === 'pullRequest')
                .map((link) => link.url),
            ),
          ),
        );
        await navigator.clipboard.writeText(pullRequestUrls.join('\n'));
        return;
      }
      const copies = selectedIssues.map((issue) => {
        const url = new URL(
          `/issues/${encodeURIComponent(issue.identifier)}`,
          window.location.origin,
        ).toString();
        switch (kind) {
          case 'id':
            return issue.identifier;
          case 'url':
            return url;
          case 'title':
            return issue.title;
          case 'titleLink': {
            const title = issue.title
              .replaceAll('\\', '\\\\')
              .replaceAll('[', '\\[')
              .replaceAll(']', '\\]');
            return `[${title}](${url})`;
          }
          case 'issueMarkdown':
            return issueMarkdown(issue, url).trimEnd();
          case 'markdown':
            return issueMarkdown(issue, url, true).trimEnd();
          case 'branch':
            return issueBranchName(issue);
          case 'prompt':
            return renderIssuePrompt(issue, codingToolPreferences.promptTemplate, url);
        }
      });
      const separator =
        kind === 'markdown' || kind === 'issueMarkdown' || kind === 'prompt' ? '\n\n---\n\n' : '\n';
      await navigator.clipboard.writeText(copies.join(separator));
    } catch {
      // Clipboard permissions can be unavailable in an embedded or insecure context.
    }
  }

  function askAgentAboutSelectedIssues() {
    const selectedIssues = selectedIds.flatMap((identifier) => {
      const issue = issueById.get(identifier);
      return issue ? [issue] : [];
    });
    if (selectedIssues.length === 0) return;
    setPendingAgentPrompt(selectedIssuesAgentPrompt(selectedIssues, window.location.origin));
    void navigate({ to: '/agent' });
  }

  return {
    bulkSelectedArchived,
    removableLabels,
    handlers: {
      onSetBulkStatus: (status: string) => updateSelectedIssues({ workflowStatus: status }),
      onArchiveBulkIssues: () => updateSelectedIssues({ archived: !bulkSelectedArchived }),
      onSetBulkPriority: (priority: number) => updateSelectedIssues({ priority }),
      onSetBulkAssignee: (assignee: 'self' | 'agent' | '') => updateSelectedIssues({ assignee }),
      onSetBulkType: (type: Issue['type']) => updateSelectedIssues({ type }),
      onSetBulkEstimate: (estimate: number | null) => updateSelectedIssues({ estimate }),
      onSetBulkDueDate: (dueDate: string | null) => updateSelectedIssues({ dueDate }),
      onSetBulkSubscribed: (subscribed: boolean) => {
        issueSubscriptions.setMany(selectedIds, subscribed);
        onClear();
      },
      onSetBulkProject: (projectId: number | null) => updateSelectedIssues({ projectId }),
      onSetBulkCycle: (cycleId: number | null) => updateSelectedIssues({ cycleId }),
      onAddBulkLabel: (labelId: number) => updateSelectedLabels(labelId, true),
      onRemoveBulkLabel: (labelId: number) => updateSelectedLabels(labelId, false),
      onCopyBulkIssues: (kind: IssueCopyKind) => copySelectedIssues(kind),
      onAskAgentAboutSelectedIssues: askAgentAboutSelectedIssues,
      onClearBulkSelection: onClear,
    },
  };
}
