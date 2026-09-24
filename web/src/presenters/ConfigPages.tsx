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
  usePersonalPreferences,
  type CommentSubmitShortcut,
  type DefaultHome,
  type FontSize,
  type SidebarItemId,
  type SidebarLocation,
  SIDEBAR_ITEM_IDS,
} from '../preferences.ts';
import { sidebarSettingsGroups } from '../sidebar.ts';

type ConfigData = {
  workspace: Workspace;
  diagnostics: Diagnostic[];
};

export function useConfigPagePresenter() {
  const data = useLoaderData({ from: '/config' }) as ConfigData;
  const { t } = useTranslation();
  const router = useRouter();
  const { set: setOverlay } = useOverlay();
  const [sidebarCustomizationOpen, setSidebarCustomizationOpen] =
    useMachineFlag('sidebar-customization');
  const [workspace, setWorkspace] = useState(() => normalizeWorkspace(data.workspace));
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
    timeZones,
    languages,
    preferences,
    codingToolDraft,
    codingToolError,
    codingToolSaved,
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
          value === 'issues' ||
          value === 'projects' ||
          value === 'cycles' ||
          value === 'agent'
        )
          updatePreferences({ defaultHome: value as DefaultHome });
      },
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
        setCodingToolSaved(false);
        setCodingToolDraft((current) => ({
          ...current,
          customLinkEnabled: e.currentTarget.checked,
        }));
      },
      onCodingToolNameChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => {
        setCodingToolSaved(false);
        setCodingToolDraft((current) => ({ ...current, customLinkName: e.target.value }));
      },
      onCodingToolURLChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => {
        setCodingToolSaved(false);
        setCodingToolDraft((current) => ({ ...current, customLinkURL: e.target.value }));
      },
      onCodingToolPromptChange: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => {
        setCodingToolSaved(false);
        setCodingToolDraft((current) => ({ ...current, promptTemplate: e.target.value }));
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
      onOpenSidebarCustomization: () => setSidebarCustomizationOpen(true),
      onCloseSidebarCustomization: () => setSidebarCustomizationOpen(false),
      onSidebarLocationChange: (id: string, value: string | null) => {
        if (!SIDEBAR_ITEM_IDS.includes(id as SidebarItemId)) return;
        if (value !== 'primary' && value !== 'more' && value !== 'hidden') return;
        updatePreferences({
          sidebarLocations: {
            ...preferences.sidebarLocations,
            [id]: value as SidebarLocation,
          },
        });
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
