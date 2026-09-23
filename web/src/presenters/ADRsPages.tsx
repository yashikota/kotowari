import { useLoaderData, useNavigate, useParams, useRouter } from '@tanstack/react-router';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import { api } from '../api.ts';
import i18n from '../i18n/index.ts';
import type { ADR, Issue, Project } from '../types.ts';
import { entityDir } from '../types.ts';

export function useADRsPagePresenter() {
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

  useEffect(() => {
    setAdr(initial);
  }, [initial]);

  useEffect(() => {
    void Promise.all([api.issues(), api.adrs(), api.projects()])
      .then(([i, a, p]) => {
        setIssues(i);
        setAllADRs(a);
        setProjects(p);
      })
      .catch((e) => setError(String(e)));
  }, [identifier]);

  async function save(body: Record<string, unknown>) {
    try {
      setError('');
      const next = await api.patchADR(identifier, body);
      setAdr(next);
      await router.invalidate();
    } catch (e) {
      setError(String(e));
    }
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
    linked,
    unlinked,
    sandbox,
    handlers: {
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
      ) => save({ status: e.target.value }),
      onClick2: () => {
        return api.publishADR(identifier).then(async (next) => {
          setAdr(next);
          await router.invalidate();
        });
      },
      ADR_title_onChange3: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setAdr({ ...adr, title: e.target.value }),
      ADR_title_onBlur4: () => save({ title: adr.title }),
      ADR_project_onChange5: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => save({ projectSlug: e.target.value || null }),
      Evaluation_onChange6: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setAdr({ ...adr, evaluation: e.target.value }),
      Evaluation_onBlur7: () => save({ evaluation: adr.evaluation }),
      Supersedes_ADR_number_onChange8: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) =>
        setAdr({
          ...adr,
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
