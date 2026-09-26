import { IconChevronDown, IconChevronUp, IconSelector } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { ProjectDisplayProperty } from '../project-display.ts';
import type { ProjectGroup } from '../project-grouping.ts';
import type { ProjectViewSearch } from '../project-views.ts';
import type { Project } from '../types.ts';
import { ProjectListItem } from './ProjectListItem.tsx';
import styles from './ProjectListView.module.css';

const SORT_BY_PROPERTY: Partial<
  Record<ProjectDisplayProperty | 'name', NonNullable<ProjectViewSearch['orderBy']>>
> = {
  name: 'name',
  priority: 'priority',
  status: 'status',
  startDate: 'startDate',
  targetDate: 'targetDate',
  created: 'created',
  updated: 'updated',
};

export function ProjectListView({
  groups,
  grouped,
  displayProperties,
  issueCounts,
  orderBy,
  direction,
  onSort,
  onReorder,
}: {
  groups: ProjectGroup[];
  grouped: boolean;
  displayProperties: ProjectDisplayProperty[];
  issueCounts: Record<string, number>;
  orderBy: NonNullable<ProjectViewSearch['orderBy']>;
  direction: NonNullable<ProjectViewSearch['direction']>;
  onSort: (property: ProjectDisplayProperty | 'name') => void;
  onReorder?: (source: string, target: string, direction: -1 | 1) => void;
}) {
  const { t } = useTranslation();
  const reorderTargets = onReorder
    ? groups.flatMap((group) => group.projects.map((p) => p.slug))
    : [];
  const columns = ['name', ...displayProperties] as const;

  function sortHeader(property: ProjectDisplayProperty | 'name', label: string) {
    const key = SORT_BY_PROPERTY[property];
    if (!key) return <span>{label}</span>;
    const active = orderBy === key;
    const icon = active ? (
      direction === 'desc' ? (
        <IconChevronDown size={13} aria-hidden="true" />
      ) : (
        <IconChevronUp size={13} aria-hidden="true" />
      )
    ) : (
      <IconSelector size={13} aria-hidden="true" />
    );
    return (
      <button
        type="button"
        className={styles.sortButton}
        aria-label={t('projectList.sortByProperty', { property: label })}
        onClick={() => onSort(property)}
      >
        {label}
        <span className={styles.sortIndicator}>{icon}</span>
      </button>
    );
  }

  return (
    <div className={styles.tableViewport}>
      <table className={styles.table} aria-label={t('nav.projects')}>
        <thead>
          <tr>
            <th
              scope="col"
              aria-sort={
                orderBy === 'name' ? (direction === 'desc' ? 'descending' : 'ascending') : 'none'
              }
            >
              {sortHeader('name', t('projectList.projectName'))}
            </th>
            {displayProperties.map((property) => {
              const sortKey = SORT_BY_PROPERTY[property];
              const active = sortKey !== undefined && orderBy === sortKey;
              return (
                <th
                  key={property}
                  scope="col"
                  aria-sort={active ? (direction === 'desc' ? 'descending' : 'ascending') : 'none'}
                >
                  {sortHeader(property, t(`projectList.property.${property}`))}
                </th>
              );
            })}
          </tr>
        </thead>
        {groups.map((group) => (
          <tbody key={group.key}>
            {grouped ? (
              <tr className={styles.groupRow}>
                <th colSpan={columns.length} scope="rowgroup">
                  <span>{group.label}</span>
                  <span className={styles.groupCount}>{group.projects.length}</span>
                </th>
              </tr>
            ) : null}
            {group.projects.map((project: Project) => (
              <ProjectListItem
                key={project.slug}
                project={project}
                displayProperties={displayProperties}
                issueCount={issueCounts[project.slug] ?? 0}
                reorderTargets={reorderTargets}
                onReorder={onReorder}
              />
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}
