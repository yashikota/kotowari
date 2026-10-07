import { useEffect, useRef, useState } from 'react';
import type { Initiative } from '../types.ts';
import { api } from '../api.ts';
import { queryCache } from '../query-cache.ts';
import { useRetriableCreation } from './useRetriableCreation.ts';
import {
  initiativeDraft,
  initiativePatch,
  reconcileInitiativeDraft,
  sameInitiativeDraft,
} from './initiativeDraft.ts';
import type { InitiativeDraft } from './initiativeDraft.ts';
import i18n from '../i18n/index.ts';

/** Scoped drafts survive refresh; confirmed PATCH results retry only their read. */
export function useInitiativeEdits({
  source,
  blocked,
}: {
  source: Initiative;
  blocked: () => boolean;
}) {
  const scope = source.slug;
  const initial = () => ({
    scope,
    source,
    entity: source,
    draft: initiativeDraft(source),
    baseline: initiativeDraft(source),
    saved: false,
    validation: '',
  });
  const [state, setState] = useState(initial);
  const generation = useRef(0);
  const currentScope = useRef(scope);
  currentScope.current = scope;
  useEffect(() => {
    generation.current++;
    return () => {
      generation.current++;
    };
  }, [scope]);
  if (state.scope !== scope) setState(initial());
  else if (state.source !== source) {
    const baseline = initiativeDraft(source);
    setState(
      source.updatedAt < state.entity.updatedAt
        ? { ...state, source }
        : {
            ...state,
            source,
            entity: source,
            baseline,
            draft: reconcileInitiativeDraft(state.draft, state.baseline, baseline),
          },
    );
  }
  const transaction = useRetriableCreation({
    scope,
    create: (payload: { draft: InitiativeDraft; baseline: InitiativeDraft }) =>
      api.patchInitiative(scope, initiativePatch(payload.draft, payload.baseline)),
    open: async (confirmed) => {
      const token = generation.current;
      setState((current) =>
        confirmed.updatedAt < current.entity.updatedAt
          ? current
          : {
              ...current,
              entity: confirmed,
              baseline: initiativeDraft(confirmed),
              draft: initiativeDraft(confirmed),
            },
      );
      queryCache.invalidate();
      const next = await api.initiative(scope);
      if (token !== generation.current || currentScope.current !== scope) return;
      setState((current) => ({
        ...current,
        entity: next,
        baseline: initiativeDraft(next),
        draft: initiativeDraft(next),
      }));
    },
  });
  async function save() {
    if (blocked() || transaction.isPending()) return false;
    if (!transaction.hasCreated() && !state.draft.name.trim()) {
      setState((current) => ({ ...current, validation: i18n.t('initiativeSave.nameRequired') }));
      return false;
    }
    const token = generation.current;
    if (!transaction.hasCreated() && sameInitiativeDraft(state.draft, state.baseline)) return true;
    const success = await transaction.submit({ draft: state.draft, baseline: state.baseline });
    if (success && token === generation.current && currentScope.current === scope)
      setState((current) => ({ ...current, saved: true }));
    return success;
  }
  return {
    ...state.draft,
    entity: state.entity,
    dirty: !sameInitiativeDraft(state.draft, state.baseline) || transaction.created,
    pending: transaction.submitting,
    confirmed: transaction.created,
    saved: state.saved || transaction.created,
    error: state.validation || transaction.error,
    nameError: state.validation,
    isPending: transaction.isPending,
    save,
    change: <Key extends keyof InitiativeDraft>(key: Key, value: InitiativeDraft[Key]) => {
      if (transaction.isPending() || transaction.hasCreated() || blocked()) return;
      transaction.invalidate();
      setState((current) => ({
        ...current,
        validation: '',
        saved: false,
        draft: { ...current.draft, [key]: value },
      }));
    },
  };
}
