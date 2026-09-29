import type { useTranslation } from 'react-i18next';
import type {
  InitiativeDateField,
  InitiativeDateFilters,
  InitiativeProjectFilter,
} from './initiative-list.ts';
import type { SearchDateFilter } from './search.ts';
import type { InitiativeStatus, ProjectHealth } from './types.ts';

export const INITIATIVE_DATE_FIELDS: InitiativeDateField[] = [
  'created',
  'updated',
  'completed',
  'latestUpdate',
];
export const INITIATIVE_FILTERS = [
  'status',
  'priority',
  'labels',
  'health',
  'dates',
  'projects',
  'advanced',
] as const;

export type InitiativeFilterKey = (typeof INITIATIVE_FILTERS)[number];
export type ActiveFilterChip = {
  filter: InitiativeFilterKey;
  key: string;
  label: string;
  value: string;
  dateField: InitiativeDateField | null;
};

type Props = {
  statusFilter: InitiativeStatus[];
  priorityFilter: number[];
  healthFilter: ProjectHealth[];
  labelFilter: string[];
  dateFilters: InitiativeDateFilters;
  projectsFilter: InitiativeProjectFilter;
  advancedFilter: boolean;
  filterLabels: Record<InitiativeFilterKey, string>;
  dateFieldLabels: Record<InitiativeDateField, string>;
  t: ReturnType<typeof useTranslation>['t'];
};

export function buildInitiativeFilterChips({
  statusFilter,
  priorityFilter,
  healthFilter,
  labelFilter,
  dateFilters,
  projectsFilter,
  advancedFilter,
  filterLabels,
  dateFieldLabels,
  t,
}: Props) {
  const filterCounts: Record<InitiativeFilterKey, number> = {
    status: statusFilter.length,
    priority: priorityFilter.length,
    labels: labelFilter.length,
    health: healthFilter.length,
    dates: INITIATIVE_DATE_FIELDS.filter((field) => dateFilters[field]).length,
    projects: Number(projectsFilter !== 'all'),
    advanced: Number(advancedFilter),
  };
  function formatDateFilter(filter: SearchDateFilter) {
    if (filter.value.kind === 'relative') {
      return `${t('searchPage.filters.operators.after')} ${t(`searchPage.filters.dateWindows.${filter.value.window}`)}`;
    }
    return filter.value.start === filter.value.end
      ? filter.value.start
      : `${filter.value.start} – ${filter.value.end}`;
  }

  const activeFilterChips: ActiveFilterChip[] = [];
  for (const filter of INITIATIVE_FILTERS) {
    if (filter === 'dates') {
      for (const field of INITIATIVE_DATE_FIELDS) {
        const dateFilter = dateFilters[field];
        if (dateFilter) {
          activeFilterChips.push({
            filter,
            key: `${filter}-${field}`,
            label: dateFieldLabels[field],
            value: formatDateFilter(dateFilter),
            dateField: field,
          });
        }
      }
      continue;
    }
    if (!filterCounts[filter]) continue;
    let value: string;
    switch (filter) {
      case 'status':
        value = statusFilter.map((status) => t(`initiatives.${status}`)).join(', ');
        break;
      case 'priority':
        value = priorityFilter
          .map((priority) => t(`initiativeList.priorityValue.${priority}`))
          .join(', ');
        break;
      case 'labels':
        value = labelFilter.join(', ');
        break;
      case 'health':
        value = healthFilter.map((health) => t(`initiativeList.healthValue.${health}`)).join(', ');
        break;
      case 'projects':
        value = t(
          projectsFilter === 'withProjects'
            ? 'initiativeList.withProjects'
            : 'initiativeList.withoutProjects',
        );
        break;
      case 'advanced':
        value = '';
        break;
      default:
        continue;
    }
    activeFilterChips.push({
      filter,
      key: filter,
      label: filterLabels[filter],
      value,
      dateField: null,
    });
  }

  return { filterCounts, activeFilterChips };
}
