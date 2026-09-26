import { Badge, Group, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { Cycle } from '../types.ts';
import { formatCalendarDate } from '../time.ts';
import { ProjectDateProperty } from './ProjectDateProperty.tsx';

export function CycleDateRangeControl({
  status,
  startsAt,
  endsAt,
  onStartDateChange,
  onEndDateChange,
}: {
  status: Cycle['status'];
  startsAt: string;
  endsAt: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || i18n.language;
  const startDate = startsAt.slice(0, 10);
  const endDate = endsAt.slice(0, 10);

  return (
    <Group justify="space-between" align="center" gap="xs" wrap="nowrap">
      <Badge size="sm" variant="light" color={status === 'active' ? 'indigo' : 'gray'}>
        {t(`cycle.status.${status}`)}
      </Badge>
      <Group gap={4} wrap="nowrap">
        {status === 'upcoming' ? (
          <ProjectDateProperty
            label={t('cycle.startDate')}
            value={startDate}
            onChange={onStartDateChange}
          />
        ) : (
          <Text
            size="xs"
            c="dimmed"
            title={status === 'active' ? t('cycle.activeStartDateHint') : undefined}
            aria-label={`${t('cycle.startDate')}: ${formatCalendarDate(startsAt, locale)}`}
          >
            {formatCalendarDate(startsAt, locale)}
          </Text>
        )}
        <Text size="xs" c="dimmed" aria-hidden="true">
          {t('cycle.dateRangeTo')}
        </Text>
        {status === 'completed' ? (
          <Text
            size="xs"
            c="dimmed"
            aria-label={`${t('cycle.endDate')}: ${formatCalendarDate(endsAt, locale)}`}
          >
            {formatCalendarDate(endsAt, locale)}
          </Text>
        ) : (
          <ProjectDateProperty
            label={t('cycle.endDate')}
            value={endDate}
            onChange={onEndDateChange}
          />
        )}
      </Group>
    </Group>
  );
}
