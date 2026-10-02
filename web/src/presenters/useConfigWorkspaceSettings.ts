import { useRouter } from '@tanstack/react-router';
import type * as React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.ts';
import { signals } from '../application/mediator.ts';
import i18n, { applyLocale } from '../i18n/index.ts';
import { languageOptions, normalizeWorkspace, resolveLocale } from '../i18n/locale.ts';
import { systemTimeZone, timeZoneOptions } from '../time.ts';
import type { Workspace } from '../types.ts';

export function useConfigWorkspaceSettings(initialWorkspace: Workspace) {
  const router = useRouter();
  const [workspace, setWorkspace] = useState(() => normalizeWorkspace(initialWorkspace));
  const [workspaceSaving, setWorkspaceSaving] = useState(false);
  const saving = useRef(false);
  const dirty = useRef(false);
  const [workspaceSaveError, setWorkspaceSaveError] = useState('');
  const [workspaceSaved, setWorkspaceSaved] = useState(false);

  function changeWorkspace(update: Partial<Workspace>) {
    if (saving.current) return;
    dirty.current = true;
    setWorkspaceSaved(false);
    setWorkspace((current) => ({ ...current, ...update }));
  }

  useEffect(() => {
    setWorkspace((current) => {
      const next = normalizeWorkspace(initialWorkspace);
      return dirty.current || saving.current
        ? { ...next, name: current.name, timezone: current.timezone, locale: current.locale }
        : next;
    });
  }, [initialWorkspace]);

  const timeZones = useMemo(() => timeZoneOptions(workspace.timezone), [workspace.timezone]);
  const languages = useMemo(
    () => languageOptions(resolveLocale(workspace.locale)),
    [workspace.locale],
  );

  const saveWorkspace = () => {
    if (saving.current) return;
    saving.current = true;
    setWorkspaceSaving(true);
    setWorkspaceSaveError('');
    setWorkspaceSaved(false);
    return api
      .patchWorkspace({
        name: workspace.name,
        timezone: workspace.timezone,
        locale: workspace.locale,
      })
      .then(async (next) => {
        dirty.current = false;
        setWorkspace(normalizeWorkspace(next));
        applyLocale(next.locale);
        setWorkspaceSaved(true);
        signals.dispatchEvent(new Event('kotowari:refresh'));
        await router.invalidate().catch(() => undefined);
      })
      .catch((error: unknown) => {
        setWorkspaceSaveError(
          error instanceof Error ? error.message : i18n.t('workspaceSave.failed'),
        );
      })
      .finally(() => {
        saving.current = false;
        setWorkspaceSaving(false);
      });
  };

  return {
    data: {
      workspace,
      timeZones,
      languages,
      workspaceSaving,
      workspaceSaveError,
      workspaceSaved,
    },
    handlers: {
      onRetryWorkspaceSave: saveWorkspace,
      onSaveWorkspace: (
        event: Parameters<NonNullable<React.ComponentProps<'form'>['onSubmit']>>[0],
      ) => {
        event.preventDefault();
        return saveWorkspace();
      },
      onWorkspaceNameChange: (
        event: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => changeWorkspace({ name: event.target.value }),
      onWorkspaceTimezoneChange: (value: string | null) =>
        changeWorkspace({ timezone: value ?? systemTimeZone() }),
      onWorkspaceLocaleChange: (value: string | null) =>
        changeWorkspace({ locale: resolveLocale(value) }),
    },
  };
}
