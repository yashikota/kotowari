import { useLoaderData, useNavigate, useParams, useRouter } from '@tanstack/react-router';
import type * as React from 'react';
import { useState } from 'react';
import { api } from '../api.ts';
import { useIntent } from '../application/Root.tsx';
import { IssueList } from '../components/IssueList.tsx';
import type { ADR, Cycle, Issue, Page, Project } from '../types.ts';

export function useProjectsPagePresenter() {
  const projects = useLoaderData({ from: '/projects' }) as Project[];
  const [name, setName] = useState('');
  const navigate = useNavigate();
  return {
    _view: 0 as const,
    projects,
    name,
    handlers: {
      onSubmit0: (e: Parameters<NonNullable<React.ComponentProps<'form'>['onSubmit']>>[0]) => {
        e.preventDefault();
        const n = name.trim();
        if (!n) {
          return;
        }
        const slug = n
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        return api
          .createProject({ name: n, slug })
          .then((p) => navigate({ to: '/projects/$slug', params: { slug: p.slug } }));
      },
      New_project_name_onChange1: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => setName(e.target.value),
    },
  };
}

export function useProjectDetailPagePresenter() {
  const sendIntent = useIntent();
  const { slug } = useParams({ from: '/projects/$slug' });
  const data = useLoaderData({ from: '/projects/$slug' }) as {
    project: Project;
    issues: Issue[];
    adrs: ADR[];
    pages: Page[];
  };
  const router = useRouter();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(data.issues[0]?.identifier ?? null);
  const [project, setProject] = useState(data.project);

  if (project.slug !== data.project.slug) {
    setProject(data.project);
    setSelected(data.issues[0]?.identifier ?? null);
  }

  async function save(body: Record<string, unknown>) {
    const next = await api.patchProject(slug, body);
    setProject(next);
    await router.invalidate();
  }

  return {
    _view: 0 as const,
    slug,
    data,
    selected,
    project,
    handlers: {
      Project_status_onChange0: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => save({ status: e.target.value }),
      onClick1: () => sendIntent('issue.create', { projectId: project.id }),
      onClick2: () => {
        if (!window.confirm(`Delete project ${project.name}?`)) {
          return;
        }
        return api.deleteProject(slug).then(async () => {
          await router.invalidate();
          await navigate({ to: '/projects' });
        });
      },
      Project_description_onChange3: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => setProject({ ...project, description: e.target.value }),
      Project_description_onBlur4: () => save({ description: project.description }),
      Start_date_onChange5: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => save(e.target.value ? { startDate: e.target.value } : { clearStartDate: true }),
      Target_date_onChange6: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => save(e.target.value ? { targetDate: e.target.value } : { clearTargetDate: true }),
      onClick7: () => {
        const title = window.prompt('ADR title');
        if (title?.trim())
          return api
            .createADR({ title, projectSlug: slug })
            .then((a) =>
              navigate({ to: '/adrs/$identifier', params: { identifier: a.identifier } }),
            );
      },
      onSelect8: (
        ...args: Parameters<NonNullable<React.ComponentProps<typeof IssueList>['onSelect']>>
      ) => {
        const handle: NonNullable<React.ComponentProps<typeof IssueList>['onSelect']> = setSelected;
        return handle(...args);
      },
    },
  };
}

export function useCyclesPagePresenter() {
  const cycles = useLoaderData({ from: '/cycles' }) as Cycle[];
  const navigate = useNavigate();
  return {
    _view: 0 as const,
    cycles,
    handlers: {
      onClick0: () => {
        const start = new Date();
        const end = new Date(start.getTime() + 14 * 86400000);
        return api
          .createCycle({
            startsAt: start.toISOString(),
            endsAt: end.toISOString(),
          })
          .then((c) =>
            navigate({
              to: '/cycles/$number',
              params: { number: String(c.number) },
            }),
          );
      },
    },
  };
}

export function useCycleDetailPagePresenter() {
  const sendIntent = useIntent();
  const data = useLoaderData({ from: '/cycles/$number' }) as {
    cycle: Cycle;
    issues: Issue[];
  };
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(data.issues[0]?.identifier ?? null);
  const [cycle, setCycle] = useState(data.cycle);
  const done = data.issues.filter((i) => i.status === 'done' || i.status === 'canceled').length;

  if (cycle.number !== data.cycle.number) {
    setCycle(data.cycle);
    setSelected(data.issues[0]?.identifier ?? null);
  }

  async function save(body: Record<string, unknown>) {
    const next = await api.patchCycle(cycle.number, body);
    setCycle(next);
    await router.invalidate();
  }

  return {
    _view: 0 as const,
    data,
    selected,
    cycle,
    done,
    handlers: {
      Cycle_status_onChange0: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => save({ status: e.target.value }),
      onClick1: () => sendIntent('issue.create', { cycleId: cycle.id }),
      onSelect2: (
        ...args: Parameters<NonNullable<React.ComponentProps<typeof IssueList>['onSelect']>>
      ) => {
        const handle: NonNullable<React.ComponentProps<typeof IssueList>['onSelect']> = setSelected;
        return handle(...args);
      },
    },
  };
}
