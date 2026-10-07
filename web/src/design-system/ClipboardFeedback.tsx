import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useActionFocusReturn } from '../focus.ts';
import { SaveFeedback } from './SaveFeedback.tsx';

type ClipboardState = {
  pending: boolean;
  copied: boolean;
  error: string;
  retry: () => unknown;
  getInitiator: () => HTMLElement | null;
};

export function ClipboardFeedback({
  clipboard,
  onRetry,
}: {
  clipboard: ClipboardState;
  onRetry: () => unknown;
}) {
  const { t } = useTranslation();
  return (
    <SaveFeedback
      saving={clipboard.pending}
      saved={clipboard.copied}
      error={clipboard.error}
      savingLabel={t('clipboard.copying')}
      savedLabel={t('ui.copied')}
      failureLabel={t('clipboard.failed')}
      retryLabel={t('clipboard.retry')}
      onRetry={onRetry}
    />
  );
}

/** Clipboard recovery preserves user-moved focus and outlives closing menu items. */
export function useClipboardFocus({
  clipboard,
  scope,
  feedbackSelector,
  menuSelector,
  fallback,
}: {
  clipboard: ClipboardState | null;
  scope: string;
  feedbackSelector: string;
  menuSelector: string;
  fallback: () => HTMLElement | null;
}) {
  const copyFromMenu = useRef(false);
  const latestClipboard = useRef(clipboard);
  latestClipboard.current = clipboard;
  const latestFallback = useRef(fallback);
  latestFallback.current = fallback;
  useEffect(() => {
    copyFromMenu.current = false;
  }, [scope]);
  function recoveryTarget() {
    return document.querySelector<HTMLButtonElement>(
      `${feedbackSelector} [role="alert"] button:not(:disabled)`,
    );
  }
  function canRestoreFrom(active: Element | null) {
    return active === document.body || active === latestFallback.current();
  }
  const runFocus = useActionFocusReturn(
    clipboard?.pending ?? false,
    () => {
      const initiator = clipboard?.getInitiator();
      return (
        recoveryTarget() ??
        (initiator && !initiator.closest(menuSelector) ? initiator : null) ??
        latestFallback.current()
      );
    },
    canRestoreFrom,
    scope,
  );
  const error = clipboard?.error ?? '';
  useEffect(() => {
    if (!error) return;
    const frame = requestAnimationFrame(() => {
      const active = document.activeElement;
      if (active === document.body || active === latestFallback.current())
        document
          .querySelector<HTMLButtonElement>(
            `${feedbackSelector} [role="alert"] button:not(:disabled)`,
          )
          ?.focus();
      if (
        !document.querySelector(menuSelector) ||
        (active !== document.body &&
          active !== latestFallback.current() &&
          !active?.closest(menuSelector))
      )
        copyFromMenu.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [error, scope, feedbackSelector, menuSelector]);
  return {
    runCopy: (action: () => unknown) => {
      copyFromMenu.current = Boolean(document.activeElement?.closest(menuSelector));
      return runFocus(action);
    },
    onMenuExited: () => {
      if (!copyFromMenu.current) return;
      if (latestClipboard.current?.pending) return;
      copyFromMenu.current = false;
      const active = document.activeElement;
      if (canRestoreFrom(active) || active?.closest(menuSelector)) recoveryTarget()?.focus();
    },
  };
}
