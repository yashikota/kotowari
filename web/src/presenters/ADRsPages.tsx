import { useLoaderData, useNavigate, useParams, useRouter } from '@tanstack/react-router';
import type * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRetriableSave } from './useRetriableSave.ts';
import { api } from '../api.ts';
import i18n from '../i18n/index.ts';
import type { ADR, Issue, Project } from '../types.ts';
import { ADR_STATUSES, entityDir } from '../types.ts';
import { useIntent } from '../application/Root.tsx';

export function useADRsPagePresenter() {
  const sendIntent = useIntent();
  const adrs = useLoaderData({ from: '/adrs' }) as ADR[];
  const [status, setStatus] = useState('');
  const [project, setProject] = useState('');
  const filtered = adrs.filter(
    (a) => (!status || a.status === status) && (!project || a.projectSlug === project),
  );
  return {
    _view: 0 as const,
    adrs,
    status,
    project,
    filtered,
    handlers: {
      onCreateADR: () => sendIntent('adr.create'),
      onClearFilters: () => {
        setStatus('');
        setProject('');
      },
      Filter_ADR_status_onChange0: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => setStatus(e.target.value),
      Filter_ADR_project_onChange1: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => setProject(e.target.value),
    },
  };
}

export function useADRDetailPagePresenter() {
  const { identifier } = useParams({ from: '/adrs/$identifier' });
  const initial = useLoaderData({ from: '/adrs/$identifier' }) as ADR;
  const router = useRouter();
  const navigate = useNavigate();
  const [allADRs, setAllADRs] = useState<ADR[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [adr, setAdr] = useState(initial);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [linkNumber, setLinkNumber] = useState('');
  const [error, setError] = useState('');
  type Properties = Pick<ADR, 'title' | 'status' | 'projectSlug' | 'evaluation' | 'supersedes'>;
  const confirmed = useRef(initial);
  const dirty = useRef(false);
  const [propertiesDirty, setPropertiesDirty] = useState(false);
  const [propertiesSaved, setPropertiesSaved] = useState(false);
  const [optionsError, setOptionsError] = useState('');
  const [optionsLoading, setOptionsLoading] = useState(true);
  const optionsGeneration = useRef(0);
  const mutation = useRetriableSave<Partial<Properties>, ADR>({
    scope: identifier,
    save: (body) => api.patchADR(identifier, body),
    onSuccess: (next) => {
      confirmed.current = next;
      dirty.current = false;
      setAdr(next);
      setPropertiesDirty(false);
      setPropertiesSaved(true);
    },
    onFailure: () => {},
  });

  useEffect(() => {
    if (initial.identifier !== confirmed.current.identifier || !dirty.current) {
      confirmed.current = initial;
      dirty.current = false;
      setAdr(initial);
      setPropertiesDirty(false);
      setPropertiesSaved(false);
    }
  }, [initial]);

  const loadOptions = useCallback(async () => {
    const generation = ++optionsGeneration.current;
    setOptionsLoading(true);
    setOptionsError('');
    try {
      const [i, a, p] = await Promise.all([api.issues(), api.adrs(), api.projects()]);
      if (generation !== optionsGeneration.current) return;
      setIssues(i);
      setAllADRs(a);
      setProjects(p);
    } catch (cause) {
      if (generation === optionsGeneration.current)
        setOptionsError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (generation === optionsGeneration.current) setOptionsLoading(false);
    }
  }, [identifier]);
  useEffect(() => {
    setIssues([]);
    setAllADRs([]);
    setProjects([]);
    setLinkNumber('');
    setError('');
    void loadOptions();
    return () => {
      optionsGeneration.current++;
    };
  }, [loadOptions]);

  function markDirty() {
    dirty.current = true;
    setPropertiesDirty(true);
    setPropertiesSaved(false);
    mutation.invalidate();
  }
  function edit(changes: Partial<Properties>) {
    if (mutation.isPending()) return;
    markDirty();
    setAdr((current) => ({ ...current, ...changes }));
  }
  function save(changes: Partial<Properties>) {
    if (mutation.isPending()) return;
    const draft = { ...adr, ...changes };
    const fields = ['title', 'status', 'projectSlug', 'evaluation', 'supersedes'] as const;
    const body = Object.fromEntries(
      fields.filter((key) => draft[key] !== confirmed.current[key]).map((key) => [key, draft[key]]),
    ) as Partial<Properties>;
    if (!Object.keys(body).length) {
      dirty.current = false;
      setPropertiesDirty(false);
      return;
    }
    markDirty();
    setAdr(draft);
    return mutation.write(body);
  }

  const linked = issues.filter((i) => adr.issueNumbers.includes(i.number));
  const unlinked = issues.filter((i) => !adr.issueNumbers.includes(i.number));
  const sandbox = `adr/${entityDir(adr.number)}/`;

  return {
    _view: 0 as const,
    identifier,
    initial,
    allADRs,
    projects,
    adr,
    issues,
    linkNumber,
    error,
    propertiesDirty,
    propertiesSaved,
    propertiesSaving: mutation.saving,
    propertiesError: mutation.error,
    supersedesLocked: confirmed.current.supersedes != null,
    optionsError,
    optionsLoading,
    linked,
    unlinked,
    sandbox,
    handlers: {
      onRetryProperties: mutation.retry,
      onSaveProperties: () => save({}),
      onRetryPropertyOptions: loadOptions,
      onClick0: () => {
        const title = window.prompt(i18n.t('modal.adrTitle'), adr.title);
        if (title?.trim())
          return api
            .createADR({
              title,
              supersedes: adr.number,
              projectSlug: adr.projectSlug,
              issueNumbers: adr.issueNumbers,
            })
            .then((a) =>
              navigate({ to: '/adrs/$identifier', params: { identifier: a.identifier } }),
            )
            .catch((e) => setError(String(e)));
      },
      ADR_status_onChange1: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => {
        const status = ADR_STATUSES.find((status) => status === e.target.value);
        if (status) return save({ status });
      },
      onClick2: () => {
        return api.publishADR(identifier).then(async (next) => {
          setAdr(next);
          await router.invalidate();
        });
      },
      ADR_title_onChange3: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => edit({ title: e.target.value }),
      ADR_title_onBlur4: () => save({ title: adr.title }),
      ADR_project_onChange5: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => save({ projectSlug: e.target.value || null }),
      Evaluation_onChange6: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => edit({ evaluation: e.target.value }),
      Evaluation_onBlur7: () => save({ evaluation: adr.evaluation }),
      Supersedes_ADR_number_onChange8: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) =>
        edit({
          supersedes: e.target.value ? Number(e.target.value) : null,
        }),
      Supersedes_ADR_number_onBlur9: () => save({ supersedes: adr.supersedes }),
      onClick10: (iss: Issue) => {
        return api.unlinkADRIssue(identifier, iss.number).then(async () => {
          setAdr(await api.adr(identifier));
          await router.invalidate();
        });
      },
      Link_issue_onChange11: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => setLinkNumber(e.target.value),
      onClick12: () => {
        const n = Number(linkNumber);
        if (!n) {
          return;
        }
        setError('');
        return api
          .linkADRIssue(identifier, n)
          .then(async (next) => {
            setAdr(next);
            setLinkNumber('');
            await router.invalidate();
          })
          .catch((e: unknown) => setError(e instanceof Error ? e.message : 'link failed'));
      },
    },
  };
}
