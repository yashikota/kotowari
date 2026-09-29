import { Alert, Box, Button, Checkbox, Group, Select, Stack, Text, Title } from '@mantine/core';
import type { useTranslation } from 'react-i18next';
import { FIRST_DAYS_OF_WEEK } from '../preferences.ts';
import type { useConfigPagePresenter } from '../presenters/ConfigPages.tsx';

type Presenter = ReturnType<typeof useConfigPagePresenter>;

export function ConfigCycleSettingsSection({
  model,
  handlers,
  t,
}: {
  model: Pick<Presenter, 'cycleSettings' | 'cycleSettingsError' | 'cycleSettingsSaved'>;
  handlers: Pick<
    Presenter['handlers'],
    | 'onSaveCycleSettings'
    | 'onCycleDurationChange'
    | 'onCycleCooldownChange'
    | 'onCycleStartDayChange'
    | 'onCycleAutoCreateAheadChange'
    | 'onCycleAutoAddActiveIssuesChange'
    | 'onCycleAutoAddCompletedIssuesChange'
  >;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const { cycleSettings, cycleSettingsError, cycleSettingsSaved } = model;

  return (
    <Stack gap="md" component="section" aria-label={t('config.cycleSettings')}>
      <Title order={4}>{t('config.cycleSettings')}</Title>
      <Text size="sm" c="dimmed">
        {t('config.cycleSettingsDescription')}
      </Text>
      {cycleSettingsError ? (
        <Alert color="red" variant="light">
          {cycleSettingsError}
        </Alert>
      ) : null}
      {cycleSettingsSaved ? (
        <Alert color="green" variant="light">
          {t('config.cycleSettingsSaved')}
        </Alert>
      ) : null}
      <Box component="form" onSubmit={handlers.onSaveCycleSettings}>
        <Stack gap="md" maw={480}>
          <Select
            label={t('config.cycleDuration')}
            aria-label={t('config.cycleDuration')}
            value={String(cycleSettings.durationDays)}
            onChange={handlers.onCycleDurationChange}
            data={[1, 2, 3, 4, 6, 8].map((weeks) => ({
              value: String(weeks * 7),
              label: t('config.cycleWeeks', { count: weeks }),
            }))}
          />
          <Select
            label={t('config.cycleCooldown')}
            aria-label={t('config.cycleCooldown')}
            value={String(cycleSettings.cooldownDays)}
            onChange={handlers.onCycleCooldownChange}
            data={[0, 7, 14].map((days) => ({
              value: String(days),
              label:
                days === 0 ? t('config.noCooldown') : t('config.cycleWeeks', { count: days / 7 }),
            }))}
          />
          <Select
            label={t('config.cycleStartDay')}
            aria-label={t('config.cycleStartDay')}
            value={cycleSettings.startDay}
            onChange={handlers.onCycleStartDayChange}
            data={FIRST_DAYS_OF_WEEK.map((day) => ({
              value: day,
              label: t(`config.weekday.${day}`),
            }))}
          />
          <Select
            label={t('config.autoCreateCycles')}
            aria-label={t('config.autoCreateCycles')}
            value={String(cycleSettings.autoCreateAhead)}
            onChange={handlers.onCycleAutoCreateAheadChange}
            data={Array.from({ length: 7 }, (_, count) => ({
              value: String(count),
              label: count === 0 ? t('config.noAutoCreate') : t('config.cyclesAhead', { count }),
            }))}
          />
          <Checkbox
            label={t('config.autoAddActiveIssues')}
            description={t('config.autoAddActiveIssuesDescription')}
            checked={cycleSettings.autoAddActiveIssues}
            onChange={handlers.onCycleAutoAddActiveIssuesChange}
          />
          <Checkbox
            label={t('config.autoAddCompletedIssues')}
            description={t('config.autoAddCompletedIssuesDescription')}
            checked={cycleSettings.autoAddCompletedIssues}
            onChange={handlers.onCycleAutoAddCompletedIssuesChange}
          />
          <Group>
            <Button type="submit">{t('config.saveCycleSettings')}</Button>
          </Group>
        </Stack>
      </Box>
    </Stack>
  );
}
