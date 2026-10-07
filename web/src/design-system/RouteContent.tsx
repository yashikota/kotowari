import { Box, Group, Loader, Text } from '@mantine/core';
import { useRouterState } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef, type ReactNode } from 'react';
import { PresenterScope } from '../application/Root.tsx';
import styles from './RouteContent.module.css';
import { RouteRecoveryProvider, useRouteRecoveryContext } from './RouteRecovery.tsx';

/** Keep the previous page readable without accepting edits for the next location. */
export function RouteContent({ children }: { children: ReactNode }) {
  return (
    <RouteRecoveryProvider>
      <RouteContentView>{children}</RouteContentView>
    </RouteRecoveryProvider>
  );
}

function RouteContentView({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const content = useRef<HTMLDivElement>(null);
  const wasPending = useRef(false);
  const recovery = useRouteRecoveryContext();
  const pending = useRouterState({
    select: (state) =>
      state.status === 'pending' && state.location.pathname !== state.resolvedLocation?.pathname,
  });
  const busy = pending || Boolean(recovery?.saving);
  useEffect(() => {
    const completed = wasPending.current && !busy;
    wasPending.current = busy;
    if (!completed) return;
    const frame = requestAnimationFrame(() => {
      if (
        document.activeElement === document.body &&
        !document.querySelector('[role="dialog"][aria-modal="true"], [role="menu"]')
      )
        content.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [busy]);
  return (
    <Box ref={content} tabIndex={-1} aria-busy={busy} data-route-content h="100%">
      {pending ? (
        <Group role="status" data-route-loading className={styles.loading} px="md" py="sm" gap="sm">
          <Loader size="xs" aria-hidden />
          <Text size="sm" c="dimmed">
            {t('navigationStatus.loading')}
          </Text>
        </Group>
      ) : null}
      <Box inert={pending ? true : undefined} h="100%">
        <PresenterScope name="RouteContent" disabled={pending}>
          {children}
        </PresenterScope>
      </Box>
    </Box>
  );
}
