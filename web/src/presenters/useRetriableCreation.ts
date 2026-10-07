import { useEffect, useRef, useState } from 'react';

/** Retain both the failed payload and a confirmed record while opening it. */
export function useRetriableCreation<Payload, Entity>({
  create,
  open,
}: {
  create: (payload: Payload) => Promise<Entity>;
  open: (entity: Entity) => Promise<unknown>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(false);
  const inFlight = useRef(false);
  const record = useRef<Entity | null>(null);
  const failed = useRef<{ payload: Payload } | null>(null);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function submit(payload: Payload) {
    if (inFlight.current) return false;
    inFlight.current = true;
    setSubmitting(true);
    setError('');
    try {
      if (!record.current) {
        failed.current ??= { payload };
        record.current = await create(failed.current.payload);
        if (!active.current) return false;
        setCreated(true);
      }
      await open(record.current);
      if (!active.current) return false;
      record.current = null;
      failed.current = null;
      setCreated(false);
      return true;
    } catch (cause) {
      if (active.current) setError(cause instanceof Error ? cause.message : String(cause));
      return false;
    } finally {
      inFlight.current = false;
      if (active.current) setSubmitting(false);
    }
  }
  return {
    submitting,
    error,
    created,
    submit,
    isPending: () => inFlight.current,
    hasCreated: () => record.current !== null,
    invalidate: () => {
      if (inFlight.current) return;
      failed.current = null;
      setError('');
    },
    reset: () => {
      if (inFlight.current) return;
      record.current = null;
      failed.current = null;
      setCreated(false);
      setError('');
    },
  };
}
