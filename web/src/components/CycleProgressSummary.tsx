import { Button, Group, Progress, Stack, Text } from '@mantine/core';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { IssueEstimateIcon } from './issue-ui.tsx';

export function CycleProgressSummary({
  scope,
  started,
  startedPercent,
  completed,
  completionPercent,
  expanded,
  onToggle,
  children,
}: {
  scope: number;
  started: number;
  startedPercent: number;
  completed: number;
  completionPercent: number;
  expanded: boolean;
  onToggle: () => void;
  children?: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <Stack component="section" aria-label={t('cycle.progressHeading')} gap="xs">
      <Button
        type="button"
        variant="subtle"
        color="gray"
        size="compact-sm"
        justify="flex-start"
        px={0}
        leftSection={
          expanded ? (
            <IconChevronDown size={14} aria-hidden="true" />
          ) : (
            <IconChevronRight size={14} aria-hidden="true" />
          )
        }
        aria-label={t(expanded ? 'cycle.collapseProgress' : 'cycle.expandProgress')}
        aria-expanded={expanded}
        aria-controls="cycle-progress-content"
        onClick={onToggle}
      >
        {t('cycle.progressHeading')}
      </Button>
      <Stack
        id="cycle-progress-content"
        gap="sm"
        style={{ display: expanded ? undefined : 'none' }}
      >
        <Group grow align="flex-start" gap="md">
          <Stack gap={4}>
            <Text size="xs" c="dimmed">
              {t('cycle.scope')}
            </Text>
            <Group gap={4} wrap="nowrap">
              <IssueEstimateIcon />
              <Text size="sm">{scope}</Text>
            </Group>
          </Stack>
          <Stack gap={4}>
            <Text size="xs" c="dimmed">
              {t('cycle.started')}
            </Text>
            <Group gap={4} wrap="nowrap">
              <IssueEstimateIcon />
              <Text size="sm">
                {started} · {startedPercent}%
              </Text>
            </Group>
          </Stack>
          <Stack gap={4}>
            <Text size="xs" c="dimmed">
              {t('cycle.completed')}
            </Text>
            <Group gap={4} wrap="nowrap">
              <IssueEstimateIcon />
              <Text size="sm">
                {completed} · {completionPercent}%
              </Text>
            </Group>
          </Stack>
        </Group>
        <Progress
          aria-label={t('cycle.progress')}
          aria-valuetext={`${completionPercent}%`}
          value={completionPercent}
          size="sm"
        />
        {children}
      </Stack>
    </Stack>
  );
}
