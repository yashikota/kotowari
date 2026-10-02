import { useRouter } from '@tanstack/react-router';
import type * as React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  const router = useRouter();
  const [workspace, setWorkspace] = useState(() => normalizeWorkspace(initialWorkspace));
  const [workspaceSaving, setWorkspaceSaving] = useState(false);
  const saving = useRef(false);

  function changeWorkspace(update: Partial<Workspace>) {
    setSaved(false);
    setWorkspace((current) => ({ ...current, ...update }));
  }

  useEffect(() => setWorkspace(normalizeWorkspace(initialWorkspace)), [initialWorkspace]);

  const timeZones = useMemo(() => timeZoneOptions(workspace.timezone), [workspace.timezone]);
  const languages = useMemo(
    () => languageOptions(resolveLocale(workspace.locale)),
    [workspace.locale],
  );

  return {
    data: {
      workspace,
      timeZones,
      languages,
      workspaceSaving,
    },
    handlers: {
      onSaveWorkspace: (
        event: Parameters<NonNullable<React.ComponentProps<'form'>['onSubmit']>>[0],
      ) => {
        event.preventDefault();
        if (saving.current) return;
        saving.current = true;
        setWorkspaceSaving(true);
        setError('');
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
          )
          .finally(() => {
            saving.current = false;
            setWorkspaceSaving(false);
          });
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
