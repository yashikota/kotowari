import { Badge, Box, Card, Group, Progress, Stack, Text } from '@mantine/core';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { priorityLabel } from '../i18n/labels.ts';
import { formatCalendarDate } from '../time.ts';
import type { ProjectDisplayProperty } from '../project-display.ts';
import type { Project } from '../types.ts';
import { ProjectIconMark } from './ProjectIcon.tsx';

export type ProjectBoardModel = {
  columns: { key: string; label: string }[];
  rows: { key: string; label: string; cells: Record<string, Project[]> }[];
};

export function ProjectBoardView({
  model,
  showRows,
  displayProperties,
  issueCounts,
}: {
  model: ProjectBoardModel;
  showRows: boolean;
  displayProperties: ProjectDisplayProperty[];
  issueCounts: Record<string, number>;
}) {
  const { t } = useTranslation();
  const rowHeaderWidth = showRows ? 144 : 0;
  const templateColumns = `${showRows ? `${rowHeaderWidth}px ` : ''}repeat(${model.columns.length}, minmax(248px, 1fr))`;

  return (
    <Box role="grid" aria-label={t('projectList.projectBoard')} style={{ overflowX: 'auto' }}>
      <Box style={{ minWidth: `${rowHeaderWidth + model.columns.length * 256}px` }}>
        <Box
          role="row"
          style={{
            display: 'grid',
            gridTemplateColumns: templateColumns,
            gap: 8,
            marginBottom: 8,
          }}
        >
          {showRows ? <Box role="columnheader" aria-hidden /> : null}
          {model.columns.map((column) => {
            const count = model.rows.reduce(
              (total, row) => total + (row.cells[column.key]?.length ?? 0),
              0,
            );
            return (
              <Group
                key={column.key}
                role="columnheader"
                aria-label={column.label}
                justify="space-between"
                px="xs"
                py={6}
                wrap="nowrap"
              >
                <Text size="sm" fw={600} truncate>
                  {column.label}
                </Text>
                <Badge size="sm" variant="light" color="gray">
                  {count}
                </Badge>
              </Group>
            );
          })}
        </Box>
        <Stack gap="sm">
          {model.rows.map((row) => (
            <Box
              key={row.key}
              role="row"
              style={{ display: 'grid', gridTemplateColumns: templateColumns, gap: 8 }}
            >
              {showRows ? (
                <Group
                  role="rowheader"
                  align="flex-start"
                  justify="space-between"
                  wrap="nowrap"
                  pt="xs"
                >
                  <Text size="sm" fw={500} truncate>
                    {row.label}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {Object.values(row.cells).reduce(
                      (total, projects) => total + projects.length,
                      0,
                    )}
                  </Text>
                </Group>
              ) : null}
              {model.columns.map((column) => {
                const projects = row.cells[column.key] ?? [];
                return (
                  <Stack
                    key={column.key}
                    role="gridcell"
                    aria-label={showRows ? `${column.label} · ${row.label}` : column.label}
                    gap="xs"
                    p={8}
                    mih={112}
                    style={{
                      borderRadius: 'var(--mantine-radius-md)',
                      background: 'var(--mantine-color-default-hover)',
                    }}
                  >
                    {projects.map((project) => (
                      <ProjectBoardCard
                        key={project.slug}
                        project={project}
                        displayProperties={displayProperties}
                        issueCount={issueCounts[project.slug] ?? 0}
                      />
                    ))}
                  </Stack>
                );
              })}
            </Box>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}

function ProjectBoardCard({
  project,
  displayProperties,
  issueCount,
}: {
  project: Project;
  displayProperties: ProjectDisplayProperty[];
  issueCount: number;
}) {
  const { t, i18n } = useTranslation();
  const shows = (property: ProjectDisplayProperty) => displayProperties.includes(property);
  const progress = Math.round(project.progress * 100);
  return (
    <Link
      to="/projects/$slug"
      params={{ slug: project.slug }}
      style={{ color: 'inherit', textDecoration: 'none' }}
    >
      <Card
        component="article"
        withBorder
        radius="sm"
        padding="sm"
        shadow="xs"
        style={{ background: 'var(--mantine-color-body)' }}
      >
        <Stack gap="xs">
          {shows('id') ? (
            <Text size="xs" c="dimmed">
              #{project.id}
            </Text>
          ) : null}
          <Group gap="xs" wrap="nowrap" align="flex-start">
            <ProjectIconMark icon={project.icon} color={project.iconColor} size={18} />
            <Text size="sm" fw={550} lineClamp={2}>
              {project.name}
            </Text>
          </Group>
          {shows('priority') || shows('status') || shows('health') || shows('labels') ? (
            <Group gap={6} wrap="wrap">
              {shows('priority') ? (
                <Badge size="xs" variant="light" color="gray">
                  {priorityLabel(project.priority)}
                </Badge>
              ) : null}
              {shows('status') ? (
                <Badge size="xs" variant="light" color="gray">
                  {t(`projectStatus.${project.status}`)}
                </Badge>
              ) : null}
              {shows('health') ? (
                <Badge
                  size="xs"
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
                >
                  {t(`projectHealth.status.${project.health || 'none'}`)}
                </Badge>
              ) : null}
              {shows('labels')
                ? (project.labels ?? []).slice(0, 3).map((label) => (
                    <Badge key={label} size="xs" variant="outline" color="gray">
                      {label}
                    </Badge>
                  ))
                : null}
              {shows('labels') && (project.labels?.length ?? 0) > 3 ? (
                <Text size="xs" c="dimmed">
                  +{project.labels!.length - 3}
                </Text>
              ) : null}
            </Group>
          ) : null}
          {shows('summary') && (project.summary || project.description) ? (
            <Text size="xs" c="dimmed" lineClamp={2}>
              {project.summary || project.description}
            </Text>
          ) : null}
          {shows('milestones') || shows('dependencies') || shows('issues') ? (
            <Group gap={6} wrap="wrap">
              {shows('milestones') ? (
                <Badge size="xs" variant="outline" color="gray">
                  {t('projectList.milestonesCount', { count: project.milestones.length })}
                </Badge>
              ) : null}
              {shows('dependencies') ? (
                <Badge size="xs" variant="outline" color="gray">
                  {t('projectList.dependenciesCount', { count: project.dependencies?.length ?? 0 })}
                </Badge>
              ) : null}
              {shows('issues') ? (
                <Badge size="xs" variant="outline" color="gray">
                  {t('projectList.issuesCount', { count: issueCount })}
                </Badge>
              ) : null}
            </Group>
          ) : null}
          {shows('progress') ? (
            <Group gap="xs" wrap="nowrap" align="center">
              <Progress
                aria-label={t('ui.projectProgress', { progress })}
                value={progress}
                size="xs"
                flex={1}
              />
              <Text size="xs" c="dimmed" w={32} ta="right">
                {progress}%
              </Text>
            </Group>
          ) : null}
          {shows('startDate') && project.startDate ? (
            <Text size="xs" c="dimmed">
              {t('projectList.startDate')}: {formatCalendarDate(project.startDate, i18n.language)}
            </Text>
          ) : null}
          {shows('targetDate') && project.targetDate ? (
            <Text size="xs" c="dimmed">
              {t('projectList.targetDate')}: {formatCalendarDate(project.targetDate, i18n.language)}
            </Text>
          ) : null}
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
        </Stack>
      </Card>
    </Link>
  );
}
