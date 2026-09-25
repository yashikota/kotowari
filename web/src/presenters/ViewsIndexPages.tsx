import { useLoaderData, useNavigate } from '@tanstack/react-router';
import type { View } from '../types.ts';

export function useViewsIndexPresenter() {
  const views = useLoaderData({ from: '/views' }) as View[];
  const navigate = useNavigate();

  return {
    _view: 0 as const,
    views,
    handlers: {
      onCreateView: () => navigate({ to: '/views/new', state: { autofocus: 'name' } }),
    },
  };
}
