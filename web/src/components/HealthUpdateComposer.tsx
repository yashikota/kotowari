import { Button, Group, Modal, Select, Stack, Textarea } from '@mantine/core';
import type { ChangeEventHandler, FormEventHandler } from 'react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { SaveFeedback } from '../design-system/SaveFeedback.tsx';
import actionStyles from '../design-system/ActionControl.module.css';
import { useActionFocusReturn } from '../focus.ts';

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
  confirmed = false,
  scope,
  onRetry,
  bodyError,
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
  confirmed?: boolean;
  scope: string;
  onRetry: () => unknown;
  bodyError?: string;
}) {
  const { t } = useTranslation();
  const form = useRef<HTMLFormElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const retry = () =>
    form.current?.querySelector<HTMLButtonElement>('[role="alert"] button:not(:disabled)') ?? null;
  const canRestore = (active: Element | null) =>
    active === document.body ||
    Boolean(active && form.current?.closest('[role="dialog"]')?.contains(active));
  const run = useActionFocusReturn(
    submitting,
    () => (opened ? (bodyError ? textarea.current : (retry() ?? textarea.current)) : null),
    canRestore,
    `${scope}:${opened}`,
  );
  useEffect(() => {
    if (!opened || submitting || !error) return;
    const frame = requestAnimationFrame(() => {
      if (canRestore(document.activeElement)) (bodyError ? textarea.current : retry())?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [opened, submitting, error, scope, bodyError]);
  const close = () => {
    if (!submitting) onClose();
  };
  return (
    <Modal
      opened={opened}
      onClose={close}
      title={title}
      centered
      closeOnEscape={!submitting}
      closeOnClickOutside={!submitting}
      closeButtonProps={{ disabled: submitting, style: { minWidth: 44, minHeight: 44 } }}
      onEnterTransitionEnd={() => {
        if (opened && !submitting && error && canRestore(document.activeElement))
          (bodyError ? textarea.current : retry())?.focus();
      }}
    >
      <form
        ref={form}
        aria-busy={submitting}
        onSubmit={(event) => {
          event.preventDefault();
          void run(() => onSubmit(event));
        }}
      >
        <Stack gap="sm">
          <Select
            label={healthLabel}
            value={health}
            onChange={onHealthChange}
            data={healthOptions}
            allowDeselect={false}
            readOnly={submitting || confirmed}
          />
          <Textarea
            error={bodyError}
            label={bodyLabel}
            placeholder={bodyPlaceholder}
            value={body}
            onChange={onBodyChange}
            minRows={5}
            maxLength={10000}
            required
            ref={textarea}
            data-autofocus
            autosize
            maxRows={10}
            readOnly={submitting || confirmed}
          />
          <SaveFeedback
            saving={submitting}
            saved={confirmed && !submitting}
            error={error ?? ''}
            savingLabel={t(confirmed ? 'healthUpdate.refreshing' : 'healthUpdate.posting')}
            savedLabel={t('healthUpdate.posted')}
            failureLabel={t(confirmed ? 'healthUpdate.refreshFailed' : 'healthUpdate.failed')}
            retryLabel={t(confirmed ? 'healthUpdate.retryRefresh' : 'healthUpdate.retry')}
            onRetry={() => run(onRetry)}
          />
          <Group justify="flex-end" wrap="wrap">
            <Button
              className={actionStyles.action}
              type="button"
              variant="default"
              onClick={close}
              disabled={submitting}
            >
              {confirmed ? t('ui.close') : cancelLabel}
            </Button>
            {!error && (
              <Button
                className={actionStyles.action}
                type="submit"
                loading={submitting}
                disabled={submitting || !body.trim()}
              >
                {submitLabel}
              </Button>
            )}
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
