import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  isWebCodingToolURLTemplate,
  useCodingToolPreferences,
  type CodingToolPreferences,
} from '../coding-tools.ts';

export function useConfigCodingTools() {
  const { t } = useTranslation();
  const { preferences, update: updatePreferences } = useCodingToolPreferences();
  const dirty = useRef(false);
  const [draft, setDraft] = useState(preferences);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ url: '', prompt: '' });
  const [validationFocus, setValidationFocus] = useState<{
    field: 'url' | 'prompt' | null;
    attempt: number;
  }>({ field: null, attempt: 0 });
  useEffect(() => {
    if (!dirty.current) setDraft(preferences);
  }, [preferences]);
  const change = (values: Partial<CodingToolPreferences>, field?: 'url' | 'prompt') => {
    dirty.current = true;
    setSaved(false);
    setError('');
    setValidationFocus((current) => ({ ...current, field: null }));
    if (field) setFieldErrors((current) => ({ ...current, [field]: '' }));
    setDraft((current) => ({ ...current, ...values }));
  };
  const save = () => {
    setSaved(false);
    setError('');
    const next: CodingToolPreferences = {
      ...draft,
      customLinkName: draft.customLinkName.trim() || 'Custom link',
      customLinkURL: draft.customLinkURL.trim(),
    };
    const errors = {
      url:
        next.customLinkEnabled && !isWebCodingToolURLTemplate(next.customLinkURL)
          ? t('codingTools.invalidURL')
          : '',
      prompt: !next.promptTemplate.trim() ? t('codingTools.promptRequired') : '',
    };
    setFieldErrors(errors);
    const field = errors.url ? 'url' : errors.prompt ? 'prompt' : null;
    setValidationFocus((current) => ({ field, attempt: current.attempt + 1 }));
    if (field) return;
    try {
      const confirmed = updatePreferences(next);
      dirty.current = false;
      setDraft(confirmed);
      setSaved(true);
    } catch {
      setError(t('codingTools.storageFailed'));
    }
  };
  return {
    data: {
      codingToolDraft: draft,
      codingToolError: error,
      codingToolSaved: saved,
      codingToolFieldErrors: fieldErrors,
      codingToolValidationFocus: validationFocus,
    },
    handlers: {
      onCodingToolEnabledChange: (event: ChangeEvent<HTMLInputElement>) =>
        change({ customLinkEnabled: event.currentTarget.checked }, 'url'),
      onCodingToolNameChange: (event: ChangeEvent<HTMLInputElement>) =>
        change({ customLinkName: event.currentTarget.value }),
      onCodingToolURLChange: (event: ChangeEvent<HTMLInputElement>) =>
        change({ customLinkURL: event.currentTarget.value }, 'url'),
      onCodingToolPromptChange: (event: ChangeEvent<HTMLTextAreaElement>) =>
        change({ promptTemplate: event.currentTarget.value }, 'prompt'),
      onRetryCodingToolsSave: save,
      onSaveCodingTools: (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        save();
      },
    },
  };
}
