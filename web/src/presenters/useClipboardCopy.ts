import { useEffect, useRef, useState } from 'react';
import { useRetriableSave } from './useRetriableSave.ts';

export function useClipboardCopy(scope: string) {
  const [copied, setCopied] = useState(false);
  const initiator = useRef<HTMLElement | null>(null);
  const timer = useRef<number | null>(null);
  function clearTimer() {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  }
  useEffect(() => {
    clearTimer();
    setCopied(false);
    return clearTimer;
  }, [scope]);
  const write = useRetriableSave<string>({
    scope,
    save: (value) => navigator.clipboard.writeText(value),
    onSuccess: () => {
      setCopied(true);
      clearTimer();
      timer.current = window.setTimeout(() => setCopied(false), 4000);
    },
    onFailure: () => setCopied(false),
  });
  return {
    getInitiator: () => (initiator.current?.isConnected ? initiator.current : null),
    copied,
    pending: write.saving,
    error: write.error,
    retry: write.retry,
    copy: (value: string) => {
      if (write.isPending()) return;
      initiator.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      clearTimer();
      setCopied(false);
      write.invalidate();
      return write.write(value);
    },
  };
}
