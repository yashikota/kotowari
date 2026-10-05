import { useLoaderData, useNavigate, useParams } from '@tanstack/react-router';
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
  type Operation = { kind: 'publish' } | { kind: 'link' | 'unlink'; number: number };
  const [operationKind, setOperationKind] = useState<Operation['kind']>('publish');
  const [operationSaved, setOperationSaved] = useState(false);
  const operation = useRetriableSave<Operation, { next: ADR; kind: Operation['kind'] }>({
    scope: identifier,
    save: async (action) => {
      const current = confirmed.current;
      if (action.kind === 'unlink') {
        await api.unlinkADRIssue(identifier, action.number);
        return {
          next: {
            ...current,
            issueNumbers: current.issueNumbers.filter((n) => n !== action.number),
          },
          kind: action.kind,
        };
      }
      const next =
        action.kind === 'publish'
          ? await api.publishADR(identifier)
          : await api.linkADRIssue(identifier, action.number);
      return { next, kind: action.kind };
    },
    onSuccess: ({ next, kind }) => {
      confirmed.current = next;
      setAdr(next);
      if (kind === 'link') setLinkNumber('');
      setOperationSaved(true);
    },
    onFailure: () => {},
  });
  function runOperation(action: Operation) {
    if (operation.isPending() || mutation.isPending() || dirty.current) return;
    setOperationKind(action.kind);
    setOperationSaved(false);
    return operation.write(action);
  }

  useEffect(() => {
    if (initial.identifier !== confirmed.current.identifier || !dirty.current) {
      confirmed.current = initial;
      dirty.current = false;
      setAdr(initial);
      setPropertiesDirty(false);
      setPropertiesSaved(false);
      setOperationSaved(false);
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
    operation.invalidate();
    setOperationSaved(false);
  }
  function edit(changes: Partial<Properties>) {
    if (mutation.isPending() || operation.isPending()) return;
    markDirty();
    setAdr((current) => ({ ...current, ...changes }));
  }
  function save(changes: Partial<Properties>) {
    if (mutation.isPending() || operation.isPending()) return;
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
    operationKind,
    operationSaved,
    operationSaving: operation.saving,
    operationError: operation.error,
    linked,
    unlinked,
    sandbox,
    handlers: {
      onRetryProperties: mutation.retry,
      onSaveProperties: () => save({}),
      onRetryPropertyOptions: loadOptions,
      onRetryOperation: () => {
        if (mutation.isPending() || dirty.current) return;
        return operation.retry();
      },
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
      onClick2: () => runOperation({ kind: 'publish' }),
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
      onClick10: (iss: Issue) => runOperation({ kind: 'unlink', number: iss.number }),
      Link_issue_onChange11: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => {
        if (!operation.isPending()) {
          setLinkNumber(e.target.value);
          operation.invalidate();
          setOperationSaved(false);
        }
      },
      onClick12: () => {
        const n = Number(linkNumber);
        if (!n) {
          return;
        }
        return runOperation({ kind: 'link', number: n });
      },
    },
  };
}
