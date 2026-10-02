import { useLoaderData } from '@tanstack/react-router';
import { useMemo } from 'react';
import { useOverlay } from '../application/Root.tsx';
import { normalizeWorkspace } from '../i18n/locale.ts';
import type { Diagnostic, Workspace } from '../types.ts';
import { useConfigWorkflowSettings } from './useConfigWorkflowSettings.ts';
import { useConfigCodingTools } from './useConfigCodingTools.ts';
import { useConfigCycleSettings } from './useConfigCycleSettings.ts';
import { useConfigIssueAutomationSettings } from './useConfigIssueAutomationSettings.ts';
import { useConfigPersonalPreferences } from './useConfigPersonalPreferences.ts';
import { useConfigWorkspaceSettings } from './useConfigWorkspaceSettings.ts';

type ConfigData = {
  workspace: Workspace;
  diagnostics: Diagnostic[];
};

export function useConfigPagePresenter() {
  const data = useLoaderData({ from: '/config' }) as ConfigData;
  const { set: setOverlay } = useOverlay();
  const normalizedWorkspace = useMemo(() => normalizeWorkspace(data.workspace), [data.workspace]);

  const workspaceSettings = useConfigWorkspaceSettings(data.workspace);
  const cycleSettings = useConfigCycleSettings(normalizedWorkspace.cycleSettings);
  const issueAutomationSettings = useConfigIssueAutomationSettings(
    normalizedWorkspace.issueAutomationSettings,
  );
  const personalSettings = useConfigPersonalPreferences();
  const codingTools = useConfigCodingTools();
  const workflowSettings = useConfigWorkflowSettings();

  const { data: workspaceSettingsData, handlers: workspaceSettingsHandlers } = workspaceSettings;
  const { data: cycleSettingsData, handlers: cycleSettingsHandlers } = cycleSettings;
  const { data: issueAutomationSettingsData, handlers: issueAutomationSettingsHandlers } =
    issueAutomationSettings;
  const { data: personalSettingsData, handlers: personalSettingsHandlers } = personalSettings;
  const { data: codingToolsData, handlers: codingToolsHandlers } = codingTools;
  const { data: workflowSettingsData, handlers: workflowSettingsHandlers } = workflowSettings;

  return {
    _view: 0 as const,
    ...workspaceSettingsData,
    ...cycleSettingsData,
    ...issueAutomationSettingsData,
    ...personalSettingsData,
    ...codingToolsData,
    ...workflowSettingsData,
    diagnostics: data.diagnostics,
    handlers: {
      ...workspaceSettingsHandlers,
      ...cycleSettingsHandlers,
      ...issueAutomationSettingsHandlers,
      ...personalSettingsHandlers,
      ...codingToolsHandlers,
      ...workflowSettingsHandlers,
      onOpenCommandPalette: () => setOverlay('palette')(true),
      onOpenKeyboardShortcuts: () => setOverlay('help')(true),
    },
  };
}
