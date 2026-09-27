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
import type {
  Cycle,
  IssueLinkSource,
  IssueTemplateFilterOption,
  Label,
  Project,
} from '../types.ts';
import type { IssueFilterChoices, IssueFilterGroup } from '../issue-advanced-filter.ts';
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
  'assignee',
  'agent',
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
  'assignee',
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
  linkSources?: IssueLinkSource[];
  templateOptions?: IssueTemplateFilterOption[];
  onChange: (next: IssueSearch) => void;
  advancedFilter?: boolean;
  advancedFilterGroup?: IssueFilterGroup;
  onAdvancedFilterToggle?: (enabled: boolean) => void;
  onAdvancedFilterChange?: (group: IssueFilterGroup) => void;
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
  linkSources = [],
  templateOptions = [],
  onChange,
  advancedFilter,
  advancedFilterGroup,
  onAdvancedFilterToggle,
  onAdvancedFilterChange,
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
  const selectedStatuses = search.statuses ?? (search.status ? [search.status] : []);
  const selectedPriorities =
    search.priorities ?? (search.priority === undefined ? [] : [search.priority]);
  const selectedLinkSources = search.linkSources ?? [];
  const selectedTemplateSlugs = search.templateSlugs ?? [];
  const selectedAddedToCycle = search.addedToCycle ?? [];
  const advancedFilterChoices: IssueFilterChoices = {
    status: workflowStatuses.map((status) => ({
      value: status.id,
      label: workflowStatusLabel(status.id, workflowStatuses),
    })),
    assignee: [
      { value: 'self', label: t('issueAssignment.you') },
      { value: 'agent', label: t('issueAssignment.agent') },
      { value: 'none', label: t('issueAssignment.unassigned') },
    ],
    priority: [0, 1, 2, 3, 4].map((priority) => ({
      value: String(priority),
      label: priorityLabel(priority),
    })),
    type: (['bug', 'feature', 'improvement', 'task'] as const).map((type) => ({
      value: type,
      label: issueTypeLabel(type),
    })),
    estimate: [
      { value: 'none', label: t('issueProperties.noEstimate') },
      ...[0, 1, 2, 3, 5, 8].map((estimate) => ({
        value: String(estimate),
        label: String(estimate),
      })),
    ],
    project: [
      { value: 'none', label: t('field.noProject') },
      ...projects.map((project) => ({
        value: project.slug || String(project.id),
        label: project.name,
      })),
    ],
    cycle: [
      { value: 'none', label: t('field.noCycle') },
      ...cycles.map((cycle) => ({
        value: String(cycle.id),
        label: cycle.name || t('field.cycleN', { number: cycle.number }),
      })),
    ],
    label: [
      { value: 'none', label: t('issueProperties.noLabels') },
      ...labels.map((label) => ({ value: label.name, label: label.name })),
    ],
    relation: [
      'parent',
      'subissue',
      'blocked',
      'blocking',
      'recurring',
      'related',
      'duplicate',
    ].map((relation) => ({
      value: relation,
      label: t(`filters.relationValue.${relation}`),
    })),
    links: [
      { value: 'yes', label: t('issueFilters.hasAny') },
      { value: 'no', label: t('issueFilters.hasNone') },
    ],
    recurring: [
      { value: 'yes', label: t('issueFilters.hasAny') },
      { value: 'no', label: t('issueFilters.hasNone') },
    ],
  };

  function set(patch: IssueSearch) {
    const next = { ...searchRef.current, ...patch };
    searchRef.current = next;
    pendingSearchRef.current = next;
    onChange(next);
  }

  const chips: FilterChip[] = [
    ...(selectedStatuses.length > 0
      ? [
          {
            key: 'statuses',
            label:
              selectedStatuses.length === 1
                ? `${t('field.status')} · ${workflowStatusLabel(selectedStatuses[0]!, workflowStatuses)}`
                : `${t('field.status')} · ${t('filters.statusesSelected', { count: selectedStatuses.length })}`,
          },
        ]
      : []),
    ...(search.assignee
      ? [
          {
            key: 'assignee',
            label: `${t('field.assignee')} · ${t(`issueAssignment.${search.assignee === 'self' ? 'you' : search.assignee === 'agent' ? 'agent' : 'unassigned'}`)}`,
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
    ...(selectedPriorities.length > 0
      ? [
          {
            key: 'priorities',
            label:
              selectedPriorities.length === 1
                ? `${t('field.priority')} · ${priorityLabel(selectedPriorities[0]!)}`
                : `${t('field.priority')} · ${t('filters.prioritiesSelected', { count: selectedPriorities.length })}`,
          },
        ]
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
    ...selectedLinkSources.map((source) => ({
      key: `linkSource:${source}`,
      label: `${t('filters.categories.links')} · ${source === 'no-source' ? t('filters.noLinkSource') : (linkSources.find((item) => item.id === source)?.name ?? source)}`,
    })),
    ...selectedTemplateSlugs.map((slug) => ({
      key: `template:${slug}`,
      label: `${t('filters.categories.template')} · ${slug === 'no-template' ? t('filters.noIssueTemplate') : (templateOptions.find((item) => item.id === slug)?.name ?? slug)}`,
    })),
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
    ...(search.advancedFilter && search.advancedFilterGroup?.children.length
      ? [{ key: 'advancedFilter', label: t('issueFilters.advancedFilter') }]
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
    linkSources,
    templateOptions,
    onChange,
    onAdvancedFilterToggle,
    onAdvancedFilterChange,
    advancedFilter: advancedFilter ?? search.advancedFilter ?? false,
    advancedFilterGroup: advancedFilterGroup ??
      search.advancedFilterGroup ?? { kind: 'group', operator: 'and', children: [] },
    advancedFilterChoices,
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
    selectedLinkSources,
    selectedTemplateSlugs,
    selectedProjectLabels,
    selectedAddedToCycle,
    filterOpened,
    displayOpened,
    chips,
    handlers: {
      onFilterOpenChange: (next: boolean) => setFilterOpened(next),
      onAdvancedFilterToggle: () =>
        onAdvancedFilterToggle?.(!(advancedFilter ?? search.advancedFilter ?? false)),
      onAdvancedFilterChange: (group: IssueFilterGroup) => onAdvancedFilterChange?.(group),
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
      onStatusChange: (value: string) => {
        const current =
          searchRef.current.statuses ??
          (searchRef.current.status ? [searchRef.current.status] : []);
        const next = current.includes(value)
          ? current.filter((status) => status !== value)
          : [...current, value];
        set({
          status: next.length === 1 ? next[0] : undefined,
          statuses: next.length > 1 ? next : undefined,
        });
      },
      onAssigneeChange: (value: string) =>
        set({ assignee: value ? (value as NonNullable<IssueSearch['assignee']>) : undefined }),
      onProjectChange: (value: string) => set({ project: value || undefined }),
      onCycleChange: (value: string) => set({ cycle: value ? Number(value) : undefined }),
      onPriorityChange: (value: string) => {
        const priority = Number(value);
        const current =
          searchRef.current.priorities ??
          (searchRef.current.priority === undefined ? [] : [searchRef.current.priority]);
        const next = current.includes(priority)
          ? current.filter((selected) => selected !== priority)
          : [...current, priority];
        set({
          priority: next.length === 1 ? next[0] : undefined,
          priorities: next.length > 1 ? next : undefined,
        });
      },
      onTypeChange: (value: string) => set({ type: value || undefined }),
      onEstimateChange: (value: string) =>
        set({ estimate: value === '' ? undefined : Number(value) }),
      onDueDateChange: (value: string) =>
        set({ dueDate: value ? (value as NonNullable<IssueSearch['dueDate']>) : undefined }),
      onRelationChange: (value: string) =>
        set({ relation: value ? (value as NonNullable<IssueSearch['relation']>) : undefined }),
      onToggleLinkSource: (value: string) => {
        const current = searchRef.current.linkSources ?? [];
        const next = current.includes(value)
          ? current.filter((source) => source !== value)
          : [...current, value];
        set({ linkSources: next.length > 0 ? next : undefined });
      },
      onToggleTemplateSlug: (value: string) => {
        const current = searchRef.current.templateSlugs ?? [];
        const next = current.includes(value)
          ? current.filter((slug) => slug !== value)
          : [...current, value];
        set({ templateSlugs: next.length > 0 ? next : undefined });
      },
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
          statuses: undefined,
          priority: undefined,
          priorities: undefined,
          assignee: undefined,
          project: undefined,
          cycle: undefined,
          type: undefined,
          estimate: undefined,
          dueDate: undefined,
          relation: undefined,
          linkSources: undefined,
          templateSlugs: undefined,
          content: undefined,
          milestoneName: undefined,
          dateField: undefined,
          dateRange: undefined,
          projectStatus: undefined,
          projectPriority: undefined,
          projectLabels: undefined,
          addedToCycle: undefined,
          advancedFilter: undefined,
          advancedFilterGroup: undefined,
          labels: undefined,
        });
        onFind?.('');
      },
      onRemoveFilter: (key: string) => {
        if (key.startsWith('linkSource:')) {
          const current = searchRef.current.linkSources ?? [];
          const next = current.filter((source) => source !== key.slice('linkSource:'.length));
          set({ linkSources: next.length > 0 ? next : undefined });
          return;
        }
        if (key.startsWith('template:')) {
          const current = searchRef.current.templateSlugs ?? [];
          const next = current.filter((slug) => slug !== key.slice('template:'.length));
          set({ templateSlugs: next.length > 0 ? next : undefined });
          return;
        }
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
          key === 'statuses' ||
          key === 'priority' ||
          key === 'priorities' ||
          key === 'assignee' ||
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
          key === 'projectPriority' ||
          key === 'advancedFilter'
        ) {
          if (key === 'advancedFilter') {
            set({ advancedFilter: undefined, advancedFilterGroup: undefined });
          } else if (key === 'status' || key === 'statuses') {
            set({ status: undefined, statuses: undefined });
          } else if (key === 'priority' || key === 'priorities') {
            set({ priority: undefined, priorities: undefined });
          } else {
            set({ [key]: undefined });
          }
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
