import { useEffect, useRef, useState } from 'react';
import { api } from '../api.ts';
import type { ProjectDependency } from '../types.ts';
import { useRetriableCreation } from './useRetriableCreation.ts';

type Change =
  | { action: 'add'; dependency: ProjectDependency }
  | { action: 'remove'; projectSlug: string };

/** A confirmed relationship write retries only the project refresh. */
export function useProjectDependencyChanges({
  scope,
  onConfirmed,
  refresh,
}: {
  scope: string;
  onConfirmed: (change: Change) => void;
  refresh: () => Promise<unknown>;
}) {
  const [saved, setSaved] = useState(false);
  const [action, setAction] = useState<'add' | 'remove'>('add');
  const lastChange = useRef<Change | null>(null);
  const generation = useRef(0);
  const currentScope = useRef(scope);
  currentScope.current = scope;
  useEffect(() => {
    generation.current++;
    setSaved(false);
    setAction('add');
    lastChange.current = null;
    return () => {
      generation.current++;
    };
  }, [scope]);
  const transaction = useRetriableCreation({
    scope,
    create: async (change: Change) => {
      if (change.action === 'add') await api.createProjectDependency(scope, change.dependency);
      else await api.deleteProjectDependency(scope, change.projectSlug);
      return change;
    },
    open: async (change) => {
      onConfirmed(change);
      await refresh();
    },
  });
  async function write(change: Change) {
    if (transaction.isPending() || transaction.hasCreated()) return;
    transaction.invalidate();
    const token = generation.current;
    lastChange.current = change;
    setSaved(false);
    setAction(change.action);
    const success = await transaction.submit(change);
    if (generation.current === token && currentScope.current === scope) setSaved(success);
  }
  return {
    pending: transaction.submitting,
    confirmed: transaction.created,
    error: transaction.error,
    saved,
    action,
    isPending: transaction.isPending,
    write,
    retry: async () => {
      if (transaction.isPending() || !lastChange.current) return;
      const token = generation.current;
      const success = await transaction.submit(lastChange.current);
      if (generation.current === token && currentScope.current === scope) setSaved(success);
    },
    invalidate: () => {
      transaction.invalidate();
      setSaved(false);
    },
  };
}
