import { ActionIcon, Badge, Group, Progress, Text } from '@mantine/core';
import { IconGripVertical } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { ProjectDisplayProperty } from '../project-display.ts';
import { priorityLabel } from '../i18n/labels.ts';
import { formatCalendarDate } from '../time.ts';
import type { Project } from '../types.ts';
import { RouterNavLink } from '../mantine-ui.tsx';
import { useProjectWorkflow, projectWorkflowStatusLabel } from '../project-workflow.tsx';
import { ProjectIconMark } from './ProjectIcon.tsx';
import styles from './ProjectListView.module.css';

const STATUS_COLORS: Record<string, string> = {
  started: 'indigo',
  completed: 'teal',
  canceled: 'red',
};

function EmptyValue() {
  return (
    <Text component="span" size="xs" c="dimmed">
      —
    </Text>
  );
}

export function ProjectListItem({
  project,
  displayProperties,
  issueCount = 0,
  reorderTargets = [],
  onReorder,
}: {
  project: Project;
  displayProperties: ProjectDisplayProperty[];
  issueCount?: number;
  reorderTargets?: string[];
  onReorder?: (source: string, target: string, direction: -1 | 1) => void;
}) {
  const { t, i18n } = useTranslation();
  const { statuses } = useProjectWorkflow();
  const progress = Math.round(project.progress * 100);
  const status = project.workflowStatus ?? project.status;
  const reorderable = Boolean(onReorder);
  const reorderAt = (direction: -1 | 1) => {
    const index = reorderTargets.indexOf(project.slug);
    const target = reorderTargets[index + direction];
    if (target) onReorder?.(project.slug, target, direction);
  };
  const health = project.health ?? 'none';
  const date = (value: string | null | undefined) =>
    value ? formatCalendarDate(value, i18n.language) : <EmptyValue />;

  return (
    <tr
      className={styles.projectRow}
      data-project-list-row={project.slug}
      onDragOver={(event) => {
        if (reorderable && Array.from(event.dataTransfer.types).includes('text/plain')) {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
        }
      }}
      onDrop={(event) => {
        if (!reorderable) return;
        const source = event.dataTransfer.getData('text/plain');
        if (source && source !== project.slug) {
          event.preventDefault();
          onReorder?.(source, project.slug, -1);
        }
      }}
    >
      <td className={`${styles.cell} ${styles.nameCell}`}>
        <div className={styles.nameContent}>
          {reorderable ? (
            <ActionIcon
              type="button"
              variant="subtle"
              color="gray"
              size="sm"
              aria-label={t('projectList.moveProject', { project: project.name })}
              title={t('projectList.moveProjectHint')}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData('text/plain', project.slug);
                event.dataTransfer.effectAllowed = 'move';
              }}
              onKeyDown={(event) => {
                if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
                event.preventDefault();
                reorderAt(event.key === 'ArrowUp' ? -1 : 1);
              }}
            >
              <IconGripVertical size={16} aria-hidden="true" />
            </ActionIcon>
          ) : null}
          <RouterNavLink
            className={styles.projectLink}
            to="/projects/$slug"
            params={{ slug: project.slug }}
            label={
              <span className={styles.projectTitle}>
                <Text component="span" size="sm" fw={500} truncate>
                  {project.name}
                </Text>
              </span>
            }
            leftSection={<ProjectIconMark icon={project.icon} color={project.iconColor} />}
            styles={{ root: { minWidth: 0 }, body: { minWidth: 0 }, label: { minWidth: 0 } }}
          />
        </div>
      </td>
      {displayProperties.map((property) => (
        <td className={styles.cell} key={property} data-project-property={property}>
          {property === 'id' ? (
            <Text size="xs" c="dimmed">
              #{project.id}
            </Text>
          ) : property === 'summary' ? (
            <Text
              size="xs"
              c={project.summary || project.description ? undefined : 'dimmed'}
              lineClamp={1}
            >
              {project.summary || project.description || '—'}
            </Text>
          ) : property === 'priority' ? (
            <Badge variant="light" color="gray" size="sm">
              {priorityLabel(project.priority)}
            </Badge>
          ) : property === 'status' ? (
            <Badge variant="light" color={STATUS_COLORS[status] ?? 'gray'} size="sm">
              {projectWorkflowStatusLabel(status, statuses, t)}
            </Badge>
          ) : property === 'health' ? (
            <Badge
              variant="light"
              color={
                health === 'on_track'
                  ? 'teal'
                  : health === 'at_risk'
                    ? 'yellow'
                    : health === 'off_track'
                      ? 'red'
                      : 'gray'
              }
            >
              {t(`projectHealth.status.${health}`)}
            </Badge>
          ) : property === 'lead' ? (
            <Text size="xs" c="dimmed">
              {project.lead === 'self' ? t('projectList.leadYou') : t('projectList.leadUnassigned')}
            </Text>
          ) : property === 'progress' ? (
            <Group gap={6} wrap="nowrap" className={styles.progressCell}>
              <Progress
                aria-label={t('ui.projectProgress', { progress })}
                value={progress}
                size="sm"
              />
              <Text size="xs" c="dimmed">
                {progress}%
              </Text>
            </Group>
          ) : property === 'startDate' ? (
            <Text size="xs" c="dimmed">
              {date(project.startDate)}
            </Text>
          ) : property === 'targetDate' ? (
            <Text size="xs" c="dimmed">
              {date(project.targetDate)}
            </Text>
          ) : property === 'milestones' ? (
            project.milestones.length ? (
              <Group gap={4} wrap="nowrap">
                <Badge
                  variant="outline"
                  color="gray"
                  size="sm"
                  title={project.milestones.map((item) => item.name).join(', ')}
                >
                  {project.milestones[0].name}
                </Badge>
                {project.milestones.length > 1 ? (
                  <Text size="xs" c="dimmed">
                    +{project.milestones.length - 1}
                  </Text>
                ) : null}
              </Group>
            ) : (
              <EmptyValue />
            )
          ) : property === 'dependencies' ? (
            project.dependencies?.length ? (
              <Badge variant="outline" color="gray" size="sm">
                {t('projectList.dependenciesCount', { count: project.dependencies.length })}
              </Badge>
            ) : (
              <EmptyValue />
            )
          ) : property === 'issues' ? (
            <Text size="xs" c={issueCount ? undefined : 'dimmed'}>
              {t('projectList.issuesCount', { count: issueCount })}
            </Text>
          ) : property === 'labels' ? (
            project.labels?.length ? (
              <Group gap={4} wrap="nowrap" className={styles.labelsCell}>
                {project.labels.slice(0, 2).map((label) => (
                  <Badge key={label} variant="outline" color="gray" size="sm">
                    {label}
                  </Badge>
                ))}
                {project.labels.length > 2 ? (
                  <Text size="xs" c="dimmed">
                    +{project.labels.length - 2}
                  </Text>
                ) : null}
              </Group>
            ) : (
              <EmptyValue />
            )
          ) : property === 'created' ? (
            <Text size="xs" c="dimmed">
              {date(project.createdAt)}
            </Text>
          ) : property === 'updated' ? (
            <Text size="xs" c="dimmed">
              {date(project.updatedAt)}
            </Text>
          ) : property === 'completed' ? (
            <Text size="xs" c="dimmed">
              {date(project.completedAt)}
            </Text>
          ) : null}
        </td>
      ))}
    </tr>
  );
}
