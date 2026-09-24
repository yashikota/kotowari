import { useLoaderData } from '@tanstack/react-router';
import { useOverlay } from '../application/Root.tsx';
import type { View } from '../types.ts';

export function useViewsIndexPresenter() {
  const views = useLoaderData({ from: '/views' }) as View[];
  const { set } = useOverlay();
  const setCreateView = set('view');

  return {
    _view: 0 as const,
    views,
    handlers: {
      onCreateView: () => setCreateView(true),
    },
  };
}
