import { useCallback, useEffect, useRef, useState } from 'react';
import { signals } from './application/mediator.ts';

/** Share status persistence without allowing older reads to undo confirmed writes. */
export function useWorkflowStatuses<Status>(
  defaults: Status[],
  load: () => Promise<Status[]>,
  save: (statuses: Status[]) => Promise<Status[]>,
) {
  const [statuses, setStatuses] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);
  const active = useRef(false);
  const revision = useRef(0);
  const pendingWrites = useRef(0);
  const pendingRead = useRef<{ revision: number; promise: Promise<void> } | null>(null);
  const refresh = useCallback(() => {
    if (pendingWrites.current) return Promise.resolve();
    if (pendingRead.current) return pendingRead.current.promise;
    const requestRevision = ++revision.current;
    setLoading(true);
    setLoadError('');
    const current = () =>
      active.current && requestRevision === revision.current && !pendingWrites.current;
    const promise = (async () => {
      try {
        const next = await load();
        if (!current()) return;
        if (!Array.isArray(next) || next.length < defaults.length)
          throw new Error('The status list returned by the server is incomplete.');
        loaded.current = true;
        setStatuses(next);
        setReady(true);
      } catch (cause) {
        if (current())
          setLoadError(cause instanceof Error ? cause.message : 'Unable to load statuses');
      } finally {
        if (current()) setLoading(false);
        if (pendingRead.current?.revision === requestRevision) pendingRead.current = null;
      }
    })();
    pendingRead.current = { revision: requestRevision, promise };
    return promise;
  }, [load, defaults]);
  useEffect(() => {
    active.current = true;
    void refresh();
    const onRefresh = () => {
      void refresh();
    };
    signals.addEventListener('kotowari:refresh', onRefresh);
    return () => {
      active.current = false;
      revision.current++;
      pendingRead.current = null;
      signals.removeEventListener('kotowari:refresh', onRefresh);
    };
  }, [refresh]);
  const updateStatuses = useCallback(
    async (next: Status[]) => {
      if (!loaded.current) throw new Error('Load workflow statuses before saving changes.');
      pendingWrites.current++;
      revision.current++;
      pendingRead.current = null;
      let confirmed: Status[];
      try {
        confirmed = await save(next);
        revision.current++;
        if (active.current) {
          setStatuses(confirmed);
          setLoading(false);
          setLoadError('');
        }
      } finally {
        pendingWrites.current--;
        if (active.current && !pendingWrites.current) setLoading(false);
      }
      signals.dispatchEvent(new Event('kotowari:refresh'));
      return confirmed;
    },
    [save],
  );
  return { statuses, updateStatuses, ready, loading, loadError, refresh };
}
