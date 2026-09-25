import type * as React from 'react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useMachineFlag, useRootMachineFlag } from '../application/Root.tsx';
import type { IssueSearch } from '../api.ts';
import { issueTypeLabel, priorityLabel } from '../i18n/labels.ts';
import type {
  CompletedIssuesFilter,
  IssueDisplayProperty,
  IssueGroupBy,
  IssueLayout,
  IssueOrderBy,
} from '../issue-list.ts';
import type { Cycle, Label, Project } from '../types.ts';
import { useIssueWorkflow, workflowStatusLabel } from '../workflow.tsx';
import { useProjectWorkflow, projectWorkflowStatusLabel } from '../project-workflow.tsx';

export type FilterChip = { key: string; label: string };

function searchKey(search: IssueSearch): string {
  return JSON.stringify(
    Object.entries(search).sort(([left], [right]) => left.localeCompare(right)),
  );
}

const GROUP_BY: IssueGroupBy[] = [
  'none',
  'priority',
  'status',
  'project',
  'cycle',
  'label',
  'parent',
  'type',
  'estimate',
];
const ORDER_BY: IssueOrderBy[] = [
  'manual',
  'title',
  'status',
  'priority',
  'estimate',
  'updated',
  'created',
  'dueDate',
  'linkCount',
  'timeInStatus',
];
const COMPLETED_ISSUES: CompletedIssuesFilter[] = [
  'all',
  'pastDay',
  'pastWeek',
  'pastMonth',
  'currentCycle',
  'none',
];

type Props = {
  search: IssueSearch;
  projects: Project[];
  cycles: Cycle[];
  labels: Label[];
  onChange: (next: IssueSearch) => void;
  find?: string;
  onFind?: (q: string) => void;
  groupBy?: IssueGroupBy;
  onGroupBy?: (groupBy: IssueGroupBy) => void;
  layout?: IssueLayout;
  onLayout?: (layout: IssueLayout) => void;
  orderBy?: IssueOrderBy;
  onOrderBy?: (orderBy: IssueOrderBy) => void;
  subGroupBy?: IssueGroupBy;
  onSubGroupBy?: (groupBy: IssueGroupBy) => void;
  direction?: 'asc' | 'desc';
  onDirection?: (direction: 'asc' | 'desc') => void;
  completedIssues?: CompletedIssuesFilter;
  onCompletedIssues?: (filter: CompletedIssuesFilter) => void;
  showSubIssues?: boolean;
  onShowSubIssues?: (show: boolean) => void;
  nestedSubIssues?: 'showMatching' | 'showAll';
  onNestedSubIssues?: (mode: 'showMatching' | 'showAll') => void;
  showEmptyGroups?: boolean;
  onShowEmptyGroups?: (show: boolean) => void;
  displayProperties?: string[];
  onDisplayPropertyToggle?: (property: IssueDisplayProperty) => void;
  detailsOpen?: boolean;
  onDetailsToggle?: () => void;
};

export function useIssueFiltersPresenter({
  search,
  projects,
  cycles,
  labels,
  onChange,
  find,
  onFind,
  groupBy,
  onGroupBy,
  layout,
  onLayout,
  orderBy,
  onOrderBy,
  subGroupBy,
  onSubGroupBy,
  direction,
  onDirection,
  completedIssues,
  onCompletedIssues,
  showSubIssues,
  onShowSubIssues,
  nestedSubIssues,
  onNestedSubIssues,
  showEmptyGroups,
  onShowEmptyGroups,
  displayProperties,
  onDisplayPropertyToggle,
  detailsOpen,
  onDetailsToggle,
}: Props) {
  const { statuses: workflowStatuses } = useIssueWorkflow();
  const { statuses: projectWorkflowStatuses } = useProjectWorkflow();
  const { t } = useTranslation();
  const [findOpen, setFindOpen] = useRootMachineFlag('issues.find');
  const findRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef(search);
  const observedSearchRef = useRef(search);
  const pendingSearchRef = useRef<IssueSearch | null>(null);
  if (searchKey(search) !== searchKey(observedSearchRef.current)) {
    observedSearchRef.current = search;
    const pendingSearch = pendingSearchRef.current;
    if (!pendingSearch) {
      searchRef.current = search;
    } else if (searchKey(search) === searchKey(pendingSearch)) {
      searchRef.current = search;
      pendingSearchRef.current = null;
    }
  }
  const [filterOpened, setFilterOpened] = useMachineFlag('filter');
  const [displayOpened, setDisplayOpened] = useMachineFlag('display');

  useEffect(() => {
    if (findOpen) findRef.current?.focus();
  }, [findOpen]);

  const selectedLabels = (search.labels ?? '')
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);
  const selectedProjectLabels = search.projectLabels ?? [];
  const selectedAddedToCycle = search.addedToCycle ?? [];

  function set(patch: IssueSearch) {
    const next = { ...searchRef.current, ...patch };
    searchRef.current = next;
    pendingSearchRef.current = next;
    onChange(next);
  }

  const chips: FilterChip[] = [
    ...(search.status
      ? [
          {
            key: 'status',
            label: `${t('field.status')} · ${workflowStatusLabel(search.status, workflowStatuses)}`,
          },
        ]
      : []),
    ...(search.project
      ? [
          {
            key: 'project',
            label: `${t('field.project')} · ${projects.find((project) => project.slug === search.project)?.name ?? search.project}`,
          },
        ]
      : []),
    ...(search.cycle ? [{ key: 'cycle', label: `${t('field.cycle')} · ${search.cycle}` }] : []),
    ...(search.priority !== undefined
      ? [{ key: 'priority', label: `${t('field.priority')} · ${priorityLabel(search.priority)}` }]
      : []),
    ...(search.type
      ? [
          {
            key: 'type',
            label: `${t('field.type')} · ${issueTypeLabel(search.type as import('../types.ts').IssueType)}`,
          },
        ]
      : []),
    ...(search.estimate !== undefined
      ? [{ key: 'estimate', label: `${t('field.estimate')} · ${search.estimate}` }]
      : []),
    ...(search.dueDate
      ? [
          {
            key: 'dueDate',
            label: `${t('filters.dueDate')} · ${search.dueDate.startsWith('on:') ? `${t('filters.dueDateValue.custom')} · ${search.dueDate.slice(3)}` : t(`filters.dueDateValue.${search.dueDate}`)}`,
          },
        ]
      : []),
    ...(search.relation
      ? [
          {
            key: 'relation',
            label: `${t('filters.relation')} · ${t(`filters.relationValue.${search.relation}`)}`,
          },
        ]
      : []),
    ...(search.content
      ? [{ key: 'content', label: `${t('filters.content')} · ${search.content.trim()}` }]
      : []),
    ...(search.milestoneName
      ? [
          {
            key: 'milestoneName',
            label: `${t('filters.milestoneName')} · ${search.milestoneName.trim()}`,
          },
        ]
      : []),
    ...(search.projectStatus
      ? [
          {
            key: 'projectStatus',
            label: `${t('filters.projectStatus')} · ${projectWorkflowStatusLabel(search.projectStatus, projectWorkflowStatuses, t)}`,
          },
        ]
      : []),
    ...(search.projectPriority !== undefined
      ? [
          {
            key: 'projectPriority',
            label: `${t('filters.projectPriority')} · ${priorityLabel(search.projectPriority)}`,
          },
        ]
      : []),
    ...(search.dateField && search.dateRange && search.dateRange !== 'custom'
      ? [
          {
            key: 'date',
            label: `${t(`filters.dateField.${search.dateField}`)} · ${search.dateRange.startsWith('on:') ? search.dateRange.slice(3) : t(`${search.dateField === 'timeInCurrentStatus' ? 'filters.statusAgeRange' : 'filters.dateRange'}.${search.dateRange}`)}`,
          },
        ]
      : []),
    ...selectedLabels.map((name) => ({
      key: `label:${name}`,
      label: `${t('issueProperties.labels')} · ${name}`,
    })),
    ...selectedProjectLabels.map((name) => ({
      key: `projectLabel:${name}`,
      label: `${t('filters.projectLabels')} · ${name === '__none__' ? t('filters.noProjectLabels') : name}`,
    })),
    ...selectedAddedToCycle.map((phase) => ({
      key: `addedToCycle:${phase}`,
      label: `${t('filters.addedToCycle')} · ${t(`filters.addedToCycle${phase[0]!.toUpperCase()}${phase.slice(1)}`)}`,
    })),
  ];

  return {
    _view: 0 as const,
    search,
    projects,
    cycles,
    labels,
    onChange,
    findOpen,
    find,
    onFind,
    groupBy,
    onGroupBy,
    layout,
    onLayout,
    orderBy,
    onOrderBy,
    subGroupBy,
    direction,
    completedIssues,
    showSubIssues,
    nestedSubIssues,
    showEmptyGroups,
    displayProperties,
    detailsOpen,
    onDetailsToggle,
    findRef,
    selectedLabels,
    selectedProjectLabels,
    selectedAddedToCycle,
    filterOpened,
    displayOpened,
    chips,
    handlers: {
      onFilterToggle: () => setFilterOpened((current) => !current),
      onFilterOpenChange: (next: boolean) => setFilterOpened(next),
      onDisplayToggle: () => setDisplayOpened((current) => !current),
      onDisplayOpenChange: (next: boolean) => setDisplayOpened(next),
      onFindToggle: () => {
        if (findOpen) {
          onFind?.('');
          setFindOpen(false);
        } else {
          setFindOpen(true);
        }
      },
      onStatusChange: (value: string) => set({ status: value || undefined }),
      onProjectChange: (value: string) => set({ project: value || undefined }),
      onCycleChange: (value: string) => set({ cycle: value ? Number(value) : undefined }),
      onPriorityChange: (value: string) =>
        set({ priority: value === '' ? undefined : Number(value) }),
      onTypeChange: (value: string) => set({ type: value || undefined }),
      onEstimateChange: (value: string) =>
        set({ estimate: value === '' ? undefined : Number(value) }),
      onDueDateChange: (value: string) =>
        set({ dueDate: value ? (value as NonNullable<IssueSearch['dueDate']>) : undefined }),
      onRelationChange: (value: string) =>
        set({ relation: value ? (value as NonNullable<IssueSearch['relation']>) : undefined }),
      onContentChange: (value: string) => set({ content: value.trim() ? value : undefined }),
      onMilestoneNameChange: (value: string) =>
        set({ milestoneName: value.trim() ? value : undefined }),
      onDateFieldChange: (value: string) => {
        if (!value) {
          set({ dateField: undefined, dateRange: undefined });
          return;
        }
        if (
          ['createdAt', 'updatedAt', 'startedAt', 'completedAt', 'timeInCurrentStatus'].includes(
            value,
          )
        ) {
          set({
            dateField: value as NonNullable<IssueSearch['dateField']>,
            dateRange: searchRef.current.dateRange ?? 'weekAgo',
          });
        }
      },
      onDateRangeChange: (value: string) => {
        if (!value) {
          set({ dateField: undefined, dateRange: undefined });
        } else {
          set({ dateRange: value as NonNullable<IssueSearch['dateRange']> });
        }
      },
      onProjectStatusChange: (value: string) => set({ projectStatus: value || undefined }),
      onProjectPriorityChange: (value: string) =>
        set({ projectPriority: value === '' ? undefined : Number(value) }),
      onFindChange: (e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0]) =>
        onFind?.(e.target.value),
      onGroupByChange: (value: string) => {
        if (GROUP_BY.includes(value as IssueGroupBy)) return onGroupBy?.(value as IssueGroupBy);
      },
      onLayoutChange: (value: string) => {
        if (value === 'list' || value === 'board') return onLayout?.(value);
      },
      onOrderByChange: (value: string) => {
        if (ORDER_BY.includes(value as IssueOrderBy)) return onOrderBy?.(value as IssueOrderBy);
      },
      onSubGroupByChange: (value: string) => {
        if (GROUP_BY.includes(value as IssueGroupBy)) return onSubGroupBy?.(value as IssueGroupBy);
      },
      onDirectionChange: (value: string) => {
        if (value === 'asc' || value === 'desc') return onDirection?.(value);
      },
      onCompletedIssuesChange: (value: string) => {
        if (COMPLETED_ISSUES.includes(value as CompletedIssuesFilter))
          return onCompletedIssues?.(value as CompletedIssuesFilter);
      },
      onShowSubIssuesChange: (value: boolean) => onShowSubIssues?.(value),
      onNestedSubIssuesChange: (value: string) => {
        if (value === 'showMatching' || value === 'showAll') onNestedSubIssues?.(value);
      },
      onShowEmptyGroupsChange: (value: boolean) => onShowEmptyGroups?.(value),
      onDisplayPropertyToggle: (value: IssueDisplayProperty) => onDisplayPropertyToggle?.(value),
      onDetailsToggle: () => onDetailsToggle?.(),
      onClearFilters: () => {
        set({
          status: undefined,
          project: undefined,
          cycle: undefined,
          priority: undefined,
          type: undefined,
          estimate: undefined,
          dueDate: undefined,
          relation: undefined,
          content: undefined,
          milestoneName: undefined,
          dateField: undefined,
          dateRange: undefined,
          projectStatus: undefined,
          projectPriority: undefined,
          projectLabels: undefined,
          addedToCycle: undefined,
          labels: undefined,
        });
        onFind?.('');
      },
      onRemoveFilter: (key: string) => {
        if (key.startsWith('label:')) {
          const currentLabels = (searchRef.current.labels ?? '')
            .split(',')
            .map((label) => label.trim())
            .filter(Boolean);
          const next = currentLabels.filter((label) => label !== key.slice(6));
          set({ labels: next.length > 0 ? next.join(',') : undefined });
        } else if (key.startsWith('projectLabel:')) {
          const currentLabels = searchRef.current.projectLabels ?? [];
          const next = currentLabels.filter((label) => label !== key.slice(13));
          set({ projectLabels: next.length > 0 ? next : undefined });
        } else if (key.startsWith('addedToCycle:')) {
          const current = searchRef.current.addedToCycle ?? [];
          const next = current.filter((phase) => phase !== key.slice('addedToCycle:'.length));
          set({ addedToCycle: next.length ? next : undefined });
        } else if (
          key === 'status' ||
          key === 'project' ||
          key === 'cycle' ||
          key === 'priority' ||
          key === 'type' ||
          key === 'estimate' ||
          key === 'dueDate' ||
          key === 'relation' ||
          key === 'content' ||
          key === 'milestoneName' ||
          key === 'date' ||
          key === 'projectStatus' ||
          key === 'projectPriority'
        ) {
          set({ [key]: undefined });
        }
      },
      onToggleLabel: (name: string) => {
        const currentLabels = (searchRef.current.labels ?? '')
          .split(',')
          .map((label) => label.trim())
          .filter(Boolean);
        const next = currentLabels.includes(name)
          ? currentLabels.filter((label) => label !== name)
          : [...currentLabels, name];
        set({ labels: next.length ? next.join(',') : undefined });
      },
      onToggleProjectLabel: (name: string) => {
        const current = searchRef.current.projectLabels ?? [];
        const next =
          name === '__none__'
            ? current.includes('__none__')
              ? []
              : ['__none__']
            : current.includes(name)
              ? current.filter((label) => label !== name && label !== '__none__')
              : [...current.filter((label) => label !== '__none__'), name];
        set({ projectLabels: next.length ? next : undefined });
      },
      onToggleAddedToCycle: (phase: NonNullable<IssueSearch['addedToCycle']>[number]) => {
        const current = searchRef.current.addedToCycle ?? [];
        const next = current.includes(phase)
          ? current.filter((value) => value !== phase)
          : [...current, phase];
        set({ addedToCycle: next.length ? next : undefined });
      },
    },
  };
}
