import { useEffect, useRef, useState } from 'react';
import { useRetriableRemoval } from './useRetriableRemoval.ts';

/** Removes one selected item, then retries only refresh after a confirmed DELETE. */
export function useItemRemoval<Key extends string | number>({
  scope,
  remove,
  refresh,
  onRemoved,
}: {
  scope: string;
  remove: (id: Key) => Promise<void>;
  refresh: () => Promise<unknown>;
  onRemoved: (id: Key) => void;
}) {
  type Target = { scope: string; id: Key; name: string };
  const [target, setTarget] = useState<Target | null>(null);
  const lastTarget = useRef<Target | null>(null);
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const [removed, setRemoved] = useState(false);
  const removal = useRetriableRemoval({
    scope: JSON.stringify([scope, target?.scope === scope ? target.id : null]),
    remove: async () => {
      if (!target || target.scope !== scope) throw new Error('No item selected for removal');
      await remove(target.id);
    },
    onRemoved: () => {
      if (!target || target.scope !== scope || currentScope.current !== scope) return;
      setRemoved(true);
      onRemoved(target.id);
    },
    openList: async () => {
      const captured = target;
      await refresh();
      if (currentScope.current === scope && lastTarget.current === captured) setTarget(null);
    },
  });
  useEffect(() => {
    if (target?.scope === scope) removal.request();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Open only when the selected target changes.
  }, [scope, target]);
  useEffect(() => {
    setTarget(null);
    lastTarget.current = null;
    setRemoved(false);
  }, [scope]);
  return {
    ...removal,
    name: target?.name ?? '',
    focusId: lastTarget.current?.scope === scope ? lastTarget.current.id : undefined,
    removed,
    request: (id: Key, name: string) => {
      if (removal.isPending() || removal.isRemoved()) return;
      setRemoved(false);
      const next = { scope, id, name };
      lastTarget.current = next;
      setTarget(next);
    },
    close: () => {
      if (removal.isPending()) return;
      if (!removal.isRemoved()) void removal.close();
      setTarget(null);
    },
  };
}
