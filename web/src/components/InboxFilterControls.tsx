import { Button, Group, Menu, TextInput } from '@mantine/core';
import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconFilter,
  IconX,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  INBOX_ACTIVITY_FILTERS,
  type InboxActivityFilter,
  type InboxFilterFacet,
  type InboxFilterMenuState,
  type InboxFilters,
} from '../inbox-filter.ts';
import type { IssueStatus } from '../types.ts';
import styles from './InboxFilterControls.module.css';

export type InboxProjectOption = { id: number | null; name: string };

export type InboxFilterHandlers = {
  onToggleActivityFilter: (value: InboxActivityFilter) => void;
  onToggleProjectFilter: (value: number | null) => void;
  onTogglePriorityFilter: (value: number) => void;
  onToggleStatusFilter: (value: IssueStatus) => void;
  onClearFilters: () => void;
};

export type InboxFilterMenuHandlers = InboxFilterHandlers & {
  onSetFilterMenuOpen: (open: boolean) => void;
  onSetFilterMenuQuery: (query: string) => void;
  onSelectFilterFacet: (facet: InboxFilterFacet) => void;
  onBackToFilterFacets: () => void;
};

type InboxFilterProps = {
  filters: InboxFilters;
  projects: InboxProjectOption[];
  handlers: InboxFilterHandlers;
};

function filterLabels(
  t: ReturnType<typeof useTranslation>['t'],
): Record<InboxActivityFilter, string> {
  return {
    changes: t('inbox.filterChanges'),
    comments: t('inbox.filterComments'),
    reactions: t('inbox.filterReactions'),
    attachments: t('inbox.filterAttachments'),
  };
}

type FilterOption = {
  key: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
};

type InboxFilterMenuProps = InboxFilterProps & {
  menu: InboxFilterMenuState;
  handlers: InboxFilterMenuHandlers;
};

export function InboxFilterMenu({ filters, projects, menu, handlers }: InboxFilterMenuProps) {
  const { t } = useTranslation();
  const labels = filterLabels(t);
  const priorities = [0, 1, 2, 3, 4];
  const statuses: IssueStatus[] = ['backlog', 'todo', 'in_progress', 'done', 'canceled'];
  const query = menu.query.trim().toLocaleLowerCase();
  const facets: Array<{ id: InboxFilterFacet; label: string }> = [
    { id: 'activityTypes', label: t('inbox.filterNotificationType') },
    { id: 'projectIds', label: t('inbox.filterProject') },
    { id: 'priorities', label: t('inbox.filterIssuePriority') },
    { id: 'statuses', label: t('inbox.filterIssueStatusType') },
  ];
  const options: FilterOption[] =
    menu.facet === 'activityTypes'
      ? INBOX_ACTIVITY_FILTERS.map((filter) => ({
          key: filter,
          label: labels[filter],
          selected: filters.activityTypes.includes(filter),
          onSelect: () => handlers.onToggleActivityFilter(filter),
        }))
      : menu.facet === 'projectIds'
        ? projects.map((project) => ({
            key: String(project.id ?? 'none'),
            label: project.name,
            selected: filters.projectIds.includes(project.id),
            onSelect: () => handlers.onToggleProjectFilter(project.id),
          }))
        : menu.facet === 'priorities'
          ? priorities.map((priority) => ({
              key: String(priority),
              label: t(`priority.${priority}`),
              selected: filters.priorities.includes(priority),
              onSelect: () => handlers.onTogglePriorityFilter(priority),
            }))
          : menu.facet === 'statuses'
            ? statuses.map((status) => ({
                key: status,
                label: t(`issueStatus.${status}`),
                selected: filters.statuses.includes(status),
                onSelect: () => handlers.onToggleStatusFilter(status),
              }))
            : [];
  const visibleFacets = facets.filter((facet) => facet.label.toLocaleLowerCase().includes(query));
  const visibleOptions = options.filter((option) =>
    option.label.toLocaleLowerCase().includes(query),
  );

  return (
    <Menu
      opened={menu.open}
      onChange={handlers.onSetFilterMenuOpen}
      position="bottom-start"
      width={280}
      withinPortal
    >
      <Menu.Target>
        <Button
          type="button"
          variant="subtle"
          color="gray"
          size="compact-sm"
          leftSection={<IconFilter size={14} />}
          aria-label={t('inbox.addFilter')}
        >
          {t('inbox.addFilter')}
        </Button>
      </Menu.Target>
      <Menu.Dropdown aria-label={t('inbox.addFilter')}>
        <TextInput
          autoFocus
          size="xs"
          value={menu.query}
          placeholder={t('inbox.filterSearch')}
          aria-label={t('inbox.filterSearch')}
          onChange={(event) => handlers.onSetFilterMenuQuery(event.currentTarget.value)}
        />
        <Menu.Divider />
        {menu.facet ? (
          <>
            <Menu.Item
              closeMenuOnClick={false}
              leftSection={<IconChevronLeft size={14} />}
              onClick={handlers.onBackToFilterFacets}
            >
              {t('inbox.backToFilters')}
            </Menu.Item>
            <Menu.Divider />
            {visibleOptions.length > 0 ? (
              visibleOptions.map((option) => (
                <Menu.Item
                  key={option.key}
                  closeMenuOnClick={false}
                  rightSection={option.selected ? <IconCheck size={14} /> : null}
                  onClick={option.onSelect}
                >
                  {option.label}
                </Menu.Item>
              ))
            ) : (
              <Menu.Item disabled>{t('inbox.noFilterResults')}</Menu.Item>
            )}
          </>
        ) : visibleFacets.length > 0 ? (
          visibleFacets.map((facet) => (
            <Menu.Item
              key={facet.id}
              closeMenuOnClick={false}
              rightSection={<IconChevronRight size={14} />}
              onClick={() => handlers.onSelectFilterFacet(facet.id)}
            >
              {facet.label}
            </Menu.Item>
          ))
        ) : (
          <Menu.Item disabled>{t('inbox.noFilterResults')}</Menu.Item>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}

export function InboxFilterChips({ filters, projects, handlers }: InboxFilterProps) {
  const { t } = useTranslation();
  const labels = filterLabels(t);
  const activeFilters = [
    ...filters.activityTypes.map((filter) => ({
      key: `type:${filter}`,
      label: `${t('inbox.filterNotificationType')}: ${labels[filter]}`,
      onRemove: () => handlers.onToggleActivityFilter(filter),
    })),
    ...filters.projectIds.map((projectId) => ({
      key: `project:${projectId ?? 'none'}`,
      label: `${t('inbox.filterProject')}: ${projects.find((project) => project.id === projectId)?.name ?? t('issueProperties.noProject')}`,
      onRemove: () => handlers.onToggleProjectFilter(projectId),
    })),
    ...filters.priorities.map((priority) => ({
      key: `priority:${priority}`,
      label: `${t('inbox.filterIssuePriority')}: ${t(`priority.${priority}`)}`,
      onRemove: () => handlers.onTogglePriorityFilter(priority),
    })),
    ...filters.statuses.map((status) => ({
      key: `status:${status}`,
      label: `${t('inbox.filterIssueStatusType')}: ${t(`issueStatus.${status}`)}`,
      onRemove: () => handlers.onToggleStatusFilter(status),
    })),
  ];

  if (activeFilters.length === 0) return null;

  return (
    <Group
      role="group"
      aria-label={t('inbox.activeFilters')}
      gap={6}
      wrap="wrap"
      className={styles.filterChips}
    >
      {activeFilters.map((filter) => (
        <Button
          key={filter.key}
          type="button"
          size="compact-xs"
          variant="light"
          color="gray"
          rightSection={<IconX size={12} aria-hidden />}
          aria-label={t('inbox.removeFilter', { filter: filter.label })}
          onClick={filter.onRemove}
        >
          {filter.label}
        </Button>
      ))}
      <Button
        type="button"
        size="compact-xs"
        variant="subtle"
        color="gray"
        onClick={handlers.onClearFilters}
      >
        {t('inbox.clearFilters')}
      </Button>
    </Group>
  );
}
