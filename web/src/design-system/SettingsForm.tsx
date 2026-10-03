import { Box, Button, Group, Stack } from '@mantine/core';
import { useRef, type ComponentProps, type ReactNode } from 'react';
import { useActionFocusReturn } from '../focus.ts';
import { SaveFeedback } from './SaveFeedback.tsx';

export function SettingsForm({
  children,
  saving,
  saved,
  error,
  saveLabel,
  labels,
  onSave,
  onRetry,
  noValidate = false,
}: {
  children: ReactNode;
  saving: boolean;
  saved: boolean;
  error: string;
  saveLabel: string;
  labels: { saving: string; saved: string; failed: string; retry: string };
  onSave: NonNullable<ComponentProps<'form'>['onSubmit']>;
  onRetry: () => unknown;
  noValidate?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const retryWithFocusReturn = useActionFocusReturn(
    saving,
    () =>
      formRef.current?.querySelector<HTMLButtonElement>(
        '[role="alert"] button:not(:disabled),button[type="submit"]:not(:disabled)',
      ) ?? null,
  );
  return (
    <Box ref={formRef} component="form" onSubmit={onSave} noValidate={noValidate}>
      <Stack gap="md" maw={480}>
        <Box
          component="fieldset"
          disabled={saving}
          aria-busy={saving}
          style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
        >
          <Stack gap="md">{children}</Stack>
        </Box>
        <SaveFeedback
          saving={saving}
          saved={saved}
          error={error}
          savingLabel={labels.saving}
          savedLabel={labels.saved}
          failureLabel={labels.failed}
          retryLabel={labels.retry}
          onRetry={() => retryWithFocusReturn(onRetry)}
        />
        <Group>
          <Button type="submit" loading={saving}>
            {saveLabel}
          </Button>
        </Group>
      </Stack>
    </Box>
  );
}
