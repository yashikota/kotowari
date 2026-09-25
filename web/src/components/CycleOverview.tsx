import { Box, Group, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { Cycle } from '../types.ts';
import type { CycleProgressPoint } from '../cycle-progress.ts';
import { CycleProgressChart } from './CycleProgressChart.tsx';
import styles from './CycleOverview.module.css';

export function CycleOverview({
  cycle,
  points,
  scope,
  started,
  startedPercent,
  completed,
  completionPercent,
  locale,
}: {
  cycle: Cycle;
  points: CycleProgressPoint[];
  scope: number;
  started: number;
  startedPercent: number;
  completed: number;
  completionPercent: number;
  locale: string;
}) {
  const { t } = useTranslation();

  return (
    <Box
      component="section"
      aria-label={t('cycle.currentOverview')}
      px="md"
      py="sm"
      className={styles.overview}
    >
      <Box className={styles.layout}>
        <Box style={{ minWidth: 0 }}>
          <CycleProgressChart cycle={cycle} points={points} locale={locale} showLegend={false} />
        </Box>
        <Stack
          component="section"
          aria-label={t('cycle.progressHeading')}
          gap={0}
          style={{ minWidth: 0 }}
        >
          <OverviewStat label={t('cycle.scope')} value={String(scope)} />
          <OverviewStat label={t('cycle.started')} value={`${started} · ${startedPercent}%`} />
          <OverviewStat
            label={t('cycle.completed')}
            value={`${completed} · ${completionPercent}%`}
          />
        </Stack>
      </Box>
    </Box>
  );
}

function OverviewStat({ label, value }: { label: string; value: string }) {
  return (
    <Group
      justify="space-between"
      gap="sm"
      wrap="nowrap"
      py="xs"
      style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
    >
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={500}>
        {value}
      </Text>
    </Group>
  );
}
