import { Badge, Box, Card, Group, Progress, Stack, Text } from '@mantine/core';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { priorityLabel } from '../i18n/labels.ts';
import type { Project } from '../types.ts';

export type ProjectBoardModel = {
  columns: { key: string; label: string }[];
  rows: { key: string; label: string; cells: Record<string, Project[]> }[];
};

export function ProjectBoardView({
  model,
  showRows,
}: {
  model: ProjectBoardModel;
  showRows: boolean;
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
                      <ProjectBoardCard key={project.slug} project={project} />
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

function ProjectBoardCard({ project }: { project: Project }) {
  const { t } = useTranslation();
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
          <Text size="sm" fw={550} lineClamp={2}>
            {project.name}
          </Text>
          <Group gap={6} wrap="wrap">
            <Badge size="xs" variant="light" color="gray">
              {priorityLabel(project.priority)}
            </Badge>
            {(project.labels ?? []).slice(0, 3).map((label) => (
              <Badge key={label} size="xs" variant="outline" color="gray">
                {label}
              </Badge>
            ))}
            {(project.labels?.length ?? 0) > 3 ? (
              <Text size="xs" c="dimmed">
                +{project.labels!.length - 3}
              </Text>
            ) : null}
          </Group>
          {project.description ? (
            <Text size="xs" c="dimmed" lineClamp={2}>
              {project.description}
            </Text>
          ) : null}
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
          {project.targetDate ? (
            <Text size="xs" c="dimmed">
              {t('projectList.targetDate')}: {project.targetDate.slice(0, 10)}
            </Text>
          ) : null}
        </Stack>
      </Card>
    </Link>
  );
}
