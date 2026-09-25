import { ActionIcon, Badge, Box, Group, Menu, Text } from '@mantine/core';
import { IconCircleCheck, IconDotsVertical, IconPlayerPlay } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { RouterNavLink } from '../mantine-ui.tsx';
import type { Cycle } from '../types.ts';
import { formatCalendarDate } from '../time.ts';
import styles from './CycleListItem.module.css';

type CycleSummary = Cycle & {
  googleCalendarURL: string;
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
  const locale = i18n.resolvedLanguage || i18n.language;
  const name = cycle.name || t('field.cycleN', { number: cycle.number });
  const startDate = formatCalendarDate(cycle.startsAt, locale);

  return (
    <Group
      component="section"
      aria-label={t('cycle.rowLabel', { name })}
      gap="xs"
      wrap="nowrap"
      className={styles.row}
    >
      <RouterNavLink
        to="/cycles/$number"
        params={{ number: String(cycle.number) }}
        label={
          <Text size="sm" fw={550}>
            {name}
          </Text>
        }
        leftSection={
          <Box className={styles.dateRail}>
            <Text className={styles.dateLabel}>{startDate}</Text>
            <span className={styles.dateMarker} aria-hidden="true" />
            {cycle.status === 'completed' ? (
              <IconCircleCheck className={styles.cycleIcon} size={16} aria-hidden="true" />
            ) : (
              <span
                className={`${styles.cycleIcon} ${styles.cyclePlayIcon}`}
                data-active={cycle.status === 'active' || undefined}
                aria-hidden="true"
              >
                <IconPlayerPlay size={8} />
              </span>
            )}
          </Box>
        }
        rightSection={
          <Badge variant="light" color={cycle.status === 'active' ? 'indigo' : 'gray'} size="sm">
            {t(`cycle.status.${cycle.status}`)}
          </Badge>
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
          <Menu.Sub>
            <Menu.Sub.Target>
              <Menu.Sub.Item>{t('cycle.subscribeCalendar')}</Menu.Sub.Item>
            </Menu.Sub.Target>
            <Menu.Sub.Dropdown>
              <Menu.Item
                component="a"
                href={cycle.googleCalendarURL}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('cycle.addToGoogleCalendar')}
              </Menu.Item>
              <Menu.Item onClick={cycle.onExportCalendar}>{t('cycle.exportCalendar')}</Menu.Item>
            </Menu.Sub.Dropdown>
          </Menu.Sub>
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
}
