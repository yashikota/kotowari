import { useRouter } from '@tanstack/react-router';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api.ts';
import { signals } from '../application/mediator.ts';
import { normalizeWorkspace } from '../i18n/locale.ts';
import type { CycleSettings } from '../types.ts';

export function useConfigCycleSettings(initialSettings: CycleSettings) {
  const { t } = useTranslation();
  const router = useRouter();
  const [cycleSettings, setCycleSettings] = useState(initialSettings);
  const [cycleSettingsError, setCycleSettingsError] = useState('');
  const [cycleSettingsSaved, setCycleSettingsSaved] = useState(false);

  useEffect(() => setCycleSettings(initialSettings), [initialSettings]);

  return {
    data: { cycleSettings, cycleSettingsError, cycleSettingsSaved },
    handlers: {
      onSaveCycleSettings: (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setCycleSettingsError('');
        setCycleSettingsSaved(false);
        void api
          .patchWorkspace({ cycleSettings })
          .then(async (next) => {
            setCycleSettings(normalizeWorkspace(next).cycleSettings);
            await api.ensureCycleSchedule();
            setCycleSettingsSaved(true);
            signals.dispatchEvent(new Event('kotowari:refresh'));
            await router.invalidate();
          })
          .catch((error: unknown) =>
            setCycleSettingsError(
              error instanceof Error ? error.message : t('config.cycleSettingsSaveFailed'),
            ),
          );
      },
      onCycleDurationChange: (value: string | null) => {
        if (value && Number.isInteger(Number(value))) {
          setCycleSettingsSaved(false);
          setCycleSettings((current) => ({ ...current, durationDays: Number(value) }));
        }
      },
      onCycleCooldownChange: (value: string | null) => {
        if (value && Number.isInteger(Number(value))) {
          setCycleSettingsSaved(false);
          setCycleSettings((current) => ({ ...current, cooldownDays: Number(value) }));
        }
      },
      onCycleStartDayChange: (value: string | null) => {
        if (
          value === 'sunday' ||
          value === 'monday' ||
          value === 'tuesday' ||
          value === 'wednesday' ||
          value === 'thursday' ||
          value === 'friday' ||
          value === 'saturday'
        ) {
          setCycleSettingsSaved(false);
          setCycleSettings((current) => ({ ...current, startDay: value }));
        }
      },
      onCycleAutoCreateAheadChange: (value: string | null) => {
        if (value && Number.isInteger(Number(value))) {
          setCycleSettingsSaved(false);
          setCycleSettings((current) => ({ ...current, autoCreateAhead: Number(value) }));
        }
      },
      onCycleAutoAddActiveIssuesChange: (
        event: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => {
        setCycleSettingsSaved(false);
        setCycleSettings((current) => ({
          ...current,
          autoAddActiveIssues: event.currentTarget.checked,
        }));
      },
      onCycleAutoAddCompletedIssuesChange: (
        event: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => {
        setCycleSettingsSaved(false);
        setCycleSettings((current) => ({
          ...current,
          autoAddCompletedIssues: event.currentTarget.checked,
        }));
      },
    },
  };
}
