import { Box, Group, Progress, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { CycleAssigneeShare } from '../cycle-progress.ts';

const colors = {
  self: 'indigo.5',
  agent: 'violet.5',
  unassigned: 'gray.5',
} as const;

export function CycleAssigneeBreakdown({ items }: { items: CycleAssigneeShare[] }) {
  const { t } = useTranslation();
  const total = items.reduce((count, item) => count + item.count, 0);
  if (total === 0) return null;

  return (
    <Stack component="section" aria-label={t('cycle.assignees')} gap={6}>
      <Text size="xs" c="dimmed" fw={500}>
        {t('cycle.assignees')}
      </Text>
      <Progress.Root role="img" aria-label={t('cycle.assigneeDistribution')} size={8} radius="xl">
        {items.map((item) => (
          <Progress.Section key={item.assignee} value={item.share} color={colors[item.assignee]} />
        ))}
      </Progress.Root>
      <Group gap="md" wrap="wrap">
        {items.map((item) => {
          const assigneeLabel =
            item.assignee === 'self' ? 'you' : item.assignee === 'agent' ? 'agent' : 'unassigned';
          return (
            <Group key={item.assignee} gap={5} wrap="nowrap">
              <Box
                aria-hidden="true"
                w={7}
                h={7}
                style={{
                  borderRadius: '50%',
                  background: `var(--mantine-color-${colors[item.assignee].replace('.', '-')})`,
                }}
              />
              <Text size="xs">{t(`issueAssignment.${assigneeLabel}`)}</Text>
              <Text size="xs" c="dimmed">
                {t('cycle.assigneeShare', {
                  count: item.count,
                  percent: Math.round(item.share),
                  total,
                })}
              </Text>
            </Group>
          );
        })}
      </Group>
    </Stack>
  );
}
