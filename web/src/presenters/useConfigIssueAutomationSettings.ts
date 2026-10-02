import { useRouter } from '@tanstack/react-router';
import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api.ts';
import { signals } from '../application/mediator.ts';
import { normalizeWorkspace } from '../i18n/locale.ts';
import type { IssueAutomationSettings } from '../types.ts';

export function useConfigIssueAutomationSettings(initialSettings: IssueAutomationSettings) {
  const { t } = useTranslation();
  const router = useRouter();
  const [issueAutomationSettings, setIssueAutomationSettings] = useState(initialSettings);
  const [issueAutomationSettingsError, setIssueAutomationSettingsError] = useState('');
  const [issueAutomationSettingsSaved, setIssueAutomationSettingsSaved] = useState(false);

  const [issueAutomationSettingsSaving, setIssueAutomationSettingsSaving] = useState(false);
  const pending = useRef(false);
  const dirty = useRef(false);
  useEffect(() => {
    if (!dirty.current && !pending.current) setIssueAutomationSettings(initialSettings);
  }, [initialSettings]);

  const changeSettings = (update: Partial<IssueAutomationSettings>) => {
    if (pending.current) return;
    dirty.current = true;
    setIssueAutomationSettingsSaved(false);
    setIssueAutomationSettings((current) => ({ ...current, ...update }));
  };

  const saveSettings = () => {
    if (pending.current) return;
    pending.current = true;
    setIssueAutomationSettingsSaving(true);
    setIssueAutomationSettingsError('');
    setIssueAutomationSettingsSaved(false);
    return api
      .patchWorkspace({ issueAutomationSettings })
      .then(async (next) => {
        dirty.current = false;
        setIssueAutomationSettings(normalizeWorkspace(next).issueAutomationSettings);
        setIssueAutomationSettingsSaved(true);
        signals.dispatchEvent(new Event('kotowari:refresh'));
        await router.invalidate().catch(() => undefined);
      })
      .catch((error: unknown) => {
        setIssueAutomationSettingsError(
          error instanceof Error ? error.message : t('config.issueAutomationSettingsSaveFailed'),
        );
      })
      .finally(() => {
        pending.current = false;
        setIssueAutomationSettingsSaving(false);
      });
  };

  return {
    data: {
      issueAutomationSettings,
      issueAutomationSettingsError,
      issueAutomationSettingsSaved,
      issueAutomationSettingsSaving,
    },
    handlers: {
      onRetryIssueAutomationSettingsSave: saveSettings,
      onSaveIssueAutomationSettings: (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        return saveSettings();
      },
      onAutoCloseParentIssuesChange: (
        event: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => {
        const checked = event.currentTarget.checked;
        changeSettings({
          autoCloseParentIssues: checked,
        });
      },
      onAutoCloseSubIssuesChange: (
        event: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => {
        const checked = event.currentTarget.checked;
        changeSettings({
          autoCloseSubIssues: checked,
        });
      },
      onStatusProgressionOrderChange: (value: string | null) => {
        if (value !== 'first' && value !== 'last' && value !== 'no_action') return;
        changeSettings({
          statusProgressionOrder: value,
        });
      },
      onAutoCloseStaleIssuesAfterMonthsChange: (value: string | null) => {
        const months = Number(value);
        if (value === null || ![0, 1, 3, 6, 12].includes(months)) return;
        changeSettings({
          autoCloseStaleIssuesAfterMonths: months,
        });
      },
      onAutoArchiveClosedIssuesAfterMonthsChange: (value: string | null) => {
        const months = Number(value);
        if (value === null || ![0, 1, 3, 6, 12].includes(months)) return;
        changeSettings({
          autoArchiveClosedIssuesAfterMonths: months,
          autoArchiveCompletedProjectsAfterMonths: months,
          autoArchiveCompletedCyclesAfterMonths: months,
        });
      },
    },
  };
}
