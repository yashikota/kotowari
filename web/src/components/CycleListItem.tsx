import { Badge, Group, Progress, Stack, Text } from '@mantine/core';
import { RouterNavLink } from '../mantine-ui.tsx';
import type { Cycle } from '../types.ts';

type CycleSummary = Cycle & { issueCount: number; completedCount: number };

function statusLabel(status: string) {
  return status === 'active' ? 'Current' : status.replace(/^./, (letter) => letter.toUpperCase());
}

export function CycleListItem({ cycle }: { cycle: CycleSummary }) {
  const start = new Date(cycle.startsAt);
  const progress = cycle.issueCount
    ? Math.round((cycle.completedCount / cycle.issueCount) * 100)
    : 0;

  return (
    <RouterNavLink
      to="/cycles/$number"
      params={{ number: String(cycle.number) }}
      label={
        <Stack gap={4}>
          <Group gap="sm" wrap="wrap">
            <Text size="sm" fw={550}>
              Cycle {cycle.number}
            </Text>
            <Badge variant="light" color={cycle.status === 'active' ? 'indigo' : 'gray'} size="sm">
              {statusLabel(cycle.status)}
            </Badge>
          </Group>
          <Text size="xs" c="dimmed">
            {cycle.startsAt.slice(0, 10)} — {cycle.endsAt.slice(0, 10)}
          </Text>
        </Stack>
      }
      leftSection={
        <Stack
          align="center"
          justify="center"
          gap={0}
          w={40}
          h={44}
          style={{
            border: '1px solid var(--mantine-color-default-border)',
            borderRadius: 'var(--mantine-radius-sm)',
            backgroundColor: 'var(--mantine-color-body)',
          }}
        >
          <Text size="10px" c="dimmed" tt="uppercase">
            {start.toLocaleString('en-US', { month: 'short' })}
          </Text>
          <Text size="sm" fw={600}>
            {start.getDate()}
          </Text>
        </Stack>
      }
      rightSection={
        <Group gap="sm" wrap="nowrap">
          <Text size="xs" c="dimmed" visibleFrom="sm">
            {cycle.issueCount} in scope
          </Text>
          <Progress
            aria-label={`Cycle ${cycle.number} completion ${progress}%`}
            value={progress}
            size="xs"
            w={96}
          />
          <Text size="xs" c="dimmed" w={32} ta="right">
            {cycle.completedCount}/{cycle.issueCount}
          </Text>
        </Group>
      }
      styles={{
        root: {
          minHeight: 72,
          padding: '10px 12px',
          borderBottom: '1px solid var(--mantine-color-default-border)',
        },
        body: { minWidth: 0 },
        section: { flexShrink: 0 },
      }}
    />
  );
}

export function CycleStatusHeading({ title, count }: { title: string; count: number }) {
  return (
    <Group justify="space-between" mih={32} px={4}>
      <Text size="sm" fw={550} c="dimmed">
        {title}
      </Text>
      <Text size="xs" c="dimmed">
        {count}
      </Text>
    </Group>
  );
}
