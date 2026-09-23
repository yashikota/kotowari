import { Badge, Box, Group, Progress, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { RouterNavLink } from '../mantine-ui.tsx';
import type { Project } from '../types.ts';

const STATUS_COLORS: Record<string, string> = {
  started: 'indigo',
  completed: 'teal',
  canceled: 'red',
};

export function ProjectListItem({ project }: { project: Project }) {
  const { t } = useTranslation();
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
      label={project.name}
      leftSection={
        <Box
          w={3}
          h={22}
          style={{ borderRadius: 2, backgroundColor: indicatorColor }}
          aria-hidden
        />
      }
      rightSection={
        <Group gap="md" wrap="nowrap">
          <Badge variant="light" color={STATUS_COLORS[project.status] ?? 'gray'} size="sm">
            {t(`projectStatus.${project.status}`)}
          </Badge>
          <Progress
            aria-label={t('ui.projectProgress', { progress })}
            value={progress}
            w={112}
            size="sm"
          />
          <Text size="xs" c="dimmed" w={92} ta="right" visibleFrom="sm">
            {project.targetDate ? project.targetDate.slice(0, 10) : 'No target date'}
          </Text>
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
