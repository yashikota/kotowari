import { useEffect, useRef, type RefObject } from 'react';
import { useRouterState } from '@tanstack/react-router';

export type AutofocusTarget = 'title' | 'name' | 'body' | 'description';

export type IssueNavigationState = {
  issueIds: string[];
  issueReturnTo: string;
  issueListFind: string;
  issueListSelectedId: string;
  issueListScrollTop: number;
  issueListLayout: 'list' | 'board';
};

export function readAutofocus(state: unknown): AutofocusTarget | undefined {
  return (state as { autofocus?: AutofocusTarget } | undefined)?.autofocus;
}

export function useAutofocusTarget(target: AutofocusTarget): boolean {
  return useRouterState({
    select: (s) => readAutofocus(s.location.state) === target,
  });
}

export function useFocusWhen<T extends HTMLElement>(
  active: boolean,
  deps: readonly unknown[] = [],
): RefObject<T | null> {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!active) {
      return;
    }
    const id = window.requestAnimationFrame(() => {
      ref.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps list is caller-controlled
  }, [active, ...deps]);
  return ref;
}

declare module '@tanstack/history' {
  interface HistoryState {
    autofocus?: AutofocusTarget;
    issueIds?: string[];
    issueReturnTo?: string;
    issueListFind?: string;
    issueListSelectedId?: string;
    issueListScrollTop?: number;
    issueListLayout?: 'list' | 'board';
    viewDraft?: {
      display?: 'list' | 'board';
      groupBy?: string;
      subGroupBy?: string;
      orderBy?: string;
      direction?: 'asc' | 'desc';
      completedIssues?: 'all' | 'pastDay' | 'pastWeek' | 'pastMonth' | 'currentCycle' | 'none';
      showSubIssues?: boolean;
      nestedSubIssues?: 'showMatching' | 'showAll';
      showEmptyGroups?: boolean;
      displayProperties?: string[];
    };
  }
}
