import { useRouter } from '@tanstack/react-router';
import type * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
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
    },
    handlers: {
      onSaveWorkspace: (
        event: Parameters<NonNullable<React.ComponentProps<'form'>['onSubmit']>>[0],
      ) => {
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
      onWorkspaceNameChange: (
        event: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setWorkspace((current) => ({ ...current, name: event.target.value })),
      onWorkspaceTimezoneChange: (value: string | null) =>
        setWorkspace((current) => ({ ...current, timezone: value ?? systemTimeZone() })),
      onWorkspaceLocaleChange: (value: string | null) =>
        setWorkspace((current) => ({ ...current, locale: resolveLocale(value) })),
    },
  };
}
