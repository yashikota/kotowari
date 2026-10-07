import { Alert, Button, Group, Stack, Text } from '@mantine/core';
import { useRef } from 'react';
import { useActionFocusReturn } from '../focus.ts';
import styles from './ActionControl.module.css';

export function LoadFailure({
  title,
  message,
  retryLabel,
  backLabel,
  pending,
  pendingLabel,
  onRetry,
  onBack,
}: {
  title: string;
  message: string;
  retryLabel: string;
  backLabel: string;
  pending: boolean;
  pendingLabel: string;
  onRetry: () => unknown;
  onBack: () => unknown;
}) {
  const retryRef = useRef<HTMLButtonElement>(null);
  const run = useActionFocusReturn(pending, () => retryRef.current);
  return (
    <Alert color="red" role="alert" title={title}>
      <Stack gap="md">
        {pending && (
          <Text role="status" size="sm">
            {pendingLabel}
          </Text>
        )}
        <Text size="sm" style={{ overflowWrap: 'anywhere' }}>
          {message}
        </Text>
        <Group gap="xs">
          <Button
            ref={retryRef}
            className={styles.action}
            disabled={pending}
            onClick={() => run(onRetry)}
          >
            {retryLabel}
          </Button>
          <Button className={styles.action} variant="default" onClick={onBack}>
            {backLabel}
          </Button>
        </Group>
      </Stack>
    </Alert>
  );
}
