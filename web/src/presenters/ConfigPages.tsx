import { useLoaderData, useRouter } from '@tanstack/react-router';
import type * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useMantineColorScheme } from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.ts';
import { signals } from '../application/mediator.ts';
import { useMachineFlag, useOverlay } from '../application/Root.tsx';
import { applyLocale } from '../i18n/index.ts';
import { languageOptions, normalizeWorkspace, resolveLocale } from '../i18n/locale.ts';
import { timeZoneOptions, systemTimeZone } from '../time.ts';
import type { Diagnostic, Workspace } from '../types.ts';
import { isWebCodingToolURLTemplate, useCodingToolPreferences } from '../coding-tools.ts';
import type { CodingToolPreferences } from '../coding-tools.ts';
import {
  FIRST_DAYS_OF_WEEK,
  usePersonalPreferences,
  type CommentSubmitShortcut,
  type DefaultHome,
  type FontSize,
  type SidebarItemId,
  SIDEBAR_ITEM_IDS,
} from '../preferences.ts';
import { sidebarSettingsGroups } from '../sidebar.ts';
import { useConfigWorkflowSettings } from './useConfigWorkflowSettings.ts';

type ConfigData = {
  workspace: Workspace;
  diagnostics: Diagnostic[];
};

export function useConfigPagePresenter() {
  const data = useLoaderData({ from: '/config' }) as ConfigData;
  const { t } = useTranslation();
  const router = useRouter();
  const workflowSettings = useConfigWorkflowSettings();
  const { data: workflowSettingsData, handlers: workflowSettingsHandlers } = workflowSettings;
  const { set: setOverlay } = useOverlay();
  const [sidebarCustomizationOpen, setSidebarCustomizationOpen] =
    useMachineFlag('sidebar-customization');
  const [workspace, setWorkspace] = useState(() => normalizeWorkspace(data.workspace));
  const [cycleSettings, setCycleSettings] = useState(
    () => normalizeWorkspace(data.workspace).cycleSettings,
  );
  const [cycleSettingsError, setCycleSettingsError] = useState('');
  const [cycleSettingsSaved, setCycleSettingsSaved] = useState(false);
  const [issueAutomationSettings, setIssueAutomationSettings] = useState(
    () => normalizeWorkspace(data.workspace).issueAutomationSettings,
  );
  const [issueAutomationSettingsError, setIssueAutomationSettingsError] = useState('');
  const [issueAutomationSettingsSaved, setIssueAutomationSettingsSaved] = useState(false);
  const { preferences, update: updatePreferences } = usePersonalPreferences();
  const { preferences: codingToolPreferences, update: updateCodingToolPreferences } =
    useCodingToolPreferences();
  const [codingToolDraft, setCodingToolDraft] = useState(codingToolPreferences);
  const [codingToolError, setCodingToolError] = useState('');
  const [codingToolSaved, setCodingToolSaved] = useState(false);
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setWorkspace(normalizeWorkspace(data.workspace));
    setCycleSettings(normalizeWorkspace(data.workspace).cycleSettings);
    setIssueAutomationSettings(normalizeWorkspace(data.workspace).issueAutomationSettings);
  }, [data.workspace]);

  useEffect(() => {
    setCodingToolDraft(codingToolPreferences);
  }, [codingToolPreferences]);

  const timeZones = useMemo(() => timeZoneOptions(workspace.timezone), [workspace.timezone]);
  const languages = useMemo(
    () => languageOptions(resolveLocale(workspace.locale)),
    [workspace.locale],
  );

  return {
    _view: 0 as const,
    workspace,
    cycleSettings,
    cycleSettingsError,
    cycleSettingsSaved,
    issueAutomationSettings,
    issueAutomationSettingsError,
    issueAutomationSettingsSaved,
    timeZones,
    languages,
    preferences,
    codingToolDraft,
    codingToolError,
    codingToolSaved,
    ...workflowSettingsData,
    sidebarGroups: sidebarSettingsGroups(preferences).map(({ group, items }) => ({
      group,
      label: t(`config.sidebarGroup.${group}`),
      items: items.map((item) => ({ ...item, label: t(item.labelKey) })),
    })),
    sidebarCustomizationOpen,
    colorScheme,
    diagnostics: data.diagnostics,
    error,
    saved,
    handlers: {
      onSubmit0: (e: Parameters<NonNullable<React.ComponentProps<'form'>['onSubmit']>>[0]) => {
        e.preventDefault();
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
          .catch((err: unknown) => setError(err instanceof Error ? err.message : 'save failed'));
      },
      onSaveCycleSettings: (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
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
          .catch((err: unknown) =>
            setCycleSettingsError(
              err instanceof Error ? err.message : t('config.cycleSettingsSaveFailed'),
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
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => {
        setCycleSettingsSaved(false);
        setCycleSettings((current) => ({
          ...current,
          autoAddActiveIssues: e.currentTarget.checked,
        }));
      },
      onCycleAutoAddCompletedIssuesChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => {
        setCycleSettingsSaved(false);
        setCycleSettings((current) => ({
          ...current,
          autoAddCompletedIssues: e.currentTarget.checked,
        }));
      },
      onSaveIssueAutomationSettings: (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
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
          .catch((err: unknown) =>
            setIssueAutomationSettingsError(
              err instanceof Error ? err.message : t('config.issueAutomationSettingsSaveFailed'),
            ),
          );
      },
      onAutoCloseParentIssuesChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => {
        setIssueAutomationSettingsSaved(false);
        setIssueAutomationSettings((current) => ({
          ...current,
          autoCloseParentIssues: e.currentTarget.checked,
        }));
      },
      onAutoCloseSubIssuesChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => {
        setIssueAutomationSettingsSaved(false);
        setIssueAutomationSettings((current) => ({
          ...current,
          autoCloseSubIssues: e.currentTarget.checked,
        }));
      },
      onStatusProgressionOrderChange: (value: string | null) => {
        if (value !== 'first' && value !== 'last' && value !== 'no_action') {
          return;
        }
        setIssueAutomationSettingsSaved(false);
        setIssueAutomationSettings((current) => ({
          ...current,
          statusProgressionOrder: value,
        }));
      },
      onAutoCloseStaleIssuesAfterMonthsChange: (value: string | null) => {
        const months = Number(value);
        if (value === null || ![0, 1, 3, 6, 12].includes(months)) {
          return;
        }
        setIssueAutomationSettingsSaved(false);
        setIssueAutomationSettings((current) => ({
          ...current,
          autoCloseStaleIssuesAfterMonths: months,
        }));
      },
      onAutoArchiveClosedIssuesAfterMonthsChange: (value: string | null) => {
        const months = Number(value);
        if (value === null || ![0, 1, 3, 6, 12].includes(months)) {
          return;
        }
        setIssueAutomationSettingsSaved(false);
        setIssueAutomationSettings((current) => ({
          ...current,
          autoArchiveClosedIssuesAfterMonths: months,
          autoArchiveCompletedProjectsAfterMonths: months,
          autoArchiveCompletedCyclesAfterMonths: months,
        }));
      },
      Workspace_name_onChange1: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setWorkspace({ ...workspace, name: e.target.value }),
      Timezone_onChange2: (value: string | null) =>
        setWorkspace({ ...workspace, timezone: value ?? systemTimeZone() }),
      Locale_onChange3: (value: string | null) =>
        setWorkspace({ ...workspace, locale: resolveLocale(value) }),
      onDefaultHomeChange: (value: string | null) => {
        if (
          value === 'home' ||
          value === 'inbox' ||
          value === 'reviews' ||
          value === 'myIssues' ||
          value === 'activeIssues' ||
          value === 'issues' ||
          value === 'currentCycle' ||
          value === 'projects' ||
          value === 'cycles' ||
          value === 'agent'
        )
          updatePreferences({ defaultHome: value as DefaultHome });
      },
      onFirstDayOfWeekChange: (value: string | null) => {
        if (FIRST_DAYS_OF_WEEK.includes(value as (typeof FIRST_DAYS_OF_WEEK)[number]))
          updatePreferences({ firstDayOfWeek: value as (typeof FIRST_DAYS_OF_WEEK)[number] });
      },
      onAutoAssignToSelfChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => updatePreferences({ autoAssignToSelf: e.currentTarget.checked }),
      onAutoAssignOnStartChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => updatePreferences({ autoAssignOnStart: e.currentTarget.checked }),
      onColorSchemeChange: (value: string | null) => {
        if (value === 'light' || value === 'dark' || value === 'auto') setColorScheme(value);
      },
      onFontSizeChange: (value: string | null) => {
        if (value === 'small' || value === 'default' || value === 'large')
          updatePreferences({ fontSize: value as FontSize });
      },
      onCommentShortcutChange: (value: string | null) => {
        if (value === 'modEnter' || value === 'enter')
          updatePreferences({ commentSubmitShortcut: value as CommentSubmitShortcut });
      },
      onConvertEmoticonsChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => updatePreferences({ convertEmoticons: e.currentTarget.checked }),
      onPointerCursorsChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => updatePreferences({ pointerCursors: e.currentTarget.checked }),
      onUnderlineLinksChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => updatePreferences({ underlineLinks: e.currentTarget.checked }),
      onCodingToolEnabledChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => {
        const enabled = e.currentTarget.checked;
        setCodingToolSaved(false);
        setCodingToolDraft((current) => ({
          ...current,
          customLinkEnabled: enabled,
        }));
      },
      onCodingToolNameChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => {
        const name = e.currentTarget.value;
        setCodingToolSaved(false);
        setCodingToolDraft((current) => ({ ...current, customLinkName: name }));
      },
      onCodingToolURLChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => {
        const url = e.currentTarget.value;
        setCodingToolSaved(false);
        setCodingToolDraft((current) => ({ ...current, customLinkURL: url }));
      },
      onCodingToolPromptChange: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => {
        const prompt = e.currentTarget.value;
        setCodingToolSaved(false);
        setCodingToolDraft((current) => ({ ...current, promptTemplate: prompt }));
      },
      onSaveCodingTools: (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const next: CodingToolPreferences = {
          ...codingToolDraft,
          customLinkName: codingToolDraft.customLinkName.trim() || 'Custom link',
          customLinkURL: codingToolDraft.customLinkURL.trim(),
        };
        if (!next.promptTemplate.trim()) {
          setCodingToolError(t('codingTools.promptRequired'));
          setCodingToolSaved(false);
          return;
        }
        if (next.customLinkEnabled && !isWebCodingToolURLTemplate(next.customLinkURL)) {
          setCodingToolError(t('codingTools.invalidURL'));
          setCodingToolSaved(false);
          return;
        }
        setCodingToolError('');
        setCodingToolDraft(next);
        updateCodingToolPreferences(next);
        setCodingToolSaved(true);
      },
      ...workflowSettingsHandlers,
      onOpenSidebarCustomization: () => setSidebarCustomizationOpen(true),
      onCloseSidebarCustomization: () => setSidebarCustomizationOpen(false),
      onSidebarLocationChange: (id: string, value: string | null) => {
        if (!SIDEBAR_ITEM_IDS.includes(id as SidebarItemId)) return;
        if (value !== 'primary' && value !== 'badged' && value !== 'more' && value !== 'hidden')
          return;
        updatePreferences({
          sidebarLocations: {
            ...preferences.sidebarLocations,
            [id]: value,
          },
        });
      },
      onSidebarBadgeStyleChange: (value: string | null) => {
        if (value === 'count' || value === 'dot') updatePreferences({ sidebarBadgeStyle: value });
      },
      onMoveSidebarItem: (id: string, direction: number) => {
        const group = sidebarSettingsGroups(preferences).find((candidate) =>
          candidate.items.some((item) => item.id === id),
        );
        if (!group) return;
        const index = group.items.findIndex((item) => item.id === id);
        const neighbor = group.items[index + direction];
        if (!neighbor) return;
        const sidebarOrder = [...preferences.sidebarOrder];
        const from = sidebarOrder.indexOf(id as SidebarItemId);
        const to = sidebarOrder.indexOf(neighbor.id);
        if (from < 0 || to < 0) return;
        [sidebarOrder[from], sidebarOrder[to]] = [sidebarOrder[to]!, sidebarOrder[from]!];
        updatePreferences({ sidebarOrder });
      },
      onClick3: () => setOverlay('palette')(true),
      onClick4: () => setOverlay('help')(true),
    },
  };
}
