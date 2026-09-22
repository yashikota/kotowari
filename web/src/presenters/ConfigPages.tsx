import { useLoaderData, useRouter } from '@tanstack/react-router';
import type * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.ts';
import { signals } from '../application/mediator.ts';
import { useOverlay } from '../application/Root.tsx';
import { applyLocale } from '../i18n/index.ts';
import { languageOptions, normalizeWorkspace, resolveLocale } from '../i18n/locale.ts';
import { timeZoneOptions, systemTimeZone } from '../time.ts';
import type { Diagnostic, Workspace } from '../types.ts';

type ConfigData = {
  workspace: Workspace;
  diagnostics: Diagnostic[];
};

export function useConfigPagePresenter() {
  const data = useLoaderData({ from: '/config' }) as ConfigData;
  const router = useRouter();
  const { set: setOverlay } = useOverlay();
  const [workspace, setWorkspace] = useState(() => normalizeWorkspace(data.workspace));
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setWorkspace(normalizeWorkspace(data.workspace));
  }, [data.workspace]);

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
      onClick3: () => setOverlay('palette')(true),
      onClick4: () => setOverlay('help')(true),
    },
  };
}
