import { ActionIcon, Badge, Group, Menu, Progress, Stack, Text } from '@mantine/core';
import { IconDotsVertical } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { RouterNavLink } from '../mantine-ui.tsx';
import type { Cycle } from '../types.ts';
import { formatCalendarDate } from '../time.ts';

type CycleSummary = Cycle & {
  issueCount: number;
  startedCount: number;
  completedCount: number;
  linkCopied: boolean;
  onEdit: () => void;
  onChangeDates: () => void;
  onStartCycleToday: () => void;
  onToggleFavorite: () => void;
  onCopyLink: () => void;
  onExportCalendar: () => void;
};

export function CycleListItem({ cycle }: { cycle: CycleSummary }) {
  const { t, i18n } = useTranslation();
  const start = new Date(`${cycle.startsAt.slice(0, 10)}T00:00:00Z`);
  const locale = i18n.resolvedLanguage || i18n.language;
  const progress = cycle.issueCount
    ? Math.round((cycle.completedCount / cycle.issueCount) * 100)
    : 0;
  const startedProgress = cycle.issueCount
    ? Math.round((cycle.startedCount / cycle.issueCount) * 100)
    : 0;
  const name = cycle.name || t('field.cycleN', { number: cycle.number });

  return (
    <Group
      component="section"
      aria-label={t('cycle.rowLabel', { name })}
      gap="xs"
      wrap="nowrap"
      style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
    >
      <RouterNavLink
        to="/cycles/$number"
        params={{ number: String(cycle.number) }}
        label={
          <Stack gap={4}>
            <Group gap="sm" wrap="wrap">
              <Text size="sm" fw={550}>
                {name}
              </Text>
              <Badge
                variant="light"
                color={cycle.status === 'active' ? 'indigo' : 'gray'}
                size="sm"
              >
                {t(`cycle.status.${cycle.status}`)}
              </Badge>
            </Group>
            <Text size="xs" c="dimmed">
              {formatCalendarDate(cycle.startsAt, locale)} —{' '}
              {formatCalendarDate(cycle.endsAt, locale)}
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
              {new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(start)}
            </Text>
            <Text size="sm" fw={600}>
              {start.getUTCDate()}
            </Text>
          </Stack>
        }
        rightSection={
          cycle.status === 'active' ? (
            <Stack gap={4}>
              <Group gap="md" wrap="nowrap">
                <Stack gap={0}>
                  <Text size="10px" c="dimmed">
                    {t('cycle.scope')}
                  </Text>
                  <Text size="xs">{cycle.issueCount}</Text>
                </Stack>
                <Stack gap={0}>
                  <Text size="10px" c="dimmed">
                    {t('cycle.started')}
                  </Text>
                  <Text size="xs">
                    {cycle.startedCount} · {startedProgress}%
                  </Text>
                </Stack>
                <Stack gap={0}>
                  <Text size="10px" c="dimmed">
                    {t('cycle.completed')}
                  </Text>
                  <Text size="xs">
                    {cycle.completedCount} · {progress}%
                  </Text>
                </Stack>
              </Group>
              <Progress
                aria-label={t('cycle.progressFor', { number: cycle.number, progress })}
                value={progress}
                size="xs"
              />
            </Stack>
          ) : null
        }
        styles={{
          root: {
            minHeight: 72,
            padding: '10px 12px',
          },
          body: { minWidth: 0 },
          section: { flexShrink: 0 },
        }}
        style={{ flex: '1 1 auto', minWidth: 0 }}
      />
      <Menu withinPortal shadow="md" position="bottom-end">
        <Menu.Target>
          <ActionIcon type="button" variant="subtle" aria-label={t('cycle.options')}>
            <IconDotsVertical size={16} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item onClick={cycle.onEdit}>{t('cycle.editNameAndDescription')}</Menu.Item>
          {cycle.status !== 'completed' ? (
            <Menu.Item onClick={cycle.onChangeDates}>{t('cycle.changeDates')}</Menu.Item>
          ) : null}
          {cycle.status === 'upcoming' ? (
            <Menu.Item onClick={cycle.onStartCycleToday}>{t('cycle.startToday')}</Menu.Item>
          ) : null}
          <Menu.Item onClick={cycle.onToggleFavorite}>
            {cycle.isFavorite ? t('cycle.removeFavorite') : t('cycle.favorite')}
          </Menu.Item>
          <Menu.Item onClick={cycle.onCopyLink}>
            {cycle.linkCopied ? t('cycle.linkCopied') : t('cycle.copyLink')}
          </Menu.Item>
          <Menu.Item onClick={cycle.onExportCalendar}>{t('cycle.exportCalendar')}</Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Group>
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
