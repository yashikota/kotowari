import { Button, Group, Kbd, Stack, Text } from '@mantine/core';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import styles from './ProjectsEmptyState.module.css';

const cubePositions = [
  [17, 0],
  [0, 8],
  [14, 17],
  [34, 8],
  [0, 26],
  [34, 26],
  [17, 36],
] as const;

function ProjectCube({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="m11 0 11 6-11 6L0 6 11 0Z" fill="currentColor" fillOpacity={0.05} />
      <path d="M0 6v12l11 6V12L0 6Z" fill="currentColor" fillOpacity={0.1} />
      <path d="M22 6v12l-11 6V12l11-6Z" fill="currentColor" fillOpacity={0.07} />
      <path d="m11 0 11 6-11 6L0 6 11 0Z M0 6v12l11 6V12 M22 6v12l-11 6V12" />
    </g>
  );
}

export function ProjectsEmptyState({ onCreateProject }: { onCreateProject: () => void }) {
  const { t } = useTranslation();

  return (
    <Stack
      component="section"
      aria-label={t('nav.projects')}
      className={styles.root}
      align="flex-start"
      justify="center"
      gap={0}
    >
      <svg
        aria-hidden="true"
        className={styles.illustration}
        width="77"
        height="80"
        viewBox="0 0 72 80"
        fill="none"
        stroke="color-mix(in srgb, var(--mantine-color-text) 30%, var(--mantine-color-dimmed))"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <g transform="translate(0 8) scale(1.15)">
          {cubePositions.map(([x, y]) => (
            <ProjectCube key={`${x}-${y}`} x={x} y={y} />
          ))}
        </g>
      </svg>
      <Text component="h2" className={styles.heading}>
        {t('nav.projects')}
      </Text>
      <Text c="dimmed" className={styles.description}>
        {t('projectList.empty')}
      </Text>
      <Group className={styles.actions} gap={8} justify="flex-start" wrap="wrap">
        <Button
          type="button"
          variant="filled"
          size="xs"
          className={styles.createButton}
          aria-label={t('projectList.emptyCreate')}
          onClick={onCreateProject}
        >
          <Group component="span" gap={8} wrap="nowrap">
            <Text component="span" className={styles.buttonLabel}>
              {t('projectList.emptyCreate')}
            </Text>
            <Group component="span" className={styles.shortcut} gap={3} wrap="nowrap">
              <Kbd className={styles.shortcutKey}>N</Kbd>
              <Text component="span" className={styles.shortcutThen}>
                {t('ui.shortcutThen')}
              </Text>
              <Kbd className={styles.shortcutKey}>P</Kbd>
            </Group>
          </Group>
        </Button>
        <Link to="/pages" className={styles.documentationLink}>
          {t('projectList.emptyDocumentation')}
        </Link>
      </Group>
    </Stack>
  );
}
