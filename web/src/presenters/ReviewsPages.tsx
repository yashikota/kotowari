import { useLoaderData } from '@tanstack/react-router';
import type { Issue } from '../types.ts';
import { listLinkedPullRequests } from '../reviews.ts';

export function useReviewsPagePresenter() {
  const issues = (useLoaderData({ from: '/reviews' }) as Issue[] | null) ?? [];
  return {
    _view: 0 as const,
    pullRequests: listLinkedPullRequests(issues),
  };
}
