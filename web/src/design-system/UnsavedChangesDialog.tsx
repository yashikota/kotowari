import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import { useEffect, useRef, useState } from 'react';
import { useBlocker } from '@tanstack/react-router';
import { useActionFocusReturn } from '../focus.ts';
import { SaveFeedback } from './SaveFeedback.tsx';
import styles from './ActionControl.module.css';

export function useUnsavedNavigation({
  dirty,
  pending,
  error,
  save,
  scope,
}: {
  dirty: boolean;
  pending: boolean;
  error: string;
  save: () => unknown;
  scope: string;
}) {
  const [waiting, setWaiting] = useState(false);
  const [localError, setLocalError] = useState('');
  const generation = useRef(0);
  useEffect(() => {
    generation.current++;
    setWaiting(false);
    setLocalError('');
    return () => {
      generation.current++;
    };
  }, [scope]);
  const blocker = useBlocker({
    shouldBlockFn: ({ current, next }) => dirty && current.pathname !== next.pathname,
    enableBeforeUnload: () => dirty,
    disabled: !dirty,
    withResolver: true,
  });
  useEffect(() => {
    if (blocker.status !== 'blocked') return;
    if (!dirty && !pending) {
      setWaiting(false);
      blocker.proceed();
    } else if (error && !pending) setWaiting(false);
  }, [blocker, dirty, pending, error]);
  return {
    opened: blocker.status === 'blocked',
    pending: pending || waiting,
    error: localError || error,
    stay: () => {
      setWaiting(false);
      setLocalError('');
      blocker.reset?.();
    },
    discard: () => {
      if (!pending && !waiting) blocker.proceed?.();
    },
    save: async () => {
      if (pending || waiting) return;
      const token = generation.current;
      setLocalError('');
      setWaiting(true);
      try {
        await save();
      } catch (cause) {
        if (generation.current === token) {
          setWaiting(false);
          setLocalError(cause instanceof Error ? cause.message : String(cause));
        }
      }
    },
  };
}

export function UnsavedChangesDialog({
  state,
  title,
  description,
  stayLabel,
  discardLabel,
  saveLabel,
  savingLabel,
  failureLabel,
}: {
  state: ReturnType<typeof useUnsavedNavigation>;
  title: string;
  description: string;
  stayLabel: string;
  discardLabel: string;
  saveLabel: string;
  savingLabel: string;
  failureLabel: string;
}) {
  const cancel = useRef<HTMLButtonElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const run = useActionFocusReturn(
    state.pending,
    () =>
      feedback.current?.querySelector<HTMLButtonElement>('[role="alert"] button:not(:disabled)') ??
      cancel.current,
  );
  return (
    <Modal
      opened={state.opened}
      onClose={state.stay}
      title={title}
      centered
      size="sm"
      styles={{ close: { width: 44, height: 44 } }}
    >
      <Stack gap="md">
        <Text size="sm" style={{ overflowWrap: 'anywhere' }}>
          {description}
        </Text>
        <div ref={feedback}>
          <SaveFeedback
            saving={state.pending}
            saved={false}
            error={state.error}
            savingLabel={savingLabel}
            savedLabel=""
            failureLabel={failureLabel}
            retryLabel={saveLabel}
            onRetry={() => run(state.save)}
          />
        </div>
        <Group justify="flex-end" gap="xs">
          <Button
            className={styles.action}
            ref={cancel}
            data-autofocus
            variant="default"
            onClick={state.stay}
          >
            {stayLabel}
          </Button>
          <Button
            className={styles.action}
            variant="outline"
            color="red"
            disabled={state.pending}
            onClick={state.discard}
          >
            {discardLabel}
          </Button>
          {!state.error && (
            <Button
              className={styles.action}
              disabled={state.pending}
              onClick={() => run(state.save)}
            >
              {saveLabel}
            </Button>
          )}
        </Group>
      </Stack>
    </Modal>
  );
}
