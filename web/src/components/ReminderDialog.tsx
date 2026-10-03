import { useRef } from 'react';
import { Box, Button, Group, Modal, Stack, Text, TextInput } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { SaveFeedback } from '../design-system/SaveFeedback.tsx';
import { useActionFocusReturn, useFocusWhen } from '../focus.ts';
import type { useReminderEditor } from '../presenters/useReminderEditor.ts';

export function ReminderDialog({
  data,
  onClose,
  onChange,
  onSave,
  onRetry,
}: {
  data: ReturnType<typeof useReminderEditor>['data'];
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
      title={t(data.clearing ? 'issueActions.reminder.clear' : 'issueActions.reminder.customTitle')}
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
            savingLabel={t(
              data.clearing ? 'issueActions.reminder.clearing' : 'issueActions.reminder.saving',
            )}
            savedLabel=""
            failureLabel={t(
              data.clearing ? 'issueActions.reminder.clearFailed' : 'issueActions.reminder.failed',
            )}
            retryLabel={t(
              data.clearing ? 'issueActions.reminder.retryClear' : 'issueActions.reminder.retry',
            )}
            onRetry={() => run(onRetry)}
          />
          {data.clearing ? (
            <Text size="sm">{t('issueActions.reminder.clearHint')}</Text>
          ) : (
            <TextInput
              ref={input}
              type="datetime-local"
              label={t('issueActions.reminder.dateTime')}
              description={t('issueActions.reminder.hint')}
              value={data.value}
              required
              error={data.validation || undefined}
              disabled={data.saving}
              onChange={(event) => onChange(event.target.value)}
              data-autofocus
            />
          )}
          <Group justify="flex-end" wrap="wrap">
            <Button type="button" variant="default" disabled={data.saving} onClick={onClose}>
              {t('common.cancel')}
            </Button>
            {!data.clearing ? (
              <Button type="submit" loading={data.saving}>
                {t('common.save')}
              </Button>
            ) : null}
          </Group>
        </Stack>
      </Box>
    </Modal>
  );
}
