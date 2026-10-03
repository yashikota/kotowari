import { useCallback, useEffect, useRef, useState } from 'react';
import { signals } from './application/mediator.ts';

/** Share status persistence without allowing older reads to undo confirmed writes. */
export function useWorkflowStatuses<Status>(
  defaults: Status[],
  load: () => Promise<Status[]>,
  save: (statuses: Status[]) => Promise<Status[]>,
) {
  const [statuses, setStatuses] = useState(defaults);
  const active = useRef(false);
  const revision = useRef(0);
  const pendingWrites = useRef(0);
  const refresh = useCallback(() => {
    if (pendingWrites.current) return;
    const requestRevision = ++revision.current;
    void load()
      .then((next) => {
        if (
          active.current &&
          requestRevision === revision.current &&
          !pendingWrites.current &&
          next.length >= defaults.length
        )
          setStatuses(next);
      })
      .catch(() => {});
  }, [load, defaults]);
  useEffect(() => {
    active.current = true;
    refresh();
    signals.addEventListener('kotowari:refresh', refresh);
    return () => {
      active.current = false;
      revision.current++;
      signals.removeEventListener('kotowari:refresh', refresh);
    };
  }, [refresh]);
  const updateStatuses = useCallback(
    async (next: Status[]) => {
      pendingWrites.current++;
      revision.current++;
      let confirmed: Status[];
      try {
        confirmed = await save(next);
        // Reads begun before this response cannot replace its authoritative result.
        revision.current++;
        if (active.current) setStatuses(confirmed);
      } finally {
        pendingWrites.current--;
      }
      signals.dispatchEvent(new Event('kotowari:refresh'));
      return confirmed;
    },
    [save],
  );
  return { statuses, updateStatuses };
}
