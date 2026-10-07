import { useEffect, useRef, useState } from 'react';

/** Retain both the failed payload and a confirmed record while opening it. */
export function useRetriableCreation<Payload, Entity>({
  create,
  open,
  scope = '',
}: {
  create: (payload: Payload) => Promise<Entity>;
  open: (entity: Entity) => Promise<unknown>;
  scope?: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(false);
  const inFlight = useRef(false);
  const record = useRef<Entity | null>(null);
  const failed = useRef<{ payload: Payload } | null>(null);
  const active = useRef(true);
  const generation = useRef(0);
  useEffect(() => {
    active.current = true;
    generation.current++;
    inFlight.current = false;
    record.current = null;
    failed.current = null;
    setSubmitting(false);
    setError('');
    setCreated(false);
    return () => {
      active.current = false;
      generation.current++;
    };
  }, [scope]);
  async function submit(payload: Payload) {
    if (inFlight.current) return false;
    const token = generation.current;
    inFlight.current = true;
    setSubmitting(true);
    setError('');
    try {
      if (!record.current) {
        failed.current ??= { payload };
        const next = await create(failed.current.payload);
        if (!active.current || generation.current !== token) return false;
        record.current = next;
        setCreated(true);
      }
      await open(record.current);
      if (!active.current || generation.current !== token) return false;
      record.current = null;
      failed.current = null;
      setCreated(false);
      return true;
    } catch (cause) {
      if (active.current && generation.current === token)
        setError(cause instanceof Error ? cause.message : String(cause));
      return false;
    } finally {
      if (generation.current === token) {
        inFlight.current = false;
        if (active.current) setSubmitting(false);
      }
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
