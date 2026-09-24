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
import type { Diagnostic, IssueStatus, IssueWorkflowStatus, Workspace } from '../types.ts';
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
import { useIssueWorkflow } from '../workflow.tsx';

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
  const { statuses: issueWorkflowStatuses, updateStatuses: saveIssueWorkflowStatuses } =
    useIssueWorkflow();
  const [codingToolDraft, setCodingToolDraft] = useState(codingToolPreferences);
  const [codingToolError, setCodingToolError] = useState('');
  const [codingToolSaved, setCodingToolSaved] = useState(false);
  const [workflowDraft, setWorkflowDraft] = useState(issueWorkflowStatuses);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [workflowCategory, setWorkflowCategory] = useState<IssueStatus>('in_progress');
  const [workflowError, setWorkflowError] = useState('');
  const [workflowSaved, setWorkflowSaved] = useState(false);
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setWorkspace(normalizeWorkspace(data.workspace));
  }, [data.workspace]);

  useEffect(() => {
    setCodingToolDraft(codingToolPreferences);
  }, [codingToolPreferences]);

  useEffect(() => {
    setWorkflowDraft(issueWorkflowStatuses);
  }, [issueWorkflowStatuses]);

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
    issueWorkflowStatuses: workflowDraft,
    workflowError,
    workflowSaved,
    workflowDirty: JSON.stringify(workflowDraft) !== JSON.stringify(issueWorkflowStatuses),
    workflowName,
    workflowDescription,
    workflowCategory,
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
      onWorkflowStatusNameChange: (id: string, name: string) => {
        setWorkflowSaved(false);
        setWorkflowDraft((current) =>
          current.map((status) => (status.id === id ? { ...status, name } : status)),
        );
      },
      onWorkflowStatusDescriptionChange: (id: string, description: string) => {
        setWorkflowSaved(false);
        setWorkflowDraft((current) =>
          current.map((status) => (status.id === id ? { ...status, description } : status)),
        );
      },
      onWorkflowNameChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setWorkflowName(e.target.value),
      onWorkflowDescriptionChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setWorkflowDescription(e.target.value),
      onWorkflowCategoryChange: (value: string | null) => {
        if (
          value === 'backlog' ||
          value === 'todo' ||
          value === 'in_progress' ||
          value === 'done' ||
          value === 'canceled'
        )
          setWorkflowCategory(value);
      },
      onSaveWorkflow: (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setWorkflowError('');
        setWorkflowSaved(false);
        void saveIssueWorkflowStatuses(workflowDraft)
          .then(() => setWorkflowSaved(true))
          .catch((err: unknown) =>
            setWorkflowError(err instanceof Error ? err.message : t('config.workflowSaveFailed')),
          );
      },
      onAddWorkflowStatus: (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const name = workflowName.trim();
        if (!name) {
          setWorkflowError(t('config.workflowNameRequired'));
          return;
        }
        const base = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 48);
        const idBase = base || `custom-status-${Date.now().toString(36)}`;
        const used = new Set(workflowDraft.map((status) => status.id));
        let id = idBase;
        for (let suffix = 2; used.has(id); suffix++) id = `${idBase.slice(0, 43)}-${suffix}`;
        const status: IssueWorkflowStatus = {
          id,
          name,
          category: workflowCategory,
          ...(workflowDescription.trim() ? { description: workflowDescription.trim() } : {}),
        };
        const next = [...workflowDraft, status];
        setWorkflowError('');
        setWorkflowSaved(false);
        void saveIssueWorkflowStatuses(next)
          .then(() => {
            setWorkflowDraft(next);
            setWorkflowName('');
            setWorkflowDescription('');
            setWorkflowSaved(true);
          })
          .catch((err: unknown) =>
            setWorkflowError(err instanceof Error ? err.message : t('config.workflowSaveFailed')),
          );
      },
      onDeleteWorkflowStatus: (id: string) => {
        const next = workflowDraft.filter((status) => status.id !== id);
        setWorkflowError('');
        setWorkflowSaved(false);
        void saveIssueWorkflowStatuses(next)
          .then(() => {
            setWorkflowDraft(next);
            setWorkflowSaved(true);
          })
          .catch((err: unknown) =>
            setWorkflowError(err instanceof Error ? err.message : t('config.workflowSaveFailed')),
          );
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
