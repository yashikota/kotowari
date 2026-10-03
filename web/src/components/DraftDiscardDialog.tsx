import { useTranslation } from 'react-i18next';
import { SaveFeedback } from '../design-system/SaveFeedback.tsx';
import { Button, Group, Modal, Stack, Text } from '@mantine/core';

export function DraftDiscardDialog({
  error,
  opened,
  title,
  description,
  discardLabel,
  cancelLabel,
  onCancel,
  onConfirm,
}: {
  error: string;
  opened: boolean;
  title: string;
  description: string;
  discardLabel: string;
  cancelLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal opened={opened} onClose={onCancel} title={title} centered size="sm">
      <Stack gap="md">
        <SaveFeedback
          saving={false}
          saved={false}
          error={error}
          savingLabel=""
          savedLabel=""
          failureLabel={t('drafts.discardFailed')}
          retryLabel={t('drafts.retryDiscard')}
          onRetry={onConfirm}
        />
        <Text size="sm" c="dimmed">
          {description}
        </Text>
        <Group justify="flex-end">
          <Button type="button" variant="default" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button type="button" color="red" onClick={onConfirm}>
            {discardLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
