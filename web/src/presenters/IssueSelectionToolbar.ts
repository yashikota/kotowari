import { issueTypeLabel, priorityLabel } from '../i18n/labels.ts';
import type { IssueType } from '../types.ts';
import { useIssueWorkflow, workflowStatusLabel } from '../workflow.tsx';

type Props = {
  selectedCount: number;
  onSetStatus: (status: string) => void;
  onSetPriority: (priority: number) => void;
  onSetAssignee: (assignee: 'self' | 'agent' | '') => void;
  onSetType: (type: IssueType) => void;
  onSetEstimate: (estimate: number | null) => void;
  onClear: () => void;
};

export function useIssueSelectionToolbarPresenter({
  selectedCount,
  onSetStatus,
  onSetPriority,
  onSetAssignee,
  onSetType,
  onSetEstimate,
  onClear,
}: Props) {
  const { statuses } = useIssueWorkflow();
  return {
    selectedCount,
    statuses: statuses.map((status) => ({
      id: status.id,
      label: workflowStatusLabel(status.id, statuses),
    })),
    priorities: [0, 1, 2, 3, 4].map((priority) => ({
      value: priority,
      label: priorityLabel(priority),
    })),
    types: (['bug', 'feature', 'improvement', 'task'] as const).map((type) => ({
      value: type,
      label: issueTypeLabel(type),
    })),
    estimates: [null, 0, 1, 2, 3, 5, 8, 13, 21, 34].map((estimate) => ({
      value: estimate,
      label: estimate == null ? '' : String(estimate),
    })),
    handlers: {
      onSetStatus: (status: string) => onSetStatus(status),
      onSetPriority: (priority: number) => onSetPriority(priority),
      onSetAssignee: (assignee: 'self' | 'agent' | '') => onSetAssignee(assignee),
      onSetType: (type: IssueType) => onSetType(type),
      onSetEstimate: (estimate: number | null) => onSetEstimate(estimate),
      onClear,
    },
  };
}
