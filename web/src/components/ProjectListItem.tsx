import { Badge, Box, Group, Progress, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { RouterNavLink } from '../mantine-ui.tsx';
import { formatCalendarDate } from '../time.ts';
import type { ProjectDisplayProperty } from '../project-display.ts';
import { priorityLabel } from '../i18n/labels.ts';
import type { Project } from '../types.ts';
import { ProjectIconMark } from './ProjectIcon.tsx';
import { useProjectWorkflow, projectWorkflowStatusLabel } from '../project-workflow.tsx';

const STATUS_COLORS: Record<string, string> = {
  started: 'indigo',
  completed: 'teal',
  canceled: 'red',
};

export function ProjectListItem({
  project,
  displayProperties,
  issueCount = 0,
}: {
  project: Project;
  displayProperties: ProjectDisplayProperty[];
  issueCount?: number;
}) {
  const { t, i18n } = useTranslation();
  const { statuses } = useProjectWorkflow();
  const shows = (property: ProjectDisplayProperty) => displayProperties.includes(property);
  const progress = Math.round(project.progress * 100);
  const indicatorColor =
    project.status === 'started'
      ? 'var(--mantine-color-indigo-6)'
      : project.status === 'completed'
        ? 'var(--mantine-color-teal-6)'
        : project.status === 'canceled'
          ? 'var(--mantine-color-red-6)'
          : 'var(--mantine-color-gray-5)';

  return (
    <RouterNavLink
      to="/projects/$slug"
      params={{ slug: project.slug }}
      label={
        <Stack gap={2}>
          <Text size="sm" fw={500} truncate>
            {project.name}
          </Text>
          {shows('summary') && (project.summary || project.description) ? (
            <Text size="xs" c="dimmed" lineClamp={1}>
              {project.summary || project.description}
            </Text>
          ) : null}
        </Stack>
      }
      leftSection={
        <Group gap="sm" wrap="nowrap">
          <ProjectIconMark icon={project.icon} color={project.iconColor} />
          {shows('status') ? (
            <Box
              w={3}
              h={22}
              style={{ borderRadius: 2, backgroundColor: indicatorColor }}
              aria-hidden
            />
          ) : null}
        </Group>
      }
      rightSection={
        <Group gap="xs" wrap="wrap" justify="flex-end">
          {shows('id') ? (
            <Text size="xs" c="dimmed">
              #{project.id}
            </Text>
          ) : null}
          {shows('priority') ? (
            <Badge variant="light" color="gray" size="sm">
              {priorityLabel(project.priority)}
            </Badge>
          ) : null}
          {shows('status') ? (
            <Badge variant="light" color={STATUS_COLORS[project.status] ?? 'gray'} size="sm">
              {projectWorkflowStatusLabel(project.workflowStatus ?? project.status, statuses, t)}
            </Badge>
          ) : null}
          {shows('health') ? (
            <Badge
              variant="light"
              color={
                project.health === 'on_track'
                  ? 'teal'
                  : project.health === 'at_risk'
                    ? 'yellow'
                    : project.health === 'off_track'
                      ? 'red'
                      : 'gray'
              }
              size="sm"
            >
              {t(`projectHealth.status.${project.health || 'none'}`)}
            </Badge>
          ) : null}
          {shows('progress') ? (
            <Progress
              aria-label={t('ui.projectProgress', { progress })}
              value={progress}
              w={92}
              size="sm"
            />
          ) : null}
          {shows('startDate') ? (
            <Text size="xs" c="dimmed">
              {project.startDate
                ? formatCalendarDate(project.startDate, i18n.language)
                : t('projectList.noStartDate')}
            </Text>
          ) : null}
          {shows('targetDate') ? (
            <Text size="xs" c="dimmed">
              {project.targetDate
                ? formatCalendarDate(project.targetDate, i18n.language)
                : t('projectList.noTargetDate')}
            </Text>
          ) : null}
          {shows('milestones') ? (
            <Badge variant="outline" color="gray" size="sm">
              {t('projectList.milestonesCount', { count: project.milestones.length })}
            </Badge>
          ) : null}
          {shows('dependencies') ? (
            <Badge variant="outline" color="gray" size="sm">
              {t('projectList.dependenciesCount', { count: project.dependencies?.length ?? 0 })}
            </Badge>
          ) : null}
          {shows('issues') ? (
            <Badge variant="outline" color="gray" size="sm">
              {t('projectList.issuesCount', { count: issueCount })}
            </Badge>
          ) : null}
          {shows('labels')
            ? (project.labels ?? []).slice(0, 2).map((label) => (
                <Badge key={label} variant="outline" color="gray" size="sm">
                  {label}
                </Badge>
              ))
            : null}
          {shows('created') ? (
            <Text size="xs" c="dimmed">
              {t('projectList.createdDate', {
                date: formatCalendarDate(project.createdAt, i18n.language),
              })}
            </Text>
          ) : null}
          {shows('updated') ? (
            <Text size="xs" c="dimmed">
              {t('projectList.updatedDate', {
                date: formatCalendarDate(project.updatedAt, i18n.language),
              })}
            </Text>
          ) : null}
          {shows('completed') && project.completedAt ? (
            <Text size="xs" c="dimmed">
              {t('projectList.completedDate', {
                date: formatCalendarDate(project.completedAt, i18n.language),
              })}
            </Text>
          ) : null}
        </Group>
      }
      styles={{
        root: {
          minHeight: 48,
          padding: '6px 18px',
          borderBottom: '1px solid var(--mantine-color-default-border)',
        },
        body: { minWidth: 0 },
        label: { minWidth: 120, fontSize: 'var(--mantine-font-size-sm)', fontWeight: 500 },
        section: { flexShrink: 0 },
      }}
    />
  );
}
