import {
  useLoaderData,
  useNavigate,
  useParams,
  useRouter,
  useSearch,
} from '@tanstack/react-router';
import type * as React from 'react';
import { useState } from 'react';
import { api, parseIssueSearch, searchToFilter, type IssueSearch } from '../api.ts';
import { IssueFilters } from '../components/IssueFilters.tsx';
import { IssueBoard, IssueList } from '../components/IssueList.tsx';
import type { Cycle, Issue, Label, Project } from '../types.ts';

type IssueListData = {
  issues: Issue[];
  projects: Project[];
  cycles: Cycle[];
  labels: Label[];
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

function compactSearch(next: IssueSearch): IssueSearch {
  return parseIssueSearch({
    status: next.status ?? '',
    project: next.project ?? '',
    cycle: next.cycle ?? '',
    priority: next.priority ?? '',
    labels: next.labels ?? '',
  });
}

function matchesFind(issue: Issue, q: string): boolean {
  const n = q.trim().toLowerCase();
  if (!n) {
    return true;
  }
  return issue.title.toLowerCase().includes(n) || issue.identifier.toLowerCase().includes(n);
}

export function useIssuesPagePresenter() {
  const data = useLoaderData({ from: '/issues' }) as IssueListData;
  const search = useSearch({ from: '/issues' }) as IssueSearch;
  const navigate = useNavigate();
  const router = useRouter();
  const [find, setFind] = useState('');
  const issues = (data.issues ?? []).filter((i) => matchesFind(i, find));
  const [selected, setSelected] = useState<string | null>(issues[0]?.identifier ?? null);
  if (selected && !issues.some((i) => i.identifier === selected)) {
    setSelected(issues[0]?.identifier ?? null);
  }

  async function saveView(name: string) {
    const filter = searchToFilter(search);
    const view = await api.createView({
      name,
      slug: slugify(name) || `view-${Date.now()}`,
      display: 'list',
      status: filter.status ?? null,
      project: filter.project ?? null,
      cycle: filter.cycle ?? null,
      labels: filter.labels ?? [],
      priority: filter.priority ?? null,
    });
    await router.invalidate();
    await navigate({ to: '/views/$slug', params: { slug: view.slug } });
  }

  return {
    _view: 0 as const,
    data,
    search,
    find,
    issues,
    selected,
    handlers: {
      onChange0: (
        next: Parameters<NonNullable<React.ComponentProps<typeof IssueFilters>['onChange']>>[0],
      ) => navigate({ to: '/issues', search: compactSearch(next) }),
      onSaveView1: (
        ...args: Parameters<NonNullable<React.ComponentProps<typeof IssueFilters>['onSaveView']>>
      ) => {
        const handle: NonNullable<React.ComponentProps<typeof IssueFilters>['onSaveView']> =
          saveView;
        return handle(...args);
      },
      onFind2: (
        ...args: Parameters<NonNullable<React.ComponentProps<typeof IssueFilters>['onFind']>>
      ) => {
        const handle: NonNullable<React.ComponentProps<typeof IssueFilters>['onFind']> = setFind;
        return handle(...args);
      },
      onSelect3: (
        ...args: Parameters<NonNullable<React.ComponentProps<typeof IssueList>['onSelect']>>
      ) => {
        const handle: NonNullable<React.ComponentProps<typeof IssueList>['onSelect']> = setSelected;
        return handle(...args);
      },
    },
  };
}

export function useIssueRoutePagePresenter() {
  const { identifier } = useParams({ from: '/issues/$identifier' });
  const issues = (useLoaderData({ from: '/issues/$identifier' }) as Issue[] | null) ?? [];
  const navigate = useNavigate();
  return {
    _view: 0 as const,
    identifier,
    issues,
    handlers: {
      onSelect0: (
        id: Parameters<NonNullable<React.ComponentProps<typeof IssueList>['onSelect']>>[0],
      ) => navigate({ to: '/issues/$identifier', params: { identifier: id } }),
    },
  };
}

export function useBoardPagePresenter() {
  const data = useLoaderData({ from: '/board' }) as IssueListData;
  const search = useSearch({ from: '/board' }) as IssueSearch;
  const navigate = useNavigate();
  const router = useRouter();
  const [find, setFind] = useState('');
  const issues = (data.issues ?? []).filter((i) => matchesFind(i, find));

  async function saveView(name: string) {
    const filter = searchToFilter(search);
    const view = await api.createView({
      name,
      slug: slugify(name) || `view-${Date.now()}`,
      display: 'board',
      status: filter.status ?? null,
      project: filter.project ?? null,
      cycle: filter.cycle ?? null,
      labels: filter.labels ?? [],
      priority: filter.priority ?? null,
    });
    await router.invalidate();
    await navigate({ to: '/views/$slug', params: { slug: view.slug } });
  }

  return {
    _view: 0 as const,
    data,
    search,
    find,
    issues,
    handlers: {
      onChange0: (
        next: Parameters<NonNullable<React.ComponentProps<typeof IssueFilters>['onChange']>>[0],
      ) => navigate({ to: '/board', search: compactSearch(next) }),
      onSaveView1: (
        ...args: Parameters<NonNullable<React.ComponentProps<typeof IssueFilters>['onSaveView']>>
      ) => {
        const handle: NonNullable<React.ComponentProps<typeof IssueFilters>['onSaveView']> =
          saveView;
        return handle(...args);
      },
      onFind2: (
        ...args: Parameters<NonNullable<React.ComponentProps<typeof IssueFilters>['onFind']>>
      ) => {
        const handle: NonNullable<React.ComponentProps<typeof IssueFilters>['onFind']> = setFind;
        return handle(...args);
      },
      onOpen3: (
        id: Parameters<NonNullable<React.ComponentProps<typeof IssueBoard>['onOpen']>>[0],
      ) => navigate({ to: '/issues/$identifier', params: { identifier: id } }),
      onMove4: (
        id: Parameters<NonNullable<React.ComponentProps<typeof IssueBoard>['onMove']>>[0],
        status: Parameters<NonNullable<React.ComponentProps<typeof IssueBoard>['onMove']>>[1],
        sortOrder: Parameters<NonNullable<React.ComponentProps<typeof IssueBoard>['onMove']>>[2],
      ) => {
        return api.patchIssue(id, { status, sortOrder }).then(() => router.invalidate());
      },
    },
  };
}
