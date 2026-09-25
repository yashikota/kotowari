import { Button, Group, Stack, Text } from '@mantine/core';
import { IconStack2 } from '@tabler/icons-react';
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
      <IconStack2 size={30} stroke={1.5} color="var(--mantine-color-dimmed)" aria-hidden="true" />
      <Text component="h2" fw={600} size="md" ta="center">
        {t('nav.projects')}
      </Text>
      <Text c="dimmed" size="sm" ta="center" maw={440}>
        {t('projectList.empty')}
      </Text>
      <Group gap="xs" mt="xs">
        <Button type="button" variant="default" onClick={onCreateProject}>
          {t('projectList.emptyCreate')}
        </Button>
        <Text size="xs" c="dimmed">
          {t('ui.shortcutProjectSequence')}
        </Text>
      </Group>
    </Stack>
  );
}
