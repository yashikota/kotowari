import { priorityLabel } from '../i18n/labels.ts';
import { useIssueWorkflow, workflowStatusLabel } from '../workflow.tsx';

type Props = {
  selectedCount: number;
  onSetStatus: (status: string) => void;
  onSetPriority: (priority: number) => void;
  onClear: () => void;
};

export function useIssueSelectionToolbarPresenter({
  selectedCount,
  onSetStatus,
  onSetPriority,
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
    handlers: {
      onSetStatus: (status: string) => onSetStatus(status),
      onSetPriority: (priority: number) => onSetPriority(priority),
      onClear,
    },
  };
}
