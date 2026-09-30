import { useRouter } from '@tanstack/react-router';
import type * as React from 'react';
import { useEffect, useState } from 'react';
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

  useEffect(() => setIssueAutomationSettings(initialSettings), [initialSettings]);

  return {
    data: {
      issueAutomationSettings,
      issueAutomationSettingsError,
      issueAutomationSettingsSaved,
    },
    handlers: {
      onSaveIssueAutomationSettings: (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIssueAutomationSettingsError('');
        setIssueAutomationSettingsSaved(false);
        void api
          .patchWorkspace({ issueAutomationSettings })
          .then(async (next) => {
            setIssueAutomationSettings(normalizeWorkspace(next).issueAutomationSettings);
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
        const checked = event.currentTarget.checked;
        setIssueAutomationSettingsSaved(false);
        setIssueAutomationSettings((current) => ({
          ...current,
          autoCloseParentIssues: checked,
        }));
      },
      onAutoCloseSubIssuesChange: (
        event: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => {
        const checked = event.currentTarget.checked;
        setIssueAutomationSettingsSaved(false);
        setIssueAutomationSettings((current) => ({
          ...current,
          autoCloseSubIssues: checked,
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
    },
  };
}
