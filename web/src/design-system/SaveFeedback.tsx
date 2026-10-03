import styles from './SaveFeedback.module.css';
import { Alert, Button, Stack, Text } from '@mantine/core';

export function SaveFeedback({
  saving,
  saved,
  error,
  savingLabel,
  savedLabel,
  failureLabel,
  retryLabel,
  onRetry,
}: {
  saving: boolean;
  saved: boolean;
  error: string;
  savingLabel: string;
  savedLabel: string;
  failureLabel: string;
  retryLabel: string;
  onRetry: () => unknown;
}) {
  return (
    <>
      {saving || saved ? (
        <Text role="status" size="sm" c="dimmed">
          {saving ? savingLabel : savedLabel}
        </Text>
      ) : null}
      {error ? (
        <Alert color="red" role="alert" title={failureLabel}>
          <Stack gap="xs">
            <Text size="sm" className={styles.message}>
              {error}
            </Text>
            <Button
              className={styles.retry}
              size="xs"
              variant="default"
              disabled={saving}
              onClick={onRetry}
            >
              {retryLabel}
            </Button>
          </Stack>
        </Alert>
      ) : null}
    </>
  );
}
