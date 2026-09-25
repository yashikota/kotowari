import { Link } from '@tanstack/react-router';
import { Button, Group, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

export function ProjectsEmptyState({ onCreateProject }: { onCreateProject: () => void }) {
  const { t } = useTranslation();

  return (
    <Stack
      component="section"
      aria-label={t('nav.projects')}
      align="center"
      justify="center"
      gap="sm"
      px="md"
      py="xl"
      style={{ flex: 1, minHeight: 320 }}
    >
      <svg
        aria-hidden="true"
        width="72"
        height="60"
        viewBox="0 0 72 60"
        fill="none"
        stroke="var(--mantine-color-dimmed)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      >
        <g transform="translate(24 0)">
          <path d="m11 0 11 6-11 6L0 6 11 0Z M0 6v12l11 6V12 M22 6v12l-11 6V12" />
        </g>
        <g transform="translate(12 14)">
          <path d="m11 0 11 6-11 6L0 6 11 0Z M0 6v12l11 6V12 M22 6v12l-11 6V12" />
        </g>
        <g transform="translate(36 14)">
          <path d="m11 0 11 6-11 6L0 6 11 0Z M0 6v12l11 6V12 M22 6v12l-11 6V12" />
        </g>
        <g transform="translate(0 28)">
          <path d="m11 0 11 6-11 6L0 6 11 0Z M0 6v12l11 6V12 M22 6v12l-11 6V12" />
        </g>
        <g transform="translate(24 28)">
          <path d="m11 0 11 6-11 6L0 6 11 0Z M0 6v12l11 6V12 M22 6v12l-11 6V12" />
        </g>
        <g transform="translate(48 28)">
          <path d="m11 0 11 6-11 6L0 6 11 0Z M0 6v12l11 6V12 M22 6v12l-11 6V12" />
        </g>
      </svg>
      <Text component="h2" fw={600} size="md" ta="center">
        {t('nav.projects')}
      </Text>
      <Text c="dimmed" size="sm" ta="center" maw={440}>
        {t('projectList.empty')}
      </Text>
      <Group gap="xs" mt="xs" justify="center" wrap="wrap">
        <Button type="button" variant="default" onClick={onCreateProject}>
          {t('projectList.emptyCreate')}
        </Button>
        <Button component={Link} to="/pages" variant="default">
          {t('projectList.emptyDocumentation')}
        </Button>
        <Text size="xs" c="dimmed">
          {t('ui.shortcutProjectSequence')}
        </Text>
      </Group>
    </Stack>
  );
}
