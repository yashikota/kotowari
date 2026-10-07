import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import { useRef } from 'react';
import { useActionFocusReturn } from '../focus.ts';
import { SaveFeedback } from './SaveFeedback.tsx';
import styles from './ActionControl.module.css';

export function ConfirmActionDialog({
  opened,
  title,
  description,
  pending,
  confirmed = false,
  allowConfirmedClose = false,
  error,
  confirmLabel,
  cancelLabel,
  savingLabel,
  savedLabel,
  failureLabel,
  retryLabel,
  onClose,
  onConfirm,
  returnFocusTo,
}: {
  opened: boolean;
  title: string;
  description: string;
  pending: boolean;
  confirmed?: boolean;
  allowConfirmedClose?: boolean;
  error: string;
  confirmLabel: string;
  cancelLabel: string;
  savingLabel: string;
  savedLabel: string;
  failureLabel: string;
  retryLabel: string;
  onClose: () => unknown;
  onConfirm: () => unknown;
  returnFocusTo?: () => HTMLElement | null;
}) {
  const feedbackRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const run = useActionFocusReturn(
    pending,
    () =>
      feedbackRef.current?.querySelector<HTMLButtonElement>(
        '[role="alert"] button:not(:disabled)',
      ) ?? cancelRef.current,
  );
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      centered
      size="sm"
      returnFocus={!returnFocusTo}
      closeOnEscape={!pending}
      closeOnClickOutside={!pending}
      withCloseButton={!pending}
      onEnterTransitionEnd={() => {
        if (pending || confirmed || error) return;
        const dialog = cancelRef.current?.closest('[role="dialog"]');
        if (dialog && !dialog.contains(document.activeElement)) cancelRef.current?.focus();
      }}
      onExitTransitionEnd={() => returnFocusTo?.()?.focus()}
    >
      <Stack gap="md">
        <Text size="sm" style={{ overflowWrap: 'anywhere' }}>
          {description}
        </Text>
        <div ref={feedbackRef}>
          <SaveFeedback
            saving={pending}
            saved={confirmed && !pending}
            error={error}
            savingLabel={savingLabel}
            savedLabel={savedLabel}
            failureLabel={failureLabel}
            retryLabel={retryLabel}
            onRetry={() => run(onConfirm)}
          />
        </div>
        <Group justify="flex-end" gap="xs">
          {(!confirmed || allowConfirmedClose) && (
            <Button
              className={styles.action}
              ref={cancelRef}
              data-autofocus
              variant="default"
              disabled={pending}
              onClick={onClose}
            >
              {cancelLabel}
            </Button>
          )}
          {!error && (
            <Button
              className={styles.action}
              color={confirmed ? undefined : 'red'}
              disabled={pending}
              onClick={() => run(onConfirm)}
            >
              {confirmLabel}
            </Button>
          )}
        </Group>
      </Stack>
    </Modal>
  );
}
