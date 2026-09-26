import { Button, Group, Modal, Select, Stack, Text, Textarea } from '@mantine/core';
import type { ChangeEventHandler, FormEventHandler } from 'react';

import type { ProjectHealth } from '../types.ts';

export type HealthUpdateOption = { value: ProjectHealth; label: string };

export function HealthUpdateComposer({
  opened,
  onClose,
  onSubmit,
  title,
  healthLabel,
  health,
  healthOptions,
  onHealthChange,
  bodyLabel,
  bodyPlaceholder,
  body,
  onBodyChange,
  cancelLabel,
  submitLabel,
  error,
  submitting = false,
}: {
  opened: boolean;
  onClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  title: string;
  healthLabel: string;
  health: ProjectHealth;
  healthOptions: HealthUpdateOption[];
  onHealthChange: (value: string | null) => void;
  bodyLabel: string;
  bodyPlaceholder: string;
  body: string;
  onBodyChange: ChangeEventHandler<HTMLTextAreaElement>;
  cancelLabel: string;
  submitLabel: string;
  error?: string;
  submitting?: boolean;
}) {
  return (
    <Modal opened={opened} onClose={onClose} title={title} centered>
      <form onSubmit={onSubmit}>
        <Stack gap="sm">
          <Select
            label={healthLabel}
            value={health}
            onChange={onHealthChange}
            data={healthOptions}
            allowDeselect={false}
          />
          <Textarea
            label={bodyLabel}
            placeholder={bodyPlaceholder}
            value={body}
            onChange={onBodyChange}
            minRows={5}
            maxLength={10000}
            required
          />
          {error ? (
            <Text c="red" role="alert">
              {error}
            </Text>
          ) : null}
          <Group justify="flex-end">
            <Button type="button" variant="default" onClick={onClose}>
              {cancelLabel}
            </Button>
            <Button type="submit" loading={submitting} disabled={!body.trim()}>
              {submitLabel}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
