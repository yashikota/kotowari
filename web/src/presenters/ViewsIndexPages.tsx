import { useLoaderData, useNavigate, useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import { useProjectViews } from '../project-views.ts';
import type { ProjectSavedView } from '../project-views.ts';
import type { View } from '../types.ts';

export type ViewCollectionEntity = 'issues' | 'projects';
export type ViewCollectionOrder = 'name' | 'updated';
export type ViewCollectionDirection = 'asc' | 'desc';
export type ViewDisplayProperty = 'created' | 'updated';

export function sortViewCollection<T extends { name: string; updatedAt: string }>(
  views: readonly T[],
  order: ViewCollectionOrder,
  direction: ViewCollectionDirection,
) {
  return [...views].sort((left, right) => {
    const comparison =
      order === 'name'
        ? left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
        : left.updatedAt.localeCompare(right.updatedAt);
    return direction === 'asc' ? comparison : -comparison;
  });
}

export function useViewsIndexPresenter() {
  const views = useLoaderData({ from: '/views' }) as View[];
  const search = useSearch({ from: '/views' });
  const projectViews = useProjectViews();
  const navigate = useNavigate();
  const [order, setOrder] = useState<ViewCollectionOrder>('name');
  const [direction, setDirection] = useState<ViewCollectionDirection>('asc');
  const [displayProperties, setDisplayProperties] = useState<ViewDisplayProperty[]>([
    'created',
    'updated',
  ]);
  const entity: ViewCollectionEntity = search.entity === 'projects' ? 'projects' : 'issues';
  const orderedViews =
    entity === 'issues'
      ? sortViewCollection(views, order, direction)
      : sortViewCollection(projectViews.views, order, direction);

  function onEntityChange(nextEntity: ViewCollectionEntity) {
    return navigate({
      to: '/views',
      search: (previous) => ({
        ...previous,
        entity: nextEntity === 'projects' ? 'projects' : undefined,
      }),
      replace: true,
      resetScroll: false,
    });
  }

  function onOpenView(view: View | ProjectSavedView) {
    if (entity === 'projects') {
      const projectView = view as ProjectSavedView;
      return navigate({
        to: '/projects',
        search: { ...projectView.search, projectView: projectView.slug },
        resetScroll: false,
      });
    }
    return navigate({ to: '/views/$slug', params: { slug: view.slug }, resetScroll: false });
  }

  function onCreateView() {
    return navigate({
      to: entity === 'projects' ? '/views/projects/new' : '/views/new',
      state: { autofocus: 'name' },
    });
  }

  function onToggleDisplayProperty(property: ViewDisplayProperty) {
    setDisplayProperties((current) =>
      current.includes(property)
        ? current.filter((item) => item !== property)
        : [...current, property],
    );
  }

  return {
    _view: 0 as const,
    entity,
    views: orderedViews,
    order,
    direction,
    displayProperties,
    handlers: {
      onEntityChange,
      onOpenView,
      onCreateView,
      onOrderChange: setOrder,
      onToggleDirection: () => setDirection((current) => (current === 'asc' ? 'desc' : 'asc')),
      onToggleDisplayProperty,
    },
  };
}
