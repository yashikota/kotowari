import { issueTypeLabel, priorityLabel } from '../i18n/labels.ts';
import type { IssueType } from '../types.ts';
import { useIssueWorkflow, workflowStatusLabel } from '../workflow.tsx';
import type { Cycle, Label, Project } from '../types.ts';
import { localToday } from '../due.ts';
import { useState } from 'react';

type BulkCopyKind = 'id' | 'url' | 'title' | 'titleLink' | 'markdown' | 'branch';

type Props = {
  selectedCount: number;
  onSetStatus: (status: string) => void;
  onSetPriority: (priority: number) => void;
  onSetAssignee: (assignee: 'self' | 'agent' | '') => void;
  onSetType: (type: IssueType) => void;
  onSetEstimate: (estimate: number | null) => void;
  onSetDueDate: (dueDate: string | null) => void;
  projects?: Project[];
  cycles?: Cycle[];
  labels?: Label[];
  removableLabels?: Label[];
  onSetProject: (projectId: number | null) => void;
  onSetCycle: (cycleId: number | null) => void;
  onAddLabel: (labelId: number) => void;
  onRemoveLabel: (labelId: number) => void;
  onCopyIssues: (kind: BulkCopyKind) => void;
  onClear: () => void;
};

export function useIssueSelectionToolbarPresenter({
  selectedCount,
  onSetStatus,
  onSetPriority,
  onSetAssignee,
  onSetType,
  onSetEstimate,
  onSetDueDate,
  projects = [],
  cycles = [],
  labels = [],
  removableLabels = [],
  onSetProject,
  onSetCycle,
  onAddLabel,
  onRemoveLabel,
  onCopyIssues,
  onClear,
}: Props) {
  const { statuses } = useIssueWorkflow();
  const [dueDateDraft, setDueDateDraft] = useState(localToday());
  const [projectQuery, setProjectQuery] = useState('');
  const [cycleQuery, setCycleQuery] = useState('');
  const [labelQuery, setLabelQuery] = useState('');
  const offsetDate = (offset: number) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
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
    projects: projects
      .map(({ id, name }) => ({ id, name }))
      .filter((project) => project.name.toLowerCase().includes(projectQuery.toLowerCase())),
    cycles: cycles
      .map(({ id, number, name }) => ({ id, number, name: name?.trim() }))
      .filter((cycle) =>
        (cycle.name ?? String(cycle.number)).toLowerCase().includes(cycleQuery.toLowerCase()),
      ),
    labels: labels
      .map(({ id, name }) => ({ id, name }))
      .filter((label) => label.name.toLowerCase().includes(labelQuery.toLowerCase())),
    removableLabels: removableLabels
      .map(({ id, name }) => ({ id, name }))
      .filter((label) => label.name.toLowerCase().includes(labelQuery.toLowerCase())),
    dueDateDraft,
    projectQuery,
    cycleQuery,
    labelQuery,
    dueDatePresets: [
      { key: 'today', value: offsetDate(0) },
      { key: 'tomorrow', value: offsetDate(1) },
      { key: 'nextWeek', value: offsetDate(7) },
    ] as const,
    handlers: {
      onSetStatus: (status: string) => onSetStatus(status),
      onSetPriority: (priority: number) => onSetPriority(priority),
      onSetAssignee: (assignee: 'self' | 'agent' | '') => onSetAssignee(assignee),
      onSetType: (type: IssueType) => onSetType(type),
      onSetEstimate: (estimate: number | null) => onSetEstimate(estimate),
      onSetDueDate: (dueDate: string | null) => onSetDueDate(dueDate),
      onDueDateChange: (dueDate: string) => setDueDateDraft(dueDate),
      onSetProject: (projectId: number | null) => onSetProject(projectId),
      onSetCycle: (cycleId: number | null) => onSetCycle(cycleId),
      onAddLabel: (labelId: number) => onAddLabel(labelId),
      onRemoveLabel: (labelId: number) => onRemoveLabel(labelId),
      onCopyIssues: (kind: BulkCopyKind) => onCopyIssues(kind),
      onProjectQueryChange: (query: string) => setProjectQuery(query),
      onCycleQueryChange: (query: string) => setCycleQuery(query),
      onLabelQueryChange: (query: string) => setLabelQuery(query),
      onClear,
    },
  };
}
