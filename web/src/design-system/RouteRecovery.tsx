import { createContext, useContext, type ReactNode } from 'react';
import { useRouter, useRouterState } from '@tanstack/react-router';
import { useRetriableSave } from '../presenters/useRetriableSave.ts';

export function useRouteRecovery() {
  const router = useRouter();
  const scope = useRouterState({ select: (state) => state.location.pathname });
  return useRetriableSave<void>({
    scope,
    save: async () => {
      await router.invalidate();
    },
    onSuccess: () => undefined,
    onFailure: () => undefined,
  });
}

const RecoveryContext = createContext<ReturnType<typeof useRouteRecovery> | null>(null);

/** Retry state survives replacement of a failed route match. */
export function RouteRecoveryProvider({ children }: { children: ReactNode }) {
  const recovery = useRouteRecovery();
  return <RecoveryContext.Provider value={recovery}>{children}</RecoveryContext.Provider>;
}

export function useRouteRecoveryContext() {
  return useContext(RecoveryContext);
}
