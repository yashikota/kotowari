import { Group, Progress, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

export function CycleProgressSummary({
  scope,
  started,
  startedPercent,
  completed,
  completionPercent,
}: {
  scope: number;
  started: number;
  startedPercent: number;
  completed: number;
  completionPercent: number;
}) {
  const { t } = useTranslation();

  return (
    <Stack component="section" aria-label={t('cycle.progressHeading')} gap="sm">
      <Text size="sm" fw={550}>
        {t('cycle.progressHeading')}
      </Text>
      <Group grow align="flex-start" gap="md">
        <Stack gap={4}>
          <Text size="xs" c="dimmed">
            {t('cycle.scope')}
          </Text>
          <Text size="sm">{scope}</Text>
        </Stack>
        <Stack gap={4}>
          <Text size="xs" c="dimmed">
            {t('cycle.started')}
          </Text>
          <Text size="sm">
            {started} · {startedPercent}%
          </Text>
        </Stack>
        <Stack gap={4}>
          <Text size="xs" c="dimmed">
            {t('cycle.completed')}
          </Text>
          <Text size="sm">
            {completed} · {completionPercent}%
          </Text>
        </Stack>
      </Group>
      <Progress
        aria-label={t('cycle.progress')}
        aria-valuetext={`${completionPercent}%`}
        value={completionPercent}
        size="sm"
      />
    </Stack>
  );
}
