import { useRouter } from '@tanstack/react-router';
import type * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api.ts';
import { signals } from '../application/mediator.ts';
import { applyLocale } from '../i18n/index.ts';
import { languageOptions, normalizeWorkspace, resolveLocale } from '../i18n/locale.ts';
import { systemTimeZone, timeZoneOptions } from '../time.ts';
import type { Workspace } from '../types.ts';

type Props = {
  initialWorkspace: Workspace;
  setError: (message: string) => void;
  setSaved: (saved: boolean) => void;
};

export function useConfigWorkspaceSettings({ initialWorkspace, setError, setSaved }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const [workspace, setWorkspace] = useState(() => normalizeWorkspace(initialWorkspace));
  const [cycleSettings, setCycleSettings] = useState(
    () => normalizeWorkspace(initialWorkspace).cycleSettings,
  );
  const [cycleSettingsError, setCycleSettingsError] = useState('');
  const [cycleSettingsSaved, setCycleSettingsSaved] = useState(false);
  const [issueAutomationSettings, setIssueAutomationSettings] = useState(
    () => normalizeWorkspace(initialWorkspace).issueAutomationSettings,
  );
  const [issueAutomationSettingsError, setIssueAutomationSettingsError] = useState('');
  const [issueAutomationSettingsSaved, setIssueAutomationSettingsSaved] = useState(false);

  useEffect(() => {
    const normalized = normalizeWorkspace(initialWorkspace);
    setWorkspace(normalized);
    setCycleSettings(normalized.cycleSettings);
    setIssueAutomationSettings(normalized.issueAutomationSettings);
  }, [initialWorkspace]);

  const timeZones = useMemo(() => timeZoneOptions(workspace.timezone), [workspace.timezone]);
  const languages = useMemo(
    () => languageOptions(resolveLocale(workspace.locale)),
    [workspace.locale],
  );

  return {
    data: {
      workspace,
      cycleSettings,
      cycleSettingsError,
      cycleSettingsSaved,
      issueAutomationSettings,
      issueAutomationSettingsError,
      issueAutomationSettingsSaved,
      timeZones,
      languages,
    },
    handlers: {
      onSubmit0: (event: Parameters<NonNullable<React.ComponentProps<'form'>['onSubmit']>>[0]) => {
        event.preventDefault();
        setSaved(false);
        return api
          .patchWorkspace({
            name: workspace.name,
            timezone: workspace.timezone,
            locale: workspace.locale,
          })
          .then(async (next) => {
            setWorkspace(normalizeWorkspace(next));
            applyLocale(next.locale);
            setSaved(true);
            signals.dispatchEvent(new Event('kotowari:refresh'));
            await router.invalidate();
          })
          .catch((error: unknown) =>
            setError(error instanceof Error ? error.message : 'save failed'),
          );
      },
      onSaveCycleSettings: (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setCycleSettingsError('');
        setCycleSettingsSaved(false);
        void api
          .patchWorkspace({ cycleSettings })
          .then(async (next) => {
            const normalized = normalizeWorkspace(next);
            setCycleSettings(normalized.cycleSettings);
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
      onSaveIssueAutomationSettings: (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIssueAutomationSettingsError('');
        setIssueAutomationSettingsSaved(false);
        void api
          .patchWorkspace({ issueAutomationSettings })
          .then(async (next) => {
            const normalized = normalizeWorkspace(next);
            setIssueAutomationSettings(normalized.issueAutomationSettings);
            setIssueAutomationSettingsSaved(true);
            signals.dispatchEvent(new Event('kotowari:refresh'));
            await router.invalidate();
          })
          .catch((error: unknown) =>
            setIssueAutomationSettingsError(
              error instanceof Error
                ? error.message
                : t('config.issueAutomationSettingsSaveFailed'),
            ),
          );
      },
      onAutoCloseParentIssuesChange: (
        event: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => {
        setIssueAutomationSettingsSaved(false);
        setIssueAutomationSettings((current) => ({
          ...current,
          autoCloseParentIssues: event.currentTarget.checked,
        }));
      },
      onAutoCloseSubIssuesChange: (
        event: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => {
        setIssueAutomationSettingsSaved(false);
        setIssueAutomationSettings((current) => ({
          ...current,
          autoCloseSubIssues: event.currentTarget.checked,
        }));
      },
      onStatusProgressionOrderChange: (value: string | null) => {
        if (value !== 'first' && value !== 'last' && value !== 'no_action') return;
        setIssueAutomationSettingsSaved(false);
        setIssueAutomationSettings((current) => ({
          ...current,
          statusProgressionOrder: value,
        }));
      },
      onAutoCloseStaleIssuesAfterMonthsChange: (value: string | null) => {
        const months = Number(value);
        if (value === null || ![0, 1, 3, 6, 12].includes(months)) return;
        setIssueAutomationSettingsSaved(false);
        setIssueAutomationSettings((current) => ({
          ...current,
          autoCloseStaleIssuesAfterMonths: months,
        }));
      },
      onAutoArchiveClosedIssuesAfterMonthsChange: (value: string | null) => {
        const months = Number(value);
        if (value === null || ![0, 1, 3, 6, 12].includes(months)) return;
        setIssueAutomationSettingsSaved(false);
        setIssueAutomationSettings((current) => ({
          ...current,
          autoArchiveClosedIssuesAfterMonths: months,
          autoArchiveCompletedProjectsAfterMonths: months,
          autoArchiveCompletedCyclesAfterMonths: months,
        }));
      },
      Workspace_name_onChange1: (
        event: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setWorkspace({ ...workspace, name: event.target.value }),
      Timezone_onChange2: (value: string | null) =>
        setWorkspace({ ...workspace, timezone: value ?? systemTimeZone() }),
      Locale_onChange3: (value: string | null) =>
        setWorkspace({ ...workspace, locale: resolveLocale(value) }),
    },
  };
}
