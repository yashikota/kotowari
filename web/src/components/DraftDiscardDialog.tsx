import { Button, Group, Modal, Stack, Text } from '@mantine/core';

export function DraftDiscardDialog({
  opened,
  title,
  description,
  discardLabel,
  cancelLabel,
  onCancel,
  onConfirm,
}: {
  opened: boolean;
  title: string;
  description: string;
  discardLabel: string;
  cancelLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal opened={opened} onClose={onCancel} title={title} centered size="sm">
      <Stack gap="md">
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
