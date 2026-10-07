import { Box, Button, Group, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { ProjectMilestoneEditor } from './ProjectMilestoneEditor.tsx';
import type { useMilestoneEdits } from '../presenters/useMilestoneEdits.ts';
import { useRef } from 'react';
import { useActionFocusReturn, useFocusWhen } from '../focus.ts';
import actionStyles from '../design-system/ActionControl.module.css';
import { SaveFeedback } from '../design-system/SaveFeedback.tsx';
import type { ChangeEvent, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProjectMilestone } from '../types.ts';
import { Section } from '../mantine-ui.tsx';

export function ProjectMilestonesSection({
  milestones,
  name,
  description,
  targetDate,
  onCreate,
  creation,
  onRetryCreate,
  onDraftNameChange,
  onDraftDescriptionChange,
  onDraftTargetDateChange,
  edits,
  onEditChange,
  onSaveEdit,
  onRemove,
}: {
  milestones: ProjectMilestone[];
  name: string;
  description: string;
  targetDate: string;
  onCreate: (event: FormEvent<HTMLFormElement>) => unknown;
  creation: {
    scope: string;
    pending: boolean;
    created: boolean;
    saved: boolean;
    error: string;
    nameError: string;
    validationAttempt: number;
  };
  onRetryCreate: () => unknown;
  onDraftNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDraftDescriptionChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onDraftTargetDateChange: (event: ChangeEvent<HTMLInputElement>) => void;
  edits: ReturnType<typeof useMilestoneEdits>;
  onEditChange: ReturnType<typeof useMilestoneEdits>['change'];
  onSaveEdit: ReturnType<typeof useMilestoneEdits>['commit'];
  onRemove: (id: number, name: string) => void;
}) {
  const { t } = useTranslation();
  const form = useRef<HTMLFormElement>(null);
  const nameInput = useFocusWhen<HTMLInputElement>(Boolean(creation.nameError), [
    creation.validationAttempt,
  ]);
  const run = useActionFocusReturn(
    creation.pending,
    () =>
      form.current?.querySelector<HTMLButtonElement>('[role="alert"] button:not(:disabled)') ??
      form.current?.querySelector<HTMLButtonElement>('button[type="submit"]:not(:disabled)') ??
      null,
    (active) =>
      active === document.body || active === form.current?.querySelector('button[type="submit"]'),
    creation.scope,
  );

  return (
    <Section title={t('projectMilestones.heading')}>
      <Box
        ref={form}
        component="form"
        aria-label={t('projectMilestones.heading')}
        onSubmit={(event) => {
          event.preventDefault();
          void run(() => onCreate(event));
        }}
      >
        <Box
          component="fieldset"
          disabled={creation.pending || creation.created}
          aria-busy={creation.pending}
          style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}
        >
          <Group gap="xs" align="flex-end" wrap="wrap">
            <TextInput
              ref={nameInput}
              error={creation.nameError}
              label={t('projectMilestones.name')}
              withAsterisk
              aria-label={t('projectMilestones.name')}
              placeholder={t('projectMilestones.namePlaceholder')}
              value={name}
              onChange={onDraftNameChange}
              size="sm"
              style={{ flex: '1 1 220px' }}
            />
            <Textarea
              label={t('projectMilestones.description')}
              aria-label={t('projectMilestones.description')}
              placeholder={t('projectMilestones.descriptionPlaceholder')}
              value={description}
              onChange={onDraftDescriptionChange}
              minRows={1}
              autosize
              size="sm"
              style={{ flex: '1 1 220px' }}
            />
            <TextInput
              type="date"
              label={t('projectMilestones.targetDate')}
              aria-label={t('projectMilestones.targetDate')}
              value={targetDate}
              onChange={onDraftTargetDateChange}
              size="sm"
            />
            <Button className={actionStyles.action} type="submit" variant="default" size="sm">
              {t('projectMilestones.add')}
            </Button>
          </Group>
        </Box>
        <Box mt="sm">
          <SaveFeedback
            saving={creation.pending}
            saved={creation.saved}
            error={creation.error}
            savingLabel={t(
              creation.created ? 'milestoneCreation.refreshing' : 'milestoneCreation.creating',
            )}
            savedLabel={t('milestoneCreation.saved')}
            failureLabel={t(
              creation.created ? 'milestoneCreation.refreshFailed' : 'milestoneCreation.failed',
            )}
            retryLabel={t(
              creation.created ? 'milestoneCreation.retryRefresh' : 'milestoneCreation.retry',
            )}
            onRetry={() => run(onRetryCreate)}
          />
        </Box>
      </Box>
      {milestones.length === 0 ? (
        <Text size="sm" c="dimmed" mt="sm">
          {t('projectMilestones.empty')}
        </Text>
      ) : (
        <Stack
          component="ul"
          gap="xs"
          mt="sm"
          style={{
            listStyle: 'none',
            margin: 'var(--mantine-spacing-sm) 0 0',
            padding: 0,
          }}
        >
          {milestones.map((milestone) =>
            edits.rows[milestone.id] ? (
              <ProjectMilestoneEditor
                key={milestone.id}
                milestone={milestone}
                state={edits.rows[milestone.id]!}
                scope={`${creation.scope}:${milestone.id}`}
                onChange={(field, value) => onEditChange(milestone.id, field, value)}
                onSave={(focusInvalid) => onSaveEdit(milestone.id, focusInvalid)}
                onRemove={() => onRemove(milestone.id, milestone.name)}
                removalDisabled={edits.pending}
              />
            ) : null,
          )}
        </Stack>
      )}
    </Section>
  );
}
