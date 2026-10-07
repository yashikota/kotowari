import { useEffect, useRef, useState, type RefObject } from 'react';
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
      const modal = document.querySelector('[role="dialog"][aria-modal="true"]');
      if (modal && !modal.contains(ref.current)) return;
      const menu = document.querySelector('[role="menu"]');
      const menuTrigger = document.querySelector('[aria-haspopup="menu"][aria-expanded="true"]');
      if ((menu || menuTrigger) && !menu?.contains(ref.current)) return;
      ref.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps list is caller-controlled
  }, [active, ...deps]);
  return ref;
}

/** A route landing target is a fallback, not a control the user chose to edit. */
export function isPassiveFocus(active: Element | null): boolean {
  return active === document.body || Boolean(active?.matches('[data-route-content]'));
}

/** Restore focus after pending controls have been rendered enabled again. */
export function useActionFocusReturn(
  busy: boolean,
  fallback: () => HTMLElement | null,
  canRestoreFrom: (active: Element | null) => boolean = isPassiveFocus,
  scope?: string,
) {
  const pending = useRef<HTMLElement | null>(null);
  const generation = useRef(0);
  useEffect(() => {
    generation.current++;
    pending.current = null;
    return () => {
      generation.current++;
    };
  }, [scope]);
  const latestFallback = useRef(fallback);
  latestFallback.current = fallback;
  const latestCanRestore = useRef(canRestoreFrom);
  latestCanRestore.current = canRestoreFrom;
  const [completion, setCompletion] = useState(0);
  useEffect(() => {
    if (busy) return;
    const trigger = pending.current;
    if (!trigger) return;
    const token = generation.current;
    const frame = requestAnimationFrame(() => {
      if (generation.current !== token) return;
      pending.current = null;
      if (latestCanRestore.current(document.activeElement)) latestFallback.current()?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [busy, completion]);
  return async (action: () => unknown) => {
    const token = generation.current;
    const trigger = document.activeElement;
    try {
      return await action();
    } finally {
      if (generation.current === token) {
        pending.current =
          trigger instanceof HTMLElement && trigger !== document.body ? trigger : null;
        setCompletion((current) => current + 1);
      }
    }
  };
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
