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
import type { IssueGroupBy, IssueLayout, IssueOrderBy } from '../issue-list.ts';
import { IssueFilters } from '../components/IssueFilters.tsx';
import { IssueBoard, IssueList } from '../components/IssueList.tsx';
import { isTypingTarget } from '../keymap.ts';
import { useKeyboard } from '../application/Root.tsx';
import type { Cycle, Issue, Label, Project } from '../types.ts';

type IssueListData = {
  issues: Issue[];
  projects: Project[];
  cycles: Cycle[];
  labels: Label[];
};

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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

export function useIssuesPagePresenter() {
  const data = useLoaderData({ from: '/issues' }) as IssueListData;
  const search = useSearch({ from: '/issues' }) as IssueSearch;
  const navigate = useNavigate();
  const router = useRouter();
  const [find, setFind] = useState('');
  const [view, setView] = useState<'active' | 'backlog' | 'all'>('all');
  const [groupBy, setGroupBy] = useState<IssueGroupBy>('priority');
  const [layout, setLayout] = useState<IssueLayout>('list');
  const [orderBy, setOrderBy] = useState<IssueOrderBy>('manual');
  const [selected, setSelected] = useState<string | null>(null);

  async function saveView(name: string) {
    const filter = searchToFilter(search);
    const saved = await api.createView({
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
    await navigate({ to: '/views/$slug', params: { slug: saved.slug } });
  }

  useKeyboard((event) => {
    if (
      !(event.ctrlKey || event.metaKey) ||
      event.altKey ||
      event.shiftKey ||
      event.repeat ||
      event.key.toLowerCase() !== 'b' ||
      isTypingTarget(event.target)
    )
      return false;
    event.preventDefault();
    setLayout((current) => (current === 'list' ? 'board' : 'list'));
    return true;
  });
  const issues = (data.issues ?? [])
    .filter((i) => matchesFind(i, find))
    .filter((i) =>
      view === 'active'
        ? i.status === 'todo' || i.status === 'in_progress'
        : view === 'backlog'
          ? i.status === 'backlog'
          : true,
    );
  const selectedId = selected && issues.some((i) => i.identifier === selected) ? selected : null;

  return {
    _view: 0 as const,
    data,
    search,
    find,
    issues,
    selected: selectedId,
    view,
    groupBy,
    layout,
    orderBy,
    handlers: {
      onChange0: (
        next: Parameters<NonNullable<React.ComponentProps<typeof IssueFilters>['onChange']>>[0],
      ) => navigate({ to: '/issues', search: compactSearch(next) }),
      onSaveView10: (
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
      onView4: (next: string | null) => {
        if (next === 'active' || next === 'backlog' || next === 'all') setView(next);
      },
      onGroupBy5: (next: IssueGroupBy) => setGroupBy(next),
      onLayout6: (next: IssueLayout) => setLayout(next),
      onOrderBy7: (next: IssueOrderBy) => setOrderBy(next),
      onBoardOpen8: (id: string) =>
        navigate({ to: '/issues/$identifier', params: { identifier: id } }),
      onBoardMove9: (id: string, status: Issue['status'], sortOrder: number) =>
        api.patchIssue(id, { status, sortOrder }).then(() => router.invalidate()),
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
