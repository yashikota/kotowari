import { useLoaderData, useRouter } from '@tanstack/react-router';
import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { api } from '../api.ts';
import { useMachineFlag } from '../application/Root.tsx';
import { signals } from '../application/mediator.ts';
import i18n from '../i18n/index.ts';
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
  const removingIds = useRef(new Set<number>());
  const [removingResources, setRemovingResources] = useState<number[]>([]);
  const [removalErrors, setRemovalErrors] = useState<Record<number, string>>({});
  const [removedResource, setRemovedResource] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const savePending = useRef(false);
  const dirty = useRef(false);
  const [resourceOpen, setResourceOpen] = useState(false);
  const [resourceURL, setResourceURL] = useState('');
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceSaving, setResourceSaving] = useState(false);
  const resourcePending = useRef(false);
  const [resourceError, setResourceError] = useState('');
  const [urlEditing, setUrlEditing] = useMachineFlag('url-editor');
  const [githubEditing, setGithubEditing] = useMachineFlag('github-editor');

  useEffect(() => {
    setWorkspace((current) =>
      dirty.current || savePending.current
        ? { ...current, resources: data.workspace.resources }
        : normalizeWorkspace(data.workspace),
    );
  }, [data.workspace]);

  const updateField = (field: 'name' | 'url' | 'githubUrl' | 'description', value: string) => {
    if (savePending.current) return;
    dirty.current = true;
    setSaved(false);
    setWorkspace((current) => ({ ...current, [field]: value }));
  };

  const saveWorkspace = () => {
    if (savePending.current) return;
    savePending.current = true;
    setSaving(true);
    setSaved(false);
    setSaveError('');
    return api
      .patchWorkspace({
        name: workspace.name,
        url: workspace.url,
        description: workspace.description,
        githubUrl: workspace.githubUrl,
      })
      .then(async (next) => {
        dirty.current = false;
        setWorkspace((current) => ({ ...normalizeWorkspace(next), resources: current.resources }));
        setSaved(true);
        signals.dispatchEvent(new Event('kotowari:refresh'));
        await router.invalidate().catch(() => undefined);
      })
      .catch((err: unknown) => {
        setSaveError(err instanceof Error ? err.message : i18n.t('common.saveFailed'));
      })
      .finally(() => {
        savePending.current = false;
        setSaving(false);
      });
  };

  return {
    _view: 0 as const,
    workspace,
    counts: data.counts,
    removingResources,
    removalErrors,
    removedResource,
    saved,
    saving,
    saveError,
    resourceOpen,
    resourceURL,
    resourceTitle,
    resourceSaving,
    resourceError,
    urlEditing,
    githubEditing,
    handlers: {
      onRetrySave: saveWorkspace,
      onEditUrl: () => setUrlEditing(true),
      onBlurUrl: () => setUrlEditing(false),
      onEditGithub: () => setGithubEditing(true),
      onBlurGithub: () => setGithubEditing(false),
      onOpenResource: () => {
        if (resourcePending.current) return;
        setResourceError('');
        setResourceURL('');
        setResourceTitle('');
        setResourceOpen(true);
      },
      onCloseResource: () => {
        if (!resourcePending.current) setResourceOpen(false);
      },
      onResourceURLChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setResourceURL(e.target.value),
      onResourceTitleChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setResourceTitle(e.target.value),
      onCreateResource: (
        e: Parameters<NonNullable<React.ComponentProps<'form'>['onSubmit']>>[0],
      ) => {
        e.preventDefault();
        if (resourcePending.current) return;
        resourcePending.current = true;
        setResourceSaving(true);
        setResourceError('');
        return api
          .createWorkspaceResource({ url: resourceURL, title: resourceTitle })
          .then(async (resource) => {
            setWorkspace((current) => ({
              ...current,
              resources: [...current.resources, resource],
            }));
            setResourceOpen(false);
            signals.dispatchEvent(new Event('kotowari:refresh'));
            await router.invalidate().catch(() => undefined);
          })
          .catch((err: unknown) =>
            setResourceError(err instanceof Error ? err.message : i18n.t('common.saveFailed')),
          )
          .finally(() => {
            resourcePending.current = false;
            setResourceSaving(false);
          });
      },
      onRemoveResource: (id: number) => {
        if (removingIds.current.has(id)) return Promise.resolve(false);
        removingIds.current.add(id);
        setRemovingResources([...removingIds.current]);
        setRemovalErrors((current) => ({ ...current, [id]: '' }));
        setRemovedResource('');
        const resource = workspace.resources.find((item) => item.id === id);
        return api
          .deleteWorkspaceResource(id)
          .then(async () => {
            setWorkspace((current) => ({
              ...current,
              resources: current.resources.filter((item) => item.id !== id),
            }));
            setRemovedResource(resource?.title || resource?.url || '');
            signals.dispatchEvent(new Event('kotowari:refresh'));
            await router.invalidate().catch(() => undefined);
            return true;
          })
          .catch((err: unknown) => {
            setRemovalErrors((current) => ({
              ...current,
              [id]: err instanceof Error ? err.message : i18n.t('home.removalFailed'),
            }));
            return false;
          })
          .finally(() => {
            removingIds.current.delete(id);
            setRemovingResources([...removingIds.current]);
          });
      },
      onSubmit0: (e: Parameters<NonNullable<React.ComponentProps<'form'>['onSubmit']>>[0]) => {
        e.preventDefault();
        return saveWorkspace();
      },
      Workspace_name_onChange1: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => updateField('name', e.target.value),
      Workspace_url_onChange2: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => updateField('url', e.target.value),
      Workspace_githubUrl_onChange3: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => updateField('githubUrl', e.target.value),
      Workspace_description_onChange4: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => updateField('description', e.target.value),
    },
  };
}
