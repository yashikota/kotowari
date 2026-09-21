import { useLoaderData, useRouter } from '@tanstack/react-router';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import { api } from '../api.ts';
import { signals } from '../application/mediator.ts';
import { normalizeWorkspace } from '../i18n/locale.ts';
import type { Workspace } from '../types.ts';

export type HomeCounts = {
  issues: number;
  openIssues: number;
  projects: number;
  adrs: number;
};

type HomeData = {
  workspace: Workspace;
  counts: HomeCounts;
};

export function useHomePagePresenter() {
  const data = useLoaderData({ from: '/' }) as HomeData;
  const router = useRouter();
  const [workspace, setWorkspace] = useState(() => normalizeWorkspace(data.workspace));
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setWorkspace(normalizeWorkspace(data.workspace));
  }, [data.workspace]);

  return {
    _view: 0 as const,
    workspace,
    counts: data.counts,
    error,
    saved,
    handlers: {
      onSubmit0: (e: Parameters<NonNullable<React.ComponentProps<'form'>['onSubmit']>>[0]) => {
        e.preventDefault();
        setSaved(false);
        return api
          .patchWorkspace({
            name: workspace.name,
            url: workspace.url,
            description: workspace.description,
            githubUrl: workspace.githubUrl,
          })
          .then(async (next) => {
            setWorkspace(normalizeWorkspace(next));
            setSaved(true);
            signals.dispatchEvent(new Event('kotowari:refresh'));
            await router.invalidate();
          })
          .catch((err: unknown) =>
            setError(err instanceof Error ? err.message : 'save failed'),
          );
      },
      Workspace_name_onChange1: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setWorkspace({ ...workspace, name: e.target.value }),
      Workspace_url_onChange2: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setWorkspace({ ...workspace, url: e.target.value }),
      Workspace_githubUrl_onChange3: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setWorkspace({ ...workspace, githubUrl: e.target.value }),
      Workspace_description_onChange4: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => setWorkspace({ ...workspace, description: e.target.value }),
    },
  };
}
