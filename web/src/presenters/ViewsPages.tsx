import { useLoaderData, useNavigate, useParams, useRouter } from '@tanstack/react-router';
import type * as React from 'react';
import { useState } from 'react';
import { api, type IssueSearch } from '../api.ts';
import type { IssueGroupBy, IssueLayout, IssueOrderBy } from '../issue-list.ts';
import { IssueList } from '../components/IssueList.tsx';
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
  const [find, setFind] = useState('');
  const [groupBy, setGroupBy] = useState<IssueGroupBy>(
    (data.view.groupBy || 'priority') as IssueGroupBy,
  );
  const [orderBy, setOrderBy] = useState<IssueOrderBy>(
    (data.view.orderBy || 'manual') as IssueOrderBy,
  );
  const [view, setView] = useState(data.view);
  const issues = (data.issues ?? []).filter((issue) => {
    const query = find.trim().toLowerCase();
    return (
      !query ||
      issue.title.toLowerCase().includes(query) ||
      issue.identifier.toLowerCase().includes(query)
    );
  });
  const [selected, setSelected] = useState<string | null>(issues[0]?.identifier ?? null);

  if (view.slug !== data.view.slug || view.updatedAt !== data.view.updatedAt) {
    setView(data.view);
    setSelected((data.issues ?? [])[0]?.identifier ?? null);
    setGroupBy((data.view.groupBy || 'priority') as IssueGroupBy);
    setOrderBy((data.view.orderBy || 'manual') as IssueOrderBy);
  }

  async function save(body: Record<string, unknown>) {
    const next = await api.patchView(slug, body);
    setView(next);
    await router.invalidate();
  }

  const search: IssueSearch = {
    status: view.status ?? undefined,
    project: view.project ?? undefined,
    cycle: view.cycle ?? undefined,
    priority: view.priority ?? undefined,
    labels: view.labels.length > 0 ? view.labels.join(',') : undefined,
  };

  function patchFilters(next: IssueSearch) {
    return save({
      status: next.status ?? '',
      project: next.project ?? '',
      cycle: next.cycle ?? 0,
      priority: next.priority ?? -1,
      labels: next.labels ? next.labels.split(',').filter(Boolean) : [],
    });
  }

  return {
    _view: 0 as const,
    slug,
    data,
    issues,
    view,
    selected,
    search,
    find,
    groupBy,
    orderBy,
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
      onSelect11: (
        ...args: Parameters<NonNullable<React.ComponentProps<typeof IssueList>['onSelect']>>
      ) => {
        const handle: NonNullable<React.ComponentProps<typeof IssueList>['onSelect']> = setSelected;
        return handle(...args);
      },
      onFilterChange12: (next: IssueSearch) => patchFilters(next),
      onFind13: (query: string) => setFind(query),
      onGroupBy14: (next: IssueGroupBy) => {
        setGroupBy(next);
        return save({ groupBy: next });
      },
      onLayout15: (next: IssueLayout) => save({ display: next }),
      onOrderBy16: (next: IssueOrderBy) => {
        setOrderBy(next);
        return save({ orderBy: next });
      },
      onBoardOpen17: (id: string) =>
        navigate({ to: '/issues/$identifier', params: { identifier: id } }),
      onBoardMove18: (id: string, status: string, sortOrder: number) =>
        api.patchIssue(id, { status, sortOrder }).then(() => router.invalidate()),
    },
  };
}
