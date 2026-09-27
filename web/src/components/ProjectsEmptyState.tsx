import { Link } from '@tanstack/react-router';
import { Button, Group, Kbd, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

const shortcutKeyStyle = {
  background: 'rgba(255, 255, 255, 0.22)',
  color: 'inherit',
  fontSize: 10,
  lineHeight: 1,
  padding: '2px 3px',
};

export function ProjectsEmptyState({ onCreateProject }: { onCreateProject: () => void }) {
  const { t } = useTranslation();

  return (
    <Stack
      component="section"
      aria-label={t('nav.projects')}
      align="flex-start"
      justify="center"
      gap="sm"
      px="md"
      py="xl"
      style={{ flex: 1, minHeight: 320, width: 'min(352px, 100%)', marginInline: 'auto' }}
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
      <Text component="h2" fw={600} size="md">
        {t('nav.projects')}
      </Text>
      <Text c="dimmed" size="sm" maw={320}>
        {t('projectList.empty')}
      </Text>
      <Group gap={8} mt="xs" justify="flex-start" wrap="wrap">
        <Button
          type="button"
          variant="filled"
          size="xs"
          style={{ paddingInline: 8 }}
          aria-label={t('projectList.emptyCreate')}
          onClick={onCreateProject}
        >
          <Group component="span" gap={6} wrap="nowrap">
            <Text component="span">{t('projectList.emptyCreate')}</Text>
            <Kbd style={shortcutKeyStyle}>N</Kbd>
            <Text component="span" size="xs">
              {t('ui.shortcutThen')}
            </Text>
            <Kbd style={shortcutKeyStyle}>P</Kbd>
          </Group>
        </Button>
        <Button component={Link} to="/pages" variant="default" size="xs">
          {t('projectList.emptyDocumentation')}
        </Button>
      </Group>
    </Stack>
  );
}
