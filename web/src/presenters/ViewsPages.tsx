import { useLoaderData, useNavigate, useParams, useRouter } from '@tanstack/react-router';
import type * as React from 'react';
import { useState } from 'react';
import { api, type IssueSearch } from '../api.ts';
import i18n from '../i18n/index.ts';
import {
  DEFAULT_DISPLAY_PROPERTIES,
  filterCompletedIssues,
  includeNestedIssueMatches,
  type CompletedIssuesFilter,
  type IssueDisplayProperty,
  type IssueGroupBy,
  type IssueLayout,
  type IssueOrderBy,
} from '../issue-list.ts';
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
  const matchingIssues = (data.issues ?? []).filter((issue) => {
    const query = find.trim().toLowerCase();
    return (
      !query ||
      issue.title.toLowerCase().includes(query) ||
      issue.identifier.toLowerCase().includes(query)
    );
  });
  const issues = filterCompletedIssues(
    includeNestedIssueMatches(
      matchingIssues,
      data.issues ?? [],
      view.nestedSubIssues === 'showAll' ? 'showAll' : 'showMatching',
    ),
    (view.completedIssues || 'all') as CompletedIssuesFilter,
    data.cycles,
  );
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
    type: view.type ?? undefined,
    estimate: view.estimate ?? undefined,
    dueDate: view.dueDate === '' ? undefined : (view.dueDate as IssueSearch['dueDate']),
    relation: view.relation === '' ? undefined : (view.relation as IssueSearch['relation']),
    content: view.content ?? undefined,
    milestoneName: view.milestoneName ?? undefined,
    dateField: view.dateField as IssueSearch['dateField'],
    dateRange: view.dateRange as IssueSearch['dateRange'],
    projectStatus: view.projectStatus ?? undefined,
    projectPriority: view.projectPriority ?? undefined,
    projectLabels: view.projectLabels ?? undefined,
    addedToCycle: view.addedToCycle ?? undefined,
    labels: view.labels.length > 0 ? view.labels.join(',') : undefined,
  };

  function patchFilters(next: IssueSearch) {
    if (next.dateRange === 'custom') {
      setView({ ...view, dateField: next.dateField ?? '', dateRange: 'custom' });
      return Promise.resolve(view);
    }
    return save({
      status: next.status ?? '',
      project: next.project ?? '',
      cycle: next.cycle ?? 0,
      priority: next.priority ?? -1,
      type: next.type ?? '',
      estimate: next.estimate ?? -1,
      dueDate: next.dueDate ?? '',
      relation: next.relation ?? '',
      content: next.content ?? '',
      milestoneName: next.milestoneName ?? '',
      dateField: next.dateField ?? '',
      dateRange: next.dateRange ?? '',
      projectStatus: next.projectStatus ?? '',
      projectPriority: next.projectPriority ?? -1,
      projectLabels: next.projectLabels ?? [],
      addedToCycle: next.addedToCycle ?? [],
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
    subGroupBy: (view.subGroupBy || 'none') as IssueGroupBy,
    direction: view.direction || 'asc',
    completedIssues: (view.completedIssues || 'all') as CompletedIssuesFilter,
    showSubIssues: view.showSubIssues ?? true,
    nestedSubIssues: (view.nestedSubIssues === 'showAll' ? 'showAll' : 'showMatching') as
      | 'showMatching'
      | 'showAll',
    showEmptyGroups: view.showEmptyGroups ?? false,
    displayProperties: (view.displayProperties as IssueDisplayProperty[] | undefined) ?? [
      ...DEFAULT_DISPLAY_PROPERTIES,
    ],
    handlers: {
      onClick0: () => {
        if (!window.confirm(i18n.t('ui.deleteViewConfirmation', { name: view.name }))) {
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
      onSubGroupBy19: (next: IssueGroupBy) => save({ subGroupBy: next }),
      onDirection20: (next: 'asc' | 'desc') => save({ direction: next }),
      onCompletedIssues21: (next: CompletedIssuesFilter) => save({ completedIssues: next }),
      onShowSubIssues22: (next: boolean) => save({ showSubIssues: next }),
      onNestedSubIssues23: (next: 'showMatching' | 'showAll') => save({ nestedSubIssues: next }),
      onShowEmptyGroups24: (next: boolean) => save({ showEmptyGroups: next }),
      onDisplayPropertyToggle25: (property: IssueDisplayProperty) => {
        const displayProperties = (view.displayProperties as
          | IssueDisplayProperty[]
          | undefined) ?? [...DEFAULT_DISPLAY_PROPERTIES];
        return save({
          displayProperties: displayProperties.includes(property)
            ? displayProperties.filter((item) => item !== property)
            : [...displayProperties, property],
        });
      },
      onBoardOpen17: (id: string) =>
        navigate({ to: '/issues/$identifier', params: { identifier: id } }),
      onBoardMove18: (id: string, status: string, sortOrder: number) =>
        api.patchIssue(id, { status, sortOrder }).then(() => router.invalidate()),
    },
  };
}
