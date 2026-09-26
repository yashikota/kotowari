import { Button, Group, Menu } from '@mantine/core';
import { IconCheck, IconFilter, IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  INBOX_ACTIVITY_FILTERS,
  type InboxActivityFilter,
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

export function InboxFilterMenu({ filters, projects, handlers }: InboxFilterProps) {
  const { t } = useTranslation();
  const labels = filterLabels(t);
  const priorities = [0, 1, 2, 3, 4];
  const statuses: IssueStatus[] = ['backlog', 'todo', 'in_progress', 'done', 'canceled'];

  return (
    <Menu position="bottom-end" withinPortal>
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
      <Menu.Dropdown>
        <Menu.Sub>
          <Menu.Sub.Target>
            <Menu.Sub.Item>{t('inbox.filterNotificationType')}</Menu.Sub.Item>
          </Menu.Sub.Target>
          <Menu.Sub.Dropdown>
            {INBOX_ACTIVITY_FILTERS.map((filter) => (
              <Menu.Item
                key={filter}
                closeMenuOnClick={false}
                rightSection={
                  filters.activityTypes.includes(filter) ? <IconCheck size={14} /> : null
                }
                onClick={() => handlers.onToggleActivityFilter(filter)}
              >
                {labels[filter]}
              </Menu.Item>
            ))}
          </Menu.Sub.Dropdown>
        </Menu.Sub>
        <Menu.Sub>
          <Menu.Sub.Target>
            <Menu.Sub.Item>{t('inbox.filterProject')}</Menu.Sub.Item>
          </Menu.Sub.Target>
          <Menu.Sub.Dropdown>
            {projects.map((project) => (
              <Menu.Item
                key={project.id ?? 'none'}
                closeMenuOnClick={false}
                rightSection={
                  filters.projectIds.includes(project.id) ? <IconCheck size={14} /> : null
                }
                onClick={() => handlers.onToggleProjectFilter(project.id)}
              >
                {project.name}
              </Menu.Item>
            ))}
          </Menu.Sub.Dropdown>
        </Menu.Sub>
        <Menu.Sub>
          <Menu.Sub.Target>
            <Menu.Sub.Item>{t('inbox.filterIssuePriority')}</Menu.Sub.Item>
          </Menu.Sub.Target>
          <Menu.Sub.Dropdown>
            {priorities.map((priority) => (
              <Menu.Item
                key={priority}
                closeMenuOnClick={false}
                rightSection={
                  filters.priorities.includes(priority) ? <IconCheck size={14} /> : null
                }
                onClick={() => handlers.onTogglePriorityFilter(priority)}
              >
                {t(`priority.${priority}`)}
              </Menu.Item>
            ))}
          </Menu.Sub.Dropdown>
        </Menu.Sub>
        <Menu.Sub>
          <Menu.Sub.Target>
            <Menu.Sub.Item>{t('inbox.filterIssueStatusType')}</Menu.Sub.Item>
          </Menu.Sub.Target>
          <Menu.Sub.Dropdown>
            {statuses.map((status) => (
              <Menu.Item
                key={status}
                closeMenuOnClick={false}
                rightSection={filters.statuses.includes(status) ? <IconCheck size={14} /> : null}
                onClick={() => handlers.onToggleStatusFilter(status)}
              >
                {t(`issueStatus.${status}`)}
              </Menu.Item>
            ))}
          </Menu.Sub.Dropdown>
        </Menu.Sub>
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
