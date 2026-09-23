import type * as React from 'react';
import { useRef } from 'react';
import { useMachineFlag } from '../application/Root.tsx';
import type { IssueSearch } from '../api.ts';
import { issueStatusLabel, priorityLabel } from '../i18n/labels.ts';
import type { IssueGroupBy, IssueLayout, IssueOrderBy } from '../issue-list.ts';
import {
  ISSUE_STATUSES,
  type Cycle,
  type IssueStatus,
  type Label,
  type Project,
} from '../types.ts';

export type FilterChip = { key: string; label: string };

const GROUP_BY: IssueGroupBy[] = ['none', 'priority', 'status', 'project', 'cycle', 'parent'];
const ORDER_BY: IssueOrderBy[] = ['manual', 'priority', 'updated', 'dueDate', 'title'];

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
}: Props) {
  const findRef = useRef<HTMLInputElement>(null);
  const [filterOpened, setFilterOpened] = useMachineFlag('filter');
  const [displayOpened, setDisplayOpened] = useMachineFlag('display');

  const selectedLabels = (search.labels ?? '')
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);

  function set(patch: IssueSearch) {
    onChange({ ...search, ...patch });
  }

  const chips: FilterChip[] = [
    ...(search.status
      ? [
          {
            key: 'status',
            label: `Status · ${ISSUE_STATUSES.includes(search.status as IssueStatus) ? issueStatusLabel(search.status as IssueStatus) : search.status}`,
          },
        ]
      : []),
    ...(search.project
      ? [
          {
            key: 'project',
            label: `Project · ${projects.find((project) => project.slug === search.project)?.name ?? search.project}`,
          },
        ]
      : []),
    ...(search.cycle ? [{ key: 'cycle', label: `Cycle · ${search.cycle}` }] : []),
    ...(search.priority !== undefined
      ? [{ key: 'priority', label: `Priority · ${priorityLabel(search.priority)}` }]
      : []),
    ...selectedLabels.map((name) => ({ key: `label:${name}`, label: `Label · ${name}` })),
  ];

  return {
    _view: 0 as const,
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
    findRef,
    selectedLabels,
    filterOpened,
    displayOpened,
    chips,
    handlers: {
      onFilterToggle: () => setFilterOpened((current) => !current),
      onFilterOpenChange: (next: boolean) => setFilterOpened(next),
      onDisplayToggle: () => setDisplayOpened((current) => !current),
      onDisplayOpenChange: (next: boolean) => setDisplayOpened(next),
      onStatusChange: (value: string) => set({ status: value || undefined }),
      onProjectChange: (value: string) => set({ project: value || undefined }),
      onCycleChange: (value: string) => set({ cycle: value ? Number(value) : undefined }),
      onPriorityChange: (value: string) =>
        set({ priority: value === '' ? undefined : Number(value) }),
      onFindChange: (e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0]) =>
        onFind?.(e.target.value),
      onGroupByChange: (value: string) => {
        if (GROUP_BY.includes(value as IssueGroupBy)) onGroupBy?.(value as IssueGroupBy);
      },
      onLayoutChange: (value: string) => {
        if (value === 'list' || value === 'board') onLayout?.(value);
      },
      onOrderByChange: (value: string) => {
        if (ORDER_BY.includes(value as IssueOrderBy)) onOrderBy?.(value as IssueOrderBy);
      },
      onClearFilters: () => {
        onChange({
          ...search,
          status: undefined,
          project: undefined,
          cycle: undefined,
          priority: undefined,
          labels: undefined,
        });
        onFind?.('');
      },
      onRemoveFilter: (key: string) => {
        if (key.startsWith('label:')) {
          const next = selectedLabels.filter((label) => label !== key.slice(6));
          set({ labels: next.length > 0 ? next.join(',') : undefined });
        } else if (key === 'status' || key === 'project' || key === 'cycle' || key === 'priority') {
          set({ [key]: undefined });
        }
      },
      onToggleLabel: (name: string) => {
        const next = selectedLabels.includes(name)
          ? selectedLabels.filter((label) => label !== name)
          : [...selectedLabels, name];
        set({ labels: next.length ? next.join(',') : undefined });
      },
    },
  };
}
