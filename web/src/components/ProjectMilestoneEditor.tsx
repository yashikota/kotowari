import { ActionIcon, Button, Group, Stack, Textarea, TextInput } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useRef } from 'react';
import type { FocusEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { SaveFeedback } from '../design-system/SaveFeedback.tsx';
import actionStyles from '../design-system/ActionControl.module.css';
import { useActionFocusReturn, useFocusWhen } from '../focus.ts';
import type { ProjectMilestone } from '../types.ts';
import type { MilestoneDraft, MilestoneEditState } from '../presenters/useMilestoneEdits.ts';

export function ProjectMilestoneEditor({
  milestone,
  state,
  scope,
  onChange,
  onSave,
  onRemove,
  removalDisabled,
}: {
  milestone: ProjectMilestone;
  state: MilestoneEditState;
  scope: string;
  onChange: (field: keyof MilestoneDraft, value: string) => void;
  onSave: (focusInvalid?: boolean) => unknown;
  onRemove: () => unknown;
  removalDisabled: boolean;
}) {
  const { t } = useTranslation();
  const root = useRef<HTMLDivElement>(null);
  const name = useFocusWhen<HTMLInputElement>(
    Boolean(state.nameError) && state.validationAttempt > 0,
    [state.validationAttempt],
  );
  const run = useActionFocusReturn(
    state.pending,
    () =>
      root.current?.querySelector<HTMLButtonElement>('[role="alert"] button:not(:disabled)') ??
      name.current,
    undefined,
    scope,
  );
  function saveOnBlur(event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (
      event.relatedTarget instanceof Element &&
      event.relatedTarget.closest('[data-milestone-save], [data-milestone-confirm]')
    )
      return;
    void onSave();
  }
  return (
    <li>
      <Stack ref={root} gap="xs" data-milestone-id={milestone.id} aria-busy={state.pending}>
        <Group gap="xs" wrap="wrap" align="flex-end">
          <TextInput
            ref={name}
            label={t('projectMilestones.name')}
            withAsterisk
            aria-label={`${t('projectMilestones.name')}: ${milestone.name}`}
            error={state.nameError}
            value={state.draft.name}
            readOnly={state.pending}
            onChange={(event) => onChange('name', event.currentTarget.value)}
            onBlur={saveOnBlur}
            size="sm"
            style={{ flex: '1 1 220px' }}
          />
          <TextInput
            type="date"
            label={t('projectMilestones.targetDate')}
            aria-label={`${t('projectMilestones.targetDate')}: ${milestone.name}`}
            value={state.draft.targetDate ?? ''}
            readOnly={state.pending}
            onChange={(event) => onChange('targetDate', event.currentTarget.value)}
            onBlur={saveOnBlur}
            size="sm"
          />
          <ActionIcon
            data-milestone-confirm
            data-milestone-remove={milestone.id}
            type="button"
            variant="subtle"
            color="red"
            size={44}
            disabled={removalDisabled}
            aria-label={t('projectMilestones.remove', { name: milestone.name })}
            onClick={onRemove}
          >
            <IconTrash size={16} aria-hidden="true" />
          </ActionIcon>
        </Group>
        <Textarea
          label={t('projectMilestones.description')}
          aria-label={`${t('projectMilestones.description')}: ${milestone.name}`}
          value={state.draft.description}
          readOnly={state.pending}
          onChange={(event) => onChange('description', event.currentTarget.value)}
          onBlur={saveOnBlur}
          autosize
          minRows={1}
          size="sm"
        />
        <div data-milestone-save>
          <SaveFeedback
            saving={state.pending}
            saved={state.saved}
            error={state.error}
            savingLabel={t('milestoneSave.saving')}
            savedLabel={t('milestoneSave.saved')}
            failureLabel={t('milestoneSave.failed')}
            retryLabel={t('milestoneSave.retry')}
            onRetry={() => run(() => onSave(true))}
          />
        </div>
        {!state.error && (
          <Group>
            <Button
              data-milestone-save
              className={actionStyles.action}
              variant="default"
              disabled={state.pending}
              onClick={() => run(() => onSave(true))}
            >
              {t('milestoneSave.save')}
            </Button>
          </Group>
        )}
      </Stack>
    </li>
  );
}
