import { useEffect, useRef } from 'react';
import { isPassiveFocus, useActionFocusReturn } from '../focus.ts';

/** Menu actions keep retry focus after the closing menu restores its trigger. */
export function useMenuActionFocus({
  pending,
  scope,
  menuSelector,
  feedbackSelector,
  triggerSelector,
}: {
  pending: boolean;
  scope: string;
  menuSelector: string;
  feedbackSelector: string;
  triggerSelector: string;
}) {
  const owned = useRef(false);
  useEffect(() => {
    owned.current = false;
  }, [scope]);
  const trigger = () => document.querySelector<HTMLElement>(triggerSelector);
  const recovery = () =>
    document.querySelector<HTMLButtonElement>(
      `${feedbackSelector} [role="alert"] button:not(:disabled)`,
    );
  const canRestore = (active: Element | null) => isPassiveFocus(active) || active === trigger();
  const run = useActionFocusReturn(pending, () => recovery() ?? trigger(), canRestore, scope);
  return {
    run: (action: () => unknown) => {
      owned.current = Boolean(document.activeElement?.closest(menuSelector));
      return run(action);
    },
    onMenuExited: () => {
      if (!owned.current) return;
      owned.current = false;
      if (canRestore(document.activeElement)) recovery()?.focus();
    },
  };
}
