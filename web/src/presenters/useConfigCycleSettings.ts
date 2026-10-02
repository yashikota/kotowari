import { useRouter } from '@tanstack/react-router';
import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
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

  const [cycleSettingsSaving, setCycleSettingsSaving] = useState(false);
  const [cycleGenerationError, setCycleGenerationError] = useState('');
  const [cycleGenerationState, setCycleGenerationState] = useState<
    'idle' | 'generating' | 'ready' | 'failed'
  >('idle');
  const pending = useRef(false);
  const dirty = useRef(false);
  useEffect(() => {
    if (!dirty.current && !pending.current) setCycleSettings(initialSettings);
  }, [initialSettings]);

  const changeSettings = (update: Partial<CycleSettings>) => {
    if (pending.current) return;
    dirty.current = true;
    setCycleSettingsSaved(false);
    setCycleGenerationError('');
    setCycleGenerationState('idle');
    setCycleSettings((current) => ({ ...current, ...update }));
  };

  const generateCycles = async () => {
    setCycleGenerationError('');
    setCycleGenerationState('generating');
    try {
      await api.ensureCycleSchedule();
      setCycleGenerationState('ready');
    } catch (error) {
      setCycleGenerationError(
        error instanceof Error ? error.message : t('config.cycleGenerationFailed'),
      );
      setCycleGenerationState('failed');
    }
    signals.dispatchEvent(new Event('kotowari:refresh'));
    await router.invalidate().catch(() => undefined);
  };

  const saveSettings = () => {
    if (pending.current) return;
    pending.current = true;
    setCycleSettingsSaving(true);
    setCycleSettingsError('');
    setCycleSettingsSaved(false);
    setCycleGenerationError('');
    setCycleGenerationState('idle');
    return api
      .patchWorkspace({ cycleSettings })
      .then(async (next) => {
        dirty.current = false;
        setCycleSettings(normalizeWorkspace(next).cycleSettings);
        setCycleSettingsSaved(true);
        await generateCycles();
      })
      .catch((error: unknown) => {
        setCycleSettingsError(
          error instanceof Error ? error.message : t('config.cycleSettingsSaveFailed'),
        );
      })
      .finally(() => {
        pending.current = false;
        setCycleSettingsSaving(false);
      });
  };

  return {
    data: {
      cycleSettings,
      cycleSettingsError,
      cycleSettingsSaved,
      cycleSettingsSaving,
      cycleGenerationError,
      cycleGenerationState,
    },
    handlers: {
      onRetryCycleSettingsSave: saveSettings,
      onRetryCycleGeneration: () => {
        if (pending.current || dirty.current || cycleGenerationState !== 'failed') return;
        pending.current = true;
        setCycleSettingsSaving(true);
        return generateCycles().finally(() => {
          pending.current = false;
          setCycleSettingsSaving(false);
        });
      },
      onSaveCycleSettings: (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        return saveSettings();
      },
      onCycleDurationChange: (value: string | null) => {
        if (value && Number.isInteger(Number(value))) {
          changeSettings({ durationDays: Number(value) });
        }
      },
      onCycleCooldownChange: (value: string | null) => {
        if (value && Number.isInteger(Number(value))) {
          changeSettings({ cooldownDays: Number(value) });
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
          changeSettings({ startDay: value });
        }
      },
      onCycleAutoCreateAheadChange: (value: string | null) => {
        if (value && Number.isInteger(Number(value))) {
          changeSettings({ autoCreateAhead: Number(value) });
        }
      },
      onCycleAutoAddActiveIssuesChange: (
        event: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => {
        const checked = event.currentTarget.checked;
        changeSettings({
          autoAddActiveIssues: checked,
        });
      },
      onCycleAutoAddCompletedIssuesChange: (
        event: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => {
        const checked = event.currentTarget.checked;
        changeSettings({
          autoAddCompletedIssues: checked,
        });
      },
    },
  };
}
