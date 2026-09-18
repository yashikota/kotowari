import { useLoaderData, useNavigate, useParams, useRouter } from '@tanstack/react-router';
import type * as React from 'react';
import { useState } from 'react';
import { api } from '../api.ts';
import { IssueBoard, IssueList } from '../components/IssueList.tsx';
import type { Cycle, Issue, Label, Project, View } from '../types.ts';

export function useViewPagePresenter() {
  const { slug } = useParams({ from: '/views/$slug' });
  const data = useLoaderData({ from: '/views/$slug' }) as {
    view: View;
    issues: Issue[];
    projects: Project[];
    cycles: Cycle[];
    labels: Label[];
  };
  const router = useRouter();
  const navigate = useNavigate();
  const issues = data.issues ?? [];
  const [view, setView] = useState(data.view);
  const [selected, setSelected] = useState<string | null>(issues[0]?.identifier ?? null);

  if (view.slug !== data.view.slug || view.updatedAt !== data.view.updatedAt) {
    setView(data.view);
    setSelected((data.issues ?? [])[0]?.identifier ?? null);
  }

  async function save(body: Record<string, unknown>) {
    const next = await api.patchView(slug, body);
    setView(next);
    await router.invalidate();
  }

  return {
    _view: 0 as const,
    slug,
    data,
    issues,
    view,
    selected,
    handlers: {
      onClick0: () => {
        if (!window.confirm(`Delete view ${view.name}?`)) {
          return;
        }
        return api.deleteView(slug).then(async () => {
          await router.invalidate();
          await navigate({ to: '/issues', search: {} });
        });
      },
      View_name_onChange1: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setView({ ...view, name: e.target.value }),
      View_name_onBlur2: () => save({ name: view.name }),
      View_display_onChange3: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => save({ display: e.target.value }),
      View_status_onChange4: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => save({ status: e.target.value }),
      View_project_onChange5: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => save({ project: e.target.value }),
      View_cycle_onChange6: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => save({ cycle: e.target.value ? Number(e.target.value) : 0 }),
      View_priority_onChange7: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) =>
        save({
          priority: e.target.value === '' ? -1 : Number(e.target.value),
        }),
      onClick8: (on: boolean, l: Label) => {
        const next = on ? view.labels.filter((n) => n !== l.name) : [...view.labels, l.name];
        return save({ labels: next });
      },
      onOpen9: (
        id: Parameters<NonNullable<React.ComponentProps<typeof IssueBoard>['onOpen']>>[0],
      ) => navigate({ to: '/issues/$identifier', params: { identifier: id } }),
      onMove10: (
        id: Parameters<NonNullable<React.ComponentProps<typeof IssueBoard>['onMove']>>[0],
        status: Parameters<NonNullable<React.ComponentProps<typeof IssueBoard>['onMove']>>[1],
        sortOrder: Parameters<NonNullable<React.ComponentProps<typeof IssueBoard>['onMove']>>[2],
      ) => {
        return api.patchIssue(id, { status, sortOrder }).then(() => router.invalidate());
      },
      onSelect11: (
        ...args: Parameters<NonNullable<React.ComponentProps<typeof IssueList>['onSelect']>>
      ) => {
        const handle: NonNullable<React.ComponentProps<typeof IssueList>['onSelect']> = setSelected;
        return handle(...args);
      },
    },
  };
}
