import { Checkbox, Stack, Text, Textarea, TextInput, Title } from '@mantine/core';
import type { useTranslation } from 'react-i18next';
import { useFocusWhen } from '../focus.ts';
import { SettingsForm } from '../design-system/SettingsForm.tsx';
import type { useConfigPagePresenter } from '../presenters/ConfigPages.tsx';

export function ConfigCodingToolsSettingsSection({
  model,
  t,
}: {
  model: ReturnType<typeof useConfigPagePresenter>;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const {
    codingToolDraft: draft,
    codingToolFieldErrors: errors,
    codingToolValidationFocus: focus,
    handlers,
  } = model;
  const url = useFocusWhen<HTMLInputElement>(focus.field === 'url', [focus.attempt]);
  const prompt = useFocusWhen<HTMLTextAreaElement>(focus.field === 'prompt', [focus.attempt]);
  return (
    <Stack
      id="settings-coding-tools"
      tabIndex={-1}
      gap="md"
      component="section"
      aria-label={t('codingTools.heading')}
    >
      <Title order={4}>{t('codingTools.heading')}</Title>
      <SettingsForm
        saving={false}
        saved={model.codingToolSaved}
        error={model.codingToolError}
        noValidate
        saveLabel={t('codingTools.save')}
        labels={{
          saving: t('codingTools.saving'),
          saved: t('codingTools.saved'),
          failed: t('codingTools.saveFailed'),
          retry: t('codingTools.retrySave'),
        }}
        onSave={handlers.onSaveCodingTools}
        onRetry={handlers.onRetryCodingToolsSave}
      >
        <Checkbox
          label={t('codingTools.enableCustomLink')}
          checked={draft.customLinkEnabled}
          onChange={handlers.onCodingToolEnabledChange}
        />
        <TextInput
          label={t('codingTools.name')}
          value={draft.customLinkName}
          maxLength={100}
          disabled={!draft.customLinkEnabled}
          onChange={handlers.onCodingToolNameChange}
        />
        <TextInput
          ref={url}
          label={t('codingTools.url')}
          placeholder={t('codingTools.urlPlaceholder')}
          description={t('codingTools.urlHint')}
          value={draft.customLinkURL}
          maxLength={2048}
          disabled={!draft.customLinkEnabled}
          error={errors.url || undefined}
          onChange={handlers.onCodingToolURLChange}
        />
        <Textarea
          ref={prompt}
          required
          maxLength={10000}
          minRows={6}
          maxRows={12}
          autosize
          label={t('codingTools.promptTemplate')}
          description={t('codingTools.promptHint')}
          value={draft.promptTemplate}
          error={errors.prompt || undefined}
          onChange={handlers.onCodingToolPromptChange}
        />
      </SettingsForm>
      <Text size="xs" c="dimmed">
        {t('config.preferencesSavedLocally')}
      </Text>
    </Stack>
  );
}
