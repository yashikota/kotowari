import { useEffect, useRef, useState } from 'react';

/** A scoped write owns its retry value and ignores results after navigation. */
export function useRetriableSave<Value>({
  scope,
  save,
  onSuccess,
  onFailure,
}: {
  scope: string;
  save: (value: Value) => Promise<void>;
  onSuccess: () => void;
  onFailure: (value: Value) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const generation = useRef(0);
  const failed = useRef<{ value: Value } | null>(null);
  useEffect(() => {
    generation.current++;
    pending.current = false;
    failed.current = null;
    setSaving(false);
    setError('');
    return () => {
      generation.current++;
    };
  }, [scope]);
  async function write(value: Value) {
    if (pending.current) return;
    const token = generation.current;
    pending.current = true;
    setSaving(true);
    setError('');
    try {
      await save(value);
      if (generation.current !== token) return;
      failed.current = null;
      onSuccess();
    } catch (cause) {
      if (generation.current !== token) return;
      failed.current = { value };
      setError(cause instanceof Error ? cause.message : String(cause));
      onFailure(value);
    } finally {
      if (generation.current === token) {
        pending.current = false;
        setSaving(false);
      }
    }
  }
  return {
    saving,
    error,
    write,
    isPending: () => pending.current,
    retry: () => (failed.current ? write(failed.current.value) : undefined),
    invalidate: () => {
      if (!pending.current) {
        failed.current = null;
        setError('');
      }
    },
  };
}
