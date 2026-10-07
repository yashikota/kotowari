import { useEffect, useRef, useState } from 'react';
import { useRetriableSave } from './useRetriableSave.ts';

/** A confirmed removal retries navigation without repeating the destructive write. */
export function useRetriableRemoval({
  scope,
  remove,
  openList,
  onRemoved,
}: {
  scope: string;
  remove: (key: string) => Promise<void>;
  openList: () => Promise<unknown>;
  onRemoved?: () => void;
}) {
  const [opened, setOpened] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [navigationError, setNavigationError] = useState('');
  const removed = useRef(false);
  const navigationPending = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    generation.current++;
    removed.current = false;
    navigationPending.current = false;
    setOpened(false);
    setConfirmed(false);
    setNavigating(false);
    setNavigationError('');
    return () => {
      generation.current++;
    };
  }, [scope]);
  async function navigate() {
    if (navigationPending.current) return;
    navigationPending.current = true;
    const token = generation.current;
    setNavigating(true);
    setNavigationError('');
    try {
      await openList();
    } catch (cause) {
      if (generation.current === token)
        setNavigationError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (generation.current === token) {
        navigationPending.current = false;
        setNavigating(false);
      }
    }
  }
  const removal = useRetriableSave<string>({
    scope,
    save: remove,
    onSuccess: () => {
      removed.current = true;
      setConfirmed(true);
      onRemoved?.();
      void navigate();
    },
    onFailure: () => {},
  });
  const isPending = () => removal.isPending() || navigationPending.current;
  return {
    opened,
    confirmed,
    pending: removal.saving || navigating,
    error: navigationError || removal.error,
    isPending,
    isRemoved: () => removed.current,
    request: () => {
      if (isPending() || removed.current) return;
      removal.invalidate();
      setOpened(true);
    },
    close: () => {
      if (isPending()) return;
      if (removed.current) return navigate();
      removal.invalidate();
      setOpened(false);
    },
    confirm: () => {
      if (isPending()) return;
      return removed.current ? navigate() : removal.write(scope);
    },
  };
}
