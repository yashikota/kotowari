import { useRef } from 'react';
import { Box, Button, Group, Modal, Stack, Text, TextInput } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { SaveFeedback } from '../design-system/SaveFeedback.tsx';
import { useActionFocusReturn, useFocusWhen } from '../focus.ts';

export function DateEditorDialog({
  inputType,
  labels,
  canClear,
  onClear,
  data,
  onClose,
  onChange,
  onSave,
  onRetry,
}: {
  inputType: 'date' | 'datetime-local';
  labels: {
    title: string;
    clearTitle: string;
    input: string;
    hint?: string;
    saving: string;
    clearing: string;
    failed: string;
    clearFailed: string;
    retry: string;
    clearRetry: string;
    clearHint: string;
    clearAction?: string;
  };
  canClear?: boolean;
  onClear?: () => unknown;
  data: {
    opened: boolean;
    value: string;
    saving: boolean;
    error: string;
    validation: string;
    validationAttempt: number;
    clearing: boolean;
  };
  onClose: () => void;
  onChange: (value: string) => void;
  onSave: () => unknown;
  onRetry: () => unknown;
}) {
  const { t } = useTranslation();
  const input = useFocusWhen<HTMLInputElement>(Boolean(data.validation), [data.validationAttempt]);
  const form = useRef<HTMLFormElement>(null);
  const run = useActionFocusReturn(
    data.saving,
    () =>
      form.current?.querySelector<HTMLButtonElement>('[role="alert"] button:not(:disabled)') ??
      input.current,
  );
  return (
    <Modal
      opened={data.opened}
      onClose={onClose}
      title={data.clearing ? labels.clearTitle : labels.title}
      centered
      closeOnEscape={!data.saving}
      closeOnClickOutside={!data.saving}
      withCloseButton={!data.saving}
    >
      <Box
        component="form"
        ref={form}
        onSubmit={(event) => {
          event.preventDefault();
          void run(data.clearing ? onRetry : onSave);
        }}
        noValidate
      >
        <Stack>
          <SaveFeedback
            saving={data.saving}
            saved={false}
            error={data.error}
            savingLabel={data.clearing ? labels.clearing : labels.saving}
            savedLabel=""
            failureLabel={data.clearing ? labels.clearFailed : labels.failed}
            retryLabel={data.clearing ? labels.clearRetry : labels.retry}
            onRetry={() => run(onRetry)}
          />
          {data.clearing ? (
            <Text size="sm">{labels.clearHint}</Text>
          ) : (
            <TextInput
              ref={input}
              type={inputType}
              label={labels.input}
              description={labels.hint}
              value={data.value}
              required
              error={data.validation || undefined}
              disabled={data.saving}
              onChange={(event) => onChange(event.target.value)}
              data-autofocus
            />
          )}
          <Group justify="space-between" wrap="wrap">
            {canClear && !data.clearing && onClear ? (
              <Button
                type="button"
                variant="subtle"
                color="red"
                disabled={data.saving}
                onClick={() => run(onClear)}
              >
                {labels.clearAction}
              </Button>
            ) : null}
            <Group gap="sm" wrap="wrap" style={{ marginLeft: 'auto' }}>
              <Button type="button" variant="default" disabled={data.saving} onClick={onClose}>
                {t('common.cancel')}
              </Button>
              {!data.clearing ? (
                <Button
                  type="submit"
                  loading={data.saving}
                  disabled={inputType === 'date' && !data.value}
                >
                  {t('common.save')}
                </Button>
              ) : null}
            </Group>
          </Group>
        </Stack>
      </Box>
    </Modal>
  );
}
