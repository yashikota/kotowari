import { useState } from 'react';
import {
  useLoaderData,
  useNavigate,
  useRouter,
  useRouterState,
  useSearch,
} from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import type * as React from 'react';
import { api, searchToFilter, type IssueSearch } from '../api.ts';
import {
  DEFAULT_DISPLAY_PROPERTIES,
  type IssueDisplayProperty,
  type IssueGroupBy,
  type IssueLayout,
  type IssueOrderBy,
} from '../issue-list.ts';
import type { ViewIconName } from '../types.ts';
import { VIEW_ICON_NAMES } from '../components/ViewIcon.tsx';
import { isSubmitShortcut } from '../keymap.ts';

type BuilderData = {
  issues: import('../types.ts').Issue[];
  projects: import('../types.ts').Project[];
  cycles: import('../types.ts').Cycle[];
  labels: import('../types.ts').Label[];
  views: import('../types.ts').View[];
};

type ViewDraft = {
  display?: IssueLayout;
  groupBy?: IssueGroupBy;
  subGroupBy?: IssueGroupBy;
  orderBy?: IssueOrderBy;
  direction?: 'asc' | 'desc';
  completedIssues?: 'all' | 'pastDay' | 'pastWeek' | 'pastMonth' | 'currentCycle' | 'none';
  showSubIssues?: boolean;
  nestedSubIssues?: 'showMatching' | 'showAll';
  showEmptyGroups?: boolean;
  displayProperties?: IssueDisplayProperty[];
};

function compactSearch(next: IssueSearch): IssueSearch {
  return {
    archived: next.archived,
    status: next.status,
    project: next.project,
    cycle: next.cycle,
    priority: next.priority,
    type: next.type,
    estimate: next.estimate,
    dueDate: next.dueDate,
    relation: next.relation,
    content: next.content,
    milestoneName: next.milestoneName,
    dateField: next.dateField,
    dateRange: next.dateRange,
    projectStatus: next.projectStatus,
    projectPriority: next.projectPriority,
    projectLabels: next.projectLabels,
    addedToCycle: next.addedToCycle,
    labels: next.labels,
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

function uniqueSlug(name: string, views: BuilderData['views']): string {
  const base = slugify(name) || `view-${Date.now()}`;
  const existing = new Set(views.map((view) => view.slug));
  let slug = base;
  let suffix = 2;
  while (existing.has(slug)) {
    const tail = `-${suffix++}`;
    slug = `${base.slice(0, 48 - tail.length)}${tail}`;
  }
  return slug;
}

export function useViewBuilderPresenter() {
  const { t } = useTranslation();
  const data = useLoaderData({ from: '/views/new' }) as BuilderData;
  const routeSearch = useSearch({ from: '/views/new' }) as IssueSearch;
  const locationState = useRouterState({ select: (state) => state.location.state }) as {
    viewDraft?: ViewDraft;
  };
  const draft = locationState.viewDraft ?? {};
  const navigate = useNavigate();
  const router = useRouter();
  const [name, setName] = useState(() => t('viewBuilder.defaultName'));
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState<ViewIconName>('list');
  const search = routeSearch;
  const issues = data.issues;
  const [display, setDisplay] = useState<IssueLayout>(draft.display ?? 'list');
  const [groupBy, setGroupBy] = useState<IssueGroupBy>(draft.groupBy ?? 'priority');
  const [subGroupBy, setSubGroupBy] = useState<IssueGroupBy>(draft.subGroupBy ?? 'none');
  const [orderBy, setOrderBy] = useState<IssueOrderBy>(draft.orderBy ?? 'manual');
  const [direction, setDirection] = useState<'asc' | 'desc'>(draft.direction ?? 'asc');
  const [completedIssues, setCompletedIssues] = useState<ViewDraft['completedIssues']>(
    draft.completedIssues ?? 'all',
  );
  const [showSubIssues, setShowSubIssues] = useState(draft.showSubIssues ?? true);
  const [nestedSubIssues, setNestedSubIssues] = useState<'showMatching' | 'showAll'>(
    draft.nestedSubIssues ?? 'showMatching',
  );
  const [showEmptyGroups, setShowEmptyGroups] = useState(draft.showEmptyGroups ?? false);
  const [displayProperties, setDisplayProperties] = useState<IssueDisplayProperty[]>(
    draft.displayProperties ?? [...DEFAULT_DISPLAY_PROPERTIES],
  );
  const [saving, setSaving] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [error, setError] = useState('');
  async function createView() {
    const cleanName = name.trim();
    if (!cleanName || saving) return;
    setSaving(true);
    setError('');
    const filter = searchToFilter(search);
    try {
      const view = await api.createView({
        name: cleanName,
        slug: uniqueSlug(cleanName, data.views),
        description: description.trim(),
        icon,
        display,
        groupBy,
        subGroupBy,
        orderBy,
        direction,
        completedIssues,
        showSubIssues,
        nestedSubIssues,
        showEmptyGroups,
        displayProperties,
        status: filter.status ?? null,
        project: filter.project ?? null,
        cycle: filter.cycle ?? null,
        labels: filter.labels ?? [],
        priority: filter.priority ?? null,
        type: filter.type ?? null,
        estimate: filter.estimate ?? null,
        dueDate: filter.dueDate ?? '',
        relation: filter.relation ?? '',
        content: filter.content ?? '',
        milestoneName: filter.milestoneName ?? '',
        dateField: filter.dateField ?? '',
        dateRange: filter.dateRange ?? '',
        projectStatus: filter.projectStatus ?? '',
        projectPriority: filter.projectPriority ?? null,
        projectLabels: filter.projectLabels ?? [],
        addedToCycle: filter.addedToCycle ?? [],
      });
      await router.invalidate();
      await navigate({ to: '/views/$slug', params: { slug: view.slug } });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setSaving(false);
    }
  }

  return {
    _view: 0 as const,
    data,
    issues,
    name,
    description,
    icon,
    iconPickerOpen,
    iconOptions: VIEW_ICON_NAMES,
    search,
    display,
    groupBy,
    subGroupBy,
    orderBy,
    direction,
    completedIssues: completedIssues ?? 'all',
    showSubIssues,
    nestedSubIssues,
    showEmptyGroups,
    displayProperties,
    saving,
    error,
    handlers: {
      onNameChange: (event: { currentTarget: { value: string } }) =>
        setName(event.currentTarget.value),
      onNameKeyDown: (
        event: Parameters<NonNullable<React.ComponentProps<'input'>['onKeyDown']>>[0],
      ) => {
        if (event.nativeEvent.isComposing || event.keyCode === 229) return;
        if (isSubmitShortcut(event)) {
          event.preventDefault();
          return createView();
        }
      },
      onDescriptionChange: (event: { currentTarget: { value: string } }) =>
        setDescription(event.currentTarget.value),
      onIconChange: (next: ViewIconName) => setIcon(next),
      onIconPickerChange: (next: boolean) => setIconPickerOpen(next),
      onSearchChange: (next: IssueSearch) =>
        navigate({ to: '/views/new', search: compactSearch(next), replace: true }),
      onDisplayChange: (next: string) => setDisplay(next as IssueLayout),
      onGroupByChange: (next: string) => setGroupBy(next as IssueGroupBy),
      onSubGroupByChange: (next: string) => setSubGroupBy(next as IssueGroupBy),
      onOrderByChange: (next: string) => setOrderBy(next as IssueOrderBy),
      onDirectionChange: (next: 'asc' | 'desc') => setDirection(next),
      onCompletedIssuesChange: (next: NonNullable<ViewDraft['completedIssues']>) =>
        setCompletedIssues(next),
      onShowSubIssuesChange: (next: boolean) => setShowSubIssues(next),
      onNestedSubIssuesChange: (next: 'showMatching' | 'showAll') => setNestedSubIssues(next),
      onShowEmptyGroupsChange: (next: boolean) => setShowEmptyGroups(next),
      onDisplayPropertyToggle: (property: IssueDisplayProperty) =>
        setDisplayProperties((current) =>
          current.includes(property)
            ? current.filter((item) => item !== property)
            : [...current, property],
        ),
      onCancel: () => navigate({ to: '/views' }),
      onCreate: () => createView(),
    },
  };
}
